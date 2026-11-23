import test from "node:test";
import assert from "node:assert/strict";
import { sceneSampleTimes, validateSceneTimeline } from "../src/video-scene-timeline.js";
import { validateGeminiPlan } from "../server/gemini-video-analysis.js";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";

const duration = 38.8;
const id = "12345678-1234-4234-9234-123456789abc";
const url = "http://127.0.0.1:4174/api/video-backgrounds/" + id;
const area = { left: 18, top: 24, width: 64, height: 49 };
const scenes = [
  { start: 0, end: 20.2, kind: "people", note: "Seated guests" },
  { start: 20.2, end: 23, kind: "transition", note: "Camera moves toward the board" },
  { start: 23, end: duration, kind: "invitation_surface", note: "Carved invitation board" }
];
const panels = [
  { kind: "intro", start: 23, end: 27, textArea: area },
  { kind: "details", start: 27, end: 30.5, textArea: area },
  { kind: "events", start: 30.8, end: 38.6, textArea: area }
];
const plan = {
  version: 1, duration, revealAt: 23, textArea: area,
  ink: "#fff1d2", shadow: "rgba(12,6,2,.7)",
  confidence: "medium", warnings: [], scenes, panels
};

test("Scene keyframes cover the complete duration and refine the final transition", () => {
  for (const seconds of [5, 30, 38.8, 120]) {
    const revealAt = Math.max(0, seconds - 6);
    const frames = sceneSampleTimes(seconds, revealAt, [seconds - 8]);
    assert.ok(frames.length >= 12 && frames.length <= 18);
    assert.ok(frames[0] >= 0 && frames.at(-1) < seconds);
    assert.ok(frames.every((time, index) =>
      Number.isFinite(time) && (index === 0 || time > frames[index - 1])));
    assert.ok(frames.some(time => Math.abs(time - revealAt) < 1.6));
  }
});

test("Bounded scenes and panels validate without accepting HTML or unsafe positions", () => {
  const validated = validateSceneTimeline(plan, duration);
  assert.equal(validated.scenes.length, 3);
  assert.deepEqual(validated.panels.map(panel => panel.kind), ["intro", "details", "events"]);
  assert.deepEqual(validateGeminiPlan(plan, duration).panels, validated.panels);
  assert.throws(() => validateSceneTimeline({
    ...plan, scenes: [{ ...scenes[0], note: "<img>".repeat(30) }, ...scenes.slice(1)]
  }, duration), /Invalid video scene boundaries/);
  assert.throws(() => validateSceneTimeline({
    ...plan, panels: [panels[0], { ...panels[1], start: 26.8 }, panels[2]]
  }, duration), /Overlapping/);
  assert.throws(() => validateSceneTimeline({
    ...plan, panels: [panels[0], { ...panels[1], textArea: {
      left: -20, top: 24, width: 64, height: 49
    } }, panels[2]]
  }, duration), /Unsafe/);
  assert.throws(() => validateSceneTimeline({
    ...plan, scenes: [{ ...scenes[0], end: 14 }, ...scenes.slice(1)]
  }, duration), /Invalid video scene boundaries/);
});

test("No readable multi-panel window uses the original single-overlay generator", () => {
  const onlyScenes = { ...plan, panels: [] };
  const normalized = validateGeminiPlan(onlyScenes, duration);
  assert.equal(normalized.scenes.length, 3);
  assert.deepEqual(normalized.panels, []);
  const html = buildVideoInvitationSource({
    id, url, title: "Wedding", visualAnalysis: normalized
  });
  assert.ok(html.includes('data-video-auto-layout="v1"'));
  assert.equal(html.includes('data-scene-timeline="v2"'), false);
  assert.equal(html.includes("panelTimeline"), false);
  const original = buildVideoInvitationSource({ id, url, title: "Wedding" });
  assert.equal(original.includes("data-video-auto-layout"), false);
});

test("V2 generator preserves editable CONFIG and two existing HTML scenes", () => {
  const html = buildVideoInvitationSource({
    id, url, title: "Scene-aware wedding", visualAnalysis: plan
  });
  assert.ok(html.includes('data-scene-timeline="v2"'));
  assert.ok(html.includes("panelTimeline"));
  const report = analyzeTemplate(html);
  assert.equal(report.sceneCount, 2);
  assert.ok(report.fields.includes("events"));
  assert.equal(report.config.partner1, "Ayaan");
  assert.ok(html.includes("data-wedding-background="));
  const js = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(js);
  assert.doesNotThrow(() => new Function(js));
  assert.ok(Buffer.byteLength(html) < 1024 * 1024);
});

test("Video playhead displays intro, details and five editable events without skipping pages", () => {
  const raw = buildVideoInvitationSource({
    id, url, title: "Scene-aware wedding", visualAnalysis: plan
  });
  const editedEvents = ["Manaktham", "Mehendi", "Ladies Majlis", "Mama Musala", "Procession"]
    .map((name, i) => ({
      name, date: "2027-01-" + String(8 + i).padStart(2, "0"),
      time: "7:30 PM", venue: "Event venue", note: "Join the programme"
    }));
  // The existing customer editor intentionally requires a fixed event count.
  // Admins can define more event slots in CONFIG before creating the template.
  const populated = raw.replace(/events: \[\{[\s\S]*?\}\]/,
    "events: [" + editedEvents.map(event =>
      "{" + Object.entries(event).map(([key, value]) =>
        key + ": " + JSON.stringify(value)).join(", ") + "}"
    ).join(", ") + "]");
  assert.notEqual(populated, raw);
  const prepared = prepareTemplate(populated, {
    partner1: "Taha", partner2: "Munira", events: editedEvents
  });
  const script = prepared.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);

  class MockNode {
    constructor() {
      this.textContent = ""; this.hidden = false; this.style = {};
      this.dataset = {}; this.children = []; this.clientWidth = 270;
      this.clientHeight = 480; this.scrollWidth = 180;
      this.scrollHeight = 220;
    }
    appendChild(node) { this.children.push(node); }
  }
  const fields = {};
  for (const name of [".ceremony", ".message", ".names", ".date-time",
    ".venue", ".address", ".blessing"]) fields[name] = new MockNode();
  const root = new MockNode(), inner = new MockNode(), eventHost = new MockNode();
  root.querySelector = selector => selector === ".copy-inner" ? inner
    : selector === ".events-list" ? eventHost : fields[selector];
  const listeners = {};
  const video = {
    currentTime: 0,
    addEventListener(name, callback) { listeners[name] = callback; }
  };
  const document = {
    querySelector: selector => selector === ".copy" ? root
      : selector === 'video[data-wedding-background]' ? video : null,
    createElement: () => new MockNode(),
    fonts: { ready: { then() {} } }
  };
  const window = { addEventListener() {} };
  new Function("document", "window", script)(document, window);
  const seek = time => { video.currentTime = time; listeners.seeked(); };
  assert.equal(root.style.opacity, "0");

  seek(24);
  assert.equal(fields[".names"].textContent, "Taha & Munira");
  assert.equal(fields[".names"].hidden, false);
  assert.equal(fields[".date-time"].hidden, true);

  seek(28);
  assert.equal(fields[".date-time"].hidden, false);
  assert.equal(fields[".message"].hidden, true);
  assert.equal(eventHost.hidden, true);

  assert.equal(eventHost.children.length, 3);
  seek(31.2);
  assert.equal(eventHost.hidden, false);
  assert.deepEqual(eventHost.children.map(node => node.hidden), [false, true, true]);
  seek(34.1);
  assert.deepEqual(eventHost.children.map(node => node.hidden), [true, false, true]);
  seek(37.1);
  assert.deepEqual(eventHost.children.map(node => node.hidden), [true, true, false]);
  assert.equal(root.dataset.timelineReadability, "ok");

  seek(38.8);
  assert.equal(root.style.opacity, "0");
  seek(24);
  assert.equal(fields[".names"].hidden, false);
  assert.equal(eventHost.hidden, true);
});
