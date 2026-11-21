import { findVideoBackground } from "./video-html-contract.js";

// Independent Video + HTML admin workflow. The existing Via Code analyzer/editor
// stays the source of truth for editable customer fields and export/publishing.
const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const DEFAULT_CONFIG = {
  partner1: "Ayaan",
  partner2: "Zoya",
  date: "2027-02-14",
  time: "7:30 PM",
  venue: "The Royal Courtyard",
  address: "Your Venue Address",
  message: "Together with our families, we invite you to celebrate our special day.",
  blessing: "Your presence will be our blessing.",
  events: [{
    name: "Wedding Celebration",
    date: "2027-02-14",
    time: "7:30 PM",
    venue: "The Royal Courtyard",
    note: "We look forward to celebrating with you."
  }]
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function buildVideoInvitationSource({ id, url, title }) {
  if (!UUID.test(id)) throw new Error("Invalid uploaded background reference.");
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) ||
      parsed.pathname !== "/api/video-backgrounds/" + id ||
      parsed.search || parsed.hash) {
    throw new Error("Invalid internal background URL.");
  }
  // The existing analyzer intentionally accepts bare-key literal CONFIG fields,
  // not JSON stringified property names. Preserve its established contract.
  const fieldLines = Object.entries(DEFAULT_CONFIG)
    .filter(([key]) => key !== "events")
    .map(([key, value]) => "  " + key + ": " + JSON.stringify(value) + ",");
  const eventLines = Object.entries(DEFAULT_CONFIG.events[0])
    .map(([key, value]) => "      " + key + ": " + JSON.stringify(value))
    .join(",\n");
  const sample = "{\n" + fieldLines.join("\n") +
    "\n  events: [{\n" + eventLines + "\n  }]\n}";
  const styles = [
    "*{box-sizing:border-box}",
    "html,body{height:100%;width:100%;margin:0;overflow:hidden;background:#100b09}",
    "body{display:grid;place-items:center}",
    ".stage{position:relative;width:min(100vw,56.25dvh);aspect-ratio:9/16;overflow:hidden;isolation:isolate;background:#160d0a;color:#fff0d6;container-type:inline-size;font-family:Georgia,'Times New Roman',serif}",
    ".scene{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
    ".background{width:100%;height:100%;object-fit:cover;display:block;background:#180f0d}",
    ".copy{position:absolute;top:30%;left:16%;width:68%;min-height:37%;padding:3cqw 2cqw;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.1cqw;overflow-wrap:anywhere;color:#fff2d9;background:linear-gradient(180deg,#140a0773,#140a0750);border-radius:2cqw;text-shadow:0 1px 5px #000e;opacity:0;animation:reveal-invitation 30s linear both}",
    ".copy p,.copy h1{margin:0;max-width:100%}",
    ".ceremony{font:700 2.7cqw system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#edd2a0}",
    ".message{font-size:3cqw;line-height:1.35}",
    ".names{font-weight:400;font-style:italic;font-size:7cqw;line-height:1.08;color:#fff4d8}",
    ".date-time{font-size:3.25cqw;line-height:1.4;color:#f8dab0}",
    ".venue{font-size:4.1cqw;line-height:1.24;font-weight:bold}",
    ".address,.blessing{font-size:2.7cqw;line-height:1.4}",
    "[hidden]{display:none!important}",
    "@keyframes reveal-invitation{0%,68%{opacity:0}77%,100%{opacity:1}}"
  ].join("\n");
  const script = [
    "const CONFIG = " + sample + ";",
    "(() => {",
    "  const root = document.querySelector('.copy');",
    "  const set = (selector, text) => {",
    "    const node = root.querySelector(selector);",
    "    const value = typeof text === 'string' ? text.trim() : '';",
    "    node.textContent = value;",
    "    node.hidden = !value;",
    "  };",
    "  const event = Array.isArray(CONFIG.events) ? CONFIG.events[0] || {} : {};",
    "  const first = String(CONFIG.partner1 || '').trim();",
    "  const second = String(CONFIG.partner2 || '').trim();",
    "  const rawDate = CONFIG.date || event.date || '';",
    "  let formattedDate = rawDate;",
    "  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(rawDate)) {",
    "    const date = new Date(rawDate + 'T00:00:00Z');",
    "    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === rawDate) {",
    "      formattedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);",
    "    }",
    "  }",
    "  set('.ceremony', event.name || 'Wedding Invitation');",
    "  set('.message', CONFIG.message);",
    "  set('.names', [first, second].filter(Boolean).join(' & '));",
    "  set('.date-time', [formattedDate, CONFIG.time || event.time].filter(Boolean).join(' · '));",
    "  set('.venue', CONFIG.venue || event.venue);",
    "  set('.address', CONFIG.address);",
    "  set('.blessing', CONFIG.blessing);",
    "})();"
  ].join("\n");
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>" + escapeHtml(title || "Video Wedding Invitation") + "</title>",
    "<style>" + styles + "</style></head><body>",
    '<main class="stage go">',
    '<section class="scene" style="--i:0" aria-label="Cinematic video background">',
    '<video data-wedding-background="' + id + '" src="' + escapeHtml(parsed.href) + '"',
    '  autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>',
    '</section><section class="scene" style="--i:1" aria-label="Personalized invitation">',
    '<article class="copy">',
    '<p class="ceremony"></p><p class="message"></p><h1 class="names"></h1>',
    '<p class="date-time"></p><p class="venue"></p><p class="address"></p><p class="blessing"></p>',
    '</article></section></main>',
    "<script>" + script + "</script></body></html>"
  ].join("\n").replace(
    'aria-hidden="true"></video>',
    'class="background" aria-hidden="true"></video>'
  );
}

async function inspectVideo(file) {
  if (!file || file.size < 1024 || file.size > MAX_FILE_BYTES ||
      (file.type && file.type !== "video/mp4") || !/\.mp4$/i.test(file.name)) {
    throw new Error("Choose a valid MP4 video no larger than 32 MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Video metadata timed out.")), 15000);
      const finish = callback => {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        callback();
      };
      video.onloadedmetadata = () => finish(resolve);
      video.onerror = () => finish(() => reject(new Error("Browser cannot read this MP4. Use H.264.")));
      video.preload = "metadata";
      video.src = objectUrl;
      video.load();
    });
    if (!Number.isFinite(video.duration) || Math.abs(video.duration - 30) > 0.5) {
      throw new Error("Background video must be 30 seconds long (±0.5 seconds).");
    }
    const ratio = video.videoWidth / video.videoHeight;
    if (!Number.isFinite(ratio) || Math.abs(ratio - 9 / 16) > 0.03) {
      throw new Error("Use a vertical 9:16 MP4 background.");
    }
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function initVideoHtmlTab() {
  const codeTab = document.querySelector("#via-code-tab");
  const videoTab = document.querySelector("#via-video-tab");
  const codePanel = document.querySelector("#code-panel");
  const videoPanel = document.querySelector("#video-html-panel");
  const fileInput = document.querySelector("#video-html-file");
  const titleInput = document.querySelector("#video-html-title");
  const createButton = document.querySelector("#video-html-create");
  const status = document.querySelector("#video-html-status");
  const storageStatus = document.querySelector("#video-html-storage-status");
  const videoHtmlCode = document.querySelector("#video-html-code");
  const analyzeVideoButton = document.querySelector("#video-html-analyze");
  const keyInput = document.querySelector("#admin-api-key");
  const codeInput = document.querySelector("#code-input");
  const analyzeButton = document.querySelector("#analyze-code");
  if (![codeTab, videoTab, codePanel, videoPanel, fileInput,
    titleInput, createButton, status, storageStatus, videoHtmlCode,
    analyzeVideoButton, keyInput, codeInput, analyzeButton].every(Boolean)) return;

  function selectTab(mode) {
    const isVideo = mode === "video";
    codePanel.hidden = isVideo;
    videoPanel.hidden = !isVideo;
    codeTab.classList.toggle("active", !isVideo);
    videoTab.classList.toggle("active", isVideo);
    codeTab.setAttribute("aria-pressed", String(!isVideo));
    videoTab.setAttribute("aria-pressed", String(isVideo));
    if (isVideo) codeTab.removeAttribute("aria-current");
    else codeTab.setAttribute("aria-current", "page");
  }
  codeTab.addEventListener("click", () => selectTab("code"));
  videoTab.addEventListener("click", () => selectTab("video"));

  async function checkStorage() {
    try {
      const response = await fetch(API_ROOT + "/api/video-backgrounds/status", {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Renderer unavailable.");
      const info = await response.json();
      if (!info.mongodbConfigured) {
        storageStatus.textContent = "MongoDB is not configured on the renderer. Set MONGODB_URI before uploading or publishing.";
      } else if (info.cloudinaryConfigured) {
        storageStatus.textContent = "Storage: Cloudinary configured for new videos; existing MongoDB videos remain accessible.";
      } else {
        storageStatus.textContent = "Storage: MongoDB GridFS. Cloudinary is not configured yet; see Cloudinary setup below.";
      }
    } catch {
      storageStatus.textContent = "Cannot check storage. Start the renderer server on port 4174 and check its settings.";
    }
  }
  void checkStorage();

  function analyzeVideoHtml() {
    const html = videoHtmlCode.value.trim();
    const background = findVideoBackground(html);
    if (!background || background.origin !== new URL(API_ROOT).origin) {
      status.textContent = "Paste a complete Video + HTML document with a valid video-background reference from this renderer, or upload an MP4 first.";
      return;
    }
    codeInput.value = videoHtmlCode.value;
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    analyzeButton.click();
    status.textContent = "Analyzing Video + HTML. Customer fields and preview controls appear below.";
  }

  analyzeVideoButton.addEventListener("click", analyzeVideoHtml);
  videoHtmlCode.addEventListener("input", () => {
    // Invalidate prepared previews when the Video + HTML source is edited.
    codeInput.value = videoHtmlCode.value;
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    status.textContent = "HTML code changed. Click Analyze HTML Code to refresh the preview.";
  });

  const originalStatus = document.querySelector("#status");
  if (originalStatus && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      if (!videoPanel.hidden && originalStatus.classList.contains("error")) {
        status.textContent = originalStatus.textContent;
      }
    });
    observer.observe(originalStatus, { childList: true, characterData: true,
      subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  createButton.addEventListener("click", async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = "Select a 30-second MP4 background first.";
      fileInput.focus();
      return;
    }
    const key = keyInput.value.trim();
    if (!key) {
      status.textContent = "Enter your Admin access key in the Export MP4 section before uploading.";
      keyInput.focus();
      return;
    }
    if ((videoHtmlCode.value.trim() || codeInput.value.trim()) &&
        !window.confirm("Generate new HTML from this MP4? This will replace the current invitation code in the editor.")) {
      return;
    }
    createButton.disabled = true;
    fileInput.disabled = true;
    status.textContent = "Checking the video format and duration…";
    try {
      await inspectVideo(file);
      status.textContent = "Uploading the background securely…";
      const response = await fetch(API_ROOT + "/api/admin/video-backgrounds", {
        method: "POST",
        headers: { "Content-Type": "video/mp4", "X-Admin-Key": key },
        body: file
      });
      if (!response.ok) {
        let message = "Background upload failed.";
        try {
          const json = await response.json();
          if (typeof json.error === "string") message = json.error;
        } catch { /* Keep the actionable fallback. */ }
        throw new Error(message);
      }
      const result = await response.json();
      const url = API_ROOT + "/api/video-backgrounds/" + result.id;
      const source = buildVideoInvitationSource({
        id: result.id,
        url,
        title: titleInput.value.trim() || "Video Wedding Invitation"
      });
      if (new TextEncoder().encode(source).length > 1024 * 1024) {
        throw new Error("Generated HTML unexpectedly exceeds the 1 MB source limit.");
      }
      // Reuse the existing analyzer and editor, but keep the HTML visible here.
      videoHtmlCode.value = source;
      analyzeVideoHtml();
      status.textContent = "Video + HTML code generated below. Edit the code or sample fields, then preview, validate and export MP4. Original video stays separate from HTML.";
      // Stay on Video + HTML; existing editable fields appear below this panel.
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Unable to create video template.";
    } finally {
      createButton.disabled = false;
      fileInput.disabled = false;
    }
  });
}

if (typeof document !== "undefined") initVideoHtmlTab();
