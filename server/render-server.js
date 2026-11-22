import express from "express";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { requireAdmin, isAdminConfigured } from "./admin-access.js";
import { templateRouter } from "./template-api.js";
import { findVideoBackground, isVideoBackgroundMarkerPresent } from "../src/video-html-contract.js";
import { videoBackgroundRouter, loadBackgroundBytes, backgroundByteRange, backgroundResponseHeaders } from "./video-backgrounds.js";
import { isDatabaseConfigured } from "./template-store.js";

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
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
// Reject unauthorized large render/publish uploads before JSON body parsing.
app.use((req, res, next) => {
  if (req.method === "POST" &&
      (req.path === "/api/render" || req.path === "/api/admin/templates")) {
    return requireAdmin(req, res, next);
  }
  next();
});
app.use(express.json({ limit: "40mb", strict: true }));
app.use("/api", templateRouter());
app.use("/api", videoBackgroundRouter());

// Only the authenticated admin with the matching render job ID can check progress.
app.get("/api/render/progress/:id", requireAdmin, (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!rendering || !activeRenderProgress || activeRenderProgress.id !== req.params.id) {
    return res.status(404).json({ error: "Render progress is unavailable." });
  }
  const { frame, phase, framesStartedAt } = activeRenderProgress;
  const elapsed = framesStartedAt ? (Date.now() - framesStartedAt) / 1000 : 0;
  const remainingSeconds = phase === "rendering" && frame >= 10
    ? Math.ceil((elapsed / frame) * (TOTAL_FRAMES - frame))
    : null;
  return res.json({ frame, totalFrames: TOTAL_FRAMES, phase, remainingSeconds });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, durationSeconds: DURATION_SECONDS, fps: FPS,
    mongodbConfigured: isDatabaseConfigured(), adminConfigured: isAdminConfigured() });
});

// Raw HTML rendering is privileged: never expose arbitrary browser code execution publicly.
app.post("/api/render", requireAdmin, async (req, res) => {
  const html = req.body?.html;
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
  const audioBase64 = req.body?.audioBase64;
  const audioMimeType = req.body?.audioMimeType;
  if (audioBase64 !== undefined) {
    if (
      typeof audioBase64 !== "string" ||
      typeof audioMimeType !== "string" ||
      !AUDIO_EXTENSIONS[audioMimeType] ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64)
    ) {
      return res.status(400).json({ error: "The selected music file format is not supported." });
    }
    if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES * 4 / 3) + 8) {
      return res.status(413).json({ error: "Music files must be 8 MB or smaller." });
    }
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
    id: typeof requestedJobId === "string" && /^[a-f0-9-]{36}$/i.test(requestedJobId)
      ? requestedJobId : null,
    frame: 0,
    phase: "preparing",
    framesStartedAt: null,
  };
  let browser;
  let workDir;
  let ffmpeg;
  let renderTimeout;

  try {
    // A single in-memory MP4 is intercepted locally. No renderer network access is enabled.
    const backgroundBytes = videoBackground ? await loadBackgroundBytes(videoBackground.id) : null;
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
      await writeFile(audioPath, audioBuffer);
    }
    browser = await chromium.launch({ headless: true });
    renderTimeout = setTimeout(() => {
      if (browser) browser.close().catch(() => {});
      if (ffmpeg) ffmpeg.kill("SIGKILL");
    }, 10 * 60 * 1000);
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
      const protocol = new URL(url).protocol;
      if (["data:", "blob:", "about:"].includes(protocol)) return route.continue();
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
      await page.evaluate(() => document.querySelector("video[data-wedding-background]").pause());
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
      ffmpegArgs.push("-stream_loop", "-1", "-i", audioPath);
      ffmpegArgs.push(
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:a", "aac", "-b:a", "160k",
        "-af", `afade=t=out:st=${Math.max(0, DURATION_SECONDS - 3)}:d=3`,
      );
    } else {
      ffmpegArgs.push("-an");
    }
    ffmpegArgs.push(
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
      "-pix_fmt", "yuv420p", "-r", String(FPS), "-t", String(DURATION_SECONDS),
      "-movflags", "+faststart", outputPath,
    );
    ffmpeg = spawn(ffmpegPath, ffmpegArgs, { stdio: ["pipe", "ignore", "pipe"] });

    let ffmpegError = "";
    ffmpeg.stderr.setEncoding("utf8");
    ffmpeg.stderr.on("data", (chunk) => { ffmpegError += chunk; });

    activeRenderProgress.phase = "rendering";
    activeRenderProgress.framesStartedAt = Date.now();
    let previousVirtualMs = 0;
    for (let frame = 0; frame < DURATION_SECONDS * FPS; frame += 1) {
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
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, "drain");
      activeRenderProgress.frame = frame + 1;
    }
    activeRenderProgress.phase = "encoding";
    ffmpeg.stdin.end();
    const [exitCode] = await once(ffmpeg, "close");
    ffmpeg = null;
    if (exitCode !== 0) throw new Error(ffmpegError || "FFmpeg could not encode the video.");

    await browser.close();
    browser = null;
    activeRenderProgress.phase = "delivering";
    res.set({
      "Content-Type": "video/mp4",
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
    }
    console.error("Wedding video render failed:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Video rendering failed.",
      });
    }
  } finally {
    if (renderTimeout) clearTimeout(renderTimeout);
    if (browser) await browser.close().catch(() => {});
    if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => {});
    rendering = false;
    activeRenderProgress = null;
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Wedding render service listening on http://${HOST}:${PORT}`);
});
