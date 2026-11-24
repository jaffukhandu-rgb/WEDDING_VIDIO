import test from "node:test";
import assert from "node:assert/strict";
import { validateVideoDesign, buildVideoDesignCss, normalizeDesignPrompt } from "../src/video-invitation-design.js";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { validateGeminiFrames, requestGeminiPlan } from "../server/gemini-video-analysis.js";

const textArea = { left: 20, top: 24, width: 56, height: 50 };
const ink = "#fff1d2";
const id = "12345678-1234-4234-9234-123456789abc";
const glass = { surface: "glass", panelColor: "#382916", lightAccent: "#f5dfb0",
  nameFont: "editorial", font: "classic", nameSize: 9.2, blur: 12, radius: 3 };
const minimal = { surface: "none", font: "modern", nameItalic: false, namesFirst: true };
test("Design data is bounded and cannot inject HTML, CSS declarations or URLs", () => {
  assert.deepEqual(validateVideoDesign(glass), glass);
  assert.equal(validateVideoDesign({ panelColor: "#000000;}body{display:none" }), null);
  assert.equal(validateVideoDesign({ font: "url(https://bad.test)" }), null);
  assert.equal(validateVideoDesign({ nameSize: 100 }), null);
  assert.equal(validateVideoDesign({ html: "<script>alert(1)</script>" }), null);
  assert.equal(buildVideoDesignCss({ surface: "glass", blur: -2 }), "");
  assert.throws(() => normalizeDesignPrompt("x".repeat(1201)), /Invalid/);
  assert.throws(() => normalizeDesignPrompt({ text: "glass" }), /Invalid/);
  assert.equal(normalizeDesignPrompt("  glass  "), "glass");
});
test("Prompt-driven design changes CSS without changing trusted timing or editable CONFIG", () => {
  const base = { version: 1, duration: 30, revealAt: 9.2, textArea, ink, motionRefined: true,
    safeWindows: [{ start: 9.2, end: 19.8, textArea, ink }, { start: 23.5, end: 29.8, textArea, ink }] };
  const make = design => buildVideoInvitationSource({ id, url: "http://127.0.0.1:4174/api/video-backgrounds/" + id,
    visualAnalysis: { ...base, design } });
  const first = make(glass), second = make(minimal);
  assert.match(first, /backdrop-filter:blur\(12px\)/);
  assert.match(first, /font-size:9.2em/);
  assert.match(second, /font-family:system-ui,Arial,sans-serif/);
  assert.match(second, /order:-1/);
  assert.notEqual(first, second);
  const script = html => html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.equal(script(first), script(second));
  assert.match(script(first), /root.dataset.playbackTimeline/);
  assert.doesNotThrow(() => new Function(script(first)));
});
test("Gemini receives a validated creative brief and local evidence; returns safe design only", async () => {
  const frames = Array.from({ length: 5 }, (_, i) => ({ time: i * 5, jpeg: "a".repeat(120) }));
  const sample = validateGeminiFrames({ duration: 30, frames, designPrompt: "Gold glassmorphism",
    localWindows: [{ start: 9.2, end: 19.8, textArea, ink }] });
  let request;
  const plan = await requestGeminiPlan(sample, "test-key", async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
      revealAt: 9.2, textArea, ink, confidence: "medium", warnings: [], design: glass,
      scenes: [{ start: 0, end: 9.2, kind: "people", note: "Opening" },
        { start: 9.2, end: 30, kind: "invitation_surface", note: "Board", textArea, ink }]
    }) }] } }] }) };
  }, "gemini-3.5-flash");
  assert.deepEqual(plan.design, glass);
  assert.ok(request.contents[0].parts.some(part => part.text?.includes("Gold glassmorphism")));
  assert.ok(request.contents[0].parts[0].text.includes("Locally measured quiet windows"));
  assert.ok(request.generationConfig.responseSchema.properties.design);
  assert.equal(JSON.stringify(request).includes("test-key"), false);
});
