// Local-only draft persistence. Never stores admin keys, customer uploads or MP4 bytes.
const KEY = "wedding_admin_drafts_v1";
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_DRAFTS = 12;

export function readDrafts() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(list)) return [];
    return list.filter(item =>
      item && typeof item.id === "string" && typeof item.html === "string" &&
      typeof item.title === "string" && ["video", "html"].includes(item.kind)
    ).slice(0, MAX_DRAFTS);
  } catch {
    return [];
  }
}

export function getDraft(id) {
  return readDrafts().find(item => item.id === id) || null;
}

export function saveDraft({ title, html, kind }) {
  if (typeof html !== "string" || !html.trim()) throw new Error("Enter invitation code before saving a draft.");
  if (new TextEncoder().encode(html).length > MAX_SOURCE_BYTES) {
    throw new Error("Draft HTML cannot exceed 1 MB.");
  }
  if (!["video", "html"].includes(kind)) throw new Error("Invalid draft type.");
  const id = crypto.randomUUID();
  const draft = {
    id,
    title: String(title || "Untitled invitation").trim().slice(0, 120) || "Untitled invitation",
    html,
    kind,
    savedAt: new Date().toISOString()
  };
  const list = [draft, ...readDrafts()].slice(0, MAX_DRAFTS);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    throw new Error("Browser storage is full. Download older drafts and remove some before saving.");
  }
  return draft;
}

export function deleteDraft(id) {
  const existing = readDrafts();
  const found = existing.some(item => item.id === id);
  if (found) localStorage.setItem(KEY, JSON.stringify(existing.filter(item => item.id !== id)));
  return found;
}
