import test from "node:test";
import assert from "node:assert/strict";
import { validateGeminiFrames, validateGeminiPlan, requestGeminiPlan } from "../server/gemini-video-analysis.js";

const duration = 34.37;
const jpeg = "abcd".repeat(120);
const sample = {
  duration,
  frames: Array.from({ length: 9 }, (_, i) => ({
    time: Number((.25 + (duration - .5) * i / 8).toFixed(2)), jpeg
  }))
};
const candidate = {
  revealAt: 24.2,
  textArea: { left: 17, top: 18, width: 66, height: 48 },
  ink: "#fff1d2", confidence: "medium", warnings: ["Review final board."]
};

test("Validates bounded chronological JPEG samples", () => {
  assert.equal(validateGeminiFrames(sample).frames.length, 9);
  assert.throws(() => validateGeminiFrames({ ...sample, duration: 0 }), /Invalid/);
  assert.throws(() => validateGeminiFrames({
    ...sample, frames: [...sample.frames].reverse()
  }), /Invalid/);
  assert.throws(() => validateGeminiFrames({
    ...sample, frames: sample.frames.map(f => ({ ...f, jpeg: "<script>" }))
  }), /Invalid/);
  assert.throws(() => validateGeminiFrames({
    ...sample, frames: Array(11).fill(sample.frames[0])
  }), /Invalid/);
});

test("Returns constrained plan, not arbitrary generated code", () => {
  const plan = validateGeminiPlan(candidate, duration);
  assert.equal(plan.version, 1);
  assert.equal(plan.aiAssisted, true);
  assert.equal(plan.duration, duration);
  assert.deepEqual(plan.textArea, candidate.textArea);
  assert.equal("html" in plan, false);
  assert.throws(() => validateGeminiPlan({
    ...candidate, revealAt: duration + 1
  }, duration), /unsafe/);
  assert.throws(() => validateGeminiPlan({
    ...candidate, textArea: { left: 55, top: 20, width: 85, height: 30 }
  }, duration), /unsafe/);
  assert.throws(() => validateGeminiPlan({
    ...candidate, ink: "url(javascript:alert(1))"
  }, duration), /unsafe/);
  assert.throws(() => validateGeminiPlan({
    ...candidate, warnings: ["x".repeat(400)]
  }, duration), /Invalid/);
});

test("Sends timestamped images to Gemini with server-only key", async () => {
  let request;
  const plan = await requestGeminiPlan(sample, "SERVER_TEST_KEY", async (url, options) => {
    request = { url, options };
    return {
      ok: true, json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(candidate) }] } }]
      })
    };
  });
  assert.equal(plan.revealAt, 24.2);
  assert.equal(request.options.headers["x-goog-api-key"], "SERVER_TEST_KEY");
  const payload = JSON.parse(request.options.body);
  assert.equal(payload.contents[0].parts.filter(part => part.inlineData).length, 9);
  assert.equal(JSON.stringify(payload).includes("SERVER_TEST_KEY"), false);
  assert.ok(request.url.startsWith("https://generativelanguage.googleapis.com/"));
});

test("Rejects HTTP errors and malformed model JSON", async () => {
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({ ok: false })), /unavailable/);
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "not json" }] } }]
    })
  })), SyntaxError);
});
