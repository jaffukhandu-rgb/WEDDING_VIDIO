// Isolated MP4 background storage. Does not modify existing HTML templates.
import express from "express";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import dns from "node:dns";
import { GridFSBucket, MongoClient } from "mongodb";
import { requireAdmin } from "./admin-access.js";

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

async function findAsset(id) {
  if (!UUID.test(id)) return null;
  const bucket = await videoBucket();
  const results = await bucket.find({ filename: id.toLowerCase() }).limit(1).toArray();
  return results.length ? { bucket, file: results[0] } : null;
}

export async function backgroundExists(id) {
  return Boolean(await findAsset(id));
}

export async function loadBackgroundBytes(id) {
  const record = await findAsset(id);
  if (!record) return null;
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
        // Reuse identical footage: repeated admin attempts should not fill GridFS.
        const sha256 = createHash("sha256").update(data).digest("hex");
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
        return res.status(201).json({ id, bytes: data.length });
      } catch (error) {
        console.error("Background upload failed:", error);
        return res.status(503).json({ error: "Background storage unavailable. Check MongoDB configuration." });
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
