// Standalone, opt-in diagnostic. Never prints credentials or raw upstream bodies.
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  classifyGeminiFailure, requestGeminiPlan, requestGeminiDesign,
  resolveGeminiModel, safeGeminiDiagnostics, validateGeminiFrames
} from "../server/gemini-video-analysis.js";
import { resolveVideoDesign } from "../src/video-invitation-design.js";

const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const EXACT_MODEL = { allowModelFallback: false };
const TIMEOUT_MS = 60_000;
// A real, generated 96x170 JPEG of a blank decorative board, no customer data.
const BOARD_JPEG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHCAkIBgoJCAkMCwoMDxoRDw4ODx8WGBMaJSEnJiQhJCMpLjsyKSw4LCMkM0Y0OD0/QkNCKDFITUhATTtBQj//2wBDAQsMDA8NDx4RER4/KiQqPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz//wAARCACqAGADASIAAhEBAxEB/8QAGQABAQEBAQEAAAAAAAAAAAAAAAYDBwUC/8QAMBAAAQEFBgQFBAMAAAAAAAAAAAIBAwQ0sQcRU3KCkhITFNEFF1Si0gYhMWFBUYH/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIEA//EAB0RAQABBQEBAQAAAAAAAAAAAAACAQMRMTISUSH/2gAMAwEAAhEDEQA/AOdgA8XuAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZ2dO0vYqLQtl6W8F7P8URha2bT0Voos87nKx2vuhhsL3N7joYbC9ze59vEJXEO2LSxTOBX2ay/+WH1yHOC72sObDeWXQw2F7m9x0MNhe5vc15DnBd7WDkOcF3tYMGWXQw2F7m9x0MNhe5vc15DnBd7WDkOcF3tYMGWXQw2F7m9x0MNhe5vc15DnBd7WHy7QlEQ8YhLEs4E/ZjLv5aMGXPLRXaXUVCIQy5LOO5n+JIwtbSZ6F10QRR02+WJbC1s2norRRZFFrZtPRWiiy3OSO3Q1TKMiqpNDNUyjIqqTQ5mwAFQAAAzTMryJqo0M0zK8iaqIrnlpM9C66IIotbSZ6F10QRR02+WJbC1s2norRRZFFrZtPRWiixc5I7dDVMoyKqk0M1TKMiqpNDmbAAVAAADNMyvImqjQzTMryJqoiueWkz0Lrogii1tJnoXXRBFHTb5YlsLWzaeitFFkUWtm09FaKLFzkjt0NUyjIqqTQzVMoyKqk0OZsABUAAAM0zK8iaqNDNMyvImqiK55aTPQuuiCKLW0mehddEEUdNvliWwtbNp6K0UWRRa2bT0VoosXOSO3Q1TKMiqpNDNUyjIqqTQ5mwAFQAAAzTMryJqo0M0zK8iaqIrnlpM9C66IIotbSZ6F10QRR02+WJbC1s2norRRZFFrZtPRWiixc5I7dDVMoyKqk0M1TKMiqpNDmbAAVAAADNMyvImqjQzTMryJqoiueWkz0Lrogii1tJnoXXRBFHTb5YlsLWzaeitFFkUe/8ASvjjnwR6/ePnbxbV8PDwMY38X33/AHZ/YuUrWP4R26y8SvmpWhiW3MaxrGtu/N36/QvfYbve3sRnmDDene7GfIeYMN6d7sZ8jw8y+N5os732G73t7C99hu97exGeYMN6d7sZ8h5gw3p3uxnyHmXwzRZ3vsN3vb2F77Dd729iM8wYb073Yz5DzBhvTvdjPkPMvhmizvfYbve3sHaV81S1sSy9jGMYxt/4v/X7IzzBhvTvdjPkPMGG9O92M+Q8y+GaPPtJnoXXRBFHv/VXjjnxt64eOXbxDUcXFxsYz83XXfdv9HgHvbpWkf1iWwAG0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/2Q==";

export function syntheticSample() {
  return { duration: 30, frames: [0.2, 4, 8, 12, 16, 20, 24, 29.8]
    .map(time => ({ time, jpeg: BOARD_JPEG })) };
}

export function parseDiagnosticArgs(args) {
  let models = DEFAULT_MODELS, video = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--models" && args[i + 1] && !args[i + 1].startsWith("--")) {
      models = args[++i].split(",").map(value => {
        if (!value.trim()) throw Error("Invalid model list.");
        return resolveGeminiModel(value);
      });
    } else if (args[i] === "--video" && args[i + 1] && !args[i + 1].startsWith("--")) {
      video = args[++i];
    } else throw Error("Usage: node --env-file=.env scripts/diagnose-gemini.js [--models id,id] [--video local.mp4]");
  }
  models = [...new Set(models)];
  if (models.length > 5) throw Error("Choose at most five models per diagnostic.");
  return { models, video };
}

async function videoSample(filename) {
  const path = resolve(filename);
  const info = statSync(path);
  if (!info.isFile() || !/\.mp4$/i.test(path) || info.size > 32 * 1024 * 1024) {
    throw Error("Choose a local MP4 no larger than 32 MB.");
  }
  const { default: ffmpeg } = await import("ffmpeg-static");
  if (!ffmpeg) throw Error("Existing ffmpeg-static binary is unavailable.");
  const probe = spawnSync(ffmpeg, ["-hide_banner", "-i", path], {
    encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024
  });
  const match = probe.stderr?.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const duration = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
  if (!(duration >= 5 && duration <= 120)) throw Error("Test video must be 5–120 seconds.");
  const frames = Array.from({ length: 10 }, (_, index) => {
    const time = Number((.2 + (duration - .4) * index / 9).toFixed(2));
    const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-ss", String(time),
      "-i", path, "-frames:v", "1", "-vf", "scale=256:455", "-q:v", "6",
      "-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1"], {
      timeout: 15_000, maxBuffer: 1024 * 1024
    });
    if (result.status !== 0 || !result.stdout?.length) throw Error("Unable to extract diagnostic JPEG.");
    return { time, jpeg: result.stdout.toString("base64") };
  });
  return validateGeminiFrames({ duration, frames });
}

const KNOWN_REASONS = new Set(["invalid_key", "permission_denied", "model_unavailable",
  "quota_exceeded", "invalid_request", "provider_unavailable", "timeout", "empty_response",
  "invalid_json", "invalid_layout", "request_failed"]);

async function basicRequest(model, key, fetcher, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(API + model + (payload ? ":generateContent" : ""), {
      headers: { "x-goog-api-key": key, ...(payload ? { "Content-Type": "application/json" } : {}) },
      ...(payload ? { method: "POST", body: JSON.stringify(payload) } : {}),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (controller.signal.aborted) throw Object.assign(Error("Timeout"), { reason: "timeout" });
    if (!response.ok) {
      const status = data?.error?.status;
      const reason = data?.error?.details?.find?.(item => typeof item?.reason === "string")?.reason;
      throw Object.assign(Error("Request unavailable"), {
        reason: classifyGeminiFailure(response.status, status, reason),
        ...safeGeminiDiagnostics({ upstreamStatus: response.status, providerStatus: status })
      });
    }
    if (!data) throw Object.assign(Error("Invalid JSON"), { reason: "invalid_json" });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// No retries or model substitution: a pass always refers to the named model.
// Continue independent production-shape tests after scene failures where safe.
export async function runGeminiDiagnostics({
  apiKey, models = DEFAULT_MODELS, sample = syntheticSample(), fetcher = fetch,
  log = row => console.log(JSON.stringify(row)), now = Date.now,
  requestPlan = requestGeminiPlan, requestDesign = requestGeminiDesign
}) {
  if (!apiKey?.trim()) throw Error("GEMINI_API_KEY is not configured in the private renderer environment.");
  const clean = validateGeminiFrames(sample);
  const results = [];
  async function check(model, stage, task) {
    const started = now();
    let row, value;
    try {
      value = await task();
      row = { model, stage, outcome: "pass", elapsedMs: now() - started };
    } catch (error) {
      const reason = error?.name === "AbortError" ? "timeout" :
        KNOWN_REASONS.has(error?.reason) ? error.reason : "request_failed";
      row = { model, stage, outcome: "fail", elapsedMs: now() - started,
        reason, ...safeGeminiDiagnostics(error) };
    }
    results.push(row); log(row);
    return { row, value };
  }

  for (const requested of models) {
    const model = resolveGeminiModel(requested);
    const listed = await check(model, "model_metadata", async () => {
      const meta = await basicRequest(model, apiKey, fetcher);
      if (!meta.supportedGenerationMethods?.includes("generateContent")) {
        throw Object.assign(Error("Unsupported generation method"), { reason: "model_unavailable" });
      }
      return meta;
    });
    if (!listed.value) continue;
    const ping = await check(model, "text_ping", async () => {
      const data = await basicRequest(model, apiKey, fetcher, {
        contents: [{ role: "user", parts: [{ text: "Reply with the word OK." }] }],
        generationConfig: { maxOutputTokens: 512 }
      });
      const text = data?.candidates?.[0]?.content?.parts?.filter(part => !part.thought)
        .map(part => part.text || "").join("").trim();
      if (!text) throw Object.assign(Error("Empty text response"), { reason: "empty_response" });
      return text;
    });
    if (!ping.value) continue;
    const scene = await check(model, "scene_schema_and_jpegs", () =>
      requestPlan(clean, apiKey, fetcher, model, TIMEOUT_MS, EXACT_MODEL));
    if (["invalid_key", "permission_denied", "quota_exceeded", "model_unavailable"].includes(scene.row.reason)) continue;
    const refs = [clean.frames[Math.floor(clean.frames.length / 2)]];
    const brief = validateGeminiFrames({ duration: clean.duration, frames: refs,
      designPrompt: "Use glass panel, elegant serif names, nameSize 8.5 and gold accents." }, 1, 3);
    const initial = await check(model, "design_schema_and_jpeg", () =>
      requestDesign(brief, apiKey, fetcher, model, TIMEOUT_MS, EXACT_MODEL));
    if (!initial.value) continue;
    const previousDesign = resolveVideoDesign(initial.value);
    const followup = validateGeminiFrames({ ...brief, previousDesign,
      designPrompt: "Increase nameSize to 10.5 and set borderWidth to 0. Keep all other settings." }, 1, 3);
    const edit = await check(model, "follow_up", async () => {
      const value = await requestDesign(followup, apiKey, fetcher, model, TIMEOUT_MS, EXACT_MODEL);
      const expected = { ...previousDesign, nameSize: 10.5, borderWidth: 0 };
      if (Object.keys(expected).some(key => expected[key] !== value[key]) ||
          Object.keys(value).some(key => !Object.hasOwn(expected, key))) {
        throw Object.assign(Error("Follow-up differs from requested changes"), { reason: "invalid_layout" });
      }
      return value;
    });
    if (scene.value) log({ model, sceneSummary: (scene.value.scenes || []).map(
      ({ start, end, kind }) => ({ start, end, kind })) });
    log({ model, designSettings: initial.value, followUpSettings: edit.value || null });
  }
  return results;
}

async function main() {
  const { models, video } = parseDiagnosticArgs(process.argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw Error("Missing GEMINI_API_KEY. Use node --env-file=.env scripts/diagnose-gemini.js.");
  console.log(video
    ? "Diagnostic uses selected test-video JPEG frames sent to Google; use only consented footage."
    : "Diagnostic uses a synthetic board JPEG (connectivity/schema check, not real video quality).");
  const sample = video ? await videoSample(video) : syntheticSample();
  const results = await runGeminiDiagnostics({ apiKey, models, sample });
  const expectedStages = 5;
  const ready = models.filter(model => results.filter(row => row.model === model && row.outcome === "pass").length === expectedStages);
  console.log(JSON.stringify({ fullyPassedModels: ready, totalChecks: results.length,
    failedChecks: results.filter(row => row.outcome === "fail").length }));
  if (ready.length !== models.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Do not expose file paths, provider bodies or credentials in copied logs.
    console.error("Diagnostic stopped. Check the private .env, model IDs, test MP4 and installed dependencies. Use the command in docs/gemini-video-analyzer.md.");
    process.exitCode = 1;
  });
}
