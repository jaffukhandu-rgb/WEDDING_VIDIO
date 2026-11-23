import express from "express";
import { requireAdmin } from "./admin-access.js";
import { isSupportedVideoDuration } from "../src/video-html-contract.js";

// Gemini never supplies HTML or JavaScript. Only a validated, bounded plan
// can modify the existing generated invitation's text placement and timing.
const MODEL = "gemini-2.5-flash";
const MAX_FRAMES = 10;
const MAX_FRAME_BASE64 = 180_000;
const MAX_BODY_CHARS = 1_600_000;
let activeRequest = false;

const isRecord = value => value !== null && typeof value === "object" &&
  !Array.isArray(value);
const finiteBetween = (value, min, max) =>
  typeof value === "number" && Number.isFinite(value) &&
  value >= min && value <= max;

export function validateGeminiPlan(value, duration) {
  if (!isRecord(value) || !isSupportedVideoDuration(duration)) {
    throw new Error("Invalid Gemini scene analysis.");
  }
  const area = value.textArea;
  if (!isRecord(area) ||
      !finiteBetween(value.revealAt, Math.max(0, duration - 20), duration - 1.5) ||
      !finiteBetween(area.left, 8, 55) ||
      !finiteBetween(area.top, 12, 69) ||
      !finiteBetween(area.width, 35, 85) ||
      !finiteBetween(area.height, 23, 67) ||
      area.left + area.width > 96 ||
      area.top + area.height > 94 ||
      !["#24160e", "#fff1d2"].includes(value.ink) ||
      !["medium", "low"].includes(value.confidence)) {
    throw new Error("Gemini returned an unsafe or unreadable layout.");
  }
  if (!Array.isArray(value.warnings) || value.warnings.length > 3 ||
      value.warnings.some(item => typeof item !== "string" || item.length > 130)) {
    throw new Error("Invalid Gemini layout warnings.");
  }
  return {
    version: 1,
    duration,
    revealAt: Math.round(value.revealAt * 100) / 100,
    textArea: {
      left: Math.round(area.left), top: Math.round(area.top),
      width: Math.round(area.width), height: Math.round(area.height)
    },
    ink: value.ink,
    shadow: value.ink === "#24160e"
      ? "rgba(255,245,224,.4)" : "rgba(12,6,2,.7)",
    confidence: value.confidence,
    warnings: value.warnings.map(item => item.trim()).filter(Boolean),
    aiAssisted: true
  };
}

export function validateGeminiFrames(input) {
  if (!isRecord(input) || !isSupportedVideoDuration(input.duration) ||
      !Array.isArray(input.frames) || input.frames.length < 5 ||
      input.frames.length > MAX_FRAMES) {
    throw new Error("Invalid sampled video frames.");
  }
  let previous = -1;
  let total = 0;
  const frames = input.frames.map(frame => {
    if (!isRecord(frame) || !finiteBetween(frame.time, 0, input.duration) ||
        frame.time <= previous || typeof frame.jpeg !== "string" ||
        frame.jpeg.length < 100 || frame.jpeg.length > MAX_FRAME_BASE64 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(frame.jpeg)) {
      throw new Error("Invalid sampled video frame.");
    }
    previous = frame.time;
    total += frame.jpeg.length;
    if (total > MAX_BODY_CHARS) throw new Error("Sampled video frames exceed the analysis limit.");
    return { time: frame.time, jpeg: frame.jpeg };
  });
  return { duration: input.duration, frames };
}

const SCHEMA = {
  type: "object",
  properties: {
    revealAt: { type: "number" },
    textArea: {
      type: "object",
      properties: {
        left: { type: "number" }, top: { type: "number" },
        width: { type: "number" }, height: { type: "number" }
      },
      required: ["left", "top", "width", "height"]
    },
    ink: { type: "string", enum: ["#24160e", "#fff1d2"] },
    confidence: { type: "string", enum: ["medium", "low"] },
    warnings: { type: "array", items: { type: "string" } }
  },
  required: ["revealAt", "textArea", "ink", "confidence", "warnings"]
};

export async function requestGeminiPlan(sample, apiKey, fetcher = fetch) {
  const parts = [{
    text: "You are planning ONE editable wedding invitation overlay for a portrait MP4. " +
      "You receive chronologically sampled still frames, NOT the full video. " +
      "Each image is preceded by its exact timestamp. Identify scene changes, people, " +
      "decorative plaques/boards, and quiet legible regions. Start text only once a final " +
      "appropriate surface is clearly visible and stable; keep text off faces and objects. " +
      "Use a late reveal within the last 20 seconds, leaving at least 1.5 seconds to read. " +
      "Return ONLY the JSON plan: revealAt in seconds, textArea in PERCENT of 9:16 video " +
      "(left 8..55, top 12..69, width 35..85, height 23..67, fully within edges), " +
      "ink (#24160e for bright or #fff1d2 for dark surfaces), confidence medium/low, " +
      "and up to 3 brief warnings. Do not invent exact motion certainty between frames. " +
      "Video length: " + sample.duration + " seconds."
  }];
  for (const frame of sample.frames) {
    parts.push({ text: "Video frame at " + frame.time.toFixed(2) + " seconds:" });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: frame.jpeg } });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetcher(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            temperature: 0.1,
            maxOutputTokens: 750
          }
        }),
        signal: controller.signal
      }
    );
    if (!response.ok) throw new Error("Gemini analysis is unavailable.");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find(part =>
      typeof part.text === "string")?.text;
    if (typeof text !== "string" || text.length > 10000) {
      throw new Error("Gemini did not return a JSON plan.");
    }
    return validateGeminiPlan(JSON.parse(text), sample.duration);
  } finally {
    clearTimeout(timeout);
  }
}

export function geminiVideoAnalysisRouter() {
  const router = express.Router();
  router.get("/admin/video-analysis", requireAdmin, (_req, res) => {
    res.set("Cache-Control", "no-store").json({ enabled: Boolean(process.env.GEMINI_API_KEY?.trim()) });
  });
  router.post("/admin/video-analysis", requireAdmin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) return res.status(503).json({ error: "Gemini analysis is not configured." });
    if (activeRequest) return res.status(429).json({ error: "Gemini analysis is already running." });
    let sample;
    try {
      sample = validateGeminiFrames(req.body);
    } catch {
      return res.status(400).json({ error: "Invalid video frame samples." });
    }
    activeRequest = true;
    try {
      const plan = await requestGeminiPlan(sample, apiKey);
      return res.json({ plan });
    } catch (error) {
      console.warn("Gemini video plan unavailable:", error instanceof Error ? error.name : "Unknown");
      return res.status(502).json({ error: "Gemini analysis failed. Use local video analysis." });
    } finally {
      activeRequest = false;
    }
  });
  return router;
}
