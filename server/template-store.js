import { MongoClient, ObjectId } from "mongodb";

const DATABASE = process.env.MONGODB_DB_NAME || "wedding_video_maker";
let clientPromise;

export function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

async function collection() {
  if (!isDatabaseConfigured()) throw new Error("MongoDB is not configured.");
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 6000,
      maxPoolSize: 5
    });
    clientPromise = client.connect().then(async connected => {
      const coll = connected.db(DATABASE).collection("invitation_templates");
      await coll.createIndex({ category: 1, status: 1, publishedAt: -1 });
      await coll.createIndex({ category: 1, sourceHash: 1 }, { unique: true });
      return coll;
    }).catch(error => {
      clientPromise = undefined;
      client.close().catch(() => {});
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
