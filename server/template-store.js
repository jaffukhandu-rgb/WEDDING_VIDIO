import { randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import dns from "node:dns";
import { findVideoBackground } from "../src/video-html-contract.js";
import { normalizeTemplateTitle } from "../src/template-metadata.js";

const DATABASE = process.env.MONGODB_DB_NAME || "wedding_video_maker";
let clientPromise;

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function connectCollection() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 6000,
    maxPoolSize: 5
  });
  try {
    const connected = await client.connect();
    const coll = connected.db(DATABASE).collection("invitation_templates");
    await coll.createIndex({ category: 1, status: 1, publishedAt: -1 });
    await coll.createIndex({ category: 1, sourceHash: 1 }, { unique: true });
    return coll;
  } catch (error) {
    await client.close().catch(() => {});
    throw error;
  }
}

async function collection() {
  if (!isDatabaseConfigured()) throw new Error("MongoDB is not configured.");
  if (!clientPromise) {
    clientPromise = connectCollection().catch(async error => {
      // Some Windows DNS resolvers refuse Atlas SRV queries even when the hostname
      // is valid. Retry only this specific failure with the servers that work.
      if (process.platform !== "win32" ||
          error?.code !== "ECONNREFUSED" || error?.syscall !== "querySrv") {
        throw error;
      }
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      console.warn("MongoDB SRV DNS lookup refused; retrying with fallback DNS servers.");
      return connectCollection();
    }).catch(error => {
      clientPromise = undefined;
      throw error;
    });
  }
  return clientPromise;
}

function serializeListItem(document) {
  return {
    id: document._id.toString(),
    title: normalizeTemplateTitle(document.title, "Wedding invitation"),
    category: document.category,
    sceneCount: document.sceneCount,
    eventCount: document.eventCount,
    photoCount: document.photoCount,
    publishedAt: document.publishedAt?.toISOString() || null
  };
}

export async function listPublishedTemplates(category) {
  const coll = await collection();
  const records = await coll.find({ category, status: "published" })
    .project({ title: 1, category: 1, sceneCount: 1, eventCount: 1, photoCount: 1, publishedAt: 1 })
    .sort({ publishedAt: -1 }).limit(50).toArray();
  return records.map(serializeListItem);
}

export async function getPublishedTemplate(id, options = {}) {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id.toLowerCase()) return null;
  const coll = await collection();
  return coll.findOne({ _id: new ObjectId(id), status: "published" }, options);
}

export async function publishTemplate(template) {
  const coll = await collection();
  const now = new Date();
  const selector = { category: template.category, sourceHash: template.sourceHash };
  // Re-publishing the same master is idempotent. Metadata edits require its revision.
  const result = await coll.findOneAndUpdate(selector, {
    $setOnInsert: { ...template, status: "published", createdAt: now, publishedAt: now, editRevision: randomUUID() }
  }, { upsert: true, returnDocument: "after" });
  if (result.status !== "published" || result.title !== template.title) {
    throw Object.assign(new Error("An identical template already exists. Reload it before editing."), { code: 11000 });
  }
  return { ...serializeListItem(result), revision: adminRevision(result) };
}


function templateId(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
}

// Admin-only metadata. Never send the full HTML in list responses.
export function adminRevision(doc) {
  return doc.editRevision || doc.sourceHash || doc._id.toString();
}

// Older records may lack the UUID index field. Return just their video tags
// for the same strict URL/marker check used by the renderer.
const legacyVideoTags = { $cond: [
  { $eq: [{ $ifNull: ["$videoBackgroundId", null] }, null] },
  { $map: { input: { $regexFindAll: { input: { $ifNull: ["$html", ""] }, regex: /<video\b[^>]*>/i } },
    as: "tag", in: "$$tag.match" } }, "$$REMOVE"
] };
function inventoryVideoId(doc) {
  return doc.videoBackgroundId || findVideoBackground(doc.videoTags?.join("") || "")?.id || null;
}

export async function listAdminTemplates(after) {
  const coll = await collection();
  const docs = await coll.find({ status: { $in: ["published", "deleting"] }, ...after })
    .project({ title: 1, titleCustomized: 1, category: 1, editRevision: 1, sourceHash: 1,
      videoTags: legacyVideoTags, status: 1, publishedAt: 1,
      updatedAt: 1, sceneCount: 1, eventCount: 1, photoCount: 1, videoBackgroundId: 1 })
    .sort({ _id: 1 }).limit(101).toArray();
  return docs.map(doc => {
    const videoId = inventoryVideoId(doc);
    return {
      id: doc._id.toString(), revision: adminRevision(doc),
      title: normalizeTemplateTitle(doc.title, "Wedding invitation"),
      titleCustomized: Boolean(doc.titleCustomized),
      category: doc.category,
      status: doc.status, kind: videoId ? "video" : "html",
      videoBackgroundId: videoId,
      publishedAt: doc.publishedAt?.toISOString() || null,
      updatedAt: doc.updatedAt?.toISOString() || null,
      sceneCount: doc.sceneCount, eventCount: doc.eventCount || 0, photoCount: doc.photoCount || 0
    };
  });
}

export async function listVideoTemplateLinks(ids) {
  if (!ids.length) return new Map();
  const coll = await collection();
  // Only fetch legacy HTML when it might reference an asset on this inventory page.
  const marker = `data-wedding-background\\s*=\\s*["'](?:${ids.join("|")})["']`;
  const docs = coll.find({ status: { $in: ["published", "deleting"] }, $or: [
    { videoBackgroundId: { $in: ids } },
    { videoBackgroundId: null, html: { $regex: marker, $options: "i" } }
  ] }).project({ title: 1, category: 1, status: 1, videoBackgroundId: 1,
    videoTags: legacyVideoTags });
  const links = new Map();
  for await (const doc of docs) {
    const videoId = (inventoryVideoId(doc) || "").toLowerCase();
    if (!videoId) continue;
    if (!links.has(videoId)) links.set(videoId, []);
    links.get(videoId).push({
      id: doc._id.toString(),
      title: normalizeTemplateTitle(doc.title, "Wedding invitation"),
      category: doc.category,
      status: doc.status
    });
  }
  return links;
}

export async function getAdminTemplate(id) {
  const _id = templateId(id);
  if (!_id) return null;
  const coll = await collection();
  return coll.findOne({ _id, status: { $in: ["published", "deleting"] } });
}

export async function updateAdminTemplate(id, fields, current) {
  const _id = templateId(id);
  if (!_id) return null;
  const coll = await collection();
  return coll.findOneAndUpdate({ _id, status: "published", editRevision: current.editRevision ?? null,
    sourceHash: current.sourceHash ?? null }, { $set: { ...fields, editRevision: randomUUID() } },
    { returnDocument: "after" });
}

export async function markAdminTemplateDeleting(id) {
  const _id = templateId(id);
  if (!_id) return null;
  const coll = await collection();
  const current = await coll.findOne({ _id, status: { $in: ["published", "deleting"] } });
  if (!current) return null;
  await coll.updateOne({ _id, status: "published" }, {
    $set: { status: "deleting", deletionStartedAt: new Date() }
  });
  return { ...current, status: "deleting" };
}

export async function finishAdminTemplateDeletion(id) {
  const _id = templateId(id);
  if (!_id) return false;
  const coll = await collection();
  const result = await coll.deleteOne({ _id, status: "deleting" });
  return result.deletedCount === 1;
}

// Include older published HTML that predates the videoBackgroundId metadata.
export async function countVideoTemplateReferences(videoId, excludedTemplateId = null) {
  if (typeof videoId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId)) return 0;
  const coll = await collection();
  const conditions = {
    status: { $in: ["published", "deleting"] },
    $or: [
      { videoBackgroundId: videoId },
      { html: { $regex: 'data-wedding-background\\s*=\\s*["\\x27]' + videoId + '["\\x27]', $options: "i" } }
    ]
  };
  const excluded = templateId(excludedTemplateId);
  if (excluded) conditions._id = { $ne: excluded };
  return coll.countDocuments(conditions);
}
