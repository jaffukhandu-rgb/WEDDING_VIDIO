import express from "express";
import { createHash } from "node:crypto";
import { analyzeTemplate } from "../src/admin-engine.js";
import { prepareCustomerInvitation } from "../src/customer-invitation.js";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { requireAdmin, isAdminConfigured } from "./admin-access.js";
import { templateRouter } from "./template-api.js";
import { findVideoBackground, isVideoBackgroundMarkerPresent, isSupportedVideoDuration,
  videoFrameCount, MIN_VIDEO_SECONDS, MAX_VIDEO_SECONDS } from "../src/video-html-contract.js";
import { videoBackgroundRouter, loadBackgroundBytes, backgroundByteRange, backgroundResponseHeaders } from "./video-backgrounds.js";
import { getPublishedTemplate, isDatabaseConfigured } from "./template-store.js";
import { geminiVideoAnalysisRouter } from "./gemini-video-analysis.js";

const app = express();
const HOST = process.env.RENDER_HOST || "127.0.0.1";
const PORT = Number(process.env.RENDER_PORT || 4174);
const DURATION_SECONDS = 30;
const FPS = 30;
// Source templates remain limited to 1 MB; personalized photo data URLs may be much larger.
const MAX_HTML_BYTES = 25 * 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const AUDIO_EXTENSIONS = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};
const audioDemuxers = { m4a: "mov", webm: "matroska", mp3: "mp3", wav: "wav", ogg: "ogg", aac: "aac" };
function matchesSoundtrackType(type, base64) {
  const bytes = Buffer.from(base64.slice(0, 24), "base64");
  const header = bytes.toString("latin1");
  switch (AUDIO_EXTENSIONS[type]) {
    case "wav": return header.startsWith("RIFF") && header.slice(8,12) === "WAVE";
    case "mp3": return header.startsWith("ID3") || (bytes[0] === 255 && (bytes[1] & 224) === 224);
    case "ogg": return header.startsWith("OggS");
    case "aac": return header.startsWith("ADIF") || (bytes[0] === 255 && (bytes[1] & 246) === 240);
    case "webm": return bytes.length >= 4 && bytes.readUInt32BE(0) === 0x1a45dfa3;
    case "m4a": return header.slice(4,8) === "ftyp";
    default: return false;
  }
}
let rendering = false;
let activeRenderProgress = null;
const TOTAL_FRAMES = DURATION_SECONDS * FPS;

app.disable("x-powered-by");
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // MP4 backgrounds are public gallery assets. Sandboxed srcdoc frames may
  // send Origin: null; all other renderer/admin endpoints retain strict CORS.
  const publicBackground = /^(GET|HEAD|OPTIONS)$/.test(req.method) &&
    /^\/api\/video-backgrounds\/[0-9a-f-]{36}$/i.test(req.path);
  if (origin && !allowedOrigins.has(origin) && !publicBackground) {
    return res.status(403).json({ error: "This website origin is not allowed to use the renderer." });
  }
  if (origin || publicBackground) {
    res.setHeader("Access-Control-Allow-Origin", publicBackground ? "*" : origin);
    if (!publicBackground) res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Key, X-Render-Job, Range");
    if (!publicBackground) res.setHeader("Access-Control-Expose-Headers", "X-Render-Duration");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
// Reject unauthorized large render/publish uploads before JSON body parsing.
app.use("/api/admin", requireAdmin);
app.post("/api/render", requireAdmin);
app.get("/api/render/progress/:id", requireAdmin);
// Admit one public request before buffering its photos or querying MongoDB.
let customerPreparing = false;
const customerStarts = new Map();
const customerParser = express.json({ limit: "36mb", strict: true, inflate: false });
app.post("/api/customer/render", (req, res) => {
  if (!req.is("application/json")) return res.status(415).json({ error: "Send invitation details as JSON." });
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(req.get("X-Render-Job") || "")) {
    return res.status(400).json({ error: "A private render job ID is required." });
  }
  if (customerPreparing || rendering) return res.status(429).json({ error: "Renderer busy. Try again shortly." });
  const now = Date.now();
  for (const [ip, entry] of customerStarts) if (entry.until <= now) customerStarts.delete(ip);
  const key = req.socket.remoteAddress;
  const entry = customerStarts.get(key) || { until: now + 60000, count: 0 };
  if (entry.count >= 6 || (!customerStarts.has(key) && customerStarts.size >= 1024)) {
    return res.status(429).json({ error: "Too many requests. Try again in a minute." });
  }
  entry.count++;
  customerStarts.set(key, entry);
  customerPreparing = true;
  let ownsPreparation = true;
  const lookup = new AbortController();
  const releasePreparation = () => {
    if (!ownsPreparation) return;
    ownsPreparation = false;
    customerPreparing = false;
  };
  // Bound total upload time even when the client keeps sending small chunks.
  const uploadDeadline = setTimeout(() => req.destroy(), 120_000);
  const onClose = () => {
    clearTimeout(uploadDeadline);
    lookup.abort();
    releasePreparation();
  };
  res.once("close", onClose);
  customerParser(req, res, async error => {
    clearTimeout(uploadDeadline);
    try {
      if (res.destroyed || !ownsPreparation) return;
      if (error) return res.status(error.status || 400).json({ error: "Invalid or oversized invitation request." });
      const body = req.body;
      if (!body || Object.keys(body).some(k => !["templateId","revision","details","photos","audioBase64","audioMimeType"].includes(k)) ||
          typeof body.templateId !== "string" || !/^[a-f0-9]{24}$/i.test(body.templateId) ||
          typeof body.revision !== "string" || !/^[a-f0-9]{64}$/.test(body.revision)) {
        return res.status(400).json({ error: "Select a published invitation and enter its supported fields." });
      }
      const template = await getPublishedTemplate(body.templateId, { timeoutMS: 8000, signal: lookup.signal });
      if (res.destroyed || !ownsPreparation) return;
      if (!template) return res.status(404).json({ error: "This invitation is no longer published." });
      const revision = template.sourceHash || createHash("sha256").update(template.html).digest("hex");
      if (revision !== body.revision) return res.status(409).json({ error: "The invitation has changed. Reload the gallery before exporting." });
      let html;
      let audio = { audioBase64: body.audioBase64, audioMimeType: body.audioMimeType };
      try {
        const analysis = analyzeTemplate(template.html);
        html = prepareCustomerInvitation(template.html, body.details, body.photos, analysis, audio.audioBase64 !== undefined);
        // Legacy masters can bind an embedded soundtrack through CONFIG.music.
        if (audio.audioBase64 === undefined && typeof analysis.config.music === "string") {
          const embedded = /^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i.exec(analysis.config.music);
          if (embedded && Object.hasOwn(AUDIO_EXTENSIONS, embedded[1])) {
            audio = { audioMimeType: embedded[1], audioBase64: embedded[2] };
          }
        }
      }
      catch (validation) { return res.status(400).json({ error: validation.message }); }
      // renderInvitation acquires its own slot synchronously before its first await.
      releasePreparation();
      if (!res.destroyed) await renderInvitation(req, res, html, true, audio);
    } catch {
      if (!res.headersSent && !res.destroyed) res.status(503).json({ error: "Invitation service unavailable. Please retry." });
    } finally {
      res.off("close", onClose);
      releasePreparation();
    }
  });
});
app.get("/api/customer/render/progress", (req, res) => {
  if (!activeRenderProgress?.customer || activeRenderProgress.id !== req.get("X-Render-Job")) {
    return res.status(404).set("Cache-Control", "no-store").end();
  }
  return sendProgress(res);
});
app.use(express.json({ limit: "40mb", strict: true }));
app.use("/api", templateRouter());
app.use("/api", videoBackgroundRouter());
app.use("/api", geminiVideoAnalysisRouter());

// Only the authenticated admin with the matching render job ID can check progress.
app.get("/api/render/progress/:id", requireAdmin, (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!rendering || !activeRenderProgress || activeRenderProgress.id !== req.params.id) {
    return res.status(404).json({ error: "Render progress is unavailable." });
  }
  return sendProgress(res);
});

function sendProgress(res) {
  res.set("Cache-Control", "no-store");
  const { frame, phase, framesStartedAt, totalFrames } = activeRenderProgress;
  const elapsed = framesStartedAt ? (Date.now() - framesStartedAt) / 1000 : 0;
  const remainingSeconds = phase === "rendering" && frame >= 10
    ? Math.ceil((elapsed / frame) * (totalFrames - frame))
    : null;
  return res.json({ frame, totalFrames, phase, remainingSeconds });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, durationSeconds: DURATION_SECONDS, fps: FPS,
    mongodbConfigured: isDatabaseConfigured(), adminConfigured: isAdminConfigured() });
});

// Raw HTML rendering is privileged: never expose arbitrary browser code execution publicly.
app.post("/api/render", requireAdmin, (req, res) => renderInvitation(req, res, req.body?.html, false));

async function renderInvitation(req, res, html, customer, audio = req.body) {
  if (typeof html !== "string" || !html.trim()) {
    return res.status(400).json({ error: "A non-empty HTML document is required." });
  }
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    return res.status(413).json({ error: "Prepared HTML exceeds the 25 MB render limit. Use smaller photos." });
  }
  const videoBackground = findVideoBackground(html);
  if (isVideoBackgroundMarkerPresent(html) && !videoBackground) {
    return res.status(400).json({ error: "Invalid Video + HTML background reference." });
  }
  const audioBase64 = audio?.audioBase64;
  const audioMimeType = audio?.audioMimeType;
  if (customer && audioMimeType !== undefined && audioBase64 === undefined) return res.status(400).json({ error: "Soundtrack data is missing." });
  if (audioBase64 !== undefined) {
    if (
      typeof audioBase64 !== "string" ||
      typeof audioMimeType !== "string" ||
      !Object.hasOwn(AUDIO_EXTENSIONS, audioMimeType) ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64)
    ) {
      return res.status(400).json({ error: "The selected music file format is not supported." });
    }
    if (customer && (!audioBase64.length || audioBase64.length % 4)) return res.status(400).json({ error: "Invalid audio encoding." });
    if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 8) {
      return res.status(413).json({ error: "Music files must be 8 MB or smaller." });
    }
    if (customer && !matchesSoundtrackType(audioMimeType, audioBase64)) return res.status(400).json({ error: "Soundtrack contents do not match its format." });
  }
  if (rendering) {
    return res.status(429).json({ error: "A video is already rendering. Please wait and try again." });
  }
  if (!ffmpegPath) {
    return res.status(500).json({ error: "FFmpeg is unavailable on this server." });
  }

  rendering = true;
  const requestedJobId = req.get("X-Render-Job");
  activeRenderProgress = {
    customer,
    id: typeof requestedJobId === "string" && /^[a-f0-9-]{36}$/i.test(requestedJobId)
      ? requestedJobId : null,
    frame: 0,
    totalFrames: TOTAL_FRAMES,
    phase: "preparing",
    framesStartedAt: null,
  };
  let browser;
  let browserClosing;
  let workDir;
  let ffmpeg;
  let ffmpegClosed;
  const encoderStopped = new AbortController();
  let renderTimeout;
  let renderDuration = DURATION_SECONDS;
  let totalFrames = TOTAL_FRAMES;

  const disconnected = new AbortController();
  // A second Playwright close can resolve on disconnect before the first finishes process cleanup.
  const closeBrowser = () => browserClosing ??= browser.close();
  const stopLongRender = () => {
    if (browser) closeBrowser().catch(() => {});
    if (ffmpeg) ffmpeg.kill("SIGKILL");
  };
  const disconnect = () => {
    if (res.writableFinished) return;
    disconnected.abort();
    stopLongRender();
  };
  if (customer) res.once("close", disconnect);
  try {
    // A single in-memory MP4 is intercepted locally. No renderer network access is enabled.
    const initBudgetMs = 90_000;
    const deadline = Date.now() + initBudgetMs;
    const initSignal = AbortSignal.any([disconnected.signal, AbortSignal.timeout(initBudgetMs)]);
    const backgroundBytes = videoBackground ? await loadBackgroundBytes(videoBackground.id, initSignal) : null;
    if (videoBackground && !backgroundBytes) {
      throw new Error("Video + HTML background asset not found. Upload it again.");
    }
    workDir = await mkdtemp(join(tmpdir(), "wedding-render-"));
    const outputPath = join(workDir, "wedding-invitation.mp4");
    let audioPath = null;
    if (audioBase64) {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      if (audioBuffer.length === 0 || audioBuffer.length > MAX_AUDIO_BYTES) {
        return res.status(413).json({ error: "Music files must be between 1 byte and 8 MB." });
      }
      audioPath = join(workDir, "invitation-music." + AUDIO_EXTENSIONS[audioMimeType]);
      await writeFile(audioPath, audioBuffer, { signal: initSignal });
    }
    initSignal.throwIfAborted();
    // Playwright owns launch cancellation and process cleanup on its native timeout.
    browser = await chromium.launch({ headless: true, timeout: Math.max(1, Math.min(30_000, deadline - Date.now())) });
    initSignal.throwIfAborted();
    renderTimeout = setTimeout(stopLongRender, 10 * 60 * 1000);
    const page = await browser.newPage({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "block",
    });

    // Virtual JS time plus explicit CSS animation seeking avoid wall-clock frame drift.
    // Install before loading the template so its own timers are virtualized.
    await page.clock.install();

    // Render user-authored HTML in an isolated browser with outbound network access disabled.
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (videoBackground && url === videoBackground.url) {
        const range = backgroundByteRange(backgroundBytes.length, route.request().headers()["range"]);
        if (!range) return route.fulfill({ status: 416,
          headers: { "Content-Range": "bytes */" + backgroundBytes.length }, body: "" });
        return route.fulfill({
          status: range.partial ? 206 : 200,
          headers: backgroundResponseHeaders(backgroundBytes.length, range),
          body: backgroundBytes.subarray(range.start, range.end + 1)
        });
      }
      if (/^(?:data|blob|about):/i.test(url)) return route.continue();
      return route.abort("blockedbyclient");
    });
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    if (videoBackground) {
      // Fail before encoding if Chromium cannot decode the uploaded MP4.
      await page.waitForFunction(() => {
        const video = document.querySelector("video[data-wedding-background]");
        return Boolean(video && video.readyState >= 2 && video.videoWidth > 0 &&
          Number.isFinite(video.duration) && video.duration > 0);
      }, null, { timeout: 20000 });
      const sourceDuration = await page.evaluate(() => {
        const video = document.querySelector("video[data-wedding-background]");
        video.pause();
        return video.duration;
      });
      if (!isSupportedVideoDuration(sourceDuration)) {
        throw new Error("Video + HTML background must be " + MIN_VIDEO_SECONDS +
          "–" + MAX_VIDEO_SECONDS + " seconds long.");
      }
      totalFrames = videoFrameCount(sourceDuration, FPS);
      renderDuration = totalFrames / FPS;
      activeRenderProgress.totalFrames = totalFrames;
      if (renderDuration > DURATION_SECONDS) {
        clearTimeout(renderTimeout);
        // Longer footage needs more rendering time; retain the original
        // 10-minute timeout for ordinary 30-second Via Code templates.
        const maxRenderMs = Math.min(20 * 60 * 1000,
          10 * 60 * 1000 + (renderDuration - DURATION_SECONDS) * 10000);
        renderTimeout = setTimeout(stopLongRender, maxRenderMs);
      }
    }
    // Advance slightly beyond document initialization, then pause virtual JS time.
    // Using the browser's own Date avoids trying to rewind the installed clock.
    const initialClock = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(new Date(initialClock + 1000));

    const ffmpegArgs = [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe", "-framerate", String(FPS), "-vcodec", "mjpeg", "-i", "pipe:0",
    ];
    if (audioPath) {
      // Pin the customer input demuxer. A renamed playlist must never initiate network reads.
      if (customer) {
        ffmpegArgs.push("-protocol_whitelist", "file", "-f", audioDemuxers[AUDIO_EXTENSIONS[audioMimeType]]);
      }
      ffmpegArgs.push("-stream_loop", "-1", "-i", audioPath);
      ffmpegArgs.push(
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:a", "aac", "-b:a", "160k",
        "-af", `afade=t=out:st=${Math.max(0, renderDuration - 3)}:d=3`,
      );
    } else {
      ffmpegArgs.push("-an");
    }
    ffmpegArgs.push(
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-pix_fmt", "yuv420p", "-r", String(FPS), "-t", String(renderDuration),
      "-movflags", "+faststart", outputPath,
    );
    ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ["pipe", "ignore", "pipe"] });

    ffmpegClosed = new Promise(resolve => ffmpeg.once("close", code => {
      encoderStopped.abort();
      resolve(code);
    }));
    let ffmpegError = "";
    const encoderError = error => {
      ffmpegError = error.message;
      encoderStopped.abort(error);
    };
    ffmpeg.once("error", encoderError);
    ffmpeg.stdin.on("error", encoderError);
    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk) => { ffmpegError += chunk; });

    activeRenderProgress.phase = "rendering";
    activeRenderProgress.framesStartedAt = Date.now();
    let previousVirtualMs = 0;
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const virtualMs = Math.round((frame * 1000) / FPS);
      const step = virtualMs - previousVirtualMs;
      if (step > 0) await page.clock.runFor(step);
      previousVirtualMs = virtualMs;
      // CSS animations use the document timeline rather than Playwright's JS
      // clock. Pause and seek them to each exact presentation timestamp.
      await page.evaluate((timeMs) => {
        for (const animation of document.getAnimations()) {
          if (animation instanceof CSSAnimation) {
            animation.pause();
            animation.currentTime = timeMs;
          }
        }
      }, virtualMs);
      if (videoBackground) {
        // Browser playback uses wall-clock time; export must decode the exact
        // requested video frame before taking each transparent-text composite.
        await page.evaluate(async timeMs => {
          const video = document.querySelector("video[data-wedding-background]");
          const target = Math.min(timeMs / 1000, Math.max(0, video.duration - 0.01));
          if (Math.abs(video.currentTime - target) < 0.001 && video.readyState >= 2) return;
          await new Promise((resolve, reject) => {
            const cleanup = () => {
              video.removeEventListener("seeked", onSeeked);
              video.removeEventListener("error", onError);
            };
            const onSeeked = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); reject(new Error("Background MP4 decoding failed.")); };
            video.addEventListener("seeked", onSeeked, { once: true });
            video.addEventListener("error", onError, { once: true });
            try { video.currentTime = target; } catch (error) { cleanup(); reject(error); }
          });
        }, virtualMs);
      }
      const jpeg = await page.screenshot({ type: "jpeg", quality: 86, animations: "allow" });
      encoderStopped.signal.throwIfAborted();
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, "drain", { signal: encoderStopped.signal });
      activeRenderProgress.frame = frame + 1;
    }
    activeRenderProgress.phase = "encoding";
    ffmpeg.stdin.end();
    const exitCode = await ffmpegClosed;
    ffmpeg = null;
    if (exitCode !== 0) throw new Error(ffmpegError || "FFmpeg could not encode the video.");

    await closeBrowser();
    browser = null;
    activeRenderProgress.phase = "delivering";
    res.set({
      "Content-Type": "video/mp4",
      "X-Render-Duration": String(renderDuration),
      "Content-Disposition": 'inline; filename="wedding-invitation.mp4"',
      "Cache-Control": "no-store",
    });
    await new Promise((resolve, reject) => {
      res.sendFile(outputPath, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  } catch (error) {
    if (ffmpeg) {
      ffmpeg.stdin.destroy();
      ffmpeg.kill("SIGKILL");
      await ffmpegClosed;
    }
    if (!customer) console.error("Wedding video render failed:", error);
    if (!res.headersSent && !res.destroyed) {
      res.status(500).json({
        error: customer ? "Could not render the invitation. Check the media and retry." : error instanceof Error ? error.message : "Video rendering failed.",
      });
    }
  } finally {
    res.off("close", disconnect);
    if (renderTimeout) clearTimeout(renderTimeout);
    if (browser) await closeBrowser().catch(() => {});
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
    rendering = false;
    activeRenderProgress = null;
  }
}

const server = app.listen(PORT, HOST, () => {
  console.log(`Wedding render service listening on http://${HOST}:${server.address().port}`);
});
