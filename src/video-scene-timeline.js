// Shared, untrusted-data-only contract for scene-aware Video + HTML plans.
// No model-provided HTML, selectors, CSS or JavaScript is accepted.
const SCENE_KINDS = new Set(["people", "invitation_surface", "decor", "transition", "other"]);
const PANEL_KINDS = ["intro", "details", "events"];
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const within = (value, low, high) =>
  typeof value === "number" && Number.isFinite(value) && value >= low && value <= high;
const round = value => Math.round(value * 100) / 100;

function layoutError(message, layoutDetail) {
  return Object.assign(new Error(message), { layoutDetail });
}

export function validateTextArea(area, layoutDetail = "text_area") {
  if (!isObject(area) ||
      !within(area.left, 8, 55) || !within(area.top, 12, 69) ||
      !within(area.width, 35, 85) || !within(area.height, 23, 67) ||
      area.left + area.width > 96 + 1e-9 || area.top + area.height > 94 + 1e-9) {
    throw layoutError("Unsafe scene-aware text area.", layoutDetail);
  }
  const left = round(area.left), top = round(area.top);
  return {
    left, top,
    width: round(Math.min(area.width, 96 - left)),
    height: round(Math.min(area.height, 94 - top))
  };
}

export function validateSceneTimeline(value, duration) {
  if (!isObject(value) || !within(duration, 5, 120) ||
      !Array.isArray(value.scenes) || value.scenes.length < 1 ||
      value.scenes.length > 8) {
    throw layoutError("Invalid scene-aware analysis.", "scene_list");
  }
  let last = 0;
  const scenes = value.scenes.map(scene => {
    if (!isObject(scene) || !SCENE_KINDS.has(scene.kind) ||
        typeof scene.note !== "string" || scene.note.length > 120) {
      throw layoutError("Invalid video scene boundaries.", "scene_metadata");
    }
    if (!within(scene.start, 0, duration) ||
        !within(scene.end, 0, duration) ||
        scene.end - scene.start < .35 - 1e-9 ||
        Math.abs(scene.start - last) > .8 + 1e-9) {
      throw layoutError("Invalid video scene boundaries.", "scene_boundaries");
    }
    last = scene.end;
    const surface = ["invitation_surface", "decor"].includes(scene.kind);
    const textArea = surface && scene.textArea != null
      ? validateTextArea(scene.textArea, "scene_text_area") : null;
    const ink = ["#24160e", "#fff1d2"].includes(scene.ink) ? scene.ink : null;
    return { start: scene.start, end: scene.end,
      kind: scene.kind, note: scene.note.trim(),
      ...(textArea ? { textArea, ...(ink ? { ink } : {}) } : {}) };
  });
  if (scenes[0].start > .4 || Math.abs(last - duration) > .8 + 1e-9) {
    throw layoutError("Video scene coverage is incomplete.", "scene_coverage");
  }

  // Some footage has too little readable time for two distinct panels.
  // In that case, scene descriptions can still augment the original v1 plan.
  if (value.panels === undefined || value.panels === null ||
      (Array.isArray(value.panels) && value.panels.length === 0)) {
    return { scenes, panels: [] };
  }
  if (!Array.isArray(value.panels) || value.panels.length < 1 ||
      value.panels.length > 3) {
    throw layoutError("Invalid invitation panel timeline.", "panel_list");
  }
  let previousEnd = -1;
  const panels = value.panels.map((panel, index) => {
    if (!isObject(panel) ||
        (value.panels.length === 1 ? panel.kind !== "all" : panel.kind !== PANEL_KINDS[index]) ||
        !within(panel.start, 0, duration) ||
        !within(panel.end, 0, duration) ||
        panel.end - panel.start < 2.5 - 1e-9 ||
        panel.end > duration - .1 + 1e-9 ||
        panel.start < previousEnd - .01 - 1e-9) {
      throw layoutError("Overlapping or unreadable invitation panels.", "panel_boundaries");
    }
    previousEnd = panel.end;
    return { kind: panel.kind, start: panel.start, end: panel.end,
      textArea: validateTextArea(panel.textArea, "panel_text_area"),
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
function changedFrameFraction(first, second, width) {
  if (!Number.isInteger(width) || width < 8 || first.length % width !== 0) return 0;
  const height = first.length / width;
  const columnStep = Math.ceil(width / 12), rowStep = Math.ceil(height / 17);
  let changed = 0, tiles = 0;
  for (let y = 0; y < height; y += rowStep) {
    for (let x = 0; x < width; x += columnStep) {
      let total = 0, samples = 0;
      for (let row = y; row < Math.min(y + rowStep, height); row += 2) {
        for (let col = x; col < Math.min(x + columnStep, width); col += 2) {
          const i = row * width + col;
          total += Math.abs(first[i] - second[i]);
          samples++;
        }
      }
      if (total / samples > .04) changed++;
      tiles++;
    }
  }
  return changed / tiles;
}

function measuredFrameChanges(frames) {
  const ordered = [...frames].sort((a, b) => a.time - b.time);
  const changes = [];
  for (let i = 1; i < ordered.length; i++) {
    const a = ordered[i - 1], b = ordered[i];
    const dt = b.time - a.time;
    if (dt <= 0 || !a.luma?.length || a.luma.length !== b.luma?.length) continue;
    let sum = 0, count = 0;
    for (let j = 0; j < a.luma.length; j += 3) {
      sum += Math.abs(a.luma[j] - b.luma[j]); count++;
    }
    changes.push({
      start: a.time, end: b.time, mean: sum / count,
      changedFraction: changedFrameFraction(a.luma, b.luma, a.width)
    });
  }
  return changes;
}

export function motionIntervals(frames, duration, { padding = true } = {}) {
  return motionIntervalsFromChanges(measuredFrameChanges(frames), duration, padding);
}

function motionIntervalsFromChanges(changes, duration, padding) {
  const intervals = [];
  for (const change of changes) {
    const elapsed = change.end - change.start;
    const threshold = Math.min(.095, .022 + .065 * elapsed);
    const wideChange = change.mean > .021 + .018 * elapsed && change.changedFraction >= .18;
    if (change.mean <= threshold && !wideChange) continue;
    const start = Math.max(0, change.start - (padding ? .18 : 0));
    const end = Math.min(duration, change.end + (padding ? .22 : 0));
    const previous = intervals.at(-1);
    if (previous && start <= previous.end + .15) previous.end = Math.max(previous.end, end);
    else intervals.push({ start, end });
  }
  return intervals;
}

// Model timestamps are estimates. Move both sides of an adjacent boundary to
// a nearby decoded cut or the matching edge of an explicit transition.
function refineSceneBoundaries(timeline, changes, movement) {
  const scenes = timeline.scenes.map(scene => ({ ...scene }));
  const cuts = changes.filter(change =>
    change.mean > .105 && change.end - change.start <= 1.01)
    .map(change => (change.start + change.end) / 2);
  for (let index = 1; index < scenes.length; index++) {
    const previous = scenes[index - 1], current = scenes[index];
    if (Math.abs(previous.end - current.start) > .4) continue;
    const estimate = (previous.end + current.start) / 2;
    const candidates = [...cuts];
    if (previous.kind === "transition") candidates.push(...movement.map(gap => gap.end));
    if (current.kind === "transition") candidates.push(...movement.map(gap => gap.start));
    let closest;
    let distance = 1;
    for (const cut of candidates) {
      if (cut < previous.start + .35 || cut > current.end - .35) continue;
      if (Math.abs(cut - estimate) >= distance) continue;
      closest = cut;
      distance = Math.abs(cut - estimate);
    }
    if (closest !== undefined) previous.end = current.start = closest;
  }
  return { ...timeline, scenes };
}

function addQuietWindows(windows, region, motion) {
  let cursor = region.start;
  const add = end => {
    if (end - cursor >= 2.5 - 1e-9) windows.push({ ...region, start: cursor, end });
  };
  for (const gap of motion) {
    if (gap.end <= cursor) continue;
    if (gap.start >= region.end) break;
    add(gap.start);
    cursor = Math.max(cursor, gap.end);
    if (cursor >= region.end) return;
  }
  add(region.end);
}

function sameTextArea(first, second) {
  return ["left", "top", "width", "height"].every(key => first[key] === second[key]);
}

// Intersect model-identified surfaces with measured quiet windows. A transition
// or person scene is never promoted to a text surface by pixel stability alone.
export function readableWindows(timeline, motion, duration, coverage = { start: .2, end: duration - .2 }) {
  const windows = [];
  const validated = validateSceneTimeline(timeline, duration);
  for (let index = 0; index < validated.scenes.length; index++) {
    const scene = validated.scenes[index];
    if (!["invitation_surface", "decor"].includes(scene.kind)) continue;
    // Tolerate approximate model scene boundaries, but never let a text
    // window overlap an adjacent scene or extrapolate past decoded evidence.
    const start = Math.max(scene.start, coverage.start, .15,
      validated.scenes[index - 1]?.end ?? 0);
    const end = Math.min(scene.end, coverage.end, duration - .1,
      validated.scenes[index + 1]?.start ?? duration);
    if (scene.textArea) {
      addQuietWindows(windows, {
        start, end, textArea: scene.textArea, ink: scene.ink || timeline.ink
      }, motion);
      continue;
    }
    // Without a scene-specific box, only the model's explicit panel ranges
    // give us evidence of where an overlay can safely fit.
    const supportedRegions = [];
    for (const panel of validated.panels) {
      const previous = supportedRegions.at(-1);
      const supportedStart = Math.max(previous?.end ?? start, panel.start);
      const supportedEnd = Math.min(end, panel.end);
      if (supportedStart >= supportedEnd) continue;
      const ink = panel.ink || timeline.ink;
      if (previous && supportedStart === previous.end &&
          previous.ink === ink && sameTextArea(previous.textArea, panel.textArea)) {
        previous.end = supportedEnd;
      } else {
        supportedRegions.push({
          start: supportedStart, end: supportedEnd, textArea: panel.textArea, ink
        });
      }
    }
    for (const region of supportedRegions) addQuietWindows(windows, region, motion);
  }
  return windows;
}

export function validateReadableWindows(windows, duration) {
  if (!Array.isArray(windows) || windows.length > 48 || !within(duration, 5, 120)) {
    throw new Error("Invalid readable windows.");
  }
  let previousEnd = 0;
  return windows.map(window => {
    if (!isObject(window) || !within(window.start, previousEnd, duration) ||
        !within(window.end, window.start, duration) || window.end - window.start < 2.49 ||
        !["#24160e", "#fff1d2"].includes(window.ink)) {
      throw new Error("Invalid or overlapping readable windows.");
    }
    previousEnd = window.end;
    return { start: window.start, end: window.end,
      textArea: validateTextArea(window.textArea), ink: window.ink };
  });
}

// Allocate ordered groups of copy, including individually paged events, to
// contiguous safe windows. The generated HTML embeds this function verbatim.
export function allocateReadablePanels(windows, requirements, { allowShort = false } = {}) {
  if (!windows.length || !requirements.length ||
      requirements.some(item => !Number.isFinite(item.seconds) || item.seconds <= 0)) return [];
  const epsilon = 1e-9;
  let best = [{ covered: 0, available: 0, firstStart: Infinity }];
  const preferred = (choice, current) => {
    if (!current) return true;
    if (allowShort && Math.abs(choice.covered - current.covered) > epsilon) {
      return choice.covered > current.covered;
    }
    if (choice.firstStart !== current.firstStart) return choice.firstStart < current.firstStart;
    return choice.available > current.available + epsilon;
  };

  for (const window of windows) {
    const available = window.end - window.start;
    if (available <= 0) continue;
    const next = best.slice();
    for (let first = 0; first < requirements.length; first++) {
      const previous = best[first];
      if (!previous) continue;
      let requested = 0;
      for (let end = first + 1; end <= requirements.length; end++) {
        requested += requirements[end - 1].seconds;
        if (!allowShort && requested > available + epsilon) break;
        const choice = {
          covered: previous.covered + Math.min(available, requested),
          available: previous.available + available,
          firstStart: previous.window ? previous.firstStart : window.start,
          first, end, window, requested, previous
        };
        if (preferred(choice, next[end])) next[end] = choice;
      }
    }
    best = next;
  }

  const assignments = [];
  for (let item = best[requirements.length]; item?.window; item = item.previous) {
    assignments.push(item);
  }
  const panels = [];
  for (const { first, end, window, requested } of assignments.reverse()) {
    let start = window.start;
    const available = window.end - window.start;
    for (let i = first; i < end; i++) {
      const { kind, seconds, pageIndex } = requirements[i];
      const finish = i + 1 === end ? window.end : start + available * seconds / requested;
      panels.push({
        kind, start, end: finish, textArea: window.textArea, ink: window.ink,
        ...(pageIndex !== undefined ? { pageIndex } : {})
      });
      start = finish;
    }
  }
  return panels;
}

export function planReadableWindows(windows) {
  if (!windows.length) return null;
  const requirements = [
    { kind: "intro", seconds: 4.5 }, { kind: "details", seconds: 5 },
    { kind: "events", seconds: 4 }
  ];
  let panels = allocateReadablePanels(windows, requirements);
  if (!panels.length) panels = allocateReadablePanels(windows, requirements.slice(0, 2));
  if (!panels.length) {
    const longest = windows.reduce((best, window) =>
      window.end - window.start > best.end - best.start ? window : best);
    panels = [{ ...longest, kind: "all" }];
  }
  return {
    panels, safeWindows: windows,
    revealAt: panels[0].start, textArea: panels[0].textArea,
    ink: panels[0].ink, motionRefined: true
  };
}

export function refineScenePlan(timeline, frames, duration) {
  if (frames.length < 2) return null;
  const changes = measuredFrameChanges(frames);
  if (!changes.length) return null;
  const motion = motionIntervalsFromChanges(changes, duration, true);
  const movement = motionIntervalsFromChanges(changes, duration, false);
  const refinedTimeline = refineSceneBoundaries(validateSceneTimeline(timeline, duration), changes, movement);
  const windows = validateReadableWindows(readableWindows(
    { ...timeline, ...refinedTimeline }, motion, duration,
    { start: changes[0].start, end: changes.at(-1).end }
  ), duration);
  const plan = planReadableWindows(windows);
  return plan && { ...plan, ...validateSceneTimeline({ ...refinedTimeline, panels: plan.panels }, duration) };
}
