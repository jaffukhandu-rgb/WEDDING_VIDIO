// Shared, dependency-free template display-name and origin helpers.
const NAMED_ENTITIES = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—"
});

export function decodeHtmlEntities(value) {
  if (typeof value !== "string") return "";
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, body) => {
    const lower = body.toLowerCase();
    if (Object.hasOwn(NAMED_ENTITIES, lower)) return NAMED_ENTITIES[lower];
    if (lower.startsWith("#x")) {
      const code = Number.parseInt(lower.slice(2), 16);
      if (Number.isInteger(code) && code >= 0x20 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
    } else if (lower.startsWith("#")) {
      const code = Number.parseInt(lower.slice(1), 10);
      if (Number.isInteger(code) && code >= 0x20 && code <= 0x10ffff) {
        return String.fromCodePoint(code);
      }
    }
    return full;
  });
}

export function normalizeTemplateTitle(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const cleaned = decodeHtmlEntities(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || fallback;
}

export function normalizeAssetDisplayName(value, fallback = "") {
  return normalizeTemplateTitle(value, fallback);
}

export function isValidDisplayName(value) {
  if (typeof value !== "string") return false;
  const cleaned = normalizeTemplateTitle(value, "");
  return cleaned.length >= 1 && cleaned.length <= 120;
}

// Loopback host aliases (localhost vs 127.0.0.1) on the same port refer to
// the same local renderer during development without weakening external origin checks.
export function isEquivalentRendererOrigin(leftOrigin, rightOrigin) {
  if (!leftOrigin || !rightOrigin) return false;
  if (leftOrigin === rightOrigin) return true;
  try {
    const a = new URL(leftOrigin);
    const b = new URL(rightOrigin);
    const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return a.protocol === b.protocol && a.port === b.port &&
      localHosts.has(a.hostname) && localHosts.has(b.hostname);
  } catch {
    return false;
  }
}
