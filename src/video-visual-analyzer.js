import { isSupportedVideoDuration, MIN_VIDEO_SECONDS, MAX_VIDEO_SECONDS } from "./video-html-contract.js";
import { normalizeDesignPrompt, validateVideoDesign, resolveVideoDesign, mergeVideoDesign } from "./video-invitation-design.js";
import { sceneSampleTimes, validateSceneTimeline, motionIntervals, refineScenePlan,
  validateReadableWindows, validateTextArea, planReadableWindows } from "./video-scene-timeline.js";

// Visual heuristics only: decoded pixels cannot semantically identify a plaque.
const W = 96, H = 170;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const roundTime = time => Math.round(time * 100) / 100;
const darkInk = "#24160e";
const lightInk = "#fff1d2";
const textShadow = ink => ink === darkInk ? "rgba(255,245,224,.4)" : "rgba(12,6,2,.7)";

function lumaFromRgba(rgba) {
  const luma = new Float32Array(W * H);
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    luma[i] = (rgba[p] * .2126 + rgba[p + 1] * .7152 + rgba[p + 2] * .0722) / 255;
  }
  return luma;
}
function measureArea(frames, left, top, width, height) {
  const x0 = Math.round(left * W), x1 = Math.round((left + width) * W);
  const y0 = Math.round(top * H), y1 = Math.round((top + height) * H);
  let mean = 0, spread = 0, texture = 0, motion = 0, peakMotion = 0;
  let minBrightness = 1, maxBrightness = 0;
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const luma = frames[frameIndex].luma;
    const previous = frameIndex ? frames[frameIndex - 1].luma : null;
    let sum = 0, square = 0, edge = 0, change = 0, n = 0;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x++) {
        const i = y * W + x, v = luma[i];
        sum += v; square += v * v; n++;
        edge += Math.abs(v - luma[i - 1]) + Math.abs(v - luma[i + 1]) +
          Math.abs(v - luma[i - W]) + Math.abs(v - luma[i + W]);
        if (previous) change += Math.abs(v - previous[i]);
      }
    }
    const frameAverage = sum / n;
    mean += frameAverage;
    spread += Math.sqrt(Math.max(0, square / n - frameAverage * frameAverage));
    texture += edge / (4 * n);
    motion += change / n;
    peakMotion = Math.max(peakMotion, change / n);
    minBrightness = Math.min(minBrightness, frameAverage);
    maxBrightness = Math.max(maxBrightness, frameAverage);
  }
  return {
    left, top, width, height, average: mean / frames.length,
    variance: spread / frames.length, texture: texture / frames.length,
    motion: motion / Math.max(1, frames.length - 1), peakMotion,
    brightnessDrift: maxBrightness - minBrightness
  };
}

function isReadableArea(area) {
  return area.average >= .035 && area.texture <= .065 && area.variance <= .16 &&
    area.motion <= .037 && area.peakMotion <= .075 && area.brightnessDrift <= .15;
}

function findArea(frames) {
  // Test rectangles across the middle of the frame. A narrow area can avoid
  // a busy border or smoke, but prefer more space when contrast is comparable.
  let best = null;
  for (const centerY of [.40, .49, .57, .65]) {
    for (const centerX of [.35, .43, .50, .57, .65]) {
      for (const width of [.36, .44, .52, .60, .68, .76]) {
        const left = centerX - width / 2;
        if (left < .08 || left + width > .96) continue;
        for (const height of [.28, .36, .44, .52]) {
          const top = centerY - height / 2;
          if (top < .12 || top + height > .94) continue;
          const area = measureArea(frames, left, top, width, height);
          if (!isReadableArea(area)) continue;
          const score = area.texture + .20 * area.variance + .55 * area.motion + .14 * area.brightnessDrift +
            .06 * Math.abs(centerY - .53) + .08 * Math.abs(centerX - .5) - .13 * width * height;
          if (!best || score < best.score) best = { ...area, score };
        }
      }
    }
  }
  return best;
}

function sortedFrames(frames) {
  if (!Array.isArray(frames) || frames.length < 6) throw Error("Insufficient decoded video frames.");
  if (frames.some(frame => !Number.isFinite(frame?.time) || frame?.luma?.length !== W * H)) {
    throw Error("Invalid video image data.");
  }
  return [...frames].sort((a, b) => a.time - b.time);
}

function percentArea(area) {
  return {
    left: Math.round(area.left * 100), top: Math.round(area.top * 100),
    width: Math.round(area.width * 100), height: Math.round(area.height * 100)
  };
}

// Gemini identifies what a scene contains, while decoded frames are more
// precise about when a continuous shot becomes still. Extend a model-approved
// surface to the full overlapping local quiet interval, but never through a
// scene that Gemini identified as people or a transition.
export function reconcileReadableWindows(refined, localPlan, scenes, duration, frames = []) {
  if (!refined?.safeWindows?.length || !localPlan?.safeWindows?.length) return refined;
  // Keep locally refined semantic boundaries rather than the original estimates.
  const semanticScenes = refined.scenes || scenes;
  const blocked = semanticScenes.filter(scene =>
    scene.kind === "people" || scene.kind === "transition");
  const original = validateReadableWindows(refined.safeWindows, duration);
  const expanded = original.map(window => ({ ...window }));
  for (const local of localPlan.safeWindows) {
    let segments = [{ start: local.start, end: local.end }];
    for (const scene of blocked) {
      segments = segments.flatMap(segment => {
        if (scene.end <= segment.start || scene.start >= segment.end) return [segment];
        return [
          ...(scene.start - segment.start >= 2.49
            ? [{ start: segment.start, end: scene.start }] : []),
          ...(segment.end - scene.end >= 2.49
            ? [{ start: scene.end, end: segment.end }] : [])
        ];
      });
    }
    for (const segment of segments) {
      const matches = original.map((window, index) => ({ window, index }))
        .filter(({ window }) => window.start < segment.end && window.end > segment.start);
      // Multiple model surfaces in one quiet shot may have different layouts.
      // Preserve the distinct verified windows rather than merging them.
      if (matches.length !== 1) continue;
      const { index } = matches[0];
      const current = expanded[index];
      const start = Math.max(expanded[index - 1]?.end ?? 0, Math.min(current.start, segment.start));
      const end = Math.min(expanded[index + 1]?.start ?? duration, Math.max(current.end, segment.end));
      if (start === current.start && end === current.end) continue;
      if (blocked.some(scene => scene.start < end && scene.end > start)) continue;
      const ai = current.textArea, pixel = local.textArea;
      const left = Math.max(ai.left, pixel.left), top = Math.max(ai.top, pixel.top);
      const width = Math.min(ai.left + ai.width, pixel.left + pixel.width) - left;
      const height = Math.min(ai.top + ai.height, pixel.top + pixel.height) - top;
      if (width < 35 || height < 23) continue;
      const shared = validateTextArea({ left, top, width, height });
      let textArea = shared, ink = current.ink;
      if (frames.length) {
        const quiet = frames.filter(frame => frame.time >= start && frame.time <= end);
        if (quiet.length < 3) continue;
        const sample = quiet.length <= 18 ? quiet : Array.from({ length: 18 }, (_, i) =>
          quiet[Math.round(i * (quiet.length - 1) / 17)]);
        // Prefer the model's semantically identified board rectangle only if
        // decoded pixels also verify it throughout the extended interval.
        let verified = false;
        for (const area of [ai, shared]) {
          const measured = measureArea(sample, area.left / 100, area.top / 100,
            area.width / 100, area.height / 100);
          if (!isReadableArea(measured)) continue;
          textArea = area;
          ink = measured.average > .48 ? darkInk : lightInk;
          verified = true;
          break;
        }
        if (!verified) continue;
      } else if (current.ink !== local.ink) continue;
      expanded[index] = { start, end, textArea, ink };
    }
  }
  // Replace each existing window once instead of appending overlapping copies.
  const safeWindows = validateReadableWindows(expanded, duration);
  const schedule = planReadableWindows(safeWindows);
  if (!schedule) return refined;
  try {
    const timeline = validateSceneTimeline({ scenes: semanticScenes, panels: schedule.panels }, duration);
    return { ...refined, ...schedule, ...timeline, safeWindows };
  } catch {
    // A borderline rounded panel must not discard the verified AI plan.
    return refined;
  }
}

export function deriveVisualPlan(frames, duration = 30, excludedScenes = []) {
  if (!isSupportedVideoDuration(duration)) throw Error("Unsupported video duration.");
  const ordered = sortedFrames(frames);
  const last = ordered.at(-1);
  const coverageEnd = Math.min(last.time, duration - .1);
  const windows = [];
  let start = Math.max(ordered[0].time, .15);
  const gaps = [...motionIntervals(ordered, duration), ...excludedScenes,
    { start: coverageEnd, end: coverageEnd }].sort((a, b) => a.start - b.start);
  for (const gap of gaps) {
    const end = Math.min(gap.start, coverageEnd);
    if (end - start >= 2.5) {
      const quiet = ordered.filter(frame => frame.time >= start && frame.time <= end);
      if (quiet.length >= 3) {
        // Keep rectangle checks bounded on long shots, including both ends.
        const sampled = quiet.length <= 18 ? quiet : Array.from({ length: 18 }, (_, index) =>
          quiet[Math.round(index * (quiet.length - 1) / 17)]);
        const area = findArea(sampled);
        if (area) windows.push({ start, end,
          textArea: percentArea(area), ink: area.average > .48 ? darkInk : lightInk });
      }
    }
    start = Math.max(start, gap.end);
  }
  const safeWindows = validateReadableWindows(windows, duration);
  const schedule = planReadableWindows(safeWindows);
  const ink = schedule?.ink || lightInk;
  const readableSeconds = safeWindows.reduce((total, window) => total + window.end - window.start, 0);
  return {
    version: 1, duration, motionRefined: true, safeWindows,
    panels: schedule?.panels || [], revealAt: schedule?.revealAt ?? 0,
    textArea: schedule?.textArea || { left: 20, top: 30, width: 60, height: 40 },
    ink, shadow: textShadow(ink),
    confidence: readableSeconds >= 6 ? "medium" : "low",
    warnings: !safeWindows.length ? ["No stable, readable text window detected. Review the footage before publishing."]
      : ["Locally estimated text placement. Check that the text fits the background throughout the preview.",
        ...(readableSeconds < 6 ? ["There is little stable footage for the invitation text. Review reading time."] : [])]
  };
}
function seek(video, time) {
  return new Promise((resolve,reject) => {
    const timeout = setTimeout(() => finish(Error("Video frame seek timed out.")), 12000);
    function finish(error) {
      clearTimeout(timeout);
      video.removeEventListener("seeked", success);
      video.removeEventListener("error", failed);
      error ? reject(error) : resolve();
    }
    const success = () => finish();
    const failed = () => finish(Error("Video decoding failed."));
    video.addEventListener("seeked", success, { once:true });
    video.addEventListener("error", failed, { once:true });
    try {
      video.currentTime = time;
      if (!video.seeking && video.readyState >= 2 &&
          Math.abs(video.currentTime - time) < .001) finish();
    } catch(error) { finish(error); }
  });
}
// Keep a full-video overview plus the earliest and central samples of
// representative readable windows. The dense local scan remains unchanged.
export function selectSceneEvidenceTimes(duration, localPlan, edges) {
  const windows = localPlan.safeWindows;
  const centres = windows.map(w => (w.start + w.end) / 2);
  const all = sceneSampleTimes(duration, localPlan.revealAt, [...edges, ...centres]);
  if (all.length <= 14) return all;
  const selected = new Set([all[0], all.at(-1)]);
  const representative = windows.length <= 3 ? windows :
    [windows[0], windows[Math.floor(windows.length / 2)], windows.at(-1)];
  for (const window of representative) {
    const inside = all.filter(time => time >= window.start && time <= window.end);
    if (!inside.length) continue;
    selected.add(inside[0]);
    const middle = (window.start + window.end) / 2;
    selected.add(inside.reduce((best, time) => Math.abs(time - middle) < Math.abs(best - middle) ? time : best));
  }
  while (selected.size < 14) {
    const distance = time => Math.min(...[...selected].map(other => Math.abs(time - other)));
    selected.add(all.filter(time => !selected.has(time)).reduce((best, time) =>
      distance(time) > distance(best) ? time : best));
  }
  return [...selected].sort((x, y) => x - y);
}

export function selectDesignFrames(images, windows) {
  const chosen = [];
  const representative = windows.length <= 3 ? windows :
    [windows[0], windows[Math.floor(windows.length / 2)], windows.at(-1)];
  for (const window of representative) {
    const inside = images.filter(frame => frame.time >= window.start && frame.time <= window.end);
    if (!inside.length) continue;
    const middle = (window.start + window.end) / 2;
    const frame = inside.reduce((best, item) =>
      Math.abs(item.time - middle) < Math.abs(best.time - middle) ? item : best);
    if (!chosen.includes(frame)) chosen.push(frame);
  }
  if (!chosen.length && images.length) chosen.push(images[Math.floor(images.length / 2)]);
  return chosen.sort((x, y) => x.time - y.time);
}

const AI_REASONS = {
  invalid_key: "invalid API key",
  permission_denied: "API permission denied",
  model_unavailable: "selected model unavailable",
  quota_exceeded: "API quota exceeded",
  invalid_request: "Gemini rejected the request",
  provider_unavailable: "Gemini service unavailable",
  timeout: "Gemini request timed out",
  empty_response: "Gemini produced no plan",
  invalid_json: "Gemini returned invalid JSON",
  invalid_layout: "Gemini returned an invalid layout",
  request_failed: "request failed"
};
const AI_LAYOUT_DETAILS = {
  plan_shape: "plan structure", reveal_time: "reveal time", text_area: "text area bounds",
  palette: "palette or confidence", warnings: "warning format", scene_list: "scene list",
  scene_metadata: "scene description", scene_boundaries: "scene boundaries", scene_coverage: "scene coverage",
  scene_text_area: "scene text area", panel_list: "panel list",
  panel_boundaries: "panel timing", panel_text_area: "panel text area"
};

function aiError(reason, detail) {
  const code = Object.hasOwn(AI_REASONS, reason) ? reason : "request_failed";
  const message = AI_REASONS[code] + (code === "invalid_layout" && Object.hasOwn(AI_LAYOUT_DETAILS, detail)
    ? ": " + AI_LAYOUT_DETAILS[detail] : "");
  return Object.assign(new Error(message), { reason: code });
}

export const GEMINI_CLIENT_STAGE_TIMEOUT_MS = 105_000;
async function fetchAiJson(endpoint, headers, body, timeoutMs = GEMINI_CLIENT_STAGE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
      cache: "no-store", ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (controller.signal.aborted) throw aiError("timeout");
    if (!response.ok) throw aiError(data?.reason, data?.layoutDetail);
    if (!data) throw aiError("invalid_json");
    return data;
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") throw aiError("timeout");
    if (Object.hasOwn(AI_REASONS, error?.reason)) throw error;
    throw aiError("request_failed");
  } finally {
    clearTimeout(timer);
  }
}

function refineAiScene(plan, localPlan, decoded, duration) {
  // Reject malformed responses even if the server was compromised.
  if (plan?.version !== 1 || plan.duration !== duration ||
      !Number.isFinite(plan.revealAt) || plan.revealAt < 0 ||
      plan.revealAt > duration - 1.5 || ![darkInk, lightInk].includes(plan.ink) ||
      !["medium", "low"].includes(plan.confidence) ||
      !Array.isArray(plan.warnings) || plan.warnings.length > 3 ||
      plan.warnings.some(w => typeof w !== "string" || w.length > 130)) {
    throw Error("Invalid AI video plan.");
  }
  const textArea = validateTextArea(plan.textArea);
  // Shared strict scene/timeline validator is also used by the backend.
  // Never let untrusted model-provided timing or selectors reach the HTML.
  const timeline = (plan.scenes !== undefined || plan.panels !== undefined)
    ? validateSceneTimeline(plan, duration) : null;
  const scenePlan = timeline ? refineScenePlan(
    { ...plan, textArea, ...timeline }, decoded, duration) : null;
  const refined = scenePlan ? reconcileReadableWindows(
    scenePlan, localPlan, timeline.scenes, duration, decoded) : null;
  if (!refined) {
    const excludedScenes = timeline?.scenes.filter(scene =>
      scene.kind === "people" || scene.kind === "transition");
    const fallback = excludedScenes?.length ? deriveVisualPlan(decoded, duration, excludedScenes) : localPlan;
    return { ...fallback, aiAssisted: true, warnings: [
      ...fallback.warnings, ...plan.warnings,
      "Gemini supplied no locally verified text window. Review the local analysis."
    ] };
  }
  return { ...plan, ...refined, design: null, shadow: textShadow(refined.ink),
    warnings: [...plan.warnings,
      "Locally refined " + refined.safeWindows.length + " readable window(s); verify motion and pacing.",
      "Gemini-assisted layout: review the full video before publishing."] };
}

// Session evidence is in memory only. Successful stages are cached by video
// and prompt, never by credentials; the caller supplies the current admin key.
export async function runVideoAiStages(session, options = {}) {
  const designPrompt = normalizeDesignPrompt(options.designPrompt);
  const { localPlan, decoded, images } = session;
  const duration = localPlan.duration;
  const onStage = options.onStage || (() => {});
  let scene = session.scenePlan || localPlan;
  // Explicit edits use the style from the actual editor, not a stale cache.
  const previousDesign = resolveVideoDesign(options.previousDesign);
  const refineDesign = Boolean(options.refineDesign && designPrompt && previousDesign);
  let design = !refineDesign && designPrompt && session.designPrompt === designPrompt
    ? session.design : null;
  const warnings = [];
  const finish = () => ({ ...scene, design: design || null, aiStageStatus: {
    scene: session.scenePlan ? "ready" : "fallback",
    design: !designPrompt ? "not_requested" : design ? "ready" : "fallback"
  }, warnings: [...scene.warnings, ...warnings] });
  if (!refineDesign && session.scenePlan && (!designPrompt || design)) return finish();
  if (!options.ai?.adminKey || !options.ai?.apiRoot || !images?.length) {
    warnings.push("Gemini unavailable (not configured or no reference frames). Used available analysis.");
    return finish();
  }
  const root = options.ai.apiRoot.replace(/\/$/, "");
  const endpoint = root + "/api/admin/video-analysis";
  const headers = { "X-Admin-Key": options.ai.adminKey };
  try {
    onStage("Checking Gemini availability…", "evidence");
    const capability = await fetchAiJson(endpoint, headers, null, 5000);
    if (!capability.enabled) throw aiError("request_failed");
  } catch (error) {
    warnings.push("Gemini unavailable (" + error.message + "). Used available analysis.");
    return finish();
  }
  let blocked = false;
  if (!session.scenePlan && !refineDesign) {
    onStage("Gemini scene analysis…", "scene");
    try {
      const result = await fetchAiJson(endpoint, headers, { duration, frames: images,
        localWindows: localPlan.safeWindows });
      try { scene = refineAiScene(result.plan, localPlan, decoded, duration); }
      catch { throw aiError("invalid_layout"); }
      session.scenePlan = scene;
    } catch (error) {
      warnings.push("Gemini unavailable (" + error.message + "). Used local frame analysis.");
      blocked = ["invalid_key", "permission_denied", "quota_exceeded", "model_unavailable"].includes(error.reason);
    }
  } else onStage(refineDesign ? "Keeping the current invitation timing…" : "Reusing successful Gemini scene analysis…", "scene");
  if (designPrompt && !design && !blocked) {
    onStage(refineDesign ? "Refining your current design with Gemini…" : "Gemini custom design…", "design");
    try {
      const frames = selectDesignFrames(images, scene.safeWindows || []);
      const result = await fetchAiJson(root + "/api/admin/video-design", headers, {
        duration, frames, localWindows: scene.safeWindows || [], designPrompt,
        ...(refineDesign ? { previousDesign } : {}) });
      design = refineDesign ? mergeVideoDesign(previousDesign, result.design) : validateVideoDesign(result.design);
      if (!design) throw aiError("invalid_layout");
      session.design = design;
      session.designPrompt = designPrompt;
    } catch (error) {
      warnings.push("Custom Gemini design unavailable (" + error.message + "). " +
        (refineDesign ? "Current design retained." : "Standard style used."));
    }
  } else if (designPrompt && !design) {
    warnings.push("Custom design was not attempted because Gemini access is unavailable.");
  }
  onStage("AI stages finished; preparing invitation…", "aiDone");
  return finish();
}

export async function analyzeVideoVisual(source, onProgress = () => {}, options = {}) {
  normalizeDesignPrompt(options.designPrompt);
  if (options.session?.source === source && options.session.localPlan && options.session.images?.length) {
    return runVideoAiStages(options.session, options);
  }
  if (options.session) {
    for (const key of ["source", "localPlan", "decoded", "images", "scenePlan", "design", "designPrompt"]) {
      delete options.session[key];
    }
  }
  const local = source instanceof Blob;
  if (!local && typeof source !== "string") throw TypeError("Video URL or file required.");
  const url = local ? URL.createObjectURL(source) : source;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  try {
    await new Promise((resolve,reject) => {
      const timeout = setTimeout(() => finish(Error("Video metadata timed out.")), 18000);
      function finish(error) {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        error ? reject(error) : resolve();
      }
      video.onloadedmetadata = () => finish();
      video.onerror = () => finish(Error("Browser cannot decode this video."));
      video.src = url; video.load();
    });
    const duration = video.duration;
    if (!isSupportedVideoDuration(duration)) {
      throw Error("Background MP4 must be " + MIN_VIDEO_SECONDS + "–" + MAX_VIDEO_SECONDS + " seconds long.");
    }
    if (Math.abs(video.videoWidth / video.videoHeight - 9 / 16) > .03) {
      throw Error("Expected a portrait 9:16 MP4.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw Error("Canvas analysis is unavailable.");
    const measured = new Map();
    const sampleMotion = async time => {
      if (measured.has(time)) return;
      await seek(video, time);
      ctx.drawImage(video, 0, 0, W, H);
      let image;
      try { image = ctx.getImageData(0, 0, W, H); }
      catch { throw Error("Video frame access blocked by cross-origin permissions."); }
      measured.set(time, { time, width: W, luma: lumaFromRgba(image.data) });
    };
    // Decode the same bounded whole-video scan with or without Gemini.
    const first = .2, last = roundTime(duration - .2);
    const step = duration <= 45 ? .5 : 1;
    const coarseTimes = [first];
    for (let t = step; t < last; t += step) coarseTimes.push(t);
    coarseTimes.push(last);
    for (let i = 0; i < coarseTimes.length; i++) {
      await sampleMotion(coarseTimes[i]);
      onProgress(Math.round((i + 1) / coarseTimes.length * 80));
    }

    // The coarse change spans bracket timing uncertainty. Sample both sides
    // of representative boundaries at quarter-second intervals before padding.
    const rawMotion = motionIntervals([...measured.values()], duration, { padding: false });
    const edges = rawMotion.flatMap(gap => [gap.start, gap.end]).filter(time => time > first && time < last);
    const edgeLimit = 12;
    const selectedEdges = edges.length <= edgeLimit ? edges : Array.from({ length: edgeLimit },
      (_, i) => edges[Math.round(i * (edges.length - 1) / (edgeLimit - 1))]);
    const fineTimes = new Set();
    for (const edge of selectedEdges) {
      for (let offset = -step; offset <= step; offset += .25) {
        const time = roundTime(clamp(edge + offset, first, last));
        if (!measured.has(time)) fineTimes.add(time);
      }
    }
    let sampled = 0;
    for (const time of [...fineTimes].sort((a, b) => a - b)) {
      await sampleMotion(time);
      onProgress(80 + Math.round(++sampled / fineTimes.size * 20));
    }
    if (!fineTimes.size) onProgress(100);
    const decoded = [...measured.values()].sort((a, b) => a.time - b.time);
    const localPlan = deriveVisualPlan(decoded, duration);
    if (!options.ai?.adminKey || !options.ai?.apiRoot) return localPlan;
    const session = options.session || {};
    const images = [];
    try {
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 256;
      sampleCanvas.height = 455;
      const sampleContext = sampleCanvas.getContext("2d");
      if (!sampleContext) throw Error("Canvas unavailable.");
      const times = selectSceneEvidenceTimes(duration, localPlan, selectedEdges);
      options.onStage?.("Preparing representative Gemini frames…", "evidence");
      for (const time of times) {
        await seek(video, time);
        sampleContext.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const jpeg = sampleCanvas.toDataURL("image/jpeg", .57).split(",")[1];
        if (!jpeg || jpeg.length > 180000) throw Error("Frame sample too large.");
        images.push({ time, jpeg });
      }
    } catch {
      return { ...localPlan, warnings: [...localPlan.warnings,
        "Gemini unavailable (AI frame sampling failed). Used local frame analysis."] };
    }
    Object.assign(session, { source, localPlan, decoded, images });
    return await runVideoAiStages(session, options);
  } finally {
    video.pause(); video.removeAttribute("src"); video.load();
    if (local) URL.revokeObjectURL(url);
  }
}
