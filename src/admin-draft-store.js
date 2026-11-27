// Local-only draft persistence. Never stores admin keys, credentials, customer uploads or MP4 bytes.
import { findVideoBackground } from "./video-html-contract.js";
import { normalizeTemplateTitle } from "./template-metadata.js";

const KEY = "wedding_admin_drafts_v1";
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_DRAFTS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

function normalizeDraft(item) {
  if (!item || typeof item.id !== "string" || typeof item.html !== "string" ||
      typeof item.title !== "string" || !["video", "html"].includes(item.kind)) {
    return null;
  }
  const detectedBg = findVideoBackground(item.html);
  const videoBackgroundId = typeof item.videoBackgroundId === "string" && UUID.test(item.videoBackgroundId)
    ? item.videoBackgroundId.toLowerCase()
    : detectedBg?.id || null;
  const videoBackgroundUrl = typeof item.videoBackgroundUrl === "string"
    ? item.videoBackgroundUrl
    : detectedBg?.url || null;
  const templateId = typeof item.templateId === "string" && OBJECT_ID.test(item.templateId)
    ? item.templateId.toLowerCase() : null;
  const mode = ["new", "edit", "video-new"].includes(item.mode)
    ? item.mode
    : templateId ? "edit" : item.kind === "video" ? "video-new" : "new";
  return {
    id: item.id,
    title: normalizeTemplateTitle(item.title, "Untitled invitation"),
    html: item.html,
    kind: item.kind,
    mode,
    templateId,
    templateCategory: typeof item.templateCategory === "string" ? item.templateCategory : null,
    templateRevision: typeof item.templateRevision === "string" ? item.templateRevision : null,
    videoBackgroundId,
    videoBackgroundUrl,
    autoSaved: Boolean(item.autoSaved),
    savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString()
  };
}

export function readDrafts() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(list)) return [];
    return list.map(normalizeDraft).filter(Boolean).slice(0, MAX_DRAFTS);
  } catch {
    return [];
  }
}

export function getDraft(id) {
  return readDrafts().find(item => item.id === id) || null;
}

export function findDraftsForVideo(videoId) {
  if (typeof videoId !== "string" || !UUID.test(videoId)) return [];
  const target = videoId.toLowerCase();
  return readDrafts().filter(draft =>
    draft.videoBackgroundId === target || findVideoBackground(draft.html)?.id === target
  );
}

export function saveDraft({
  id = null,
  title,
  html,
  kind,
  mode = null,
  templateId = null,
  templateCategory = null,
  templateRevision = null,
  videoBackgroundId = null,
  videoBackgroundUrl = null,
  autoSaved = false
}) {
  const cleanHtml = typeof html === "string" ? html : "";
  const hasVideoRef = typeof videoBackgroundId === "string" && UUID.test(videoBackgroundId);
  if (!hasVideoRef && !cleanHtml.trim()) {
    throw new Error("Enter invitation code before saving a draft.");
  }
  if (new TextEncoder().encode(cleanHtml).length > MAX_SOURCE_BYTES) {
    throw new Error("Draft HTML cannot exceed 1 MB.");
  }
  if (!["video", "html"].includes(kind)) throw new Error("Invalid draft type.");
  const existing = readDrafts();
  const targetId = typeof id === "string" && id.trim() ? id.trim() : null;
  const matchedIndex = targetId ? existing.findIndex(item => item.id === targetId) : -1;
  if (matchedIndex < 0 && existing.length >= MAX_DRAFTS) {
    throw new Error("Local draft limit reached (" + MAX_DRAFTS + "). Delete an older draft before saving a new one.");
  }
  const resolvedId = matchedIndex >= 0 ? targetId : (targetId || crypto.randomUUID());
  const detectedBg = findVideoBackground(cleanHtml);
  const draft = normalizeDraft({
    id: resolvedId,
    title: normalizeTemplateTitle(title, "Untitled invitation"),
    html: cleanHtml,
    kind,
    mode: mode || (templateId ? "edit" : kind === "video" ? "video-new" : "new"),
    templateId,
    templateCategory,
    templateRevision,
    videoBackgroundId: hasVideoRef ? videoBackgroundId.toLowerCase() : detectedBg?.id || null,
    videoBackgroundUrl: videoBackgroundUrl || detectedBg?.url || null,
    autoSaved: Boolean(autoSaved),
    savedAt: new Date().toISOString()
  });
  const list = [draft, ...existing.filter(item => item.id !== resolvedId)];
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new Error("Browser storage is full. Download or delete older drafts before saving.");
  }
  return draft;
}

export function deleteDraft(id) {
  const existing = readDrafts();
  const found = existing.some(item => item.id === id);
  if (found) localStorage.setItem(KEY, JSON.stringify(existing.filter(item => item.id !== id)));
  return found;
}
