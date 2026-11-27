import test from "node:test";
import assert from "node:assert/strict";
import { analyzeVideoVisual, deriveVisualPlan, reconcileReadableWindows, runVideoAiStages, selectSceneEvidenceTimes, selectDesignFrames } from "../src/video-visual-analyzer.js";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { findVideoBackground } from "../src/video-html-contract.js";

const W = 96, H = 170;
const ID = "12345678-1234-4234-9234-123456789abc";
const URL = "http://127.0.0.1:4174/api/video-backgrounds/" + ID;

function frameTimes(duration = 30) {
  return [.2, ...Array.from({ length: Math.floor((duration - .21) * 2) }, (_, i) => (i + 1) / 2),
    Math.round((duration - .2) * 100) / 100];
}

function makeFrames(quiet, brightness = .2, duration = 30) {
  return frameTimes(duration).map((time, i) => ({ time, width: W,
    luma: new Float32Array(W * H).fill(brightness + (quiet(time) ? 0 : .18 * (i % 2))) }));
}

const twoWindows = time => (time >= 4 && time < 13) || (time >= 17 && time < 26);

test("Automatic local analyzer uses early and middle invitation windows and excludes motion", () => {
  const plan = deriveVisualPlan(makeFrames(twoWindows), 30);
  assert.equal(plan.safeWindows.length, 2);
  assert.ok(plan.revealAt >= 4 && plan.revealAt < 5, "Reveal should follow the opening transition.");
  assert.ok(plan.safeWindows[0].end < 13);
  assert.ok(plan.safeWindows[1].start >= 17);
  assert.ok(plan.safeWindows[1].end < 26);
  assert.ok(plan.panels.every(panel => plan.safeWindows.some(window =>
    panel.start >= window.start && panel.end <= window.end)));
  assert.equal(plan.ink, "#fff1d2");
  assert.equal(plan.version, 1);
  assert.equal(plan.motionRefined, true);
  assert.equal(plan.confidence, "medium");
  assert.ok(plan.textArea.width >= 50);
  assert.ok(plan.textArea.height >= 30);
});

test("Automatic analyzer chooses dark typography for a bright panel", () => {
  const plan = deriveVisualPlan(makeFrames(twoWindows, .68), 30);
  assert.equal(plan.ink, "#24160e");
});

test("Continuous motion leaves the overlay hidden and triggers a review warning", () => {
  const plan = deriveVisualPlan(makeFrames(() => false), 30);
  assert.equal(plan.confidence, "low");
  assert.deepEqual(plan.safeWindows, []);
  assert.deepEqual(plan.panels, []);
  assert.ok(plan.warnings.some(warning => warning.includes("No stable, readable text window")));
});

test("Local analysis generates timed panels and keeps existing editable fields", () => {
  const plan = deriveVisualPlan(makeFrames(twoWindows), 30);
  const legacy = buildVideoInvitationSource({ id: ID, url: URL, title: "Wedding" });
  const smart = buildVideoInvitationSource({ id: ID, url: URL, title: "Wedding", visualAnalysis: plan });
  assert.ok(!legacy.includes("data-video-auto-layout="));
  assert.ok(smart.includes('data-video-auto-layout="v1"'));
  assert.ok(smart.includes('data-scene-timeline="v2"'));
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

test("Small lighting changes preserve a readable board and a busy edge stays outside its text area", () => {
  const frames = makeFrames(() => true);
  for (const [index, frame] of frames.entries()) {
    frame.luma.fill(.23 + (index % 3) * .006);
    for (let y = 45; y < 130; y++) {
      for (let x = 79; x < 96; x++) frame.luma[y * W + x] = (x + y + index) % 2 ? .41 : .13;
    }
  }
  const plan = deriveVisualPlan(frames, 30);
  assert.equal(plan.safeWindows.length, 1);
  assert.ok(plan.safeWindows[0].end - plan.safeWindows[0].start >= 28);
  assert.ok(plan.textArea.left + plan.textArea.width <= 82);
});

test("Malformed decoded frames fail safely instead of generating a layout", () => {
  const frames = makeFrames(twoWindows);
  frames[4].luma = new Float32Array(5);
  assert.throws(() => deriveVisualPlan(frames, 30), /Invalid video image data/);
});

test("Full-video scan supports short, fractional and long MP4 durations", () => {
  for (const duration of [5, 38.8, 120]) {
    const plan = deriveVisualPlan(makeFrames(() => true, .18, duration), duration);
    assert.equal(plan.duration, duration);
    assert.deepEqual(plan.safeWindows.map(window => [window.start, window.end]),
      [[.2, Math.round((duration - .2) * 100) / 100]]);
  }
});

function mockVideoAndGemini(t, response) {
  const video = { duration: 30, videoWidth: 1080, videoHeight: 1920, readyState: 2,
    load() { this.onloadedmetadata?.(); }, pause() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {} };
  const originalDocument = globalThis.document;
  t.after(() => { if (originalDocument) globalThis.document = originalDocument;
    else delete globalThis.document; });
  globalThis.document = { createElement: tag => tag === "video" ? video : {
    getContext: () => ({ drawImage() {}, getImageData() {
      const index = Math.floor(video.currentTime * 4);
      const brightness = twoWindows(video.currentTime) ? 58 : 58 + 65 * (index % 3);
      return { data: new Uint8ClampedArray(W * H * 4).fill(brightness) };
    } }),
    toDataURL: () => "data:image/jpeg;base64,abcdefgh"
  } };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    calls.push(options);
    return options.method === "POST" ? response : Response.json({ enabled: true });
  });
  return calls;
}

test("Gemini layout errors retain the whole-video local plan and show a fixed reason", async t => {
  const calls = mockVideoAndGemini(t, Response.json({
    reason: "invalid_layout", layoutDetail: "scene_boundaries", message: "secret"
  }, { status: 502 }));
  const plan = await analyzeVideoVisual("http://localhost/background.mp4", () => {},
    { ai: { adminKey: "test-key", apiRoot: "http://localhost" } });
  assert.equal(calls.length, 2);
  assert.ok(JSON.parse(calls[1].body).frames.length <= 18);
  assert.ok(plan.safeWindows.length >= 2);
  assert.ok(plan.revealAt < 6);
  assert.ok(plan.warnings.some(warning => warning.includes("scene boundaries")));
  assert.ok(plan.warnings.every(warning => !warning.includes("secret")));
});

test("Scene-only Gemini fallback avoids verified people and transition scenes", async t => {
  mockVideoAndGemini(t, Response.json({ plan: {
    version: 1, duration: 30, revealAt: 17, ink: "#fff1d2", confidence: "medium", warnings: [],
    textArea: { left: 20, top: 30, width: 60, height: 40 },
    scenes: [
      { start: 0, end: 14, kind: "people", note: "Ceremony" },
      { start: 14, end: 17, kind: "transition", note: "Camera pans" },
      { start: 17, end: 30, kind: "other", note: "Stable scene" }
    ], panels: []
  } }));
  const plan = await analyzeVideoVisual("http://localhost/background.mp4", () => {},
    { ai: { adminKey: "test-key", apiRoot: "http://localhost" } });
  assert.ok(plan.safeWindows.length > 0);
  assert.ok(plan.safeWindows.every(window => window.start >= 17));
  assert.ok(plan.warnings.some(warning => warning.includes("no locally verified text window")));
});

test("Local quiet timing expands a late Gemini surface without crossing semantic blockers", () => {
  const area = { left: 20, top: 24, width: 56, height: 50 };
  const ink = "#fff1d2";
  const localPlan = { safeWindows: [
    { start: 9.2, end: 19.8, textArea: area, ink },
    { start: 23.5, end: 29.8, textArea: area, ink }
  ] };
  const scenes = [
    { start: 0, end: 9, kind: "people", note: "Bride" },
    { start: 9, end: 16, kind: "other", note: "Board settles" },
    { start: 16, end: 20, kind: "invitation_surface", note: "Board", textArea: area, ink },
    { start: 20, end: 23.4, kind: "transition", note: "Camera pans" },
    { start: 23.4, end: 30, kind: "invitation_surface", note: "Board", textArea: area, ink }
  ];
  const refined = {
    scenes, safeWindows: [
      { start: 16, end: 19.8, textArea: area, ink },
      { start: 23.5, end: 29.8, textArea: area, ink }
    ],
    panels: [], revealAt: 16, textArea: area, ink, motionRefined: true
  };
  const result = reconcileReadableWindows(refined, localPlan, scenes, 30);
  assert.equal(result.revealAt, 9.2);
  assert.deepEqual(result.safeWindows.map(window => [window.start, window.end]),
    [[9.2, 19.8], [23.5, 29.8]]);

  const blockedScenes = [
    { start: 0, end: 16, kind: "people", note: "People in front of board" },
    ...scenes.slice(2)
  ];
  const blocked = reconcileReadableWindows(
    { ...refined, scenes: blockedScenes }, localPlan, blockedScenes, 30);
  assert.equal(blocked.safeWindows[0].start, 16);
  assert.ok(blocked.safeWindows.every(window => window.start >= 16));
});

test("Partially overlapping local and AI windows reconcile without duplicating intervals", () => {
  const textArea = { left: 20, top: 24, width: 56, height: 50 }, ink = "#fff1d2";
  const window = (start, end) => ({ start, end, textArea, ink });
  const scenes = [{ start: 0, end: 9, kind: "people", note: "Opening" },
    { start: 9, end: 30, kind: "invitation_surface", note: "Board", textArea, ink }];
  const refined = { scenes, safeWindows: [window(9, 18), window(23, 29)], revealAt: 9 };
  const result = reconcileReadableWindows(refined, { safeWindows: [window(10, 19)] }, scenes, 30);
  assert.deepEqual(result.safeWindows.map(w => [w.start, w.end]), [[9, 19], [23, 29]]);
});

test("Refined semantic scene boundaries are retained when reconciling quiet windows", () => {
  const textArea = { left: 20, top: 24, width: 56, height: 50 }, ink = "#fff1d2";
  const window = (start, end) => ({ start, end, textArea, ink });
  const scenes = [{ start: 0, end: 10, kind: "transition", note: "Opening" },
    { start: 10, end: 30, kind: "invitation_surface", note: "Board", textArea, ink }];
  const adjusted = [{ ...scenes[0], end: 9 }, { ...scenes[1], start: 9 }];
  const result = reconcileReadableWindows({ scenes: adjusted, safeWindows: [window(16, 19.8)] },
    { safeWindows: [window(9.2, 19.8)] }, scenes, 30);
  assert.equal(result.safeWindows[0].start, 9.2);
  assert.equal(result.scenes[0].end, 9);
});

test("Reduced Gemini samples cover the full video and representative readable windows", () => {
  const localPlan = deriveVisualPlan(makeFrames(twoWindows), 30);
  const times = selectSceneEvidenceTimes(30, localPlan, [8,9,20,23,24]);
  assert.ok(times.length <= 14 && times.length >= 5);
  assert.ok(times[0] < 1 && times.at(-1) > 29);
  assert.ok(localPlan.safeWindows.every(window => times.some(time => time >= window.start && time <= window.end)));
  const references = selectDesignFrames(times.map(time => ({ time, jpeg: "mock" })), localPlan.safeWindows);
  assert.ok(references.length >= 1 && references.length <= 3);
});

test("Retry after design timeout retains the successful scene", async t => {
  const localPlan = deriveVisualPlan(makeFrames(twoWindows), 30);
  const session = { localPlan, decoded: makeFrames(twoWindows),
    images: Array.from({ length: 9 }, (_, i) => ({ time: i * 3.5, jpeg: "mock" })),
    scenePlan: { ...localPlan, aiAssisted: true } };
  const calls = [];
  let fail = true;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push([url, options.method]);
    if (!options.method) return Response.json({ enabled: true });
    assert.ok(url.endsWith("/video-design"));
    return fail ? Response.json({ reason: "timeout" }, { status: 502 }) :
      Response.json({ design: { surface: "glass", blur: 8 } });
  });
  const options = { ai: { apiRoot: "http://localhost", adminKey: "test" }, designPrompt: "glass" };
  const first = await runVideoAiStages(session, options);
  assert.deepEqual(first.aiStageStatus, { scene: "ready", design: "fallback" });
  fail = false;
  const second = await runVideoAiStages(session, options);
  assert.deepEqual(second.aiStageStatus, { scene: "ready", design: "ready" });
  assert.deepEqual(second.safeWindows, first.safeWindows);
  assert.equal(second.design.surface, "glass");
  assert.equal(calls.filter(([url, method]) => method === "POST" && url.endsWith("/video-analysis")).length, 0);
  const before = calls.length;
  await runVideoAiStages(session, options);
  assert.equal(calls.length, before);
});

test("Successful design survives scene timeout and is reused when scenes are retried", async t => {
  const decoded = makeFrames(twoWindows);
  const localPlan = deriveVisualPlan(decoded, 30);
  const session = { localPlan, decoded,
    images: Array.from({ length: 9 }, (_, i) => ({ time: i * 3.5, jpeg: "mock" })) };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push([url, options.method]);
    if (!options.method) return Response.json({ enabled: true });
    if (url.endsWith("/video-design")) return Response.json({ design: { surface: "outline" } });
    assert.equal("designPrompt" in JSON.parse(options.body), false);
    return Response.json({ reason: "timeout" }, { status: 502 });
  });
  const options = { ai: { apiRoot: "http://localhost", adminKey: "test" }, designPrompt: "outline" };
  const first = await runVideoAiStages(session, options);
  assert.deepEqual(first.aiStageStatus, { scene: "fallback", design: "ready" });
  const second = await runVideoAiStages(session, options);
  assert.deepEqual(second.design, first.design);
  assert.equal(calls.filter(([url, method]) => method === "POST" && url.endsWith("/video-design")).length, 1);
});

test("Explicit follow-up sends the actual prior design even if the prompt matches cached text", async t => {
  const localPlan = deriveVisualPlan(makeFrames(twoWindows), 30);
  const prior = { surface: "glass", blur: 12, nameSize: 8.5, borderWidth: .18 };
  const session = { localPlan, decoded: makeFrames(twoWindows), scenePlan: localPlan,
    images: [{ time: 5, jpeg: "mock" }, { time: 18, jpeg: "mock" }],
    design: prior, designPrompt: "bigger names" };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (!options.method) return Response.json({ enabled: true });
    assert.ok(url.endsWith("/video-design"));
    calls.push(JSON.parse(options.body));
    return Response.json({ design: { nameSize: 10 } });
  });
  const result = await runVideoAiStages(session, { ai: { apiRoot: "http://localhost", adminKey: "test" },
    designPrompt: "bigger names", previousDesign: prior, refineDesign: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].previousDesign.blur, 12);
  assert.equal(result.design.nameSize, 10);
  assert.equal(result.design.surface, "glass");
  assert.equal(result.design.blur, 12);
  assert.deepEqual(result.safeWindows, localPlan.safeWindows);
});

test("Retrying a scene without a new brief retains the current design", async t => {
  const decoded = makeFrames(twoWindows);
  const localPlan = deriveVisualPlan(decoded, 30);
  const prior = { surface: "glass", blur: 10 };
  const session = { localPlan, decoded, images: [{ time: 5, jpeg: "mock" }] };
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (!options.method) return Response.json({ enabled: true });
    calls.push(url);
    return Response.json({ reason: "timeout" }, { status: 502 });
  });
  const result = await runVideoAiStages(session, { ai: { apiRoot: "http://localhost", adminKey: "test" },
    previousDesign: prior, retainDesign: true });
  assert.equal(result.design.surface, "glass");
  assert.equal(result.design.blur, 10);
  assert.deepEqual(result.aiStageStatus, { scene: "fallback", design: "ready" });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/video-analysis"));
});

test("Mixed brightness on an otherwise stable surface requests a contrast review", () => {
  const frames = makeFrames(() => true, .48, 6);
  for (const { luma } of frames) {
    for (let i = 0; i < luma.length; i++) luma[i] = Math.floor(i / W / 5) % 2 ? .37 : .61;
  }
  const plan = deriveVisualPlan(frames, 6);
  assert.ok(plan.safeWindows.length);
  assert.ok(plan.warnings.some(text => text.includes("contrast")));
});

test("Expanded AI window retains a single mixed-brightness warning", () => {
  const frames = makeFrames(() => true, .48, 6);
  for (const { luma } of frames) {
    for (let i = 0; i < luma.length; i++) luma[i] = Math.floor(i / W / 5) % 2 ? .37 : .61;
  }
  const local = deriveVisualPlan(frames, 6);
  const area = local.safeWindows[0];
  const scenes = [{ ...area, start: 0, end: 6, kind: "invitation_surface", note: "Board" }];
  const original = { scenes, safeWindows: [{ ...area, start: 2 }] };
  const warning = local.warnings.find(message => message.includes("contrast"));
  for (const warnings of [[], [warning]]) {
    const result = reconcileReadableWindows({ ...original, warnings }, local, scenes, 6, frames);
    assert.equal(result.safeWindows[0].start, area.start);
    assert.deepEqual(result.warnings, [warning]);
  }
});
