import { readDrafts, deleteDraft } from "./admin-draft-store.js";

const list = document.querySelector("#draft-list");
const status = document.querySelector("#draft-status");

function render() {
  list.replaceChildren();
  const drafts = readDrafts();
  status.textContent = drafts.length
    ? drafts.length + " draft(s) stored in this browser."
    : "No drafts yet. Open Workspace and edit or upload a template to save drafts locally.";
  for (const draft of drafts) {
    const card = document.createElement("article");
    card.className = "admin-item";

    const badges = document.createElement("div");
    badges.className = "admin-badges";
    const kindBadge = document.createElement("span");
    kindBadge.className = "admin-badge gold";
    kindBadge.textContent = draft.kind === "video" ? "Video + HTML" : "HTML";
    const modeBadge = document.createElement("span");
    modeBadge.className = "admin-badge" + (draft.templateId ? " green" : "");
    modeBadge.textContent = draft.templateId ? "Published template edit" : "New invitation";
    badges.append(kindBadge, modeBadge);
    if (draft.autoSaved) {
      const autoBadge = document.createElement("span");
      autoBadge.className = "admin-badge";
      autoBadge.textContent = "Autosaved";
      badges.append(autoBadge);
    }

    const title = document.createElement("h3");
    title.textContent = draft.title;

    const meta = document.createElement("p");
    const saved = new Date(draft.savedAt);
    const parts = [Number.isNaN(saved.getTime()) ? "Date unavailable" : saved.toLocaleString()];
    if (draft.templateId) parts.push("Template ID: " + draft.templateId.slice(0, 8) + "…");
    if (draft.videoBackgroundId) parts.push("Video: " + draft.videoBackgroundId.slice(0, 8) + "…");
    if (!draft.html.trim() && draft.videoBackgroundId) parts.push("Video selected (HTML pending)");
    meta.textContent = parts.join(" · ");

    const actions = document.createElement("div");
    actions.className = "admin-item-actions";
    const edit = document.createElement("a");
    edit.className = "button-link";
    const query = new URLSearchParams({ draft: draft.id });
    if (draft.templateId) query.set("edit", draft.templateId);
    edit.href = "/admin.html?" + query.toString();
    edit.textContent = "Continue Editing";

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.type = "button";
    remove.textContent = "Delete Draft";
    remove.addEventListener("click", () => {
      if (!window.confirm('Delete local draft "' + draft.title + '"? This cannot be undone.')) return;
      try { deleteDraft(draft.id); render(); }
      catch { status.textContent = "Could not remove draft from browser storage."; }
    });
    actions.append(edit, remove);
    card.append(badges, title, meta, actions);
    list.append(card);
  }
}

render();
