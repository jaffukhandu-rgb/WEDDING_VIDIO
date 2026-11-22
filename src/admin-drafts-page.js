import { readDrafts, deleteDraft } from "./admin-draft-store.js";

const list = document.querySelector("#draft-list");
const status = document.querySelector("#draft-status");

function render() {
  list.replaceChildren();
  const drafts = readDrafts();
  status.textContent = drafts.length
    ? drafts.length + " draft(s) stored in this browser."
    : "No drafts yet. Open Workspace and select Save Draft to keep unfinished HTML locally.";
  for (const draft of drafts) {
    const card = document.createElement("article");
    card.className = "admin-item";
    const title = document.createElement("h3");
    title.textContent = draft.title;
    const meta = document.createElement("p");
    const saved = new Date(draft.savedAt);
    meta.textContent = (draft.kind === "video" ? "Video + HTML" : "HTML only") +
      " · " + (Number.isNaN(saved.getTime()) ? "Date unavailable" : saved.toLocaleString());
    const actions = document.createElement("div");
    actions.className = "admin-item-actions";
    const edit = document.createElement("a");
    edit.className = "button-link";
    edit.href = "/admin.html?draft=" + encodeURIComponent(draft.id);
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
    card.append(title, meta, actions);
    list.append(card);
  }
}

render();
