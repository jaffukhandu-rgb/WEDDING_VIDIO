import express from "express";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";

const app = express();
const HOST = process.env.RENDER_HOST || "127.0.0.1";
const PORT = Number(process.env.RENDER_PORT || 4174);
const DURATION_SECONDS = 30;
const FPS = 30;
const MAX_HTML_BYTES = 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const AUDIO_EXTENSIONS = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
};
let rendering = false;

app.disable("x-powered-by");
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_ORIGIN,
].filter(Boolean));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "This website origin is not allowed to use the renderer." });
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "12mb", strict: true }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, durationSeconds: DURATION_SECONDS, fps: FPS });
});

app.post("/api/render", async (req, res) => {
  const html = req.body?.html;
  if (typeof html !== "string" || !html.trim()) {
    return res.status(400).json({ error: "A non-empty HTML document is required." });
  }
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    return res.status(413).json({ error: "The HTML document is too large (1 MB maximum)." });
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
  let browser;
  let workDir;
  let ffmpeg;
  let renderTimeout;

  try {
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
    });

    // Render user-authored HTML in an isolated browser with outbound network access disabled.
    await page.route("**/*", (route) => {
      const protocol = new URL(route.request().url()).protocol;
      if (["data:", "blob:", "about:"].includes(protocol)) return route.continue();
      return route.abort("blockedbyclient");
    });
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.waitForTimeout(500);

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

    const start = Date.now();
    for (let frame = 0; frame < DURATION_SECONDS * FPS; frame += 1) {
      const jpeg = await page.screenshot({ type: "jpeg", quality: 86, animations: "allow" });
      if (!ffmpeg.stdin.write(jpeg)) await once(ffmpeg.stdin, "drain");
      const targetTime = start + ((frame + 1) * 1000) / FPS;
      const delay = targetTime - Date.now();
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
    ffmpeg.stdin.end();
    const [exitCode] = await once(ffmpeg, "close");
    ffmpeg = null;
    if (exitCode !== 0) throw new Error(ffmpegError || "FFmpeg could not encode the video.");

    await browser.close();
    browser = null;
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
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Wedding render service listening on http://${HOST}:${PORT}`);
});
