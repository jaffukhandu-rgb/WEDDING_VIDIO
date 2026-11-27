// Optional Cloudinary transport for Video + HTML backgrounds.
// Secrets stay on the renderer server; the browser only talks to our existing API.
import { createHash } from "node:crypto";

const CLOUD_NAME = /^[a-zA-Z0-9_-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BYTES = 32 * 1024 * 1024;

export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME: name, CLOUDINARY_API_KEY: key,
    CLOUDINARY_API_SECRET: secret } = process.env;
  return Boolean(name && CLOUD_NAME.test(name) && key?.trim() && secret?.trim());
}

export function cloudinaryPublicId(id) {
  if (!UUID.test(id)) throw new Error("Invalid video background identifier.");
  return "wedding_backgrounds/" + id.toLowerCase();
}

export function cloudinaryUploadSignature(parameters, secret) {
  const serialized = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => key + "=" + value).join("&");
  return createHash("sha1").update(serialized + secret).digest("hex");
}

export function cloudinaryDeliveryUrl(id) {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  return "https://res.cloudinary.com/" + process.env.CLOUDINARY_CLOUD_NAME +
    "/video/upload/" + cloudinaryPublicId(id) + ".mp4";
}

export async function uploadCloudinaryBackground(data, id) {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  if (!Buffer.isBuffer(data) || data.length < 1024 || data.length > MAX_BYTES) {
    throw new Error("Invalid Cloudinary background upload size.");
  }
  const publicId = cloudinaryPublicId(id);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("file", new Blob([data], { type: "video/mp4" }), "background.mp4");
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", process.env.CLOUDINARY_API_KEY);
  form.set("signature", cloudinaryUploadSignature(params, process.env.CLOUDINARY_API_SECRET));
  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + process.env.CLOUDINARY_CLOUD_NAME + "/video/upload",
    { method: "POST", body: form, signal: AbortSignal.timeout(120000) }
  );
  if (!response.ok) {
    // Never forward Cloudinary API responses or credentials to the browser.
    throw new Error("Cloudinary rejected the background upload (HTTP " + response.status + ").");
  }
  const result = await response.json();
  if (result.resource_type !== "video" || result.public_id !== publicId ||
      result.format !== "mp4") {
    throw new Error("Cloudinary returned an unexpected video asset format.");
  }
  return { publicId, bytes: data.length, duration: result.duration ?? null };
}

export async function fetchCloudinaryBackground(id, rangeHeader, signal) {
  const headers = {};
  if (rangeHeader) headers.Range = rangeHeader;
  const timeout = AbortSignal.timeout(60000);
  const response = await fetch(cloudinaryDeliveryUrl(id), {
    headers,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout
  });
  if (![200, 206, 416].includes(response.status)) {
    throw new Error("Cloudinary video delivery failed (HTTP " + response.status + ").");
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    await response.body?.cancel();
    throw new Error("Cloudinary background is larger than the 32 MB limit.");
  }
  return response;
}


// Only wedding_backgrounds/<UUID> assets may be managed by the admin library.
export async function listCloudinaryBackgrounds() {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured.");
  const { CLOUDINARY_CLOUD_NAME: name, CLOUDINARY_API_KEY: key,
    CLOUDINARY_API_SECRET: secret } = process.env;
  const auth = "Basic " + Buffer.from(key + ":" + secret).toString("base64");
  const videos = [];
  let cursor = null;
  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({ prefix: "wedding_backgrounds/", max_results: "100" });
    if (cursor) params.set("next_cursor", cursor);
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/" + name + "/resources/video/upload?" + params,
      { headers: { Authorization: auth }, signal: AbortSignal.timeout(20000) }
    );
    if (!response.ok) throw new Error("Cloudinary inventory request failed (HTTP " + response.status + ").");
    const data = await response.json();
    for (const resource of Array.isArray(data.resources) ? data.resources : []) {
      const id = String(resource.public_id || "").replace(/^wedding_backgrounds\//, "");
      if (UUID.test(id) && resource.public_id === cloudinaryPublicId(id) &&
          resource.format === "mp4" && resource.bytes >= 1024 && resource.bytes <= MAX_BYTES) {
        videos.push({ id: id.toLowerCase(), bytes: resource.bytes,
          createdAt: resource.created_at, publicId: resource.public_id });
      }
    }
    cursor = typeof data.next_cursor === "string" ? data.next_cursor : null;
    if (!cursor) break;
  }
  return videos;
}

export async function destroyCloudinaryBackground(id) {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary credentials are required for remote deletion.");
  const publicId = cloudinaryPublicId(id);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const params = { public_id: publicId, invalidate: "true", timestamp };
  const body = new URLSearchParams({
    ...params,
    api_key: process.env.CLOUDINARY_API_KEY,
    signature: cloudinaryUploadSignature(params, process.env.CLOUDINARY_API_SECRET)
  });
  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + process.env.CLOUDINARY_CLOUD_NAME + "/video/destroy",
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body, signal: AbortSignal.timeout(30000) }
  );
  if (!response.ok) throw new Error("Cloudinary deletion failed (HTTP " + response.status + ").");
  const result = await response.json();
  if (!["ok", "not found"].includes(result.result)) {
    throw new Error("Cloudinary did not confirm deletion.");
  }
  return result.result;
}
