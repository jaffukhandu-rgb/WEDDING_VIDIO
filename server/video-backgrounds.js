// Isolated MP4 background storage. Does not modify existing HTML templates.
import express from "express";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import dns from "node:dns";
import { GridFSBucket, MongoClient } from "mongodb";
import { requireAdmin } from "./admin-access.js";
import { isCloudinaryConfigured, uploadCloudinaryBackground, fetchCloudinaryBackground, listCloudinaryBackgrounds, destroyCloudinaryBackground } from "./cloudinary-background.js";
import { countVideoTemplateReferences } from "./template-store.js";

export const MAX_BACKGROUND_BYTES = 32 * 1024 * 1024;
const DATABASE = process.env.MONGODB_DB_NAME || "wedding_video_maker";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let connectionPromise;

async function videoBucket() {
  if (!process.env.MONGODB_URI?.trim()) {
    throw new Error("MongoDB is required to store Video + HTML background files.");
  }
  if (!connectionPromise) {
    const connect = async () => {
      const client = new MongoClient(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 6000,
        maxPoolSize: 3
      });
      try {
        return await client.connect();
      } catch (error) {
        await client.close().catch(() => {});
        throw error;
      }
    };
    connectionPromise = connect().catch(async error => {
      // Keep compatibility with the existing Windows + MongoDB Atlas SRV fix.
      if (process.platform !== "win32" ||
          error?.code !== "ECONNREFUSED" || error?.syscall !== "querySrv") throw error;
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
      return connect();
    }).catch(error => {
      connectionPromise = undefined;
      throw error;
    });
  }
  const client = await connectionPromise;
  return new GridFSBucket(client.db(DATABASE), { bucketName: "invitation_video_backgrounds" });
}

async function assetMetadata() {
  await videoBucket();
  const client = await connectionPromise;
  return client.db(DATABASE).collection("invitation_video_asset_metadata");
}

async function findAsset(id) {
  if (!UUID.test(id)) return null;
  const normalized = id.toLowerCase();
  const metadata = await assetMetadata();
  const cloudFile = await metadata.findOne({ id: normalized, provider: "cloudinary" });
  if (cloudFile) return { provider: "cloudinary", file: cloudFile };
  // Preserve every video uploaded before Cloudinary was introduced.
  const bucket = await videoBucket();
  const results = await bucket.find({ filename: normalized }).limit(1).toArray();
  return results.length ? { provider: "gridfs", bucket, file: results[0] } : null;
}

export async function backgroundExists(id) {
  const record = await findAsset(id);
  return Boolean(record && record.file.status !== "uploading" && record.file.status !== "deleting");
}

// Called only after checking published-template references (or by a template
// tombstone workflow). Idempotent enough to retry a failed partial deletion.
export async function deleteVideoBackgroundAsset(id) {
  const record = await findAsset(id);
  if (!record) return { deleted: false, missing: true };
  if (record.provider === "cloudinary") {
    const metadata = await assetMetadata();
    await metadata.updateOne({ id, provider: "cloudinary" }, {
      $set: { status: "deleting", deletionStartedAt: new Date() }
    });
    // Cloudinary acknowledges removal before the MongoDB record is removed.
    // If MongoDB fails afterwards, retrying is safe (Cloudinary returns not found).
    await destroyCloudinaryBackground(id);
    await metadata.deleteOne({ id, provider: "cloudinary" });
  } else {
    await record.bucket.delete(record.file._id);
  }
  return { deleted: true, provider: record.provider };
}

export async function loadBackgroundBytes(id) {
  const record = await findAsset(id);
  if (!record) return null;
  if (record.provider === "cloudinary") {
    if (record.file.status === "uploading" || record.file.status === "deleting") return null;
    const upstream = await fetchCloudinaryBackground(id);
    if (upstream.status !== 200) throw new Error("Could not download the Cloudinary background.");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length < 1024 || buffer.length > MAX_BACKGROUND_BYTES ||
        buffer.toString("ascii", 4, 8) !== "ftyp") {
      throw new Error("The Cloudinary MP4 is incomplete or invalid.");
    }
    return buffer;
  }
  if (record.file.length < 1 || record.file.length > MAX_BACKGROUND_BYTES) {
    throw new Error("Background asset exceeds the supported size.");
  }
  const chunks = [];
  for await (const chunk of record.bucket.openDownloadStream(record.file._id)) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.length !== record.file.length) throw new Error("Incomplete MP4 background asset.");
  return buffer;
}

// Shared HTTP-range slicing for streaming and offline Chromium interception.
export function backgroundByteRange(length, rangeHeader) {
  if (!Number.isSafeInteger(length) || length < 1) return null;
  if (!rangeHeader) return { start: 0, end: length - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, length - suffix);
    end = length - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : length - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
        start >= length || start > end) return null;
    end = Math.min(end, length - 1);
  }
  return { start, end, partial: true };
}

export function backgroundResponseHeaders(total, range) {
  return {
    "Content-Type": "video/mp4",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Accept-Ranges": "bytes",
    "Content-Length": String(range.end - range.start + 1),
    "Cache-Control": "public, max-age=86400",
    "X-Content-Type-Options": "nosniff",
    ...(range.partial ? { "Content-Range":
      "bytes " + range.start + "-" + range.end + "/" + total } : {})
  };
}

export function videoBackgroundRouter() {
  const router = express.Router();

  // Safe status only: never return cloud name, key or API secret to the browser.
  router.get("/video-backgrounds/status", (_req, res) => {
    res.set("Cache-Control", "no-store").json({
      provider: isCloudinaryConfigured() ? "cloudinary" : "mongodb",
      cloudinaryConfigured: isCloudinaryConfigured(),
      mongodbConfigured: Boolean(process.env.MONGODB_URI?.trim()),
      maxUploadMb: 32
    });
  });

  // Read-only inventory: both published and unpublished uploaded backgrounds.
  router.get("/admin/video-backgrounds", requireAdmin, async (_req, res) => {
    try {
      const metadata = await assetMetadata();
      const [cloud, bucket] = await Promise.all([
        metadata.find({ provider: "cloudinary", status: { $ne: "deleting" } })
          .sort({ createdAt: -1 }).limit(150).toArray(),
        videoBucket()
      ]);
      const gridfs = await bucket.find({}).sort({ uploadDate: -1 }).limit(150).toArray();
      const videos = [
        ...cloud.filter(item => UUID.test(item.id)).map(item => ({
          id: item.id, provider: "cloudinary", bytes: item.length,
          uploadedAt: item.createdAt, status: item.status || "ready"
        })),
        ...gridfs.filter(item => UUID.test(item.filename)).map(item => ({
          id: item.filename, provider: "mongodb", bytes: item.length,
          uploadedAt: item.uploadDate, status: "ready"
        }))
      ].sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0,150);
      return res.set("Cache-Control", "no-store").json({ videos });
    } catch (error) {
      console.error("Video inventory failed:", error);
      return res.status(503).json({ error: "Unable to retrieve saved videos. Check MongoDB." });
    }
  });

  // Explicit, non-destructive repair of older Cloudinary uploads whose MongoDB
  // write failed after remote storage succeeded.
  router.post("/admin/video-backgrounds/reconcile", requireAdmin, async (_req, res) => {
    try {
      const files = await listCloudinaryBackgrounds();
      const metadata = await assetMetadata();
      let recovered = 0;
      for (const file of files) {
        const previous = await metadata.findOne({ id: file.id, provider: "cloudinary" });
        if (previous?.status === "deleting") continue;
        const result = await metadata.updateOne(
          { id: file.id, provider: "cloudinary" },
          { $set: { status: "ready", length: file.bytes },
            $setOnInsert: { id: file.id, provider: "cloudinary",
              createdAt: new Date(file.createdAt || Date.now()) } },
          { upsert: true }
        );
        if (result.upsertedCount) recovered++;
      }
      return res.set("Cache-Control", "no-store").json({
        checked: files.length, recovered
      });
    } catch (error) {
      console.error("Cloudinary inventory recovery failed:", error);
      return res.status(503).json({
        error: "Cloudinary recovery unavailable. Check Cloudinary Admin API and MongoDB access."
      });
    }
  });

  router.delete("/admin/video-backgrounds/:id", requireAdmin, async (req, res) => {
    const id = String(req.params.id || "").toLowerCase();
    if (!UUID.test(id)) return res.status(400).json({ error: "Invalid video ID." });
    try {
      const references = await countVideoTemplateReferences(id);
      if (references) return res.status(409).json({
        error: "This video is used by " + references +
          " saved template(s). Delete those templates first to avoid broken invitations."
      });
      const result = await deleteVideoBackgroundAsset(id);
      if (result.missing) return res.status(404).json({ error: "Video not found." });
      return res.set("Cache-Control", "no-store").json({ deleted: true });
    } catch (error) {
      console.error("Video deletion failed:", error);
      return res.status(503).json({ error: "Video deletion incomplete. Retry; no other templates were changed." });
    }
  });

  // Admin-only upload; a public asset can subsequently be played via an opaque UUID.
  router.post("/admin/video-backgrounds", requireAdmin,
    express.raw({ type: "video/mp4", limit: "33mb" }), async (req, res) => {
      const data = req.body;
      if (!Buffer.isBuffer(data)) {
        return res.status(415).json({ error: "Choose an MP4 video (video/mp4)." });
      }
      if (data.length < 1024 || data.length > MAX_BACKGROUND_BYTES ||
          data.toString("ascii", 4, 8) !== "ftyp") {
        return res.status(400).json({
          error: "Select a valid MP4 file smaller than 32 MB. Use H.264 for browser compatibility."
        });
      }
      try {
        const bucket = await videoBucket();
        // Reuse identical footage: repeated admin attempts should not fill storage.
        const sha256 = createHash("sha256").update(data).digest("hex");
        if (isCloudinaryConfigured()) {
          const metadata = await assetMetadata();
          const previous = await metadata.findOne({ provider: "cloudinary", sha256,
            status: { $nin: ["uploading", "deleting"] } });
          if (previous) {
            res.set("Cache-Control", "no-store");
            return res.status(200).json({
              id: previous.id, bytes: data.length, reused: true, provider: "cloudinary"
            });
          }
          const id = randomUUID();
          // Reserve the MongoDB metadata record FIRST so the library can recover
          // an upload even if the final MongoDB update fails.
          await metadata.insertOne({
            id, provider: "cloudinary", sha256, length: data.length,
            status: "uploading", createdAt: new Date()
          });
          let uploaded = false;
          try {
            await uploadCloudinaryBackground(data, id);
            uploaded = true;
            await metadata.updateOne({ id, provider: "cloudinary" }, {
              $set: { status: "ready", completedAt: new Date() }
            });
          } catch (error) {
            if (!uploaded) {
              await metadata.deleteOne({ id, provider: "cloudinary",
                status: "uploading" }).catch(() => {});
            }
            // If Cloudinary accepted the file, preserve the pending record
            // for explicit reconciliation rather than deleting a user's media.
            throw error;
          }
          res.set("Cache-Control", "no-store");
          return res.status(201).json({ id, bytes: data.length, provider: "cloudinary" });
        }
        const previous = await bucket.find({ "metadata.sha256": sha256 }).limit(1).toArray();
        if (previous.length) {
          res.set("Cache-Control", "no-store");
          return res.status(200).json({ id: previous[0].filename, bytes: data.length, reused: true });
        }
        const id = randomUUID();
        const upload = bucket.openUploadStream(id, {
          metadata: { type: "video/mp4", sha256, uploadedAt: new Date() }
        });
        await pipeline(Readable.from([data]), upload);
        res.set("Cache-Control", "no-store");
        return res.status(201).json({ id, bytes: data.length, provider: "mongodb" });
      } catch (error) {
        console.error("Background upload failed:", error);
        return res.status(503).json({ error: "Video storage unavailable. Verify MongoDB and Cloudinary server configuration." });
      }
    });

  // Video playback needs byte ranges for seeking. The UUID is unguessable,
  // but published invitation backgrounds are intentionally public assets.
  router.get("/video-backgrounds/:id", async (req, res) => {
    const id = String(req.params.id || "").toLowerCase();
    if (!UUID.test(id)) return res.status(404).end();
    try {
      const record = await findAsset(id);
      if (!record) return res.status(404).end();
      if (record.provider === "cloudinary") {
        if (record.file.status === "deleting" || record.file.status === "uploading") {
          return res.status(404).end();
        }
        const rangeHeader = req.get("Range");
        const upstream = await fetchCloudinaryBackground(id, rangeHeader);
        if (upstream.status === 416) {
          const contentRange = upstream.headers.get("content-range");
          if (contentRange) res.set("Content-Range", contentRange);
          return res.status(416).end();
        }
        const headers = {
          "Content-Type": "video/mp4",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff"
        };
        if (rangeHeader && upstream.status === 200) {
          // Some CDN configurations ignore Range; still satisfy the browser's seek.
          const buffer = Buffer.from(await upstream.arrayBuffer());
          if (buffer.length < 1 || buffer.length > MAX_BACKGROUND_BYTES) {
            throw new Error("Cloudinary returned an invalid background size.");
          }
          const range = backgroundByteRange(buffer.length, rangeHeader);
          if (!range) return res.status(416)
            .set("Content-Range", "bytes */" + buffer.length).end();
          return res.status(206)
            .set(backgroundResponseHeaders(buffer.length, range))
            .end(buffer.subarray(range.start, range.end + 1));
        }
        for (const header of ["content-length", "content-range"]) {
          const value = upstream.headers.get(header);
          if (value) headers[header] = value;
        }
        res.status(upstream.status).set(headers);
        if (!upstream.body) return res.end();
        await pipeline(Readable.fromWeb(upstream.body), res);
        return;
      }
      const total = record.file.length;
      const range = backgroundByteRange(total, req.get("Range"));
      if (!range) {
        return res.status(416).set("Content-Range", "bytes */" + total).end();
      }
      res.status(range.partial ? 206 : 200).set(backgroundResponseHeaders(total, range));
      const stream = record.bucket.openDownloadStream(record.file._id, {
        start: range.start, end: range.end + 1
      });
      stream.on("error", error => {
        console.error("Background stream failed:", error);
        if (!res.headersSent) res.status(503).end();
        else res.destroy(error);
      });
      res.on("close", () => {
        if (!res.writableFinished) stream.destroy();
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Background retrieval failed:", error);
      if (!res.headersSent) res.status(503).end();
    }
  });

  return router;
}
