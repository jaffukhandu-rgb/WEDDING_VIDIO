import { MongoClient, ObjectId } from "mongodb";
import dns from "node:dns";
import { findVideoBackground } from "../src/video-html-contract.js";

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
    title: document.title,
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

export async function getPublishedTemplate(id) {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id.toLowerCase()) return null;
  const coll = await collection();
  return coll.findOne({ _id: new ObjectId(id), status: "published" });
}

export async function publishTemplate(template) {
  const coll = await collection();
  const now = new Date();
  const selector = { category: template.category, sourceHash: template.sourceHash };
  await coll.updateOne(selector, {
    $set: { ...template, status: "published", publishedAt: now },
    $setOnInsert: { createdAt: now }
  }, { upsert: true });
  const result = await coll.findOne(selector);
  return serializeListItem(result);
}


function templateId(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return null;
  return new ObjectId(id);
}

// Admin-only metadata. Never send the full HTML in list responses.
export async function listAdminTemplates() {
  const coll = await collection();
  const docs = await coll.find({ status: { $in: ["published", "deleting"] } })
    .project({ title: 1, category: 1, html: 1, status: 1, publishedAt: 1,
      sceneCount: 1, photoCount: 1, videoBackgroundId: 1 })
    .sort({ publishedAt: -1 }).limit(250).toArray();
  return docs.map(doc => {
    const videoId = doc.videoBackgroundId || findVideoBackground(doc.html)?.id || null;
    return {
      id: doc._id.toString(), title: doc.title, category: doc.category,
      status: doc.status, kind: videoId ? "video" : "html",
      videoBackgroundId: videoId, publishedAt: doc.publishedAt?.toISOString() || null,
      sceneCount: doc.sceneCount, photoCount: doc.photoCount
    };
  });
}

export async function getAdminTemplate(id) {
  const _id = templateId(id);
  if (!_id) return null;
  const coll = await collection();
  return coll.findOne({ _id, status: { $in: ["published", "deleting"] } });
}

export async function updateAdminTemplate(id, fields) {
  const _id = templateId(id);
  if (!_id) return null;
  const coll = await collection();
  const result = await coll.updateOne({ _id, status: "published" }, { $set: fields });
  if (!result.matchedCount) return null;
  return getAdminTemplate(id);
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
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(videoId)) return 0;
  const coll = await collection();
  const conditions = {
    status: { $in: ["published", "deleting"] },
    $or: [
      { videoBackgroundId: videoId },
      { html: { $regex: 'data-wedding-background=["\\x27]' + videoId + '["\\x27]', $options: "i" } }
    ]
  };
  const excluded = templateId(excludedTemplateId);
  if (excluded) conditions._id = { $ne: excluded };
  return coll.countDocuments(conditions);
}
