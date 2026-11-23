// Shared, dependency-free contract for trusted internal MP4 background references.
// Ordinary Via Code invitations remain unaffected.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Bounded durations keep uploads and offline rendering safe on shared servers.
export const MIN_VIDEO_SECONDS = 5;
export const MAX_VIDEO_SECONDS = 120;
export function isSupportedVideoDuration(seconds) {
  return Number.isFinite(seconds) && seconds >= MIN_VIDEO_SECONDS && seconds <= MAX_VIDEO_SECONDS;
}
export function videoFrameCount(seconds, fps = 30) {
  if (!isSupportedVideoDuration(seconds) || !Number.isInteger(fps) || fps < 1) {
    throw new Error("Unsupported video duration or frame rate.");
  }
  return Math.round(seconds * fps);
}

export function findVideoBackground(html) {
  if (typeof html !== "string") return null;
  const tags = html.match(/<video\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const marker = /\bdata-wedding-background\s*=\s*(["'])([^"']+)\1/i.exec(tag);
    if (!marker || !UUID.test(marker[2])) continue;
    const source = /\bsrc\s*=\s*(["'])([^"']+)\1/i.exec(tag);
    if (!source) continue;
    try {
      const url = new URL(source[2].replace(/&amp;/g, "&"));
      const id = marker[2].toLowerCase();
      if (!["http:", "https:"].includes(url.protocol) ||
          url.username || url.password || url.search || url.hash ||
          url.pathname !== "/api/video-backgrounds/" + id) continue;
      return { id, url: url.href, origin: url.origin };
    } catch {
      // Invalid media URL is not a supported internal background.
    }
  }
  return null;
}

export function isVideoBackgroundMarkerPresent(html) {
  return typeof html === "string" &&
    /<video\b[^>]*\bdata-wedding-background\s*=/i.test(html);
}
