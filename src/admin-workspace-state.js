import { deleteDraft, getDraft, saveDraft } from "./admin-draft-store.js";
import { buildVideoInvitationSource, describeVideoTiming } from "./admin-video-html.js";
import { analyzeVideoVisual } from "./video-visual-analyzer.js";
import { findVideoBackground } from "./video-html-contract.js";
import { isEquivalentRendererOrigin, normalizeTemplateTitle } from "./template-metadata.js";

// Workspace handoff, mode clarity, published Video + HTML loading, and debounced
// local autosave. Existing analysis, preview, and delivery controllers remain the
// sole owners of template validation and API publication.
const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const params = new URLSearchParams(window.location.search);
const codeInput = document.querySelector("#code-input");
const videoCode = document.querySelector("#video-html-code");
const titleInput = document.querySelector("#video-html-title");
const workspaceTitle = document.querySelector("#workspace-template-title");
const modePill = document.querySelector("#workspace-mode-pill");
const bgBadge = document.querySelector("#workspace-background-badge");
const autosaveStatus = document.querySelector("#draft-autosave-status");
const newButton = document.querySelector("#workspace-new");
const codeTab = document.querySelector("#via-code-tab");
const videoTab = document.querySelector("#via-video-tab");
const videoPanel = document.querySelector("#video-html-panel");
const analyzeCode = document.querySelector("#analyze-code");
const analyzeVideo = document.querySelector("#video-html-analyze");
const clearCode = document.querySelector("#clear-code");
const saveButton = document.querySelector("#admin-save-draft");
const notice = document.querySelector("#admin-edit-notice");
const noticeLabel = document.querySelector("#admin-edit-message");
const editKey = document.querySelector("#admin-edit-key");
const loadEdit = document.querySelector("#admin-load-edit");
const retryEdit = document.querySelector("#admin-edit-retry");
const mainAdminKey = document.querySelector("#admin-api-key");
const publishConfirmBtn = document.querySelector("#publish-confirm");
const publishTemplateBtn = document.querySelector("#publish-template");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

let activeDraftId = null;
let workspaceMode = "new"; // "new" | "draft" | "edit" | "video-new"
let pendingVideoId = null;
let pendingVideoUrl = null;
let dirtyForAutosave = false;
let autosaveTimer = null;
let suppressAutosave = false;

function showMessage(message) {
  if (!notice || !noticeLabel) return;
  notice.hidden = false;
  noticeLabel.textContent = message;
}

function setAutosaveText(message, tone = "") {
  if (!autosaveStatus) return;
  autosaveStatus.textContent = message;
  autosaveStatus.className = "draft-status-pill" + (tone ? " " + tone : "");
}

function currentSourceAndKind() {
  const isVideo = Boolean(videoPanel && !videoPanel.hidden);
  const videoBg = findVideoBackground(isVideo ? videoCode?.value : codeInput?.value);
  return {
    kind: isVideo || videoBg ? "video" : "html",
    html: isVideo ? (videoCode?.value || "") : (codeInput?.value || ""),
    videoBg
  };
}

function updateModeUi() {
  const { videoBg } = currentSourceAndKind();
  const editId = document.documentElement.dataset.editTemplateId || "";
  const bgId = videoBg?.id || pendingVideoId || null;

  if (modePill) {
    modePill.textContent = editId
      ? (activeDraftId ? "Editing published template (autosaved draft)" : "Editing published template")
      : workspaceMode === "video-new"
        ? "Reusing uploaded background"
        : activeDraftId
          ? "Continuing local draft"
          : "Creating new invitation";
  }

  if (bgBadge) {
    if (bgId) {
      bgBadge.classList.remove("hide");
      bgBadge.textContent = "Background video: " + bgId.slice(0, 8) + "…";
      bgBadge.title = bgId;
    } else {
      bgBadge.classList.add("hide");
      bgBadge.textContent = "";
    }
  }

  if (publishConfirmBtn && publishTemplateBtn) {
    publishConfirmBtn.textContent = editId ? "Update existing template" : "Publish to MongoDB";
    publishTemplateBtn.textContent = editId ? "Review & update template" : "Choose category & publish";
  }
}

function syncUrlParams() {
  if (typeof window === "undefined" || !window.history?.replaceState) return;
  const next = new URLSearchParams();
  const editId = document.documentElement.dataset.editTemplateId;
  if (editId && OBJECT_ID.test(editId)) next.set("edit", editId);
  if (activeDraftId) next.set("draft", activeDraftId);
  if (!editId && !activeDraftId && pendingVideoId) next.set("video", pendingVideoId);
  const query = next.toString();
  const target = window.location.pathname + (query ? "?" + query : "");
  window.history.replaceState(null, "", target);
}

function syncTitles(fromInput) {
  const val = fromInput?.value ?? "";
  if (fromInput === workspaceTitle && titleInput && titleInput.value !== val) {
    titleInput.value = val;
  } else if (fromInput === titleInput && workspaceTitle && workspaceTitle.value !== val) {
    workspaceTitle.value = val;
  }
}

function loadSource(source, kind, { force = false, title = "", preserveEdit = false } = {}) {
  if (!source || !source.trim()) throw new Error("Empty invitation source.");
  const existing = (codeInput?.value || "").trim() || (videoCode?.value || "").trim();
  if (!force && existing && existing !== source.trim() &&
      !window.confirm("Replace the current invitation code in this workspace?")) {
    return false;
  }
  suppressAutosave = true;
  try {
    if (!preserveEdit) {
      delete document.documentElement.dataset.editTemplateId;
      delete document.documentElement.dataset.editTemplateCategory;
      delete document.documentElement.dataset.editTemplateRevision;
    }
    if (title && workspaceTitle) {
      workspaceTitle.value = normalizeTemplateTitle(title, "");
      if (preserveEdit) workspaceTitle.dataset.userEdited = "1";
      else delete workspaceTitle.dataset.userEdited;
      syncTitles(workspaceTitle);
    }
    const background = findVideoBackground(source);
    if (kind === "video" || background) {
      const apiOrigin = new URL(API_ROOT).origin;
      if (background && !isEquivalentRendererOrigin(background.origin, apiOrigin)) {
        // Legacy templates from another host: preserve the exact Video + HTML source
        // in Via Code if the video host differs, or let admin inspect without regenerating.
        codeTab?.click();
        if (codeInput) codeInput.value = source;
        if (videoCode) videoCode.value = source;
        analyzeCode?.click();
        showMessage("Original video host (" + background.origin + ") differs from current renderer (" +
          apiOrigin + "). Source loaded unchanged in Via Code; check preview before updating.");
        return true;
      }
      videoTab?.click();
      if (videoCode) videoCode.value = source;
      if (codeInput) codeInput.value = source;
      if (background && isEquivalentRendererOrigin(background.origin, apiOrigin) && background.origin !== apiOrigin) {
        // Keep Video + HTML analyze button happy when localhost vs 127.0.0.1 is used locally.
        codeInput.dispatchEvent(new Event("input", { bubbles: true }));
        analyzeCode?.click();
      } else {
        analyzeVideo?.click();
      }
    } else {
      codeTab?.click();
      if (codeInput) codeInput.value = source;
      analyzeCode?.click();
    }
    return true;
  } finally {
    suppressAutosave = false;
  }
}

function persistDraft({ manual = false, customTitle = null } = {}) {
  if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
  const { kind, html } = currentSourceAndKind();
  const bgId = findVideoBackground(html)?.id || pendingVideoId;
  const bgUrl = findVideoBackground(html)?.url || pendingVideoUrl;
  if (!html.trim() && !bgId) {
    if (manual) showMessage("Enter invitation code or upload a video before saving a draft.");
    return null;
  }
  const resolvedTitle = normalizeTemplateTitle(
    customTitle ?? (workspaceTitle?.value || titleInput?.value || ""),
    "Untitled invitation"
  );
  setAutosaveText("Saving draft…");
  try {
    const draft = saveDraft({
      id: activeDraftId,
      title: resolvedTitle,
      html,
      kind,
      mode: document.documentElement.dataset.editTemplateId
        ? "edit" : (bgId && !html.trim() ? "video-new" : kind === "video" ? "video-new" : "new"),
      templateId: document.documentElement.dataset.editTemplateId || null,
      templateCategory: document.documentElement.dataset.editTemplateCategory || null,
      templateRevision: document.documentElement.dataset.editTemplateRevision || null,
      videoBackgroundId: bgId,
      videoBackgroundUrl: bgUrl,
      autoSaved: !manual
    });
    activeDraftId = draft.id;
    dirtyForAutosave = false;
    syncUrlParams();
    updateModeUi();
    const timeLabel = new Date(draft.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAutosaveText("Draft saved locally in this browser · " + timeLabel, "good");
    return draft;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Could not save local draft.";
    setAutosaveText("Draft save failed: " + msg, "error");
    if (manual) showMessage(msg);
    return null;
  }
}

function scheduleAutosave() {
  if (suppressAutosave) return;
  const { html } = currentSourceAndKind();
  if (!html.trim() && !pendingVideoId) return;
  dirtyForAutosave = true;
  setAutosaveText("Unsaved local changes…");
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => { persistDraft({ manual: false }); }, 700);
}

function flushAutosave() {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    persistDraft({ manual: false });
  } else if (dirtyForAutosave) {
    persistDraft({ manual: false });
  }
}

// Track meaningful edits across code, video source, titles, and permanent master defaults.
for (const el of [codeInput, videoCode]) {
  el?.addEventListener("input", scheduleAutosave);
}
for (const el of [workspaceTitle, titleInput]) {
  el?.addEventListener("input", () => {
    if (workspaceTitle) workspaceTitle.dataset.userEdited = el.value.trim() ? "1" : "";
    syncTitles(el);
    scheduleAutosave();
  });
}
codeInput?.addEventListener("wedding:master-defaults-saved", () => {
  dirtyForAutosave = true;
  persistDraft({ manual: false });
});
codeInput?.addEventListener("wedding:refine-video-design", () => {
  dirtyForAutosave = true;
  scheduleAutosave();
});
document.addEventListener("wedding:video-generated", event => {
  const detail = event.detail || {};
  if (detail.id) pendingVideoId = detail.id;
  if (detail.url) pendingVideoUrl = detail.url;
  dirtyForAutosave = true;
  persistDraft({ manual: false });
});

// Flush pending autosave on navigation, tab hide, or page exit.
window.addEventListener("pagehide", flushAutosave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushAutosave();
});
for (const link of document.querySelectorAll(".admin-sidebar nav a")) {
  link.addEventListener("click", flushAutosave);
}

// Clear only the matching draft after a confirmed publish or update.
document.addEventListener("wedding:template-published", event => {
  const saved = event.detail || {};
  if (saved.title && workspaceTitle) {
    workspaceTitle.value = saved.title;
    syncTitles(workspaceTitle);
  }
  if (activeDraftId) {
    try { deleteDraft(activeDraftId); } catch {}
    activeDraftId = null;
  }
  dirtyForAutosave = false;
  if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
  workspaceMode = "edit";
  syncUrlParams();
  updateModeUi();
  setAutosaveText("Published cleanly · Local draft cleared", "good");
});

saveButton?.addEventListener("click", () => {
  const currentTitle = workspaceTitle?.value?.trim() || titleInput?.value?.trim() || "Untitled Invitation";
  const name = window.prompt("Name this local draft (HTML source only; video files are not saved in drafts):", currentTitle);
  if (name === null) return;
  if (workspaceTitle) {
    workspaceTitle.value = name.trim() || currentTitle;
    syncTitles(workspaceTitle);
  }
  const draft = persistDraft({ manual: true, customTitle: name });
  if (draft) {
    showMessage('Draft "' + draft.title + '" saved locally in this browser. Open Drafts anytime to continue.');
  }
});

newButton?.addEventListener("click", () => {
  const { html } = currentSourceAndKind();
  if ((html.trim() || pendingVideoId) && !window.confirm("Start a brand new invitation? Unsaved workspace edits will be cleared (saved drafts remain in Drafts).")) {
    return;
  }
  suppressAutosave = true;
  try {
    activeDraftId = null;
    pendingVideoId = null;
    pendingVideoUrl = null;
    dirtyForAutosave = false;
    if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
    delete document.documentElement.dataset.editTemplateId;
    delete document.documentElement.dataset.editTemplateCategory;
    delete document.documentElement.dataset.editTemplateRevision;
    if (workspaceTitle) {
      workspaceTitle.value = "";
      delete workspaceTitle.dataset.userEdited;
    }
    if (titleInput) titleInput.value = "Royal Wedding Film Invitation";
    if (videoCode) videoCode.value = "";
    clearCode?.click();
    if (notice) notice.hidden = true;
    workspaceMode = "new";
    syncUrlParams();
    updateModeUi();
    setAutosaveText("Local draft ready · Autosave starts when you edit");
  } finally {
    suppressAutosave = false;
  }
});

// Keep admin keys synced between the top Edit loader and Section 5 Export/Publish.
editKey?.addEventListener("input", () => {
  if (mainAdminKey && mainAdminKey.value !== editKey.value) {
    mainAdminKey.value = editKey.value;
    mainAdminKey.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
mainAdminKey?.addEventListener("input", () => {
  if (editKey && editKey.value !== mainAdminKey.value) {
    editKey.value = mainAdminKey.value;
  }
});

// Restore draft on load (?draft=...) or edit+draft (?edit=...&draft=...)
const draftId = params.get("draft");
if (draftId) {
  const draft = getDraft(draftId);
  if (!draft) {
    showMessage("This draft is not available in this browser.");
  } else {
    activeDraftId = draft.id;
    pendingVideoId = draft.videoBackgroundId;
    pendingVideoUrl = draft.videoBackgroundUrl;
    if (draft.templateId) {
      document.documentElement.dataset.editTemplateId = draft.templateId;
      if (draft.templateCategory) document.documentElement.dataset.editTemplateCategory = draft.templateCategory;
      if (draft.templateRevision) document.documentElement.dataset.editTemplateRevision = draft.templateRevision;
      workspaceMode = "edit";
    } else {
      workspaceMode = "draft";
    }
    if (draft.html.trim()) {
      loadSource(draft.html, draft.kind, { force: true, title: draft.title, preserveEdit: Boolean(draft.templateId) });
    } else if (draft.videoBackgroundId) {
      videoTab?.click();
      if (workspaceTitle) { workspaceTitle.value = draft.title; syncTitles(workspaceTitle); }
    }
    updateModeUi();
    setAutosaveText("Draft restored locally", "good");
    showMessage('Loaded local draft "' + draft.title + '". It stays in this browser until published.');
  }
}

// Reuse uploaded background video (?video=<uuid>) only when no draft was restored.
const videoId = params.get("video");
if (UUID.test(videoId || "") && !draftId) {
  workspaceMode = "video-new";
  pendingVideoId = videoId.toLowerCase();
  pendingVideoUrl = API_ROOT + "/api/video-backgrounds/" + pendingVideoId;
  updateModeUi();
  void (async () => {
    const url = pendingVideoUrl;
    showMessage("Analyzing the previously uploaded video. No re-upload needed…");
    try {
      const visualAnalysis = await analyzeVideoVisual(url, percent => {
        showMessage("Analyzing saved video for readable invitation placement: " + percent + "%");
      }); // Library handoff starts locally; enable AI and refine explicitly in the workspace.
      const source = buildVideoInvitationSource({
        id: pendingVideoId, url, title: workspaceTitle?.value || titleInput?.value || "Video Invitation", visualAnalysis
      });
      loadSource(source, "video", { force: true });
      dirtyForAutosave = true;
      persistDraft({ manual: false });
      showMessage("Saved video analyzed. " + describeVideoTiming(visualAnalysis) +
        " Analysis confidence: " + visualAnalysis.confidence + ". " +
        (visualAnalysis.warnings.join(" ") || "Review the full invitation before publishing."));
    } catch (error) {
      showMessage("Automatic analysis of the saved video failed: " +
        (error instanceof Error ? error.message : "Video frames unavailable.") +
        " No source code was replaced. Check that the renderer is running and the stored video plays.");
    }
  })();
}

// Load published template for editing (?edit=<24-hex>) when no draft already restored it.
const editId = params.get("edit");
if (OBJECT_ID.test(editId || "") && !draftId) {
  showMessage("Editing a published template. Enter your Admin key to load it securely.");
  if (editKey) { editKey.hidden = false; editKey.focus(); }
  if (loadEdit) loadEdit.hidden = false;

  const performLoadEdit = async () => {
    const key = (editKey?.value || mainAdminKey?.value || "").trim();
    if (!key) {
      showMessage("Enter the Admin key before loading this template.");
      editKey?.focus();
      return;
    }
    if (loadEdit) { loadEdit.disabled = true; loadEdit.setAttribute("aria-busy", "true"); }
    if (retryEdit) retryEdit.hidden = true;
    showMessage("Loading the published invitation for editing…");
    try {
      const response = await fetch(API_ROOT + "/api/admin/templates/" + editId, {
        headers: { "X-Admin-Key": key }, cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not load template (HTTP " + response.status + ").");
      const template = result.template;
      const kind = /<video\b[^>]*data-wedding-background\s*=/i.test(template.html) ? "video" : "html";
      const loaded = loadSource(template.html, kind, { title: template.title });
      if (!loaded) {
        showMessage("Kept existing workspace code. Click Load template again if you want to load the published template.");
        return;
      }
      document.documentElement.dataset.editTemplateId = editId;
      document.documentElement.dataset.editTemplateCategory = template.category;
      if (template.revision) document.documentElement.dataset.editTemplateRevision = template.revision;
      if (mainAdminKey) {
        mainAdminKey.value = key;
        mainAdminKey.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (editKey) editKey.hidden = true;
      if (loadEdit) loadEdit.hidden = true;
      if (retryEdit) retryEdit.hidden = true;
      workspaceMode = "edit";
      updateModeUi();
      showMessage('Editing "' + template.title + '". Edit HTML or permanent defaults, preview & validate, then save the update.');
    } catch (error) {
      if (retryEdit) retryEdit.hidden = false;
      showMessage(error instanceof Error ? error.message : "Unable to load published template.");
    } finally {
      if (loadEdit) { loadEdit.disabled = false; loadEdit.removeAttribute("aria-busy"); }
    }
  };

  loadEdit?.addEventListener("click", () => { void performLoadEdit(); });
  retryEdit?.addEventListener("click", () => { void performLoadEdit(); });
  editKey?.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); void performLoadEdit(); }
  });
}

updateModeUi();
