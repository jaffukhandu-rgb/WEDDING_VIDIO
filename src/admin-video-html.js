import { findVideoBackground, isSupportedVideoDuration, MIN_VIDEO_SECONDS, MAX_VIDEO_SECONDS } from "./video-html-contract.js";
import { isEquivalentRendererOrigin } from "./template-metadata.js";
import { analyzeVideoVisual } from "./video-visual-analyzer.js";
import { buildVideoDesignBlock, buildVideoDesignCss, readVideoDesignBlock, replaceVideoDesignBlock, normalizeDesignPrompt, applyExplicitDesignEdit } from "./video-invitation-design.js";
import { createVideoGenerationProgress } from "./video-generation-progress.js";
import { analyzeTemplate } from "./admin-engine.js";
import { validateSceneTimeline, validateReadableWindows, allocateReadablePanels } from "./video-scene-timeline.js";

// Independent Video + HTML admin workflow. The existing Via Code analyzer/editor
// stays the source of truth for editable customer fields and export/publishing.
const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const DEFAULT_CONFIG = {
  partner1: "Ayaan",
  partner2: "Zoya",
  date: "2027-02-14",
  time: "7:30 PM",
  venue: "The Royal Courtyard",
  address: "Your Venue Address",
  message: "Together with our families, we invite you to celebrate our special day.",
  blessing: "Your presence will be our blessing.",
  events: [{
    name: "Wedding Celebration",
    date: "2027-02-14",
    time: "7:30 PM",
    venue: "The Royal Courtyard",
    note: "We look forward to celebrating with you."
  }]
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function describeVideoTiming(analysis) {
  if (analysis.motionRefined === true) {
    const firstWindow = analysis.safeWindows?.[0];
    return firstWindow ? "First readable window at " + firstWindow.start.toFixed(1) + "s."
      : "No stable window long enough for text.";
  }
  return "Text starts at " + analysis.revealAt.toFixed(1) + "s.";
}

export function buildVideoInvitationSource({ id, url, title, visualAnalysis = null }) {
  if (!UUID.test(id)) throw new Error("Invalid uploaded background reference.");
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) ||
      parsed.pathname !== "/api/video-backgrounds/" + id ||
      parsed.search || parsed.hash) {
    throw new Error("Invalid internal background URL.");
  }
  // The existing analyzer intentionally accepts bare-key literal CONFIG fields,
  // not JSON stringified property names. Preserve its established contract.
  const fieldLines = Object.entries(DEFAULT_CONFIG)
    .filter(([key]) => key !== "events")
    .map(([key, value]) => "  " + key + ": " + JSON.stringify(value) + ",");
  const eventLines = Object.entries(DEFAULT_CONFIG.events[0])
    .map(([key, value]) => "      " + key + ": " + JSON.stringify(value))
    .join(",\n");
  const sample = "{\n" + fieldLines.join("\n") +
    "\n  events: [{\n" + eventLines + "\n  }]\n}";
  let styles = [
    "*{box-sizing:border-box}",
    "html,body{height:100%;width:100%;margin:0;overflow:hidden;background:#100b09}",
    "body{display:grid;place-items:center}",
    ".stage{position:relative;width:min(100vw,56.25dvh);aspect-ratio:9/16;overflow:hidden;isolation:isolate;background:#160d0a;color:#fff0d6;container-type:inline-size;font-family:Georgia,'Times New Roman',serif}",
    ".scene{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
    ".background{width:100%;height:100%;object-fit:cover;display:block;background:#180f0d}",
    ".copy{position:absolute;top:30%;left:16%;width:68%;min-height:37%;padding:3cqw 2cqw;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.1cqw;overflow-wrap:anywhere;color:#fff2d9;background:linear-gradient(180deg,#140a0773,#140a0750);border-radius:2cqw;text-shadow:0 1px 5px #000e;opacity:0;animation:reveal-invitation 30s linear both}",
    ".copy p,.copy h1{margin:0;max-width:100%}",
    ".ceremony{font:700 2.7cqw system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#edd2a0}",
    ".message{font-size:3cqw;line-height:1.35}",
    ".names{font-weight:400;font-style:italic;font-size:7cqw;line-height:1.08;color:#fff4d8}",
    ".date-time{font-size:3.25cqw;line-height:1.4;color:#f8dab0}",
    ".venue{font-size:4.1cqw;line-height:1.24;font-weight:bold}",
    ".address,.blessing{font-size:2.7cqw;line-height:1.4}",
    "[hidden]{display:none!important}",
    "@keyframes reveal-invitation{0%,68%{opacity:0}77%,100%{opacity:1}}"
  ].join("\n");
  // Only newly generated invitations receive smart styles. Pasted custom HTML
  // and older published templates remain exactly as authored.
  const isSmart = visualAnalysis?.version === 1 &&
    visualAnalysis.textArea && Number.isFinite(visualAnalysis.revealAt);
  const useSafeWindows = isSmart && visualAnalysis.motionRefined === true;
  let timelinePanels = null;
  if (isSmart && Array.isArray(visualAnalysis?.panels) &&
      visualAnalysis.panels.length >= 1) {
    try {
      timelinePanels = validateSceneTimeline(
        visualAnalysis, visualAnalysis.duration
      ).panels;
    } catch { /* Invalid AI plan keeps the original single-panel invitation. */ }
  }
  const isTimeline = useSafeWindows || Boolean(timelinePanels?.length);
  let safeWindows = [];
  if (useSafeWindows) {
    try { safeWindows = validateReadableWindows(visualAnalysis.safeWindows, visualAnalysis.duration); }
    catch { /* Require verified windows for a motion-refined plan. */ }
  }
  if (isSmart) {
    const rect = visualAnalysis.textArea;
    const percent = (value, low, high) =>
      Math.max(low, Math.min(high, Number(value) || low));
    const timelineSeconds = isSupportedVideoDuration(visualAnalysis.duration)
      ? visualAnalysis.duration : 30;
    const start = percent(visualAnalysis.revealAt / timelineSeconds * 100, 50, 92);
    const end = Math.min(99, start + 2.8);
    const textInk = ["#24160e", "#fff1d2"].includes(visualAnalysis.ink)
      ? visualAnalysis.ink : "#fff1d2";
    const shadow = ["rgba(255,245,224,.4)", "rgba(12,6,2,.7)"].includes(visualAnalysis.shadow)
      ? visualAnalysis.shadow : "rgba(12,6,2,.7)";
    styles += "\n" + [
      ".copy{left:" + percent(rect.left, 8, 55) +
        "%;top:" + percent(rect.top, 12, 69) +
        "%;width:" + percent(rect.width, 35, 85) +
        "%;height:" + percent(rect.height, 23, 67) +
        "%;min-height:0;background:none;border:0;border-radius:0;padding:1.8cqw 1.3cqw;" +
        "color:" + textInk + ";text-shadow:0 2px 6px " + shadow +
        ";animation:none;transition:none}",
      ".copy-inner{display:flex;flex-direction:column;align-items:center;justify-content:center;" +
        "gap:.8cqw;max-width:100%;width:100%;transform-origin:center center;flex-shrink:0}",
      ".copy .names{color:inherit;font-size:8.5cqw;font-weight:650;line-height:1.08;text-wrap:balance}",
      ".copy .ceremony{color:inherit;font-size:3.35cqw;letter-spacing:.09em}",
      ".copy .message{font-size:3.2cqw;line-height:1.23;max-width:100%;text-wrap:balance}",
      ".copy .date-time{color:inherit;font-size:3.9cqw;line-height:1.2}",
      ".copy .venue{font-size:4.5cqw;line-height:1.19}",
      ".copy .address,.copy .blessing{font-size:3.05cqw;line-height:1.23}",
      "@keyframes reveal-invitation{0%," + start.toFixed(2) +
        "%{opacity:0}" + end.toFixed(2) + "%,100%{opacity:1}}"
    ].join("\n");
  }
  if (isTimeline) {
    // The existing smart overlay retains its position/style; only the content
    // changes across validated playhead windows. No new scene or CSS redesign.
    styles += "\n" + [
      ".copy .events-list{width:100%;display:flex;flex-direction:column;gap:1.4cqw}",
      ".copy .event-page{display:flex;flex-direction:column;gap:1.1cqw}",
      ".copy .event-item{display:flex;flex-direction:column;align-items:center;gap:.5cqw}",
      ".copy .event-title{font-weight:700;font-size:4cqw}",
      ".copy .event-info{font-size:3.1cqw;line-height:1.24;overflow-wrap:anywhere}",
      ".copy[data-scene-timeline]{overflow:hidden}",
      ".copy[data-scene-timeline] .copy-inner{font-size:1cqw;gap:.7em}",
      ".copy[data-scene-timeline] .names{font-size:8.5em}",
      ".copy[data-scene-timeline] .ceremony{font-size:3.35em}",
      ".copy[data-scene-timeline] .message{font-size:3.6em}",
      ".copy[data-scene-timeline] .date-time{font-size:4.2em}",
      ".copy[data-scene-timeline] .venue{font-size:4.5em}",
      ".copy[data-scene-timeline] .address,.copy[data-scene-timeline] .blessing{font-size:3.4em}",
      ".copy[data-scene-timeline] .event-title{font-size:4em}",
      ".copy[data-scene-timeline] .event-info{font-size:3.1em}"
    ].join("\n");
  }
  if (isTimeline) styles += "\n" + buildVideoDesignBlock(visualAnalysis.design);
  const timelineScript = isTimeline ? [
    "  const panelTimeline = " + JSON.stringify(timelinePanels || []) + ";",
    "  const backgroundVideo = document.querySelector('video[data-wedding-background]');",
    "  const selectors = ['.ceremony','.message','.names','.date-time','.venue','.address','.blessing'];",
    "  const groups = {",
    "    intro: ['.ceremony','.message','.names'],",
    "    details: ['.names','.date-time','.venue','.address','.blessing'],",
    "    events: [],",
    "    all: selectors",
    "  };",
    "  const eventHost = root.querySelector('.events-list');",
    "  const eventPages = [];",
    "  const allEvents = Array.isArray(CONFIG.events) ? CONFIG.events.filter(Boolean) : [];",
    "  for (let i = 0; i < allEvents.length; i += 2) {",
    "    const page = document.createElement('div');",
    "    page.className = 'event-page';",
    "    for (const item of allEvents.slice(i, i + 2)) {",
    "      const entry = document.createElement('div'); entry.className = 'event-item';",
    "      const name = document.createElement('div'); name.className = 'event-title';",
    "      name.textContent = String(item.name || 'Wedding Event'); entry.appendChild(name);",
    "      const info = document.createElement('div'); info.className = 'event-info';",
    "      info.textContent = [item.date, item.time, item.venue, item.note]",
    "        .filter(Boolean).map(String).join(' · '); entry.appendChild(info);",
    "      page.appendChild(entry);",
    "    }",
    "    eventHost.appendChild(page); eventPages.push(page);",
    "  }",
    "  const words = text => String(text || '').trim().split(/\\s+/).filter(Boolean).length;",
    "  const fieldWords = kind => (groups[kind] || []).reduce((sum, selector) =>",
    "    sum + words(root.querySelector(selector).textContent), 0);",
    "  const eventWords = page => page.children.length ? Array.from(page.children).reduce((sum, entry) =>",
    "    sum + Array.from(entry.children).reduce((n, node) => n + words(node.textContent), 0), 0) : 0;",
    "  const need = count => Math.max(2.5, .65 + count / 2.8);",
    "  const safeWindows = " + JSON.stringify(safeWindows) + ";",
    ...(useSafeWindows ? [
      "  const allocate = " + allocateReadablePanels.toString() + ";",
      "  const requirements = [",
      "    {kind:'intro',seconds:need(fieldWords('intro')) + .35},",
      "    {kind:'details',seconds:need(fieldWords('details')) + .35}",
      "  ];",
      "  const wantsProgramme = allEvents.length > 1 || panelTimeline.some(panel => panel.kind === 'events');",
      "  if (wantsProgramme) eventPages.forEach((page, pageIndex) =>",
      "    requirements.push({kind:'events',pageIndex,seconds:need(eventWords(page)) + .35}));",
      "  const reallocated = allocate(safeWindows, requirements, {allowShort:true});",
      "  panelTimeline.splice(0, panelTimeline.length, ...reallocated);",
      "  const timingShort = panelTimeline.length !== requirements.length || panelTimeline.some((panel, i) =>",
      "    panel.end - panel.start + .01 < requirements[i].seconds);"
    ] : [
      "  const hasEventSlot = panelTimeline.some(panel => panel.kind === 'events');",
      "  const schedules = panelTimeline.map(panel => {",
      "    const pages = panel.kind === 'events' ? eventPages.map(page => need(eventWords(page)))",
      "      : (panel.kind === 'details' || panel.kind === 'all') && !hasEventSlot && allEvents.length > 1",
      "        ? [need(fieldWords(panel.kind)), ...eventPages.map(page => need(eventWords(page)))]",
      "        : [need(fieldWords(panel.kind))];",
      "    return pages.length ? pages : [2.5];",
      "  });",
      "  const sameArea = (a, b) => ['left','top','width','height'].every(k => a.textArea[k] === b.textArea[k]);",
      "  for (let first = 0; first < panelTimeline.length;) {",
      "    let last = first;",
      "    while (last + 1 < panelTimeline.length &&",
      "      Math.abs(panelTimeline[last].end - panelTimeline[last + 1].start) <= .011 &&",
      "      sameArea(panelTimeline[first], panelTimeline[last + 1]) &&",
      "      panelTimeline[first].ink === panelTimeline[last + 1].ink) last++;",
      "    if (last > first) {",
      "      const start = panelTimeline[first].start, end = panelTimeline[last].end;",
      "      const weights = schedules.slice(first, last + 1).map(list => list.reduce((a,b) => a+b, 0));",
      "      const total = weights.reduce((a,b) => a+b, 0); let cursor = start;",
      "      for (let i = first; i <= last; i++) {",
      "        panelTimeline[i].start = cursor;",
      "        cursor = i === last ? end : cursor + (end - start) * weights[i - first] / total;",
      "        panelTimeline[i].end = cursor;",
      "      }",
      "    }",
      "    first = last + 1;",
      "  }",
      "  const timingShort = panelTimeline.some((panel,i) =>",
      "    panel.end - panel.start + .01 < schedules[i].reduce((a,b) => a+b, 0));",
    ]),
    "  root.dataset.timelineReadability = timingShort ? 'short' : 'ok';",
    "  root.dataset.playbackTimeline = JSON.stringify(panelTimeline.map(({kind,start,end,pageIndex}) => ({kind,start,end,pageIndex})));",
    "  let activePanel = -1, activePage = -1;",
    "  const showPanel = (panel, pageIndex) => {",
    ...(useSafeWindows ? [
      "    const kind = panel.kind;",
      "    const visiblePage = pageIndex;"
    ] : [
      "    const kind = (panel.kind === 'details' || panel.kind === 'all') && !hasEventSlot && pageIndex > 0",
      "      ? 'events' : panel.kind;",
      "    const visiblePage = panel.kind === 'events' ? pageIndex : pageIndex - 1;"
    ]),
    "    const allowed = groups[kind] || [];",
    "    for (const selector of selectors) {",
    "      const node = root.querySelector(selector);",
    "      node.hidden = !allowed.includes(selector) || !node.textContent.trim();",
    "    }",
    "    const eventsVisible = kind === 'events' && eventPages.length > 0;",
    "    eventHost.hidden = !eventsVisible;",
    "    eventPages.forEach((page, i) => {",
    "      page.hidden = !eventsVisible || i !== visiblePage;",
    "    });",
    "    root.style.left = panel.textArea.left + '%';",
    "    root.style.top = panel.textArea.top + '%';",
    "    root.style.width = panel.textArea.width + '%';",
    "    root.style.height = panel.textArea.height + '%';",
    "    root.style.color = panel.ink || '';",
    "    root.dataset.designInk = panel.ink === '#24160e' ? 'dark' : 'light';",
    "    root.style.textShadow = !panel.ink ? '' : panel.ink === '#24160e'",
    "      ? '0 2px 6px rgba(255,245,224,.4)' : '0 2px 6px rgba(12,6,2,.7)';",
    "    return fit();",
    "  };",
    "  const updateReveal = () => {",
    "    if (!backgroundVideo) return;",
    "    const t = backgroundVideo.currentTime;",
    "    const idx = panelTimeline.findIndex(panel => t >= panel.start && t < panel.end);",
    "    if (idx < 0) { root.style.opacity = '0'; return; }",
    "    const panel = panelTimeline[idx];",
    ...(useSafeWindows ? [
      "    const pageIndex = panel.pageIndex ?? 0;"
    ] : [
      "    const weights = schedules[idx], total = weights.reduce((a,b) => a+b, 0);",
      "    const progress = (t - panel.start) / (panel.end - panel.start) * total;",
      "    let pageIndex = 0, threshold = weights[0];",
      "    while (pageIndex < weights.length - 1 && progress >= threshold) threshold += weights[++pageIndex];",
    ]),
    "    if (idx !== activePanel || pageIndex !== activePage) {",
    "      showPanel(panel, pageIndex); activePanel = idx; activePage = pageIndex;",
    "    }",
    "    const enter = Math.min(1, Math.max(0, (t - panel.start) / .35));",
    "    const exit = Math.min(1, Math.max(0, (panel.end - t) / .35));",
    "    root.style.opacity = String(Math.min(enter, exit));",
    "  };",
    "  const measureTimeline = () => {",
    "    let worstScale = 1, overflow = false;",
    "    const measure = (panel, pageIndex) => {",
    "      const fitResult = showPanel(panel, pageIndex);",
    "      worstScale = Math.min(worstScale, fitResult.scale);",
    "      overflow ||= fitResult.overflow;",
    "    };",
    ...(useSafeWindows ? [
      "    for (const panel of panelTimeline) measure(panel, panel.pageIndex ?? 0);"
    ] : [
      "    for (const [index, panel] of panelTimeline.entries()) {",
      "      for (const pageIndex of schedules[index].keys()) measure(panel, pageIndex);",
      "    }"
    ]),
    "    root.dataset.timelineTextFit = worstScale.toFixed(2);",
    "    root.dataset.timelineTextOverflow = String(overflow);",
    "    activePanel = activePage = -1;",
    "    updateReveal();",
    "  };",
    "  window.addEventListener('resize', measureTimeline);",
    "  if (document.fonts?.ready) document.fonts.ready.then(measureTimeline);",
    "  if (backgroundVideo) {",
    "    for (const eventName of ['timeupdate','seeking','seeked','loadedmetadata','playing','pause','ended']) {",
    "      backgroundVideo.addEventListener(eventName, updateReveal);",
    "    }",
    "    if (backgroundVideo.requestVideoFrameCallback) {",
    "      const updateFrame = () => {",
    "        updateReveal(); backgroundVideo.requestVideoFrameCallback(updateFrame);",
    "      };",
    "      backgroundVideo.requestVideoFrameCallback(updateFrame);",
    "    }",
    "    measureTimeline();",
    "  }"
  ] : [
    "  // Follow the MP4 playhead through playback, looping and renderer seeks.",
    "  const backgroundVideo = document.querySelector('video[data-wedding-background]');",
    "  const revealAt = " + Number(visualAnalysis?.revealAt || 0).toFixed(2) + ";",
    "  const updateReveal = () => {",
    "    if (!backgroundVideo) return;",
    "    const progress = Math.min(1, Math.max(0, (backgroundVideo.currentTime - revealAt) / .84));",
    "    root.style.opacity = String(progress);",
    "  };",
    "  if (backgroundVideo) {",
    "    for (const eventName of ['timeupdate','seeked','loadedmetadata','playing','ended']) {",
    "      backgroundVideo.addEventListener(eventName, updateReveal);",
    "    }",
    "    updateReveal();",
    "  }"
  ];
  const script = [
    "const CONFIG = " + sample + ";",
    "(() => {",
    "  const root = document.querySelector('.copy');",
    "  const set = (selector, text) => {",
    "    const node = root.querySelector(selector);",
    "    const value = typeof text === 'string' ? text.trim() : '';",
    "    node.textContent = value;",
    "    node.hidden = !value;",
    "  };",
    "  const event = Array.isArray(CONFIG.events) ? CONFIG.events[0] || {} : {};",
    "  const first = String(CONFIG.partner1 || '').trim();",
    "  const second = String(CONFIG.partner2 || '').trim();",
    "  const rawDate = CONFIG.date || event.date || '';",
    "  let formattedDate = rawDate;",
    "  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(rawDate)) {",
    "    const date = new Date(rawDate + 'T00:00:00Z');",
    "    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === rawDate) {",
    "      formattedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);",
    "    }",
    "  }",
    "  set('.ceremony', event.name || 'Wedding Invitation');",
    "  set('.message', CONFIG.message);",
    "  set('.names', [first, second].filter(Boolean).join(' & '));",
    "  set('.date-time', [formattedDate, CONFIG.time || event.time].filter(Boolean).join(' · '));",
    "  set('.venue', CONFIG.venue || event.venue);",
    "  set('.address', CONFIG.address);",
    "  set('.blessing', CONFIG.blessing);",
    ...(isSmart ? [
      "  // Fit every editable field without covering the ornate border.",
      "  const inner = root.querySelector('.copy-inner');",
      "  const fit = () => {",
      ...(isTimeline ? [
        "    const stageWidth = root.parentElement?.clientWidth || root.clientWidth / .6;",
        "    const base = Math.max(1, stageWidth / 100);",
        "    const usableHeight = root.clientHeight - 3.6 * base - 2;",
        "    const fits = scale => {",
        "      inner.style.fontSize = (base * scale).toFixed(3) + 'px';",
        "      return inner.scrollHeight <= usableHeight && inner.scrollWidth <= inner.clientWidth;",
        "    };",
        "    let low = .72, high = 1.65;",
        "    const overflow = !fits(low);",
        "    if (!overflow) {",
        "      for (let i = 0; i < 9; i++) {",
        "        const mid = (low + high) / 2;",
        "        if (fits(mid)) low = mid; else high = mid;",
        "      }",
        "      fits(low);",
        "    }",
        "    root.dataset.textFit = Math.min(1, low).toFixed(2);",
        "    return {scale:low,overflow};"
      ] : [
        "    inner.style.transform = 'none';",
        "    const h = Math.max(1, inner.scrollHeight);",
        "    const w = Math.max(1, inner.scrollWidth);",
        "    const required = Math.min(1, (root.clientHeight - 8) / h, (root.clientWidth - 8) / w);",
        "    const factor = Math.max(.55, required);",
        "    inner.style.transform = 'scale(' + factor.toFixed(3) + ')';",
        "    root.dataset.textFit = factor.toFixed(2);",
        "    root.dataset.textFitRequired = required.toFixed(2);"
      ]),
      "  };",
      ...(!isTimeline ? [
        "  fit();",
        "  window.addEventListener('resize', fit);",
        "  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);"
      ] : []),
      ...timelineScript
    ] : []),
    "})();"
  ].join("\n");
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>" + escapeHtml(title || "Video Wedding Invitation") + "</title>",
    "<style>" + styles + "</style></head><body>",
    '<main class="stage go">',
    '<section class="scene" style="--i:0" aria-label="Cinematic video background">',
    '<video data-wedding-background="' + id + '" src="' + escapeHtml(parsed.href) + '"',
    '  autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>',
    '</section><section class="scene" style="--i:1" aria-label="Personalized invitation">',
    isSmart ? (isTimeline
      ? '<article class="copy" data-video-auto-layout="v1" data-scene-timeline="v2"><div class="copy-inner">'
      : '<article class="copy" data-video-auto-layout="v1"><div class="copy-inner">')
      : '<article class="copy">',
    '<p class="ceremony"></p><p class="message"></p><h1 class="names"></h1>',
    '<p class="date-time"></p><p class="venue"></p><p class="address"></p><p class="blessing"></p>',
    isSmart ? (isTimeline
      ? '<div class="events-list" hidden></div></div></article></section></main>'
      : '</div></article></section></main>') : '</article></section></main>',
    "<script>" + script + "</script></body></html>"
  ].join("\n").replace(
    'aria-hidden="true"></video>',
    'class="background" aria-hidden="true"></video>'
  );
}

async function inspectVideo(file) {
  if (!file || file.size < 1024 || file.size > MAX_FILE_BYTES ||
      (file.type && file.type !== "video/mp4") || !/\.mp4$/i.test(file.name)) {
    throw new Error("Choose a valid MP4 video no larger than 32 MB.");
  }
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Video metadata timed out.")), 15000);
      const finish = callback => {
        clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onerror = null;
        callback();
      };
      video.onloadedmetadata = () => finish(resolve);
      video.onerror = () => finish(() => reject(new Error("Browser cannot read this MP4. Use H.264.")));
      video.preload = "metadata";
      video.src = objectUrl;
      video.load();
    });
    if (!isSupportedVideoDuration(video.duration)) {
      throw new Error("Background MP4 must be " + MIN_VIDEO_SECONDS + "–" + MAX_VIDEO_SECONDS + " seconds long.");
    }
    const ratio = video.videoWidth / video.videoHeight;
    if (!Number.isFinite(ratio) || Math.abs(ratio - 9 / 16) > 0.03) {
      throw new Error("Use a vertical 9:16 MP4 background.");
    }
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

// fetch() does not expose browser upload percentages; XHR gives real byte
// progress. 100% here means transfer complete, not Cloudinary persistence.
export function uploadWithProgress(file, key, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", API_ROOT + "/api/admin/video-backgrounds", true);
    request.setRequestHeader("Content-Type", "video/mp4");
    request.setRequestHeader("X-Admin-Key", key);
    request.timeout = 180000;
    request.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.floor(100 * event.loaded / event.total)), false);
      } else {
        onProgress(null, false);
      }
    };
    request.upload.onload = () => onProgress(100, true);
    request.onerror = () => reject(new Error("Video upload connection failed."));
    request.ontimeout = () => reject(new Error("Upload timed out. Check the video library before retrying."));
    request.onabort = () => reject(new Error("Video upload was cancelled."));
    request.onload = () => {
      let data = {};
      try { data = JSON.parse(request.responseText || "{}"); } catch { /* Show safe fallback. */ }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(typeof data.error === "string"
          ? data.error : "Video upload failed (HTTP " + request.status + ")."));
        return;
      }
      if (!data.id) {
        reject(new Error("The server did not return a valid saved video reference."));
        return;
      }
      resolve(data);
    };
    request.send(file);
  });
}

export function initVideoHtmlTab() {
  const codeTab = document.querySelector("#via-code-tab");
  const videoTab = document.querySelector("#via-video-tab");
  const codePanel = document.querySelector("#code-panel");
  const videoPanel = document.querySelector("#video-html-panel");
  const fileInput = document.querySelector("#video-html-file");
  const titleInput = document.querySelector("#video-html-title");
  const aiToggle = document.querySelector("#video-html-enable-ai");
  const aiFields = document.querySelector("#video-html-ai-fields");
  const aiHelp = document.querySelector("#video-html-ai-help");
  const promptInput = document.querySelector("#video-html-design-prompt");
  const createButton = document.querySelector("#video-html-create");
  const retryButton = document.querySelector("#video-html-retry-ai");
  const uploadLoader = document.querySelector("#video-html-upload-loader");
  const uploadProgress = document.querySelector("#video-html-upload-progress");
  const uploadLabel = document.querySelector("#video-html-upload-label");
  const progressPercent = document.querySelector("#video-html-progress-percent");
  const status = document.querySelector("#video-html-status");
  const storageStatus = document.querySelector("#video-html-storage-status");
  const visualReport = document.querySelector("#video-html-visual-report");
  const assetLink = document.querySelector("#video-html-asset-link");
  const videoHtmlCode = document.querySelector("#video-html-code");
  const analyzeVideoButton = document.querySelector("#video-html-analyze");
  const keyInput = document.querySelector("#admin-api-key");
  const codeInput = document.querySelector("#code-input");
  const analyzeButton = document.querySelector("#analyze-code");
  if (![codeTab, videoTab, codePanel, videoPanel, fileInput,
    titleInput, createButton, uploadLoader, uploadProgress, uploadLabel, status, storageStatus, visualReport, assetLink, videoHtmlCode,
    analyzeVideoButton, keyInput, codeInput, analyzeButton].every(Boolean)) return;

  function selectTab(mode) {
    const isVideo = mode === "video";
    codePanel.hidden = isVideo;
    videoPanel.hidden = !isVideo;
    codeTab.classList.toggle("active", !isVideo);
    videoTab.classList.toggle("active", isVideo);
    codeTab.setAttribute("aria-pressed", String(!isVideo));
    videoTab.setAttribute("aria-pressed", String(isVideo));
    if (isVideo) codeTab.removeAttribute("aria-current");
    else codeTab.setAttribute("aria-current", "page");
  }
  codeTab.addEventListener("click", () => selectTab("code"));
  videoTab.addEventListener("click", () => selectTab("video"));

  async function checkStorage() {
    try {
      const response = await fetch(API_ROOT + "/api/video-backgrounds/status", {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Renderer unavailable.");
      const info = await response.json();
      if (!info.mongodbConfigured) {
        storageStatus.textContent = "MongoDB is not configured on the renderer. Set MONGODB_URI before uploading or publishing.";
      } else if (info.cloudinaryConfigured) {
        storageStatus.textContent = "Cloudinary settings detected (upload connection not yet verified). New videos use Cloudinary; older MongoDB videos stay available.";
      } else {
        storageStatus.textContent = "Storage: MongoDB GridFS. Cloudinary is not configured yet; see Cloudinary setup below.";
      }
    } catch {
      storageStatus.textContent = "Cannot check storage. Start the renderer server on port 4174 and check its settings.";
    }
  }
  void checkStorage();

  let pendingVideoReplacement = false;
  let retrySession = null;
  let retryVideoId = null;
  const generationProgress = createVideoGenerationProgress(({ value, message, estimated, state }) => {
    uploadLoader.hidden = false;
    uploadLoader.dataset.state = state;
    uploadProgress.value = value;
    uploadProgress.setAttribute("aria-valuetext", value + "% overall" + (estimated ? " (estimated)" : ""));
    if (progressPercent) progressPercent.textContent = value + "%";
    if (uploadLabel.textContent !== message + (estimated ? " · estimated progress" : "")) {
      uploadLabel.textContent = message + (estimated ? " · estimated progress" : "");
    }
  });
  function showAiStage(message, stage = "evidence") {
    generationProgress.set(stage, message);
  }
  // Opt-in is per workspace visit, never restored from a saved template or key.
  let retryAvailable = false;
  if (aiToggle) aiToggle.checked = false;
  const aiEnabled = () => aiToggle?.checked === true;
  function syncAiControls() {
    const enabled = aiEnabled();
    const busy = createButton.disabled;
    if (aiToggle) aiToggle.disabled = busy;
    if (aiFields) aiFields.hidden = !enabled;
    if (aiHelp) aiHelp.textContent = enabled
      ? "AI is on. Gemini may receive sampled video frames and your optional design instructions."
      : "AI is off. Generate with the local invitation engine; no Gemini requests.";
    if (promptInput) promptInput.disabled = !enabled || busy;
    if (retryButton) {
      retryButton.hidden = !enabled || !retryAvailable;
      retryButton.disabled = !enabled || !retryAvailable || busy;
    }
    createButton.textContent = enabled ? "Upload video and generate HTML with AI" : "Upload video and generate HTML";
  }
  function setRetryAvailable(available) {
    retryAvailable = available;
    syncAiControls();
  }
  aiToggle?.addEventListener("change", syncAiControls);
  syncAiControls();
  function analyzeVideoHtml() {
    if (pendingVideoReplacement) {
      status.textContent = "A different MP4 is selected. Upload and generate new HTML before analyzing or exporting it.";
      return;
    }
    const html = videoHtmlCode.value.trim();
    const background = findVideoBackground(html);
    if (!background || !isEquivalentRendererOrigin(background.origin, new URL(API_ROOT).origin)) {
      status.textContent = "Paste a complete Video + HTML document with a valid video-background reference from this renderer, or upload an MP4 first.";
      return;
    }
    assetLink.href = background.url;
    assetLink.hidden = false;
    setRetryAvailable(true);
    codeInput.value = videoHtmlCode.value;
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    analyzeButton.click();
    status.textContent = "Analyzing Video + HTML. Customer fields and preview controls appear below.";
  }

  analyzeVideoButton.addEventListener("click", analyzeVideoHtml);
  videoHtmlCode.addEventListener("input", () => {
    setRetryAvailable(false);
    visualReport.hidden = true;
    assetLink.hidden = true;
    // Invalidate prepared previews when the Video + HTML source is edited.
    codeInput.value = videoHtmlCode.value;
    codeInput.dispatchEvent(new Event("input", { bubbles: true }));
    status.textContent = "HTML code changed. Click Analyze HTML Code to refresh the preview.";
  });

  const originalStatus = document.querySelector("#status");
  if (originalStatus && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      if (!videoPanel.hidden && originalStatus.classList.contains("error")) {
        status.textContent = originalStatus.textContent;
      }
    });
    observer.observe(originalStatus, { childList: true, characterData: true,
      subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  fileInput.addEventListener("change", () => {
    retrySession = null;
    retryVideoId = null;
    uploadLoader.hidden = true;
    setRetryAvailable(false);
    visualReport.hidden = true;
    assetLink.hidden = true;
    pendingVideoReplacement = Boolean(fileInput.files?.length && videoHtmlCode.value.trim());
    if (pendingVideoReplacement) {
      // Preserve the source, but invalidate its prepared preview and MP4 export.
      codeInput.dispatchEvent(new Event("input", { bubbles: true }));
      status.textContent = "New MP4 selected. Upload and regenerate before previewing or exporting; previous HTML is preserved.";
    }
  });

  function showGeneratedInvitation(result, visualAnalysis, designPrompt, assisted) {
    const url = API_ROOT + "/api/video-backgrounds/" + result.id;
    const workspaceTitleEl = document.querySelector("#workspace-template-title");
    const chosenTitle = workspaceTitleEl?.value?.trim() || titleInput.value.trim() || "Video Wedding Invitation";
    if (workspaceTitleEl && !workspaceTitleEl.value.trim()) workspaceTitleEl.value = chosenTitle;
    const source = buildVideoInvitationSource({
      id: result.id,
      url,
      title: chosenTitle,
      visualAnalysis
    });
    if (new TextEncoder().encode(source).length > 1024 * 1024) {
      throw new Error("Generated HTML unexpectedly exceeds the 1 MB source limit.");
    }
    // This is an accessible, stable local video URL even if Cloudinary is used.
    assetLink.href = url;
    assetLink.hidden = false;
    if (result.provider) storageStatus.textContent = result.provider === "cloudinary"
      ? "Uploaded to Cloudinary. The video is accessible through the website renderer URL below."
      : "Uploaded to MongoDB GridFS. The video is accessible through the website renderer URL below.";
    // Reuse the existing analyzer and editor, but keep the HTML visible here.
    // Validate the new source before replacing the existing editor.
    analyzeTemplate(source);
    videoHtmlCode.value = source;
    pendingVideoReplacement = false;
    analyzeVideoHtml();
    if (typeof document.dispatchEvent === "function" && typeof CustomEvent === "function") {
      document.dispatchEvent(new CustomEvent("wedding:video-generated", { detail: { id: result.id, url } }));
    }
    visualReport.hidden = false;
    visualReport.textContent = "Automatic video analysis: " + visualAnalysis.confidence +
      " confidence. Video duration: " + visualAnalysis.duration.toFixed(1) +
      "s. " + describeVideoTiming(visualAnalysis) + " " +
      (visualAnalysis.motionRefined && visualAnalysis.safeWindows?.length
        ? "Stable display windows: " + visualAnalysis.safeWindows.length + ". "
        : visualAnalysis.scenes?.length
          ? "Detected scenes: " + visualAnalysis.scenes.length + ". " : "") +
      (designPrompt ? (visualAnalysis.design ? "Custom Gemini design applied. " : "Custom design not available; standard style used. ") : "") +
      (!assisted ? "AI assistance off; local analysis only. " : "") +
      (visualAnalysis.aiStageStatus ? "Gemini scene: " + visualAnalysis.aiStageStatus.scene +
        "; design: " + visualAnalysis.aiStageStatus.design + ". " : "") +
      (visualAnalysis.aiModels?.scene || visualAnalysis.aiModels?.design
        ? "AI models used: " + [
          visualAnalysis.aiModels.scene && "scene " + visualAnalysis.aiModels.scene,
          visualAnalysis.aiModels.design && "design " + visualAnalysis.aiModels.design
        ].filter(Boolean).join("; ") + ". " : "") +
      "Video reference: " + result.id + ". " +
      (visualAnalysis.warnings.length ? "Review needed: " + visualAnalysis.warnings.join(" ") :
        "Text timing, contrast and layout estimated automatically. Confirm the full preview before publishing.");
    status.textContent = "Video + HTML generated from the analyzed MP4. Edit customer details and preview before export.";
  }

  // The stored background reference remains unchanged. Successful AI evidence
  // is cached for this workspace session; after refresh the stored video can
  // be decoded again without creating another upload.
  retryButton?.addEventListener("click", async () => {
    if (!aiEnabled() || !retryAvailable || createButton.disabled || pendingVideoReplacement) return;
    const background = findVideoBackground(videoHtmlCode.value);
    if (!background || background.origin !== new URL(API_ROOT).origin) {
      status.textContent = "Analyze a valid stored Video + HTML invitation first.";
      return;
    }
    const key = keyInput.value.trim();
    if (!key) {
      status.textContent = "Enter the Admin access key before retrying Gemini.";
      keyInput.focus();
      return;
    }
    let designPrompt;
    try { designPrompt = normalizeDesignPrompt(promptInput?.value); }
    catch (error) { status.textContent = error.message; return; }
    const originalVideoCode = videoHtmlCode.value, originalCode = codeInput.value;
    const currentStyle = readVideoDesignBlock(originalVideoCode);
    const refineDesign = Boolean(currentStyle?.design && designPrompt);
    const session = retryVideoId === background.id && retrySession ? retrySession : {};
    const retrySceneOnly = Boolean(currentStyle?.design && !designPrompt && !session.scenePlan);
    if (currentStyle?.design && !designPrompt && !retrySceneOnly) {
      status.textContent = "Enter a follow-up design instruction to refine the current style.";
      promptInput?.focus();
      return;
    }
    // Older/custom source without verified style metadata cannot be edited
    // incrementally. Retain the established regeneration option with consent.
    if (!refineDesign && !window.confirm(currentStyle
      ? "Retry AI using the existing video? Successful regeneration replaces the current HTML and resets preview sample values. Save a draft first if needed."
      : "This source does not contain managed design settings. Regenerate it once using the saved video and a full design prompt to enable follow-up edits? Save a draft first if needed.")) return;
    visualReport.hidden = true;
    const source = session.source || background.url;
    createButton.disabled = fileInput.disabled = true;
    syncAiControls();
    generationProgress.start(refineDesign ? "Refining the current invitation" : "Retrying AI with the existing video");
    generationProgress.set("validate", "Checking existing invitation", 1);
    status.textContent = "Working with the saved video — no new upload.";
    try {
      const previousScene = session.scenePlan, previousDesign = session.design;
      // A fully recognized exact edit needs neither video decoding nor an AI request.
      // Use the same verified CSS replacement path as a creative follow-up.
      const explicitDesign = refineDesign ? applyExplicitDesignEdit(currentStyle.design, designPrompt) : null;
      const visualAnalysis = explicitDesign ? {
        design: explicitDesign, aiStageStatus: { design: "ready" }, warnings: []
      } : await analyzeVideoVisual(source, percent => {
        generationProgress.set("frames", "Reading saved video frames", percent / 100);
      }, { ai: { adminKey: key, apiRoot: API_ROOT }, designPrompt, session, onStage: showAiStage,
        ...(refineDesign ? { refineDesign: true, previousDesign: currentStyle.design }
          : retrySceneOnly ? { retainDesign: true, previousDesign: currentStyle.design } : {}) });
      retrySession = session;
      retryVideoId = background.id;
      if (videoHtmlCode.value !== originalVideoCode || codeInput.value !== originalCode) {
        status.textContent = "Source changed during retry. Existing HTML preserved; retry again to apply the retained analysis.";
        generationProgress.fail("Source changed — existing HTML preserved");
        return;
      }
      const stages = visualAnalysis.aiStageStatus;
      if (refineDesign) {
        if (stages?.design !== "ready" || !visualAnalysis.design) {
          status.textContent = "Follow-up design failed. Existing HTML preserved. " + visualAnalysis.warnings.join(" ");
          generationProgress.fail("Design unavailable — current invitation preserved");
          return;
        }
        generationProgress.set("generate", "Validating the updated design");
        const updated = replaceVideoDesignBlock(originalVideoCode, visualAnalysis.design);
        if (updated === originalVideoCode ||
            buildVideoDesignCss(visualAnalysis.design) === buildVideoDesignCss(currentStyle.design)) {
          status.textContent = explicitDesign ? "The requested settings are already applied or have no visible effect."
            : "Gemini returned no design changes. Try a more specific instruction.";
          generationProgress.fail("No design change returned");
          return;
        }
        analyzeTemplate(updated);
        // Apply only the managed CSS block. If this exact source was analyzed,
        // retain its existing editable form and soundtrack in Admin Studio.
        const detail = { previous: originalVideoCode, next: updated, applied: false };
        codeInput.dispatchEvent(new CustomEvent("wedding:refine-video-design", { detail }));
        videoHtmlCode.value = updated;
        if (!detail.applied) analyzeVideoHtml();
        if (explicitDesign) {
          session.design = explicitDesign;
          session.designPrompt = designPrompt;
          session.designModel = null;
        }
        visualReport.hidden = false;
        visualReport.textContent = "Follow-up design applied" +
          (explicitDesign ? " locally (no AI request)" :
            visualAnalysis.aiModels?.design ? " using " + visualAnalysis.aiModels.design : "") +
          ". Existing video, timing and invitation fields preserved. Review the preview before exporting.";
        status.textContent = "Design updated. Preview the revised invitation.";
        if (promptInput) promptInput.value = "";
        generationProgress.complete("Updated invitation HTML ready");
        return;
      }
      if (retrySceneOnly && stages?.scene !== "ready") {
        status.textContent = "Scene retry unavailable. Current design and HTML preserved. " + visualAnalysis.warnings.join(" ");
        generationProgress.fail("Scene retry unavailable — current invitation preserved");
        return;
      }
      const improved = session.scenePlan !== previousScene || session.design !== previousDesign;
      if (!stages || (stages.scene !== "ready" && stages.design !== "ready") ||
          (designPrompt && stages.design !== "ready" && (!improved || previousDesign))) {
        status.textContent = "AI retry did not produce the requested result. Existing HTML preserved. " + visualAnalysis.warnings.join(" ");
        generationProgress.fail("AI retry unavailable — existing HTML preserved");
        return;
      }
      // Preserve a previously generated design if its replacement failed.
      generationProgress.set("generate", "Generating and validating HTML");
      showGeneratedInvitation({ id: background.id }, visualAnalysis, designPrompt, true);
      if (visualAnalysis.design && promptInput) promptInput.value = "";
      status.textContent = "AI retry finished using the existing video. Review the updated HTML and preview.";
      generationProgress.complete();
    } catch (error) {
      status.textContent = (error instanceof Error ? error.message : "AI retry failed.") + " Existing HTML preserved.";
      generationProgress.fail("Retry failed — existing HTML preserved");
    } finally {
      createButton.disabled = fileInput.disabled = false;
      syncAiControls();
    }
  });

  createButton.addEventListener("click", async () => {
    if (createButton.disabled) return;
    const assisted = aiEnabled();
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = "Select a portrait MP4 background first.";
      fileInput.focus();
      return;
    }
    const key = keyInput.value.trim();
    if (!key) {
      status.textContent = "Enter your Admin access key in the Export MP4 section before uploading.";
      keyInput.focus();
      return;
    }
    if ((videoHtmlCode.value.trim() || codeInput.value.trim()) &&
        !window.confirm("Generate new HTML from this MP4? This will replace the current invitation code in the editor.")) {
      return;
    }
    let designPrompt;
    try { designPrompt = assisted ? normalizeDesignPrompt(promptInput?.value) : ""; }
    catch (error) { status.textContent = error.message; return; }
    createButton.disabled = true;
    fileInput.disabled = true;
    syncAiControls();
    visualReport.hidden = true;
    generationProgress.start("Preparing invitation");
    generationProgress.set("validate", "Checking video format and duration");
    status.textContent = "Generating your invitation…";
    try {
      await inspectVideo(file);
      generationProgress.set("frames", "Analyzing video frames");
      // Analyze BEFORE upload so a failure cannot create another stored MP4.
      const session = {};
      const visualAnalysis = await analyzeVideoVisual(file, percent => {
        generationProgress.set("frames", "Analyzing video frames and readable areas", percent / 100);
      }, assisted ? { ai: { adminKey: key, apiRoot: API_ROOT }, designPrompt, session, onStage: showAiStage }
        : { session });
      generationProgress.set("upload", "Uploading background securely");
      const result = await uploadWithProgress(file, key, (percent, transferred) => {
        generationProgress.set("upload", transferred
          ? "Saving uploaded video in storage"
          : "Uploading background securely", percent === null ? 0 : percent / 100);
      });
      generationProgress.set("generate", "Generating and validating HTML");
      retrySession = session;
      retryVideoId = result.id;
      showGeneratedInvitation(result, visualAnalysis, designPrompt, assisted);
      if (visualAnalysis.design && promptInput) promptInput.value = "";
      generationProgress.complete(visualAnalysis.design || !designPrompt
        ? "Invitation HTML ready" : "Invitation HTML ready — standard design used");
      // Stay on Video + HTML; existing editable fields appear below this panel.
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Unable to create video template.";
      generationProgress.fail("Invitation generation failed");
    } finally {
      createButton.disabled = false;
      fileInput.disabled = false;
      syncAiControls();
    }
  });
}

if (typeof document !== "undefined") initVideoHtmlTab();
