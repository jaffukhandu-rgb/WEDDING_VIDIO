import { prepareTemplate } from "./admin-engine.js";
import { normalizeTemplateTitle } from "./template-metadata.js";

const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const params = new URLSearchParams(window.location.search);
const initialKind = params.get("kind");

const key = document.querySelector("#library-key");
const loadButton = document.querySelector("#library-load");
const list = document.querySelector("#library-list");
const status = document.querySelector("#library-status");
const searchInput = document.querySelector("#templates-search");
const categorySelect = document.querySelector("#templates-category");
const filterButtons = [...document.querySelectorAll("[data-kind-filter]")];
const paginationBar = document.querySelector("#templates-pagination");
const pageSummary = document.querySelector("#templates-page-summary");
const prevButton = document.querySelector("#templates-prev");
const nextButton = document.querySelector("#templates-next");

const previewDialog = document.querySelector("#library-preview-dialog");
const previewFrame = document.querySelector("#library-preview-frame");
const previewHeading = document.querySelector("#library-preview-heading");
const previewClose = document.querySelector("#library-preview-close");

const renameDialog = document.querySelector("#rename-template-dialog");
const renameForm = document.querySelector("#rename-template-form");
const renameInput = document.querySelector("#rename-template-input");
const renameError = document.querySelector("#rename-template-error");
const renameCancel = document.querySelector("#rename-template-cancel");
const renameSave = document.querySelector("#rename-template-save");

previewClose?.addEventListener("click", () => previewDialog.close());
previewDialog?.addEventListener("close", () => { previewFrame.removeAttribute("srcdoc"); });
renameCancel?.addEventListener("click", () => renameDialog.close());

const PAGE_SIZE = 12;
let allTemplates = [];
let activeKind = ["html", "video"].includes(initialKind) ? initialKind : "all";
let currentPage = 1;
let renameTarget = null;

function syncFilterButtons() {
  for (const btn of filterButtons) {
    btn.setAttribute("aria-pressed", String(btn.dataset.kindFilter === activeKind));
  }
}
syncFilterButtons();

async function readError(response) {
  try {
    const result = await response.json();
    return typeof result.error === "string" ? result.error : "Request failed (HTTP " + response.status + ").";
  } catch {
    return "Request failed (HTTP " + response.status + ").";
  }
}

function filteredTemplates() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const cat = categorySelect?.value || "all";
  return allTemplates.filter(item => {
    if (activeKind !== "all" && item.kind !== activeKind) return false;
    if (cat !== "all" && item.category !== cat) return false;
    if (query) {
      const hay = [item.title, item.category, item.id, item.videoBackgroundId || ""].join(" ").toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderList() {
  list.replaceChildren();
  const items = filteredTemplates();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  if (!allTemplates.length) {
    paginationBar.hidden = true;
    return;
  }
  status.textContent = items.length
    ? "Showing " + items.length + " matching template(s) (out of " + allTemplates.length + " total)."
    : "No templates match the current search or filter.";
  paginationBar.hidden = items.length <= PAGE_SIZE;
  if (!paginationBar.hidden) {
    pageSummary.textContent = "Page " + currentPage + " of " + totalPages + " · " + items.length + " templates";
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }

  for (const template of pageItems) {
    const card = document.createElement("article");
    card.className = "admin-item";

    const badges = document.createElement("div");
    badges.className = "admin-badges";
    const typeBadge = document.createElement("span");
    typeBadge.className = "admin-badge gold";
    typeBadge.textContent = template.kind === "video" ? "Video + HTML" : "HTML";
    const catBadge = document.createElement("span");
    catBadge.className = "admin-badge";
    catBadge.textContent = template.category || "Uncategorized";
    const stateBadge = document.createElement("span");
    stateBadge.className = "admin-badge " + (template.status === "deleting" ? "warn" : "green");
    stateBadge.textContent = template.status === "deleting" ? "Deletion incomplete" : "Published";
    badges.append(typeBadge, catBadge, stateBadge);

    const title = document.createElement("h3");
    title.textContent = normalizeTemplateTitle(template.title, "Untitled template");

    const published = template.publishedAt ? new Date(template.publishedAt) : null;
    const dateLabel = (!published || Number.isNaN(published.getTime())) ? "Unknown date" : published.toLocaleDateString();
    const meta = document.createElement("p");
    const metaParts = [
      (template.sceneCount || 0) + " scenes",
      (template.eventCount || 0) + " events",
      (template.photoCount || 0) + " photo slots",
      dateLabel
    ];
    if (template.videoBackgroundId) metaParts.push("Video: " + template.videoBackgroundId.slice(0, 8) + "…");
    meta.textContent = metaParts.join(" · ");

    const actions = document.createElement("div");
    actions.className = "admin-item-actions";

    if (template.status !== "deleting") {
      const preview = document.createElement("button");
      preview.type = "button";
      preview.textContent = "Preview";
      preview.addEventListener("click", async () => {
        preview.disabled = true;
        preview.setAttribute("aria-busy", "true");
        status.className = "status";
        status.textContent = "Loading sandboxed template preview…";
        try {
          const response = await fetch(
            API_ROOT + "/api/admin/templates/" + encodeURIComponent(template.id), {
              headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
            }
          );
          if (!response.ok) throw new Error(await readError(response));
          const data = await response.json();
          if (!/<head\b/i.test(data.template.html)) {
            throw new Error("This template needs an HTML <head> for the sandbox media policy. Open Edit to correct it.");
          }
          previewHeading.textContent = normalizeTemplateTitle(data.template.title || template.title, "Template preview");
          previewFrame.srcdoc = prepareTemplate(data.template.html, {});
          previewDialog.showModal();
          status.textContent = "Preview opened. No changes were saved.";
        } catch (error) {
          status.className = "status error";
          status.textContent = error instanceof Error ? error.message : "Preview unavailable.";
        } finally {
          preview.disabled = false;
          preview.removeAttribute("aria-busy");
        }
      });

      const rename = document.createElement("button");
      rename.type = "button";
      rename.textContent = "Rename";
      rename.addEventListener("click", () => {
        renameTarget = template;
        renameInput.value = normalizeTemplateTitle(template.title, "");
        renameError.hidden = true;
        renameError.textContent = "";
        renameDialog.showModal();
        renameInput.focus();
      });

      const edit = document.createElement("a");
      edit.className = "button-link";
      edit.href = "/admin.html?edit=" + encodeURIComponent(template.id);
      edit.textContent = "Edit";

      actions.append(preview, rename, edit);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = template.status === "deleting" ? "Retry Deletion" : "Delete";
    remove.addEventListener("click", async () => {
      const displayTitle = normalizeTemplateTitle(template.title, "this template");
      const confirmation = window.prompt(
        'Delete "' + displayTitle + '" from MongoDB, and remove its background video from Cloudinary/GridFS if no other saved template uses it? Browser-local drafts may still refer to this video. Type DELETE to confirm.'
      );
      if (confirmation !== "DELETE") return;
      remove.disabled = true;
      remove.setAttribute("aria-busy", "true");
      status.className = "status";
      status.textContent = "Deleting template and checking whether its background is shared…";
      try {
        const response = await fetch(API_ROOT + "/api/admin/templates/" + encodeURIComponent(template.id), {
          method: "DELETE", headers: { "X-Admin-Key": key.value.trim() }
        });
        if (!response.ok) throw new Error(await readError(response));
        const result = await response.json();
        const notice = result.sharedReferences
          ? "Template deleted. Shared video retained because other templates still use it."
          : result.videoRemoved
            ? "Template and its unshared video deleted from MongoDB and video storage."
            : "Template deleted successfully.";
        await loadTemplates();
        status.className = "status success";
        status.textContent = notice;
      } catch (error) {
        status.className = "status error";
        status.textContent = error instanceof Error ? error.message : "Deletion failed.";
      } finally {
        remove.disabled = false;
        remove.removeAttribute("aria-busy");
      }
    });

    actions.append(remove);
    card.append(badges, title, meta, actions);
    list.append(card);
  }
}

async function loadTemplates() {
  if (!key.value.trim()) {
    status.textContent = "Enter your admin key to load templates.";
    key.focus();
    return;
  }
  loadButton.disabled = true;
  loadButton.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Loading all uploaded templates…";
  list.replaceChildren();
  paginationBar.hidden = true;
  try {
    const response = await fetch(API_ROOT + "/api/admin/templates", {
      headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    allTemplates = Array.isArray(data.templates) ? data.templates : [];
    currentPage = 1;
    if (!allTemplates.length) {
      status.textContent = "No published templates yet.";
    } else {
      renderList();
    }
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Could not load templates.";
  } finally {
    loadButton.disabled = false;
    loadButton.removeAttribute("aria-busy");
  }
}

renameForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!renameTarget) return;
  const nextTitle = renameInput.value.trim();
  if (!nextTitle) {
    renameError.hidden = false;
    renameError.textContent = "Enter a template display name.";
    renameInput.focus();
    return;
  }
  renameSave.disabled = true;
  renameSave.setAttribute("aria-busy", "true");
  renameError.hidden = true;
  try {
    const response = await fetch(API_ROOT + "/api/admin/templates/" + encodeURIComponent(renameTarget.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key.value.trim() },
      body: JSON.stringify({ title: nextTitle })
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    renameTarget.title = data.template?.title || nextTitle;
    renameDialog.close();
    renderList();
    status.className = "status success";
    status.textContent = 'Template renamed to "' + renameTarget.title + '" without modifying its HTML or media.';
  } catch (error) {
    renameError.hidden = false;
    renameError.textContent = error instanceof Error ? error.message : "Rename failed.";
  } finally {
    renameSave.disabled = false;
    renameSave.removeAttribute("aria-busy");
  }
});

for (const btn of filterButtons) {
  btn.addEventListener("click", () => {
    activeKind = btn.dataset.kindFilter || "all";
    syncFilterButtons();
    currentPage = 1;
    renderList();
  });
}
searchInput?.addEventListener("input", () => { currentPage = 1; renderList(); });
categorySelect?.addEventListener("change", () => { currentPage = 1; renderList(); });
prevButton?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderList(); } });
nextButton?.addEventListener("click", () => { currentPage++; renderList(); });

loadButton.addEventListener("click", () => { void loadTemplates(); });
key.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); void loadTemplates(); }
});
