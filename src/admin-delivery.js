import { findVideoBackground } from "./video-html-contract.js";

// Admin delivery: MP4 generation and publication. No key or customer media is persisted.
const API_ROOT = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

async function readMusicAsBase64(file) {
  if (!file) return {};
  if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
    throw new Error("Music must be smaller than 8 MB.");
  }
  const supported = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/webm"]);
  if (!supported.has(file.type)) throw new Error("Unsupported music format for MP4 export.");
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the music file."));
    reader.readAsDataURL(file);
  });
  const match = /^data:(audio\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid audio encoding.");
  return { audioMimeType: match[1], audioBase64: match[2] };
}

async function readApiError(response, fallback) {
  try {
    const json = await response.json();
    return typeof json.error === "string" ? json.error : fallback;
  } catch {
    return fallback;
  }
}

async function verifyMp4Metadata(video, url, expectedDuration) {
  await new Promise((resolve, reject) => {
    let timer;
    function cleanup() {
      clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onLoad);
      video.removeEventListener("error", onError);
    }
    function onLoad() { cleanup(); resolve(); }
    function onError() { cleanup(); reject(new Error("The generated MP4 cannot be opened by this browser.")); }
    video.addEventListener("loadedmetadata", onLoad);
    video.addEventListener("error", onError);
    timer = setTimeout(() => { cleanup(); reject(new Error("MP4 metadata loading timed out.")); }, 15000);
    video.src = url;
    video.load();
  });
  if (!Number.isFinite(video.duration) || !Number.isFinite(expectedDuration) ||
      Math.abs(video.duration - expectedDuration) > 1 ||
      video.videoWidth !== 540 || video.videoHeight !== 960) {
    throw new Error("MP4 dimensions or duration are incorrect. Expected 540×960 and " +
      expectedDuration.toFixed(2) + " seconds.");
  }
}

export function createAdminDelivery({ getState }) {
  const apiKey = document.querySelector("#admin-api-key");
  const exportButton = document.querySelector("#export-mp4");
  const exportStatus = document.querySelector("#export-status");
  const loader = document.querySelector("#render-loader");
  const loaderTrack = document.querySelector("#render-loader-track");
  const loaderFill = document.querySelector("#render-loader-fill");
  const loaderRunners = document.querySelector("#render-loader-runners");
  const loaderPercent = document.querySelector("#render-loader-percent");
  const loaderDetail = document.querySelector("#render-loader-detail");
  const exportResult = document.querySelector("#export-result");
  const exportVideo = document.querySelector("#export-video");
  const exportDownload = document.querySelector("#export-download");
  const publishButton = document.querySelector("#publish-template");
  const publishStatus = document.querySelector("#publish-status");
  const dialog = document.querySelector("#publish-dialog");
  const form = document.querySelector("#publish-form");
  const category = document.querySelector("#publish-category");
  const cancel = document.querySelector("#publish-cancel");
  const publishConfirm = document.querySelector("#publish-confirm");
  const musicInput = document.querySelector("#music-upload");

  let mp4Url = null;
  let mp4For = null;
  let revision = 0;
  let rendering = false;
  let publishing = false;

  function keyValue() {
    return apiKey.value.trim();
  }

  function currentReady() {
    const state = getState();
    return Boolean(state.html && !state.dirty);
  }

  function updateButtons() {
    const state = getState();
    const prepared = Boolean(state.html && !state.dirty);
    const hasVideo = Boolean(prepared && mp4For && mp4For === state.html);
    exportButton.disabled = rendering || publishing || !prepared;
    publishButton.disabled = rendering || publishing || !hasVideo ||
      !state.manualReviewed || !state.runtimePassed;
  }

  function discardVideo(message = "Prepare a preview to enable video export.") {
    revision++;
    if (mp4Url) URL.revokeObjectURL(mp4Url);
    mp4Url = null;
    mp4For = null;
    exportVideo.pause();
    exportVideo.removeAttribute("src");
    exportVideo.load();
    exportResult.classList.add("hide");
    exportDownload.removeAttribute("href");
    exportStatus.textContent = message;
    publishStatus.textContent = "Complete validation, review all scenes and generate an MP4 first.";
    updateButtons();
  }

  function showRenderProgress(percent, detail) {
    const progress = Math.max(0, Math.min(100, percent));
    loaderFill.style.width = progress + "%";
    loaderRunners.style.left = progress + "%";
    loaderTrack.setAttribute("aria-valuenow", String(progress));
    loaderPercent.textContent = progress + "%";
    loaderDetail.textContent = detail;
  }

  function formatRemaining(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "";
    if (seconds < 60) return " · About " + seconds + "s remaining";
    return " · About " + Math.floor(seconds / 60) + "m " + (seconds % 60) + "s remaining";
  }

  async function generateMp4() {
    const state = getState();
    if (rendering || publishing || !currentReady()) return;
    if (!keyValue()) {
      exportStatus.textContent = "Enter your Admin access key before exporting.";
      apiKey.focus();
      return;
    }
    discardVideo("Preparing MP4 export…");
    const requestedVersion = revision;
    rendering = true;
    loader.classList.remove("hide");
    showRenderProgress(0, "Preparing video renderer…");
    exportStatus.textContent = "Rendering at 540 × 960. Duration follows the source video. Keep this tab open.";
    updateButtons();
    let progressTimer;
    try {
      const audio = await readMusicAsBase64(musicInput.files?.[0]);
      const jobId = crypto.randomUUID();
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(API_ROOT + "/api/render/progress/" + jobId, {
            headers: { "X-Admin-Key": keyValue() },
            cache: "no-store"
          });
          if (!progressResponse.ok) return;
          const progress = await progressResponse.json();
          const percent = Math.min(99, Math.floor(100 * progress.frame / progress.totalFrames));
          const detail = progress.phase === "encoding" ? "Finishing video encoding…"
            : progress.phase === "delivering" ? "Preparing MP4 download…"
            : progress.phase === "rendering" ? "Rendered " + progress.frame + " / " + progress.totalFrames +
              " frames" + (progress.remainingSeconds == null ? " · Estimating…" : formatRemaining(progress.remainingSeconds))
            : "Preparing video renderer…";
          showRenderProgress(percent, detail);
        } catch {
          // Temporary progress-poll errors must not interrupt video export.
        }
      };
      progressTimer = setInterval(() => { void pollProgress(); }, 900);
      const response = await fetch(API_ROOT + "/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": keyValue(), "X-Render-Job": jobId },
        body: JSON.stringify({ html: state.html, ...audio })
      });
      if (!response.ok) throw new Error(await readApiError(response, "MP4 rendering failed."));
      const reportedDuration = response.headers.get("X-Render-Duration");
      // Old code-only renderers produced 30s clips; uploaded video templates
      // must use the new duration-aware renderer, not silently truncate.
      if (reportedDuration === null && findVideoBackground(state.html)) {
        throw new Error("Renderer is outdated: video duration metadata is missing. Update the renderer before exporting.");
      }
      const expectedDuration = reportedDuration === null ? 30 : Number(reportedDuration);
      if (!Number.isFinite(expectedDuration) || expectedDuration <= 0) {
        throw new Error("Renderer returned an invalid video duration.");
      }
      const blob = await response.blob();
      showRenderProgress(99, "Validating the finished MP4…");
      if (!blob.type.includes("video/mp4") || blob.size < 16) {
        throw new Error("The renderer did not return a valid MP4.");
      }
      const signature = new TextDecoder().decode(await blob.slice(4, 8).arrayBuffer());
      if (signature !== "ftyp") throw new Error("Invalid MP4 file signature.");
      if (requestedVersion !== revision || getState().html !== state.html || getState().dirty) {
        exportStatus.textContent = "Preview changed during rendering. Generate the updated MP4 again.";
        return;
      }
      const candidateUrl = URL.createObjectURL(blob);
      try {
        await verifyMp4Metadata(exportVideo, candidateUrl, expectedDuration);
      } catch (metadataError) {
        URL.revokeObjectURL(candidateUrl);
        exportVideo.removeAttribute("src");
        exportVideo.load();
        throw metadataError;
      }
      if (requestedVersion !== revision || getState().dirty) {
        URL.revokeObjectURL(candidateUrl);
        exportStatus.textContent = "Preview changed during MP4 validation. Export again.";
        return;
      }
      showRenderProgress(100, "MP4 ready.");
      mp4Url = candidateUrl;
      mp4For = state.html;
      exportDownload.href = mp4Url;
      exportDownload.download = "wedding-invitation.mp4";
      exportResult.classList.remove("hide");
      exportStatus.textContent = "MP4 generated successfully. Play or download the video below.";
      publishStatus.textContent = "MP4 header, resolution and duration checked. Review the video, then choose a category to publish.";
    } catch (error) {
      exportStatus.textContent = error instanceof Error ? error.message : "Could not connect to the MP4 renderer.";
    } finally {
      clearInterval(progressTimer);
      loader.classList.add("hide");
      rendering = false;
      updateButtons();
    }
  }

  exportButton.addEventListener("click", () => { void generateMp4(); });
  apiKey.addEventListener("input", updateButtons);

  publishButton.addEventListener("click", () => {
    updateButtons();
    if (publishButton.disabled) return;
    category.value = document.documentElement.dataset.editTemplateCategory || "";
    dialog.showModal();
    category.focus();
  });

  cancel.addEventListener("click", () => dialog.close());
  form.addEventListener("submit", async event => {
    event.preventDefault();
    updateButtons();
    if (publishing || publishButton.disabled || !category.value) return;
    const { source, editTemplateId } = getState();
    if (!source) return;
    if (!keyValue()) {
      publishStatus.textContent = "Enter the Admin access key before publishing.";
      dialog.close();
      return;
    }
    publishing = true;
    publishConfirm.disabled = true;
    publishStatus.textContent = "Saving reviewed template to MongoDB…";
    updateButtons();
    try {
      const endpoint = editTemplateId
        ? API_ROOT + "/api/admin/templates/" + encodeURIComponent(editTemplateId)
        : API_ROOT + "/api/admin/templates";
      const response = await fetch(endpoint, {
        method: editTemplateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": keyValue() },
        body: JSON.stringify({
          html: source,
          category: category.value,
          visualReviewConfirmed: true
        })
      });
      if (!response.ok) throw new Error(await readApiError(response, "Could not publish the template."));
      const json = await response.json();
      dialog.close();
      publishStatus.textContent = (editTemplateId ? "Updated existing template in " : "Published in ") +
        json.template.category + " (template ID: " + json.template.id + "). " +
        (editTemplateId ? "The template ID was preserved." : "Customers can now find it in this category.");
    } catch (error) {
      publishStatus.textContent = error instanceof Error ? error.message : "MongoDB publishing failed.";
    } finally {
      publishing = false;
      publishConfirm.disabled = false;
      updateButtons();
    }
  });

  window.addEventListener("pagehide", () => {
    if (mp4Url) URL.revokeObjectURL(mp4Url);
  });
  updateButtons();
  return { refresh: updateButtons, invalidate: discardVideo };
}
