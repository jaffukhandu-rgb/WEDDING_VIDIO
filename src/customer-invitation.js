// Shared contract for the browser preview and the renderer's published-source lookup.
import { analyzeTemplate, prepareTemplate } from "./admin-engine.js";

export const PHOTO_LIMIT = 3 * 1024 * 1024;
export const photoKey = slot => slot.key === "photos" ? "photos:" + slot.index : slot.key;
export const requiredField = key => ["partner1","partner2","date","venue"].includes(key);
export const fieldLimit = key => key === "message" ? 1000 : 300;
export const eventKeys = event => Object.keys(event).filter(key => typeof event[key] === "string" && !["constructor","prototype","__proto__"].includes(key));

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}
function textValue(key, value, required) {
  if (typeof value !== "string" || value.length > fieldLimit(key) || /[<>\u0000-\u0008]/.test(value) ||
      (required && !value.trim())) throw Error("Check the " + key + " field.");
  return value;
}
// Check declared raster dimensions before handing compressed images to Chromium.
function dimensions(type, base64) {
  const header = atob(base64.slice(0, 48));
  const byte = i => header.charCodeAt(i);
  const little24 = i => byte(i) + 256 * byte(i+1) + 65536 * byte(i+2);
  const big32 = i => byte(i)*0x1000000 + byte(i+1)*65536 + byte(i+2)*256 + byte(i+3);
  if (type === "png" && header.startsWith("\x89PNG\r\n\x1a\n") && header.slice(12,16) === "IHDR") {
    return [big32(16), big32(20)];
  }
  if (type === "webp" && header.startsWith("RIFF") && header.slice(8,12) === "WEBP") {
    switch (header.slice(12,16)) {
      case "VP8X": return [1 + little24(24), 1 + little24(27)];
      case "VP8 ": return [byte(26) + ((byte(27)&63)<<8), byte(28) + ((byte(29)&63)<<8)];
      case "VP8L": return [1 + byte(21) + ((byte(22)&63)<<8), 1 + (byte(22)>>6) + (byte(23)<<2) + ((byte(24)&15)<<10)];
    }
  }
  if (type === "jpeg" && header.startsWith("\xff\xd8\xff")) {
    const raw = atob(base64);
    const word = i => raw.charCodeAt(i)*256 + raw.charCodeAt(i+1);
    let offset = 2;
    while (offset < raw.length && raw.charCodeAt(offset) === 255) {
      while (raw.charCodeAt(offset) === 255) offset++;
      const marker = raw.charCodeAt(offset++);
      const length = word(offset);
      if (length < 2 || offset + length > raw.length || marker === 0xda) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4,0xc8,0xcc].includes(marker)) {
        return [word(offset+5), word(offset+3)];
      }
      offset += length;
    }
  }
  throw Error("Photo contents do not match the image format.");
}
export function validateCustomerPhoto(url) {
  if (typeof url !== "string" || url.length > 4 * Math.ceil(PHOTO_LIMIT / 3) + 32) throw Error("Photo exceeds 3 MiB.");
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
  if (!match || match[2].length % 4 || match[2].length > 4 * Math.ceil(PHOTO_LIMIT / 3)) throw Error("Choose a JPG, PNG or WebP photo up to 3 MiB.");
  const [width, height] = dimensions(match[1], match[2]);
  const pixels = width * height;
  if (!(width > 0 && height > 0 && pixels <= 32_000_000)) throw Error("Choose a photo up to 32 megapixels.");
  return pixels;
}
export function prepareCustomerInvitation(source, details, photos, analysis = analyzeTemplate(source), replaceMusic = false) {
  if (!record(details) || !record(photos)) throw Error("Invalid invitation details.");
  const values = {};
  for (const [key, value] of Object.entries(details)) {
    if (!analysis.fields.includes(key) || key === "photos") throw Error("Unsupported invitation field.");
    if (key !== "events") {
      values[key] = textValue(key, value, requiredField(key));
      continue;
    }
    if (!Array.isArray(value) || value.length !== analysis.config.events.length) throw Error("Event count must match the invitation.");
    values.events = value.map((event, index) => {
      const original = analysis.config.events[index];
      const keys = eventKeys(original);
      if (!record(event) || Object.keys(event).some(k => !keys.includes(k))) throw Error("Unsupported event field.");
      const result = { ...original };
      for (const k of keys) {
        if (Object.hasOwn(event, k)) result[k] = textValue(k, event[k], ["name","date","time","venue"].includes(k));
      }
      return result;
    });
  }
  let pixels = 0;
  for (const [id, url] of Object.entries(photos)) {
    const slot = analysis.photoSlots.find(item => photoKey(item) === id);
    if (!slot) throw Error("Unknown photo slot.");
    pixels += validateCustomerPhoto(url);
    if (pixels > 64_000_000) throw Error("Reduce the total photo resolution to 64 megapixels.");
    if (slot.key === "photos") {
      values.photos ??= [...analysis.config.photos];
      while (values.photos.length <= slot.index) values.photos.push("");
      values.photos[slot.index] = url;
    } else values[slot.key] = url;
  }
  if (replaceMusic && Object.hasOwn(analysis.config, "music")) values.music = "";
  return prepareTemplate(source, values, { preserveConfig: true, analysis });
}
