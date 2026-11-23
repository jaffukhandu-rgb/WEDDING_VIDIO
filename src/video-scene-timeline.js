// Shared, untrusted-data-only contract for scene-aware Video + HTML plans.
// No model-provided HTML, selectors, CSS or JavaScript is accepted.
const SCENE_KINDS = new Set(["people", "invitation_surface", "decor", "transition", "other"]);
const PANEL_KINDS = ["intro", "details", "events"];
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const within = (value, low, high) =>
  typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
const round = value => Math.round(value * 100) / 100;

function validateArea(area) {
  if (!isObject(area) ||
      !within(area.left, 8, 55) || !within(area.top, 12, 69) ||
      !within(area.width, 35, 85) || !within(area.height, 23, 67) ||
      area.left + area.width > 96 || area.top + area.height > 94) {
    throw new Error("Unsafe scene-aware text area.");
  }
  return {
    left: round(area.left), top: round(area.top),
    width: round(area.width), height: round(area.height)
  };
}

export function validateSceneTimeline(value, duration) {
  if (!isObject(value) || !within(duration, 5, 120) ||
      !Array.isArray(value.scenes) || value.scenes.length < 1 ||
      value.scenes.length > 8) {
    throw new Error("Invalid scene-aware analysis.");
  }
  let last = 0;
  const scenes = value.scenes.map((scene, index) => {
    if (!isObject(scene) || !SCENE_KINDS.has(scene.kind) ||
        !within(scene.start, 0, duration) ||
        !within(scene.end, 0, duration) ||
        scene.end - scene.start < .35 ||
        Math.abs(scene.start - last) > .8 ||
        typeof scene.note !== "string" || scene.note.length > 120) {
      throw new Error("Invalid video scene boundaries.");
    }
    last = scene.end;
    return { start: round(scene.start), end: round(scene.end),
      kind: scene.kind, note: scene.note.trim() };
  });
  if (scenes[0].start > .4 || Math.abs(last - duration) > .8) {
    throw new Error("Video scene coverage is incomplete.");
  }

  // Some footage has too little readable time for two distinct panels.
  // In that case, scene descriptions can still augment the original v1 plan.
  if (value.panels === undefined || value.panels === null) {
    return { scenes, panels: [] };
  }
  if (!Array.isArray(value.panels) || value.panels.length < 2 ||
      value.panels.length > 3) {
    throw new Error("Invalid invitation panel timeline.");
  }
  let previousEnd = -1;
  const panels = value.panels.map((panel, index) => {
    if (!isObject(panel) || panel.kind !== PANEL_KINDS[index] ||
        !within(panel.start, Math.max(0, duration - 20), duration) ||
        !within(panel.end, 0, duration) ||
        panel.end - panel.start < 2.5 ||
        panel.end > duration - .1 ||
        panel.start < previousEnd - .01) {
      throw new Error("Overlapping or unreadable invitation panels.");
    }
    previousEnd = panel.end;
    return { kind: panel.kind, start: round(panel.start), end: round(panel.end),
      textArea: validateArea(panel.textArea) };
  });
  return { scenes, panels };
}

// One bounded Gemini request: overview of entire MP4 + extra keyframes near
// locally detected ending/scene cut. Keep timings chronological and unique.
export function sceneSampleTimes(duration, revealAt, candidateCuts = []) {
  if (!within(duration, 5, 120) || !within(revealAt, 0, duration)) {
    throw new Error("Invalid video timeline samples.");
  }
  const first = .2, last = duration - .2;
  const overview = Array.from({ length: 12 }, (_, i) =>
    first + (last - first) * i / 11);
  const cuts = Array.isArray(candidateCuts) ? candidateCuts.filter(x =>
    within(x, Math.max(0, duration - 12), duration - .5)) : [];
  const cut = cuts.length ? cuts[cuts.length - 1] : revealAt;
  const focus = [
    cut - .45, cut - .1, cut + .2,
    revealAt - 1.2, revealAt - .25, revealAt + .5
  ];
  const times = new Set([...overview, ...focus].map(time =>
    round(Math.min(last, Math.max(first, time)))));
  return [...times].sort((a, b) => a - b).slice(0, 18);
}
