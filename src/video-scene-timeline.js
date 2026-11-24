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
    const surface = ["invitation_surface", "decor"].includes(scene.kind);
    const textArea = surface && scene.textArea != null ? validateArea(scene.textArea) : null;
    const ink = ["#24160e", "#fff1d2"].includes(scene.ink) ? scene.ink : null;
    return { start: round(scene.start), end: round(scene.end),
      kind: scene.kind, note: scene.note.trim(),
      ...(textArea ? { textArea, ...(ink ? { ink } : {}) } : {}) };
  });
  if (scenes[0].start > .4 || Math.abs(last - duration) > .8) {
    throw new Error("Video scene coverage is incomplete.");
  }

  // Some footage has too little readable time for two distinct panels.
  // In that case, scene descriptions can still augment the original v1 plan.
  if (value.panels === undefined || value.panels === null ||
      (Array.isArray(value.panels) && value.panels.length === 0)) {
    return { scenes, panels: [] };
  }
  if (!Array.isArray(value.panels) || value.panels.length < 1 ||
      value.panels.length > 3) {
    throw new Error("Invalid invitation panel timeline.");
  }
  let previousEnd = -1;
  const panels = value.panels.map((panel, index) => {
    if (!isObject(panel) ||
        (value.panels.length === 1 ? panel.kind !== "all" : panel.kind !== PANEL_KINDS[index]) ||
        !within(panel.start, 0, duration) ||
        !within(panel.end, 0, duration) ||
        panel.end - panel.start < 2.5 ||
        panel.end > duration - .1 ||
        panel.start < previousEnd - .01) {
      throw new Error("Overlapping or unreadable invitation panels.");
    }
    previousEnd = panel.end;
    return { kind: panel.kind, start: round(panel.start), end: round(panel.end),
      textArea: validateArea(panel.textArea),
      ...(["#24160e", "#fff1d2"].includes(panel.ink) ? { ink: panel.ink } : {}) };
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
  const overviewCount = duration <= 12 ? 8 : duration <= 45 ? 10 : 12;
  const overview = Array.from({ length: overviewCount }, (_, i) =>
    first + (last - first) * i / (overviewCount - 1));
  const cuts = Array.isArray(candidateCuts) ? candidateCuts.filter(x =>
    within(x, .2, duration - .5)).sort((a, b) => a - b) : [];
  // Spread the extra samples over distinct transitions, not only the ending.
  const distinct = cuts.filter((time, i) => i === 0 || time - cuts[i - 1] > 1);
  const selected = distinct.length > 2
    ? [distinct[0], distinct[Math.floor(distinct.length / 2)], distinct.at(-1)]
    : distinct;
  const focus = duration <= 12
    ? [selected[0] ?? revealAt, revealAt - .2, revealAt + .35]
    : [...selected.flatMap(cut => [cut - .3, cut + .3]),
      revealAt - .25, revealAt + .5].slice(0, 8 - Math.max(0, overviewCount - 10));
  const times = new Set(overview.map(round));
  for (const time of focus) {
    if (times.size >= 18) break;
    times.add(round(Math.min(last, Math.max(first, time))));
  }
  return [...times].sort((a, b) => a - b);
}


// Estimate sustained visual movement from decoded luminance. A frame change
// represents an interval, not an exact cut. Keep a small clearance around it.
export function motionIntervals(frames, duration) {
  const ordered = [...frames].sort((a, b) => a.time - b.time);
  const intervals = [];
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1], b = ordered[i];
    const dt = b.time - a.time;
    if (dt <= 0 || !a.luma?.length || a.luma.length !== b.luma?.length) continue;
    let sum = 0, count = 0;
    for (let j = 0; j < a.luma.length; j += 3) {
      sum += Math.abs(a.luma[j] - b.luma[j]); count++;
    }
    const threshold = Math.min(.095, .022 + .065 * dt);
    if (sum / count <= threshold) continue;
    const start = Math.max(0, a.time - .18);
    const end = Math.min(duration, b.time + .22);
    const previous = intervals.at(-1);
    if (previous && start <= previous.end + .15) previous.end = Math.max(previous.end, end);
    else intervals.push({ start, end });
  }
  return intervals.map(interval => ({ start: round(interval.start), end: round(interval.end) }));
}

// Intersect model-identified surfaces with measured quiet windows. A transition
// or person scene is never promoted to a text surface by pixel stability alone.
export function readableWindows(timeline, motion, duration, coverage = { start: .2, end: duration - .2 }) {
  const windows = [];
  const validated = validateSceneTimeline(timeline, duration);
  for (const scene of validated.scenes) {
    if (!["invitation_surface", "decor"].includes(scene.kind)) continue;
    const supportingPanel = validated.panels.find(panel =>
      panel.start < scene.end && panel.end > scene.start);
    const area = scene.textArea || supportingPanel?.textArea;
    if (!area) continue;
    const ink = scene.ink || supportingPanel?.ink || timeline.ink;
    const start = Math.max(scene.start, coverage.start, .15);
    const end = Math.min(scene.end, coverage.end, duration - .1);
    if (end <= start) continue;
    let cursor = start;
    for (const gap of motion) {
      if (gap.end <= cursor || gap.start >= end) continue;
      if (gap.start - cursor >= 2.5) windows.push({
        start: round(cursor), end: round(Math.min(end, gap.start)), textArea: area, ink
      });
      cursor = Math.max(cursor, gap.end);
      if (cursor >= end) break;
    }
    if (end - cursor >= 2.5) windows.push({ start: round(cursor), end: round(end), textArea: area, ink });
  }
  return windows;
}

// At most three logical content groups. Search the small ordered set of
// windows, allowing several groups in the same window but never crossing a gap.
// This function is dependency-free so the generated invitation can also use it
// with its actual personalized text lengths.
export function allocateReadablePanels(windows, requirements) {
  if (!windows.length) return [];
  const kinds = requirements.map(item => item.kind);
  let best = null;
  const visit = (index, from, assignments) => {
    if (index === requirements.length) {
      const groups = [];
      for (const { windowIndex, requirement } of assignments) {
        let group = groups.at(-1);
        if (!group || group.windowIndex !== windowIndex) {
          group = { windowIndex, requirements: [] }; groups.push(group);
        }
        group.requirements.push(requirement);
      }
      let score = 0;
      const panels = [];
      for (const group of groups) {
        const window = windows[group.windowIndex];
        const available = window.end - window.start;
        const requested = group.requirements.reduce((sum, item) => sum + item.seconds, 0);
        if (available + .0001 < requested) return;
        // Use the full safe window and share surplus in proportion to reading demand.
        let start = window.start;
        for (let i = 0; i < group.requirements.length; i++) {
          const item = group.requirements[i];
          const end = i === group.requirements.length - 1 ? window.end
            : start + available * item.seconds / requested;
          panels.push({ kind: item.kind, start: Math.round(start * 100) / 100,
            end: Math.round(end * 100) / 100, textArea: window.textArea, ink: window.ink });
          start = end;
        }
        score += available;
      }
      // Prefer more readable seconds, then earlier display.
      score -= panels[0].start * .025;
      if (!best || score > best.score) best = { panels, score };
      return;
    }
    for (let i = from; i < windows.length; i++) {
      if (windows[i].end - windows[i].start + .0001 < requirements[index].seconds) continue;
      visit(index + 1, i, [...assignments, { windowIndex: i, requirement: requirements[index] }]);
    }
  };
  if (!kinds.length || kinds.length > 3) return [];
  visit(0, 0, []);
  return best?.panels || [];
}

export function refineScenePlan(timeline, frames, duration) {
  if (frames.length < 2) return null;
  const motion = motionIntervals(frames, duration);
  const windows = readableWindows(timeline, motion, duration,
    { start: frames[0].time, end: frames.at(-1).time });
  const requirements = [
    { kind: "intro", seconds: 4.5 }, { kind: "details", seconds: 5 },
    { kind: "events", seconds: 4 }
  ];
  let panels = allocateReadablePanels(windows, requirements);
  if (!panels.length) panels = allocateReadablePanels(windows, requirements.slice(0, 2));
  if (!panels.length) {
    const longest = [...windows].sort((a,b) => (b.end - b.start) - (a.end - a.start))[0];
    if (!longest) return null;
    panels = [{ ...longest, kind: "all" }];
  }
  const normalized = validateSceneTimeline({ ...timeline, panels }, duration);
  return { ...normalized, safeWindows: windows,
    revealAt: normalized.panels[0].start, textArea: normalized.panels[0].textArea,
    ink: normalized.panels[0].ink || timeline.ink, motionRefined: true };
}
