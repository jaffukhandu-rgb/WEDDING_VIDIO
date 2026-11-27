import test from "node:test";
import assert from "node:assert/strict";
import { validateGeminiFrames, validateGeminiPlan, requestGeminiPlan, requestGeminiDesign, runGeminiStage, classifyGeminiFailure, resolveGeminiModel, resolveGeminiFallback, safeGeminiDiagnostics } from "../server/gemini-video-analysis.js";

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
  assert.equal(payload.generationConfig.maxOutputTokens, 2600);
  assert.ok(payload.generationConfig.responseSchema.required.includes("scenes"));
  assert.ok(!payload.generationConfig.responseSchema.required.includes("panels"));
  assert.match(payload.contents[0].parts[0].text, /End every panel by 34\.27 seconds/);
  assert.match(request.url, /models\/gemini-3\.5-flash-lite:generateContent$/);
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
  })), error => error.reason === "invalid_layout" && error.layoutDetail === "reveal_time");
});

test("Repairs a rounded fractional clip end and a final panel that reaches the clip end", async () => {
  const seconds = 30.037333;
  const clip = { ...sample, duration: seconds, frames: sample.frames.filter(frame => frame.time < seconds) };
  const textArea = candidate.textArea;
  const response = {
    ...candidate,
    revealAt: 25,
    scenes: [
      { start: 0, end: 8.94, kind: "people", note: "Moving camera" },
      { start: 8.94, end: 30.04, kind: "invitation_surface", note: "Board", textArea }
    ],
    panels: [
      { start: 13.56, end: 16.06, kind: "intro", textArea },
      { start: 23.44, end: seconds, kind: "details", textArea }
    ]
  };
  const plan = await requestGeminiPlan(clip, "test-key", async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(response) }] } }] })
  }));
  assert.equal(plan.scenes.at(-1).end, seconds);
  assert.equal(plan.panels[0].end, 16.06);
  assert.equal(plan.panels[1].end, 29.93);
  assert.equal(plan.revealAt, plan.panels[0].start);
});

test("Keeps safe scene evidence when advisory panels overrun their usable time", () => {
  const textArea = candidate.textArea;
  const scenes = [
    { start: 0, end: 5, kind: "people", note: "Guests" },
    { start: 5, end: 17, kind: "decor", note: "Flower-framed space", textArea },
    { start: 17, end: duration, kind: "invitation_surface", note: "Board", textArea }
  ];
  const panels = [
    { start: 6, end: 10, kind: "intro", textArea },
    { start: 9, end: 12, kind: "details", textArea }
  ];
  const plan = validateGeminiPlan({ ...candidate, scenes, panels }, duration);
  assert.deepEqual(plan.scenes.map(scene => scene.start), [0, 5, 17]);
  assert.deepEqual(plan.panels, []);
  assert.throws(() => validateGeminiPlan({
    ...candidate, scenes: scenes.map(scene => ({ ...scene, textArea: undefined })), panels
  }, duration), error => error.layoutDetail === "panel_boundaries");
  assert.throws(() => validateGeminiPlan({
    ...candidate, scenes: [{ ...scenes[0], end: 2 }, ...scenes.slice(1)], panels
  }, duration), error => error.layoutDetail === "scene_boundaries");
  const slightOverlap = [panels[0], { ...panels[1], start: 9.995, end: 13 }];
  assert.equal(validateGeminiPlan({ ...candidate, scenes, panels: slightOverlap }, duration)
    .panels[1].start, panels[0].end);
  const unsafePanel = { ...slightOverlap[1], textArea: { ...textArea, width: 200 } };
  assert.deepEqual(validateGeminiPlan({
    ...candidate, scenes, panels: [panels[0], unsafePanel]
  }, duration).panels, []);
});

test("Optional empty panel fields and bounded decimal areas preserve legacy layout support", () => {
  const plan = validateGeminiPlan({
    ...candidate, panels: [], textArea: { left: 50.5, top: 40.5, width: 45.5, height: 53.5 }
  }, duration);
  assert.equal(plan.scenes, undefined);
  assert.equal(plan.textArea.left + plan.textArea.width, 96);
  assert.equal(plan.textArea.top + plan.textArea.height, 94);
});

test("Defaults to Flash-Lite candidates and supports only server-approved models", () => {
  assert.equal(resolveGeminiModel(""), "gemini-3.5-flash-lite");
  assert.equal(resolveGeminiFallback("gemini-3.5-flash-lite", ""), "gemini-3.1-flash-lite");
  assert.equal(resolveGeminiFallback("gemini-3.5-flash", ""), "gemini-3.5-flash-lite");
  assert.equal(resolveGeminiFallback("gemini-3.5-flash-lite", "none"), null);
  assert.equal(resolveGeminiFallback("gemini-3.5-flash-lite", "gemini-3.5-flash-lite"), null);
  assert.throws(() => resolveGeminiFallback("gemini-3.5-flash-lite", "../bad"), /Unsupported/);
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

test("Independent creative request uses a small style-only schema and bounded reference frames", async () => {
  const input = validateGeminiFrames({ ...sample, frames: sample.frames.slice(0, 3),
    designPrompt: "Gold glass" }, 1, 3);
  const design = { surface: "glass", font: "elegant", blur: 8 };
  let payload;
  const result = await requestGeminiDesign(input, "test-key", async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [
      { text: JSON.stringify(design) }
    ] } }] }) };
  }, "gemini-3.5-flash");
  assert.deepEqual(result, design);
  assert.equal(payload.generationConfig.maxOutputTokens, 1100);
  assert.equal("scenes" in payload.generationConfig.responseSchema.properties, false);
  assert.equal(payload.contents[0].parts.filter(part => part.inlineData).length, 3);
  assert.throws(() => validateGeminiFrames(sample, 1, 3), /Invalid/);
});

test("Slow timeout switches directly to fallback within its shared deadline", async () => {
  let clock = 0;
  const budgets = [];
  const attempts = [];
  const result = await runGeminiStage(async budget => {
    budgets.push(budget);
    if (budgets.length === 1) {
      clock += 60_000;
      throw Object.assign(new Error("timeout"), { reason: "timeout" });
    }
    return "ok";
  }, { now: () => clock, random: () => 0, sleep: async ms => { clock += ms; },
    primaryModel: "gemini-3.5-flash-lite", fallbackModel: "gemini-3.1-flash-lite",
    onAttempt: report => attempts.push(report) });
  assert.equal(result, "ok");
  assert.deepEqual(budgets, [60_000, 29_000]);
  assert.deepEqual(attempts.map(x => x.outcome), ["timeout", "ok"]);
  assert.deepEqual(attempts.map(x => x.model), ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
});

test("Non-transient stage failures are not retried", async () => {
  for (const reason of ["quota_exceeded", "invalid_key", "permission_denied", "invalid_layout"]) {
    let calls = 0;
    await assert.rejects(runGeminiStage(async () => {
      calls++;
      throw Object.assign(new Error(reason), { reason });
    }), error => error.reason === reason);
    assert.equal(calls, 1);
  }
});

test("Fast upstream failures get one delayed primary retry, then fallback", async () => {
  let clock = 0;
  const calls = [], delays = [], reports = [];
  const result = await runGeminiStage(async (budget, model) => {
    calls.push({ budget, model });
    clock += 2_000;
    if (calls.length < 3) throw Object.assign(new Error("unavailable"), {
      reason: "provider_unavailable", upstreamStatus: 503, providerStatus: "UNAVAILABLE"
    });
    return "ok";
  }, { now: () => clock, random: () => .5, sleep: async ms => { delays.push(ms); clock += ms; },
    primaryModel: "gemini-3.5-flash-lite", fallbackModel: "gemini-3.1-flash-lite",
    onAttempt: info => reports.push(info) });
  assert.equal(result, "ok");
  assert.deepEqual(calls.map(x => x.model), ["gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
  assert.deepEqual(delays, [1250, 2250]);
  assert.equal(reports[0].upstreamStatus, 503);
  assert.equal(reports[0].providerStatus, "UNAVAILABLE");
  assert.ok(calls[2].budget <= 90_000 - 7_500);
});

test("A missing primary model switches once without an identical request", async () => {
  const calls = [];
  await runGeminiStage(async (_budget, model) => {
    calls.push(model);
    if (calls.length === 1) throw Object.assign(new Error("missing"), { reason: "model_unavailable" });
    return "ok";
  }, { primaryModel: "gemini-3.5-flash-lite", fallbackModel: "gemini-3.1-flash-lite",
    sleep: async () => { throw Error("Unexpected delay"); } });
  assert.deepEqual(calls, ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
});

test("Exact model request disables hidden legacy fallback and retains safe HTTP metadata", async () => {
  let calls = 0;
  await assert.rejects(requestGeminiPlan(sample, "private-key", async () => {
    calls++;
    return { ok: false, status: 404, json: async () => ({ error: {
      status: "NOT_FOUND", message: "private-key raw upstream message"
    } }) };
  }, "gemini-3.5-flash", 20_000, { allowModelFallback: false }),
  error => error.reason === "model_unavailable" && error.upstreamStatus === 404 &&
    error.providerStatus === "NOT_FOUND" && !error.message.includes("private-key"));
  assert.equal(calls, 1);
  assert.deepEqual(safeGeminiDiagnostics({ upstreamStatus: 503, providerStatus: "secret" }), { upstreamStatus: 503 });
});

test("Exhausted fallback stops without another request", async () => {
  let count = 0, clock = 0;
  await assert.rejects(runGeminiStage(async () => {
    count++;
    clock += 1_000;
    throw Object.assign(new Error("unavailable"), { reason: "provider_unavailable" });
  }, { now: () => clock, random: () => 0, sleep: async ms => { clock += ms; },
    primaryModel: "gemini-3.5-flash-lite", fallbackModel: "gemini-3.1-flash-lite" }),
  error => error.reason === "provider_unavailable");
  assert.equal(count, 3);
});
