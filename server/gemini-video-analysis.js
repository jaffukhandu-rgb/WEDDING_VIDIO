import express from "express";
import { requireAdmin } from "./admin-access.js";
import { isSupportedVideoDuration } from "../src/video-html-contract.js";
import { validateSceneTimeline, validateTextArea } from "../src/video-scene-timeline.js";

// Gemini never supplies HTML or JavaScript. Only a validated, bounded plan
// can modify the existing generated invitation's text placement and timing.
const DEFAULT_MODEL = "gemini-3.5-flash";
const FALLBACK_MODEL = "gemini-3.5-flash-lite";
const SUPPORTED_MODELS = new Set([DEFAULT_MODEL, FALLBACK_MODEL]);

// This setting is server-only and never comes from the browser.
export function resolveGeminiModel(configured = process.env.GEMINI_MODEL) {
  const model = typeof configured === "string" ? configured.trim() : "";
  if (!model) return DEFAULT_MODEL;
  if (!SUPPORTED_MODELS.has(model)) {
    throw geminiError("Unsupported configured Gemini model.", "model_unavailable");
  }
  return model;
}

// Expose only fixed diagnostic codes. Never return provider error bodies,
// request frames, or API credentials to the browser or server logs.
const FAILURE_REASONS = new Set([
  "invalid_key", "permission_denied", "model_unavailable",
  "quota_exceeded", "invalid_request", "provider_unavailable",
  "timeout", "empty_response", "invalid_json", "invalid_layout",
  "request_failed"
]);
const LAYOUT_DETAILS = new Set([
  "plan_shape", "reveal_time", "text_area", "palette", "warnings",
  "scene_list", "scene_metadata", "scene_boundaries", "scene_coverage", "scene_text_area",
  "panel_list", "panel_boundaries", "panel_text_area"
]);
export function classifyGeminiFailure(httpStatus, providerStatus, detailReason) {
  if (detailReason === "API_KEY_INVALID") return "invalid_key";
  if (httpStatus === 401 || httpStatus === 403 ||
      providerStatus === "PERMISSION_DENIED") return "permission_denied";
  if (httpStatus === 404 || providerStatus === "NOT_FOUND") return "model_unavailable";
  if (httpStatus === 429 || providerStatus === "RESOURCE_EXHAUSTED") return "quota_exceeded";
  if (httpStatus === 400 || providerStatus === "INVALID_ARGUMENT") return "invalid_request";
  if (httpStatus >= 500) return "provider_unavailable";
  return "request_failed";
}
function geminiError(message, reason) {
  const error = new Error(message);
  error.reason = reason;
  return error;
}
const MAX_FRAMES = 18;
const MAX_FRAME_BASE64 = 180_000;
const MAX_BODY_CHARS = 3_000_000;
let activeRequest = false;

const isRecord = value => value !== null && typeof value === "object" &&
  !Array.isArray(value);
const finiteBetween = (value, min, max) =>
  typeof value === "number" && Number.isFinite(value) &&
  value >= min && value <= max;
const endBefore = (duration, margin) => Math.floor((duration - margin + 1e-9) * 100) / 100;

function layoutError(message, layoutDetail) {
  return Object.assign(geminiError(message, "invalid_layout"), { layoutDetail });
}

function validateGeminiTimeline(value, duration) {
  let { scenes, panels } = value;
  if (panels == null || (Array.isArray(panels) && panels.length === 0)) {
    if (scenes === undefined) return null;
  }

  // Gemini can round an exact, fractional clip end up to the nearest tenth.
  // Clip this small overrun without extending any scene or inventing coverage.
  const roundedClipEnd = duration + .05 + 1e-9;
  const lastScene = Array.isArray(scenes) ? scenes.at(-1) : null;
  if (lastScene?.end > duration && finiteBetween(lastScene.end, duration, roundedClipEnd)) {
    scenes = [...scenes.slice(0, -1), { ...lastScene, end: duration }];
  }
  const timeline = validateSceneTimeline({ scenes }, duration);

  if (Array.isArray(panels) && panels.length <= 3) {
    const latestEnd = endBefore(duration, .1);
    panels = panels.map((panel, index) => {
      if (!isRecord(panel)) return panel;
      const previousEnd = panels[index - 1]?.end;
      return {
        ...panel,
        start: typeof previousEnd === "number" &&
          finiteBetween(panel.start, previousEnd - .01 - 1e-9, previousEnd)
          ? previousEnd : panel.start,
        end: finiteBetween(panel.end, latestEnd, roundedClipEnd) ? latestEnd : panel.end
      };
    });
  }
  try {
    return validateSceneTimeline({ scenes: timeline.scenes, panels }, duration);
  } catch (error) {
    // Panels are advisory. Independently safe scene regions can still be
    // intersected with decoded quiet intervals and scheduled by the client.
    const panelFailure = ["panel_list", "panel_boundaries", "panel_text_area"]
      .includes(error?.layoutDetail);
    if (panelFailure && timeline.scenes.some(scene =>
      scene.textArea && scene.end - scene.start >= 2.5 - 1e-9)) return timeline;
    throw error;
  }
}

export function validateGeminiPlan(value, duration) {
  if (!isRecord(value) || !isSupportedVideoDuration(duration)) {
    throw layoutError("Invalid Gemini scene analysis.", "plan_shape");
  }
  if (!finiteBetween(value.revealAt, 0, duration - 1.5)) {
    throw layoutError("Gemini returned an unsafe or unreadable layout.", "reveal_time");
  }
  let textArea;
  try { textArea = validateTextArea(value.textArea); }
  catch { throw layoutError("Gemini returned an unsafe or unreadable layout.", "text_area"); }
  if (!["#24160e", "#fff1d2"].includes(value.ink) ||
      !["medium", "low"].includes(value.confidence)) {
    throw layoutError("Gemini returned an unsafe or unreadable layout.", "palette");
  }
  if (!Array.isArray(value.warnings) || value.warnings.length > 3 ||
      value.warnings.some(item => typeof item !== "string" || item.length > 130)) {
    throw layoutError("Invalid Gemini layout warnings.", "warnings");
  }
  const timeline = validateGeminiTimeline(value, duration);
  return {
    version: 1,
    duration,
    revealAt: timeline?.panels[0]?.start ??
      Math.min(Math.round(value.revealAt * 100) / 100, endBefore(duration, 1.5)),
    textArea,
    ink: value.ink,
    shadow: value.ink === "#24160e"
      ? "rgba(255,245,224,.4)" : "rgba(12,6,2,.7)",
    confidence: value.confidence,
    warnings: value.warnings.map(item => item.trim()).filter(Boolean),
    aiAssisted: true,
    ...(timeline ? { scenes: timeline.scenes, panels: timeline.panels } : {})
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

const TEXT_AREA_SCHEMA = {
  type: "object",
  properties: {
    left: { type: "number", minimum: 8, maximum: 55 },
    top: { type: "number", minimum: 12, maximum: 69 },
    width: { type: "number", minimum: 35, maximum: 85 },
    height: { type: "number", minimum: 23, maximum: 67 }
  },
  required: ["left", "top", "width", "height"]
};
const SCHEMA = {
  type: "object",
  properties: {
    revealAt: { type: "number", minimum: 0 },
    textArea: TEXT_AREA_SCHEMA,
    ink: { type: "string", enum: ["#24160e", "#fff1d2"] },
    confidence: { type: "string", enum: ["medium", "low"] },
    warnings: { type: "array", maxItems: 3, items: { type: "string" } },
    scenes: {
      type: "array", minItems: 1, maxItems: 8, items: {
        type: "object",
        properties: {
          start: { type: "number" }, end: { type: "number" },
          kind: { type: "string", enum: [
            "people", "invitation_surface", "decor", "transition", "other"
          ] },
          note: { type: "string" },
          textArea: TEXT_AREA_SCHEMA,
          ink: { type: "string", enum: ["#24160e", "#fff1d2"] }
        },
        required: ["start", "end", "kind", "note"]
      }
    },
    panels: {
      type: "array", maxItems: 3, items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["intro", "details", "events"] },
          start: { type: "number" }, end: { type: "number" },
          textArea: TEXT_AREA_SCHEMA,
          ink: { type: "string", enum: ["#24160e", "#fff1d2"] }
        },
        required: ["kind", "start", "end", "textArea"]
      }
    }
  },
  required: ["revealAt", "textArea", "ink", "confidence", "warnings", "scenes"]
};

export async function requestGeminiPlan(
  sample, apiKey, fetcher = fetch, configuredModel = process.env.GEMINI_MODEL
) {
  const model = resolveGeminiModel(configuredModel);
  try {
    return await requestGeminiPlanForModel(sample, apiKey, fetcher, model);
  } catch (error) {
    // Retry only a missing model. Do not double-call on quotas, bad keys,
    // timeouts or unsafe model output; the existing local analyzer handles those.
    if (model === DEFAULT_MODEL && error?.reason === "model_unavailable") {
      return requestGeminiPlanForModel(sample, apiKey, fetcher, FALLBACK_MODEL);
    }
    throw error;
  }
}

async function requestGeminiPlanForModel(sample, apiKey, fetcher, model) {
  const parts = [{
    text: "Analyze this portrait wedding-video timeline using timestamped JPEG frames. " +
      "These are selected samples, not every frame; never claim frame-exact boundaries. " +
      "Describe 1-8 consecutive scenes using start/end seconds, kind " +
      "(people, invitation_surface, decor, transition, other), and a factual note up to 120 characters. " +
      "Start at 0, use the same time for each shared scene boundary, and end at the exact " +
      "supplied duration. Each scene must last at least 0.35 seconds. Distinguish people, camera motion, boards, floral " +
      "decoration, smoke, and scene transitions based only on visible evidence. " +
      "Identify EVERY safely readable invitation surface or decoration across the entire clip, " +
      "including early and middle scenes, not only the ending. For EACH suitable scene " +
      "include its largest safe textArea and ink. Omit textArea for faces, moving cameras, " +
      "transitions and unsuitable decoration. Separate different board views and motion into scenes. " +
      "Propose a brief JSON-only plan with revealAt, textArea, ink, confidence and up to three " +
      "warnings of at most 130 characters each. Where multiple safe windows exist, distribute names/message (intro), date/venue " +
      "(details) and optional programme (events) across them; leave gaps during movement. " +
      "Provide 2-3 non-overlapping panels in intro, details, optional events order only " +
      "when each fits a safe scene for at least 2.5 seconds. End every panel by " +
      endBefore(sample.duration, .1) + " seconds. Set revealAt equal to the first panel start. " +
      "If there isn't enough time, omit panels and set revealAt between 0 and " +
      endBefore(sample.duration, 1.5) + " seconds. The browser will refine timing using decoded motion samples. " +
      "All textArea values are PERCENT of frame (left 8..55, top 12..69, " +
      "width 35..85, height 23..67, right <=96, bottom <=94). " +
      "Use ink #24160e on light or #fff1d2 on dark regions, confidence medium/low. " +
      "No generated HTML, no personal details. Use all suitable text windows, regardless of timestamp. " +
      "Video duration: " + sample.duration + " seconds."
  }];
  for (const frame of sample.frames) {
    parts.push({ text: "Video frame at " + frame.time.toFixed(2) + " seconds:" });
    parts.push({ inlineData: { mimeType: "image/jpeg", data: frame.jpeg } });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetcher(
      "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: SCHEMA,
            thinkingConfig: { thinkingLevel: "low" },
            maxOutputTokens: 2600
          }
        }),
        signal: controller.signal
      }
    );
    if (!response.ok) {
      let errorBody = null;
      try { errorBody = await response.json(); } catch { /* Some upstream failures have no JSON body. */ }
      const providerError = errorBody?.error;
      const details = Array.isArray(providerError?.details) ? providerError.details : [];
      const detailReason = details.map(item => item?.reason).find(item =>
        typeof item === "string");
      throw geminiError("Gemini analysis is unavailable.",
        classifyGeminiFailure(response.status, providerError?.status, detailReason));
    }
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.filter(part => typeof part.text === "string" && !part.thought)
      .map(part => part.text).join("").trim();
    if (typeof text !== "string" || !text || text.length > 10000) {
      throw geminiError("Gemini did not return a JSON plan.", "empty_response");
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw geminiError("Gemini returned invalid JSON.", "invalid_json");
    }
    try {
      return validateGeminiPlan(parsed, sample.duration);
    } catch (error) {
      throw layoutError("Gemini returned an invalid layout.", error?.layoutDetail);
    }
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
      const reason = error?.name === "AbortError" ? "timeout" :
        FAILURE_REASONS.has(error?.reason) ? error.reason : "request_failed";
      const layoutDetail = reason === "invalid_layout" && LAYOUT_DETAILS.has(error?.layoutDetail)
        ? error.layoutDetail : null;
      console.warn("Gemini video plan unavailable:", reason + (layoutDetail ? "/" + layoutDetail : ""));
      return res.status(502).json({
        error: "Gemini analysis failed. Local video analysis remains available.",
        reason,
        ...(layoutDetail ? { layoutDetail } : {})
      });
    } finally {
      activeRequest = false;
    }
  });
  return router;
}
