import { getDraft, saveDraft } from "./admin-draft-store.js";
import { buildVideoInvitationSource } from "./admin-video-html.js";
import { analyzeVideoVisual } from "./video-visual-analyzer.js";
import { findVideoBackground } from "./video-html-contract.js";

// Isolated workspace handoff. Existing analysis, preview and export controllers
// remain the only owners of template preparation.
const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const params = new URLSearchParams(window.location.search);
const codeInput = document.querySelector("#code-input");
const videoCode = document.querySelector("#video-html-code");
const titleInput = document.querySelector("#video-html-title");
const codeTab = document.querySelector("#via-code-tab");
const videoTab = document.querySelector("#via-video-tab");
const analyzeCode = document.querySelector("#analyze-code");
const analyzeVideo = document.querySelector("#video-html-analyze");
const saveButton = document.querySelector("#admin-save-draft");
const notice = document.querySelector("#admin-edit-notice");
const noticeLabel = document.querySelector("#admin-edit-message");
const editKey = document.querySelector("#admin-edit-key");
const loadEdit = document.querySelector("#admin-load-edit");
const mainAdminKey = document.querySelector("#admin-api-key");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

function showMessage(message) {
  notice.hidden = false;
  noticeLabel.textContent = message;
}

function loadSource(source, kind) {
  if (!source || !source.trim()) throw new Error("Empty invitation source.");
  if (codeInput.value.trim() && !window.confirm("Replace the current invitation code in this workspace?")) return;
  if (kind === "video") {
    const background = findVideoBackground(source);
    if (background && background.origin !== new URL(API_ROOT).origin) {
      // Old published templates may refer to a different configured renderer
      // origin. Keep the original source unchanged and allow code-mode analysis.
      codeTab.click();
      codeInput.value = source;
      analyzeCode.click();
      showMessage("Original video host differs from the current renderer. Source loaded unchanged in Via Code; check preview before updating.");
      return;
    }
    videoTab.click();
    videoCode.value = source;
    // Existing Video + HTML analyzer enforces the trusted media URL contract.
    analyzeVideo.click();
  } else {
    codeTab.click();
    codeInput.value = source;
    analyzeCode.click();
  }
}

saveButton?.addEventListener("click", () => {
  const videoSelected = !document.querySelector("#video-html-panel").hidden;
  const source = videoSelected ? videoCode.value : codeInput.value;
  const name = window.prompt("Name this local draft (HTML source only; video files are not saved in drafts):",
    videoSelected ? titleInput.value : "Untitled Invitation");
  if (name === null) return;
  try {
    const draft = saveDraft({
      title: name,
      html: source,
      kind: videoSelected ? "video" : "html"
    });
    showMessage('Draft "' + draft.title + '" saved locally in this browser. Open the Drafts page to continue editing.');
  } catch (error) {
    showMessage(error instanceof Error ? error.message : "Could not save draft.");
  }
});

const draftId = params.get("draft");
if (draftId) {
  const draft = getDraft(draftId);
  if (!draft) showMessage("This draft is not available in this browser.");
  else {
    loadSource(draft.html, draft.kind);
    showMessage('Loaded local draft "' + draft.title + '". It has not been published.');
  }
}

const videoId = params.get("video");
if (UUID.test(videoId || "")) {
  void (async () => {
    const url = API_ROOT + "/api/video-backgrounds/" + videoId;
    showMessage("Analyzing the previously uploaded video. No re-upload needed…");
    try {
      const visualAnalysis = await analyzeVideoVisual(url, percent => {
        showMessage("Analyzing saved video for readable invitation placement: " + percent + "%");
      }, { ai: { adminKey: mainAdminKey?.value.trim(), apiRoot: API_ROOT } });
      const source = buildVideoInvitationSource({
        id: videoId, url, title: titleInput.value || "Video Invitation", visualAnalysis
      });
      loadSource(source, "video");
      showMessage("Saved video analyzed. Text starts at " + visualAnalysis.revealAt.toFixed(1) +
        "s; confidence " + visualAnalysis.confidence + ". " +
        (visualAnalysis.warnings.join(" ") || "Review the full invitation before publishing."));
    } catch (error) {
      showMessage("Automatic analysis of the saved video failed: " +
        (error instanceof Error ? error.message : "Video frames unavailable.") +
        " No source code was replaced. Check that the renderer is running and the stored video plays.");
    }
  })();
}

const editId = params.get("edit");
if (OBJECT_ID.test(editId || "")) {
  showMessage("Editing a published template. Enter your Admin key to load it securely.");
  editKey.hidden = false;
  loadEdit.hidden = false;
  loadEdit.addEventListener("click", async () => {
    const key = editKey.value.trim();
    if (!key) { showMessage("Enter the Admin key before loading this template."); editKey.focus(); return; }
    loadEdit.disabled = true;
    showMessage("Loading the published invitation for editing…");
    try {
      const response = await fetch(API_ROOT + "/api/admin/templates/" + editId, {
        headers: { "X-Admin-Key": key }, cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load template.");
      const template = result.template;
      const kind = /<video\b[^>]*data-wedding-background\s*=/i.test(template.html)
        ? "video" : "html";
      loadSource(template.html, kind);
      document.documentElement.dataset.editTemplateId = editId;
      document.documentElement.dataset.editTemplateCategory = template.category;
      mainAdminKey.value = key;
      mainAdminKey.dispatchEvent(new Event("input", { bubbles: true }));
      document.querySelector("#publish-confirm").textContent = "Update existing template";
      document.querySelector("#publish-template").textContent = "Review & update template";
      editKey.hidden = true;
      loadEdit.hidden = true;
      showMessage('Editing "' + template.title + '". Analyze, preview, validate and export before saving the update.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Unable to load published template.");
    } finally { loadEdit.disabled = false; }
  });
  editKey.addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); loadEdit.click(); }
  });
}
