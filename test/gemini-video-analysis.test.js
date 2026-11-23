import test from "node:test";
import assert from "node:assert/strict";
import { validateGeminiFrames, validateGeminiPlan, requestGeminiPlan, classifyGeminiFailure, resolveGeminiModel } from "../server/gemini-video-analysis.js";

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
  assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel, "low");
  assert.equal("thinkingBudget" in payload.generationConfig.thinkingConfig, false);
  assert.equal("temperature" in payload.generationConfig, false);
  assert.equal(payload.generationConfig.maxOutputTokens, 1600);
  assert.match(request.url, /models\/gemini-3\.5-flash:generateContent$/);
  assert.ok(request.url.startsWith("https://generativelanguage.googleapis.com/"));
});

test("Rejects HTTP errors and malformed model JSON", async () => {
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({ ok: false })), /unavailable/);
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: "not json" }] } }]
    })
  })), /invalid JSON/);
});

test("Reports safe, useful codes for Gemini permission, quota and model failures", async () => {
  const cases = [
    [400, "INVALID_ARGUMENT", "API_KEY_INVALID", "invalid_key"],
    [403, "PERMISSION_DENIED", null, "permission_denied"],
    [404, "NOT_FOUND", null, "model_unavailable"],
    [429, "RESOURCE_EXHAUSTED", null, "quota_exceeded"],
    [503, "UNAVAILABLE", null, "provider_unavailable"]
  ];
  for (const [status, providerStatus, detailReason, expected] of cases) {
    assert.equal(classifyGeminiFailure(status, providerStatus, detailReason), expected);
    await assert.rejects(
      requestGeminiPlan(sample, "server-key", async () => ({
        ok: false,
        status,
        json: async () => ({ error: {
          status: providerStatus,
          details: detailReason ? [{ reason: detailReason }] : []
        } })
      })),
      error => error.reason === expected && !error.message.includes("server-key")
    );
  }
});

test("Missing model response and invalid layout receive distinct errors", async () => {
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({
    ok: true, json: async () => ({ candidates: [] })
  })), error => error.reason === "empty_response");
  await assert.rejects(requestGeminiPlan(sample, "key", async () => ({
    ok: true,
    json: async () => ({ candidates: [{
      content: { parts: [{ text: JSON.stringify({
        ...candidate, revealAt: 200
      }) }] }
    }] })
  })), error => error.reason === "invalid_layout");
});

test("Defaults to Gemini 3.5 Flash and supports only server-approved models", () => {
  assert.equal(resolveGeminiModel(""), "gemini-3.5-flash");
  assert.equal(resolveGeminiModel("gemini-3.5-flash"), "gemini-3.5-flash");
  assert.equal(resolveGeminiModel("gemini-3.5-flash-lite"), "gemini-3.5-flash-lite");
  assert.throws(() => resolveGeminiModel("gemini-2.5-flash"), /Unsupported/);
  assert.throws(() => resolveGeminiModel("../invalid-url"), /Unsupported/);
});

test("Missing 3.5 Flash retries once on 3.5 Flash-Lite with the same validated plan", async () => {
  const urls = [];
  const response = await requestGeminiPlan(sample, "SERVER_KEY", async (url, opts) => {
    urls.push(url);
    assert.equal(opts.headers["x-goog-api-key"], "SERVER_KEY");
    if (url.includes("gemini-3.5-flash-lite")) {
      return {
        ok: true, json: async () => ({
          candidates: [{ content: { parts: [
            { text: "internal thought", thought: true },
            { text: JSON.stringify(candidate) }
          ] } }]
        })
      };
    }
    return { ok: false, status: 404,
      json: async () => ({ error: { status: "NOT_FOUND" } }) };
  }, "gemini-3.5-flash");
  assert.equal(response.aiAssisted, true);
  assert.equal(response.revealAt, candidate.revealAt);
  assert.equal(urls.length, 2);
  assert.match(urls[0], /gemini-3\.5-flash:generateContent$/);
  assert.match(urls[1], /gemini-3\.5-flash-lite:generateContent$/);
});

test("Quota, invalid requests and authentication errors never trigger another model request", async () => {
  for (const [status, providerStatus, reason] of [
    [429, "RESOURCE_EXHAUSTED", "quota_exceeded"],
    [403, "PERMISSION_DENIED", "permission_denied"],
    [400, "INVALID_ARGUMENT", "invalid_request"]
  ]) {
    let callCount = 0;
    await assert.rejects(requestGeminiPlan(sample, "key", async () => {
      callCount++;
      return { ok: false, status,
        json: async () => ({ error: { status: providerStatus } }) };
    }, "gemini-3.5-flash"), error => error.reason === reason);
    assert.equal(callCount, 1);
  }
});

test("Explicit Flash-Lite selection bypasses primary model", async () => {
  const urls = [];
  const result = await requestGeminiPlan(sample, "key", async url => {
    urls.push(url);
    return { ok: true, json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(candidate) }] } }]
    }) };
  }, "gemini-3.5-flash-lite");
  assert.equal(result.aiAssisted, true);
  assert.equal(urls.length, 1);
  assert.match(urls[0], /gemini-3\.5-flash-lite:generateContent$/);
});
