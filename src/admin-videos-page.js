import { findDraftsForVideo } from "./admin-draft-store.js";
import { normalizeAssetDisplayName } from "./template-metadata.js";

const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const key = document.querySelector("#video-library-key");
const load = document.querySelector("#video-library-load");
const reconcile = document.querySelector("#video-library-reconcile");
const status = document.querySelector("#video-library-status");
const list = document.querySelector("#video-library-list");
const searchInput = document.querySelector("#video-search");
const filterButtons = [...document.querySelectorAll("[data-video-filter]")];
const paginationBar = document.querySelector("#video-pagination");
const pageSummary = document.querySelector("#video-page-summary");
const prevButton = document.querySelector("#video-prev");
const nextButton = document.querySelector("#video-next");

const renameDialog = document.querySelector("#rename-video-dialog");
const renameForm = document.querySelector("#rename-video-form");
const renameInput = document.querySelector("#rename-video-input");
const renameError = document.querySelector("#rename-video-error");
const renameCancel = document.querySelector("#rename-video-cancel");
const renameSave = document.querySelector("#rename-video-save");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 12;
let allVideos = [];
let activeFilter = "all";
let currentPage = 1;
let renameTarget = null;

renameCancel?.addEventListener("click", () => renameDialog.close());

function syncFilterButtons() {
  for (const btn of filterButtons) {
    btn.setAttribute("aria-pressed", String(btn.dataset.videoFilter === activeFilter));
  }
}
syncFilterButtons();

async function readError(response) {
  try {
    const json = await response.json();
    return typeof json.error === "string" ? json.error : "Request failed (HTTP " + response.status + ").";
  } catch {
    return "Request failed (HTTP " + response.status + ").";
  }
}

function resolveDisplayLabel(item, linkedTemplates, linkedDrafts) {
  if (item.displayName) return item.displayName;
  if (linkedTemplates.length) return "Video for " + linkedTemplates[0].title;
  if (linkedDrafts.length) return "Draft video · " + linkedDrafts[0].title;
  return "Background video · " + item.id.slice(0, 8);
}

function enrichedVideos() {
  return allVideos.map(item => {
    const linkedTemplates = Array.isArray(item.linkedTemplates) ? item.linkedTemplates : [];
    const linkedDrafts = findDraftsForVideo(item.id);
    const label = resolveDisplayLabel(item, linkedTemplates, linkedDrafts);
    return { ...item, linkedTemplates, linkedDrafts, label };
  });
}

function filteredVideos() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  return enrichedVideos().filter(item => {
    if (activeFilter === "linked" && item.linkedTemplates.length === 0) return false;
    if (activeFilter === "draft" && item.linkedDrafts.length === 0) return false;
    if (activeFilter === "unreferenced" && (item.linkedTemplates.length > 0 || item.linkedDrafts.length > 0)) return false;
    if (query) {
      const hay = [
        item.label, item.displayName || "", item.id,
        ...item.linkedTemplates.map(t => t.title),
        ...item.linkedDrafts.map(d => d.title)
      ].join(" ").toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function pauseOtherVideos(active) {
  for (const el of list.querySelectorAll("video")) {
    if (el !== active && !el.paused) el.pause();
  }
}

function renderVideos() {
  list.replaceChildren();
  const items = filteredVideos();
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = items.slice(start, start + PAGE_SIZE);

  if (!allVideos.length) {
    paginationBar.hidden = true;
    return;
  }
  status.textContent = items.length
    ? "Showing " + items.length + " video asset(s) (out of " + allVideos.length + " total)."
    : "No video assets match the current search or filter.";
  paginationBar.hidden = items.length <= PAGE_SIZE;
  if (!paginationBar.hidden) {
    pageSummary.textContent = "Page " + currentPage + " of " + totalPages + " · " + items.length + " assets";
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  }

  for (const item of pageItems) {
    const card = document.createElement("article");
    card.className = "admin-item";

    const preview = document.createElement("video");
    preview.src = API_ROOT + "/api/video-backgrounds/" + item.id;
    preview.controls = true;
    preview.muted = true;
    preview.playsInline = true;
    preview.preload = "none";
    preview.setAttribute("aria-label", "Preview " + item.label);
    preview.addEventListener("play", () => pauseOtherVideos(preview));

    const badges = document.createElement("div");
    badges.className = "admin-badges";
    const providerBadge = document.createElement("span");
    providerBadge.className = "admin-badge gold";
    providerBadge.textContent = item.provider === "cloudinary" ? "Cloudinary" : "MongoDB GridFS";
    badges.append(providerBadge);

    if (item.linkedTemplates.length) {
      const linkedBadge = document.createElement("span");
      linkedBadge.className = "admin-badge green";
      linkedBadge.textContent = "Linked to " + item.linkedTemplates.length + " template(s)";
      badges.append(linkedBadge);
    }
    if (item.linkedDrafts.length) {
      const draftBadge = document.createElement("span");
      draftBadge.className = "admin-badge";
      draftBadge.textContent = "Used in " + item.linkedDrafts.length + " local draft(s)";
      badges.append(draftBadge);
    }
    if (!item.linkedTemplates.length && !item.linkedDrafts.length) {
      const unrefBadge = document.createElement("span");
      unrefBadge.className = "admin-badge";
      unrefBadge.textContent = "Unreferenced asset";
      badges.append(unrefBadge);
    }

    const title = document.createElement("h3");
    title.textContent = item.label;

    const text = document.createElement("p");
    const date = item.uploadedAt ? new Date(item.uploadedAt) : null;
    text.textContent = [
      Number.isFinite(item.bytes) ? (item.bytes / 1048576).toFixed(1) + " MB" : "Unknown size",
      (!date || Number.isNaN(date.getTime())) ? "Unknown date" : date.toLocaleString(),
      item.status === "ready" ? "Available" : item.status === "deleting" ? "Deletion incomplete — retry" : "Recovery needed",
      "UUID: " + item.id.slice(0, 8) + "…"
    ].join(" · ");

    const refsList = document.createElement("ul");
    refsList.className = "admin-meta-list";
    for (const tpl of item.linkedTemplates) {
      const li = document.createElement("li");
      li.textContent = "Template: " + tpl.title + " (" + tpl.category + ")";
      refsList.append(li);
    }
    for (const draft of item.linkedDrafts) {
      const li = document.createElement("li");
      li.textContent = "Local draft: " + draft.title;
      refsList.append(li);
    }

    const actions = document.createElement("div");
    actions.className = "admin-item-actions";

    const rename = document.createElement("button");
    rename.type = "button";
    rename.textContent = "Rename";
    rename.addEventListener("click", () => {
      renameTarget = item;
      renameInput.value = item.displayName || item.label;
      renameError.hidden = true;
      renameError.textContent = "";
      renameDialog.showModal();
      renameInput.focus();
    });
    actions.append(rename);

    if (item.linkedTemplates.length === 1) {
      const editLinked = document.createElement("a");
      editLinked.className = "button-link";
      editLinked.textContent = "Edit linked template";
      editLinked.href = "/admin.html?edit=" + encodeURIComponent(item.linkedTemplates[0].id);
      actions.append(editLinked);
    } else if (item.linkedTemplates.length > 1) {
      const editLatest = document.createElement("a");
      editLatest.className = "button-link";
      editLatest.textContent = "Edit template (" + item.linkedTemplates[0].title.slice(0, 14) + "…)";
      editLatest.href = "/admin.html?edit=" + encodeURIComponent(item.linkedTemplates[0].id);
      actions.append(editLatest);
    }

    if (item.status === "ready") {
      const use = document.createElement("a");
      use.className = "button-link";
      use.textContent = "Use in Studio (New)";
      use.href = "/admin.html?video=" + encodeURIComponent(item.id);
      actions.append(use);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = item.status === "deleting" ? "Retry Deletion" : "Delete";
    remove.addEventListener("click", async () => {
      const answer = window.prompt(
        'Permanently delete "' + item.label + '" MP4 and its MongoDB asset record? Published templates are protected; browser-local drafts cannot be checked automatically. Type DELETE to confirm.'
      );
      if (answer !== "DELETE") return;
      remove.disabled = true;
      remove.setAttribute("aria-busy", "true");
      status.className = "status";
      status.textContent = "Checking template dependencies and deleting video…";
      try {
        const response = await fetch(API_ROOT + "/api/admin/video-backgrounds/" + item.id, {
          method: "DELETE", headers: { "X-Admin-Key": key.value.trim() }
        });
        if (!response.ok) throw new Error(await readError(response));
        await loadVideos();
        status.className = "status success";
        status.textContent = "Video deleted from storage and its MongoDB record removed.";
      } catch (error) {
        status.className = "status error";
        status.textContent = error instanceof Error ? error.message : "Video deletion failed.";
      } finally { remove.disabled = false; remove.removeAttribute("aria-busy"); }
    });
    actions.append(remove);

    card.append(preview, badges, title, text);
    if (refsList.children.length) card.append(refsList);
    card.append(actions);
    list.append(card);
  }
}

async function loadVideos() {
  if (!key.value.trim()) { status.textContent = "Enter your admin key first."; key.focus(); return; }
  load.disabled = true;
  load.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Loading managed video assets…";
  list.replaceChildren();
  paginationBar.hidden = true;
  try {
    const response = await fetch(API_ROOT + "/api/admin/video-backgrounds", {
      headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json();
    allVideos = (Array.isArray(result.videos) ? result.videos : []).filter(
      video => UUID.test(video.id)
    );
    currentPage = 1;
    if (!allVideos.length) {
      status.textContent = "No recorded videos found. Use Recover Cloudinary uploads if an older upload is missing.";
    } else {
      renderVideos();
    }
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Video inventory unavailable.";
  } finally {
    load.disabled = false;
    load.removeAttribute("aria-busy");
  }
}

renameForm?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!renameTarget) return;
  const nextName = normalizeAssetDisplayName(renameInput.value, "");
  if (!nextName) {
    renameError.hidden = false;
    renameError.textContent = "Enter a valid display name.";
    renameInput.focus();
    return;
  }
  renameSave.disabled = true;
  renameSave.setAttribute("aria-busy", "true");
  renameError.hidden = true;
  try {
    const response = await fetch(API_ROOT + "/api/admin/video-backgrounds/" + encodeURIComponent(renameTarget.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key.value.trim() },
      body: JSON.stringify({ displayName: nextName })
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    const target = allVideos.find(v => v.id === renameTarget.id);
    if (target) target.displayName = data.video?.displayName || nextName;
    renameDialog.close();
    renderVideos();
    status.className = "status success";
    status.textContent = 'Asset label updated to "' + nextName + '". Cloudinary public ID and URL remain unchanged.';
  } catch (error) {
    renameError.hidden = false;
    renameError.textContent = error instanceof Error ? error.message : "Rename failed.";
  } finally {
    renameSave.disabled = false;
    renameSave.removeAttribute("aria-busy");
  }
});

reconcile.addEventListener("click", async () => {
  if (!key.value.trim()) { status.textContent = "Enter your admin key first."; key.focus(); return; }
  reconcile.disabled = true;
  reconcile.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Checking Cloudinary for missing MongoDB records…";
  try {
    const response = await fetch(API_ROOT + "/api/admin/video-backgrounds/reconcile", {
      method: "POST", headers: { "X-Admin-Key": key.value.trim() }
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json();
    await loadVideos();
    status.className = "status success";
    status.textContent = "Checked " + result.checked + " Cloudinary video(s), recovered " +
      result.recovered + " missing MongoDB record(s).";
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Cloudinary recovery failed.";
  } finally { reconcile.disabled = false; reconcile.removeAttribute("aria-busy"); }
});

for (const btn of filterButtons) {
  btn.addEventListener("click", () => {
    activeFilter = btn.dataset.videoFilter || "all";
    syncFilterButtons();
    currentPage = 1;
    renderVideos();
  });
}
searchInput?.addEventListener("input", () => { currentPage = 1; renderVideos(); });
prevButton?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderVideos(); } });
nextButton?.addEventListener("click", () => { currentPage++; renderVideos(); });

load.addEventListener("click", () => { void loadVideos(); });
key.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); void loadVideos(); }
});
