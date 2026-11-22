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
function findArea(frame) {
  const { luma } = frame;
  let best = null;
  for (const top of [.28, .32, .36, .40, .44]) {
    for (const left of [.16, .19, .22]) {
      for (const height of [.34, .40, .46]) {
        const width = .84 - left;
        const x0 = Math.round(left * W), x1 = Math.round((left + width) * W);
        const y0 = Math.round(top * H), y1 = Math.round((top + height) * H);
        let sum = 0, square = 0, edge = 0, n = 0;
        for (let y = y0 + 1; y < y1 - 1; y += 2) {
          for (let x = x0 + 1; x < x1 - 1; x += 2) {
            const i = y * W + x, v = luma[i];
            sum += v; square += v * v; n++;
            edge += Math.abs(v - luma[i - 1]) + Math.abs(v - luma[i + W]);
          }
        }
        if (!n) continue;
        const average = sum / n, variance = Math.sqrt(Math.max(0, square / n - average * average));
        const texture = edge / (2 * n);
        const score = texture + .14 * variance +
          .13 * Math.abs(top + height / 2 - .51) + (height < .40 ? .008 : 0);
        if (!best || score < best.score) {
          best = { left, top, width, height, average, variance, texture, score };
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
  if (!last?.luma || last.luma.length !== W * H) throw Error("Invalid video image data.");
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
  const area = findArea(last);
  const warnings = [];
  if (!stable) warnings.push("No clear stationary ending detected; visually verify the text timing.");
  if (area.texture > .065 || area.variance > .21) {
    warnings.push("The proposed text region appears visually busy; verify readability.");
  }
  if (stable && duration - (stationaryFrom + .8) < 3.5) {
    warnings.push("The stationary ending leaves less than 3.5 seconds to read; review pacing.");
  }
  const dark = area.average > .48;
  return {
    version: 1, duration,
    revealAt: Math.round((stable ? clamp(stationaryFrom + .8, duration - 7, duration - 2.5) : duration - 4.5) * 10) / 10,
    textArea: {
      left: Math.round(area.left * 100), top: Math.round(area.top * 100),
      width: Math.round(area.width * 100), height: Math.round(area.height * 100)
    },
    ink: dark ? "#24160e" : "#fff1d2",
    shadow: dark ? "rgba(255,245,224,.4)" : "rgba(12,6,2,.7)",
    confidence: stable && area.texture < .065 && area.variance < .21 ? "medium" : "low",
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
export async function analyzeVideoVisual(source, onProgress = () => {}) {
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
    const duration = Math.min(30, video.duration);
    if (!Number.isFinite(duration) || Math.abs(video.duration - 30) > .5 ||
        Math.abs(video.videoWidth / video.videoHeight - 9 / 16) > .03) {
      throw Error("Expected a 30-second portrait 9:16 MP4.");
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
    return deriveVisualPlan(frames, duration);
  } finally {
    video.pause(); video.removeAttribute("src"); video.load();
    if (local) URL.revokeObjectURL(url);
  }
}
