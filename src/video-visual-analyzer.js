import { isSupportedVideoDuration, MIN_VIDEO_SECONDS, MAX_VIDEO_SECONDS } from "./video-html-contract.js";
import { sceneSampleTimes, validateSceneTimeline } from "./video-scene-timeline.js";

// Visual heuristics only: decoded pixels cannot semantically identify a plaque.
const W = 96, H = 170;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function lumaFromRgba(rgba) {
  const luma = new Float32Array(W * H);
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    luma[i] = (rgba[p] * .2126 + rgba[p + 1] * .7152 + rgba[p + 2] * .0722) / 255;
  }
  return luma;
}
function difference(first, second) {
  let total = 0;
  for (let i = 0; i < first.length; i += 3) total += Math.abs(first[i] - second[i]);
  return total / Math.ceil(first.length / 3);
}
function findArea(frames) {
  // Choose an area that stays quiet while the invitation text is visible.
  // Single-frame inspection can select a region that becomes busy moments later.
  let best = null;
  for (const top of [.28, .32, .36, .40, .44]) {
    for (const left of [.16, .19, .22]) {
      for (const height of [.34, .40, .46]) {
        const width = .84 - left;
        const x0 = Math.round(left * W), x1 = Math.round((left + width) * W);
        const y0 = Math.round(top * H), y1 = Math.round((top + height) * H);
        let mean = 0, spread = 0, texture = 0, motion = 0;
        let minBrightness = 1, maxBrightness = 0;
        for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
          const luma = frames[frameIndex].luma;
          const previous = frameIndex ? frames[frameIndex - 1].luma : null;
          let sum = 0, square = 0, edge = 0, change = 0, n = 0;
          for (let y = y0 + 1; y < y1 - 1; y += 2) {
            for (let x = x0 + 1; x < x1 - 1; x += 2) {
              const i = y * W + x, v = luma[i];
              sum += v; square += v * v; n++;
              edge += Math.abs(v - luma[i - 1]) + Math.abs(v - luma[i + W]);
              if (previous) change += Math.abs(v - previous[i]);
            }
          }
          if (!n) continue;
          const frameAverage = sum / n;
          mean += frameAverage;
          spread += Math.sqrt(Math.max(0, square / n - frameAverage * frameAverage));
          texture += edge / (2 * n);
          if (previous) motion += change / n;
          minBrightness = Math.min(minBrightness, frameAverage);
          maxBrightness = Math.max(maxBrightness, frameAverage);
        }
        const average = mean / frames.length;
        const variance = spread / frames.length;
        texture /= frames.length;
        motion /= Math.max(1, frames.length - 1);
        const brightnessDrift = maxBrightness - minBrightness;
        const score = texture + .14 * variance + .30 * motion + .10 * brightnessDrift +
          .13 * Math.abs(top + height / 2 - .51) + (height < .40 ? .008 : 0);
        if (!best || score < best.score) {
          best = { left, top, width, height, average, variance, texture,
            motion, brightnessDrift, score };
        }
      }
    }
  }
  return best;
}
export function deriveVisualPlan(frames, duration = 30) {
  if (!Array.isArray(frames) || frames.length < 6) throw Error("Insufficient decoded video frames.");
  const ordered = [...frames].sort((a,b) => a.time - b.time);
  const last = ordered[ordered.length - 1];
  if (!last?.luma || ordered.some(frame => frame?.luma?.length !== W * H)) {
    throw Error("Invalid video image data.");
  }
  const changes = ordered.slice(1).map((frame,i) => ({
    start: ordered[i].time, end: frame.time,
    motion: difference(ordered[i].luma, frame.luma)
  }));
  let stationaryFrom = last.time;
  for (let i = changes.length - 1; i >= 0; i--) {
    const item = changes[i];
    if (item.motion > .024 || item.end - item.start > .8) break;
    stationaryFrom = item.start;
  }
  const stable = duration - stationaryFrom >= 2.5;
  const revealAt = Math.round((stable ? clamp(stationaryFrom + .8, duration - 7, duration - 2.5) : duration - 4.5) * 10) / 10;
  const visibleFrames = ordered.filter(frame => frame.time >= revealAt);
  const area = findArea(visibleFrames.length >= 2 ? visibleFrames : ordered.slice(-6));
  const warnings = [];
  if (!stable) warnings.push("No clear stationary ending detected; visually verify the text timing.");
  if (area.texture > .065 || area.variance > .21) {
    warnings.push("The proposed text region appears visually busy; verify readability.");
  }
  if (area.motion > .025 || area.brightnessDrift > .20) {
    warnings.push("The proposed text region changes while text is visible; review placement and contrast.");
  }
  if (stable && duration - (stationaryFrom + .8) < 3.5) {
    warnings.push("The stationary ending leaves less than 3.5 seconds to read; review pacing.");
  }
  const dark = area.average > .48;
  return {
    version: 1, duration,
    revealAt,
    textArea: {
      left: Math.round(area.left * 100), top: Math.round(area.top * 100),
      width: Math.round(area.width * 100), height: Math.round(area.height * 100)
    },
    ink: dark ? "#24160e" : "#fff1d2",
    shadow: dark ? "rgba(255,245,224,.4)" : "rgba(12,6,2,.7)",
    confidence: stable && area.texture < .065 && area.variance < .21 &&
      area.motion < .025 && area.brightnessDrift < .20 ? "medium" : "low",
    candidateCuts: changes.filter(x => x.motion > .105).map(x => Number(x.end.toFixed(1))),
    warnings
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
export async function analyzeVideoVisual(source, onProgress = () => {}, options = {}) {
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
    const frames = [];
    const times = [];
    for (let t = Math.max(0, duration - 12); t < duration - .22; t += .5) times.push(Number(t.toFixed(2)));
    for (let i = 0; i < times.length; i++) {
      await seek(video, times[i]);
      ctx.drawImage(video, 0, 0, W, H);
      let image;
      try { image = ctx.getImageData(0, 0, W, H); }
      catch { throw Error("Video frame access blocked by cross-origin permissions."); }
      frames.push({ time: times[i], luma: lumaFromRgba(image.data) });
      onProgress(Math.round((i + 1) / times.length * 100));
    }
    const localPlan = deriveVisualPlan(frames, duration);
    // Video frame analysis always remains usable without an AI key.
    if (!options.ai?.adminKey || !options.ai?.apiRoot) return localPlan;
    const root = options.ai.apiRoot.endsWith("/")
      ? options.ai.apiRoot.slice(0, -1) : options.ai.apiRoot;
    const endpoint = root + "/api/admin/video-analysis";
    const headers = { "X-Admin-Key": options.ai.adminKey };
    let aiFailure = "request failed";
    try {
      const capabilityController = new AbortController();
      const capabilityTimeout = setTimeout(() => capabilityController.abort(), 5000);
      let status;
      try {
        status = await fetch(endpoint, {
          headers, cache: "no-store", signal: capabilityController.signal
        });
      } finally { clearTimeout(capabilityTimeout); }
      if (!status.ok || !(await status.json()).enabled) return localPlan;
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 256;
      sampleCanvas.height = 455;
      const sampleContext = sampleCanvas.getContext("2d");
      if (!sampleContext) return localPlan;
      const images = [];
      // Coarse overview spans the whole MP4; local cuts add keyframes
      // near the final invitation surface without streaming full footage.
      const times = sceneSampleTimes(duration, localPlan.revealAt, localPlan.candidateCuts);
      for (const time of times) {
        await seek(video, time);
        sampleContext.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const jpeg = sampleCanvas.toDataURL("image/jpeg", .57).split(",")[1];
        if (!jpeg || jpeg.length > 180000) throw Error("Frame sample too large.");
        images.push({ time, jpeg });
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 42000);
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ duration, frames: images }),
          signal: controller.signal
        });
      } finally { clearTimeout(timeout); }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        const reasons = {
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
        aiFailure = reasons[failure?.reason] || "request failed";
        throw Error("AI video plan unavailable.");
      }
      const plan = (await response.json()).plan;
      // Reject malformed responses even if the server was compromised.
      const area = plan?.textArea;
      if (plan?.version !== 1 || plan.duration !== duration ||
          !Number.isFinite(plan.revealAt) || plan.revealAt < Math.max(0, duration - 20) ||
          plan.revealAt > duration - 1.5 || !area ||
          ![area.left, area.top, area.width, area.height].every(Number.isFinite) ||
          area.left < 8 || area.left > 55 || area.top < 12 || area.top > 69 ||
          area.width < 35 || area.width > 85 || area.height < 23 || area.height > 67 ||
          area.left + area.width > 96 || area.top + area.height > 94 ||
          !["#24160e", "#fff1d2"].includes(plan.ink) ||
          !["medium", "low"].includes(plan.confidence) ||
          !Array.isArray(plan.warnings) || plan.warnings.length > 3 ||
          plan.warnings.some(w => typeof w !== "string" || w.length > 130)) {
        throw Error("Invalid AI video plan.");
      }
      // Shared strict scene/timeline validator is also used by the backend.
      // Never let untrusted model-provided timing or selectors reach the HTML.
      const timeline = (plan.scenes !== undefined || plan.panels !== undefined)
        ? validateSceneTimeline(plan, duration) : null;
      return { ...localPlan, ...plan,
        ...(timeline ? { scenes: timeline.scenes, panels: timeline.panels } : {}),
        warnings: [
          ...localPlan.warnings, ...plan.warnings,
          "Gemini-assisted layout: review the full video before publishing."
        ]
      };
    } catch {
      return { ...localPlan, warnings: [
        ...localPlan.warnings,
        "Gemini unavailable (" + aiFailure + "); used reliable local video analysis."
      ] };
    }
  } finally {
    video.pause(); video.removeAttribute("src"); video.load();
    if (local) URL.revokeObjectURL(url);
  }
}
