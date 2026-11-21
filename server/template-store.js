import { MongoClient, ObjectId } from "mongodb";
import dns from "node:dns";

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
