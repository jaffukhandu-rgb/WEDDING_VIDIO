import test from "node:test";
import assert from "node:assert/strict";
import { deriveVisualPlan } from "../src/video-visual-analyzer.js";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { findVideoBackground } from "../src/video-html-contract.js";

const W = 96, H = 170;
const ID = "12345678-1234-4234-9234-123456789abc";
const URL = "http://127.0.0.1:4174/api/video-backgrounds/" + ID;

function makeFrames(steadyAt, light = false) {
  const frames = [];
  for (let t = 18; t <= 29.5; t += .5) {
    const stationary = t >= steadyAt;
    const luma = new Float32Array(W * H);
    for (let i = 0; i < luma.length; i++) {
      // A stationary, muted-colored final board region; earlier scene changes.
      luma[i] = (light ? .68 : .20) + (stationary ? 0 : .1 * (Math.floor(t * 2) % 3));
    }
    frames.push({ time: t, luma });
  }
  return frames;
}

test("Automatic analyzer selects the static ending, not an earlier scene", () => {
  const plan = deriveVisualPlan(makeFrames(25), 30);
  assert.ok(plan.revealAt >= 25, "Reveal should follow final transition.");
  assert.ok(plan.revealAt <= 27.5, "Leave time to read.");
  assert.equal(plan.ink, "#fff1d2");
  assert.equal(plan.version, 1);
  assert.equal(plan.confidence, "medium");
  assert.ok(plan.textArea.width >= 50);
  assert.ok(plan.textArea.height >= 30);
});

test("Automatic analyzer chooses dark typography for a bright panel", () => {
  const plan = deriveVisualPlan(makeFrames(25, true), 30);
  assert.equal(plan.ink, "#24160e");
});

test("Animated footage without a steady ending triggers review warning", () => {
  const plan = deriveVisualPlan(makeFrames(999), 30);
  assert.equal(plan.confidence, "low");
  assert.ok(plan.warnings.some(warning => warning.includes("stationary")));
});

test("Smart layout is generated only for analyzed video, leaving old default unchanged", () => {
  const plan = deriveVisualPlan(makeFrames(25), 30);
  const legacy = buildVideoInvitationSource({ id: ID, url: URL, title: "Wedding" });
  const smart = buildVideoInvitationSource({ id: ID, url: URL, title: "Wedding", visualAnalysis: plan });
  assert.ok(!legacy.includes("data-video-auto-layout="));
  assert.ok(smart.includes('data-video-auto-layout="v1"'));
  assert.ok(smart.includes(".copy-inner"));
  assert.ok(smart.includes("@keyframes reveal-invitation"));
  assert.ok(smart.includes("background:none"));
  assert.ok(smart.includes("data-wedding-background=" + '"' + ID + '"'));
  assert.equal(findVideoBackground(smart)?.id, ID);
  const analysis = analyzeTemplate(smart);
  assert.equal(analysis.sceneCount, 2);
  assert.equal(analysis.photoSlots.length, 0);
  assert.ok(analysis.fields.includes("partner1"));
  const prepared = prepareTemplate(smart, { partner1: "Test Bride", partner2: "Test Groom" });
  assert.ok(prepared.includes("Test Bride"));
  assert.ok(prepared.includes("Test Groom"));
  const script = smart.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Function(script));
});

test("Animated text window reduces confidence and warns about moving text region", () => {
  const frames = makeFrames(25);
  for (const frame of frames) {
    if (frame.time >= 26) frame.luma.fill(Math.round(frame.time * 2) % 2 ? .48 : .20);
  }
  const plan = deriveVisualPlan(frames, 30);
  assert.equal(plan.confidence, "low");
  assert.ok(plan.warnings.some(warning => warning.includes("text region changes")));
});

test("Malformed decoded frames fail safely instead of generating a layout", () => {
  const frames = makeFrames(25);
  frames[4].luma = new Float32Array(5);
  assert.throws(() => deriveVisualPlan(frames, 30), /Invalid video image data/);
});

test("Visual plan preserves a 38.8-second MP4 duration and late reveal", () => {
  const frames = [];
  for (let i = 0; i < 24; i++) {
    const t = 26.8 + i * .5;
    const luma = new Float32Array(W * H);
    luma.fill(t < 33 ? .18 + (i % 2) * .10 : .18);
    frames.push({ time: t, luma });
  }
  const plan = deriveVisualPlan(frames, 38.8);
  assert.equal(plan.duration, 38.8);
  assert.ok(plan.revealAt >= 33 && plan.revealAt < 38.8);
});
