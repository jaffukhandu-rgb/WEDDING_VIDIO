import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initVideoHtmlTab, buildVideoInvitationSource } from "../src/admin-video-html.js";
import { analyzeVideoVisual, runVideoAiStages } from "../src/video-visual-analyzer.js";

const ID = "12345678-1234-4234-9234-123456789abc";
const ROOT = "http://127.0.0.1:4174";
const SOURCE = ROOT + "/api/video-backgrounds/" + ID;

function mockAdmin(t) {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) {
      const listeners = {};
      elements.set(selector, {
        value: "", textContent: "", hidden: false, checked: false, disabled: false,
        dataset: {}, files: [], classList: { toggle() {}, contains() { return false; } },
        setAttribute() {}, removeAttribute() {}, focus() {},
        addEventListener(name, callback) { listeners[name] = callback; },
        dispatchEvent(event) { return listeners[event.type]?.(event); },
        click() { return listeners.click?.(); },
        change() { return listeners.change?.(); }
      });
    }
    return elements.get(selector);
  }
  let jpegCalls = 0, uploads = 0;
  const video = { duration: 30, videoWidth: 1080, videoHeight: 1920, readyState: 2,
    load() { this.onloadedmetadata?.(); }, pause() {}, removeAttribute() {},
    addEventListener() {}, removeEventListener() {} };
  const calls = [];
  const response = (data, status = 200) => Response.json(data, { status });
  let sceneResponse = response({ reason: "provider_unavailable" }, 502);
  let duringRequest = () => {};
  const globals = {
    document: { querySelector: element, createElement: tag => tag === "video" ? video : {
      getContext: () => ({ drawImage() {}, getImageData() {
        return { data: new Uint8ClampedArray(96 * 170 * 4).fill(58) };
      } }),
      toDataURL: () => { jpegCalls++; return "data:image/jpeg;base64,abcdefgh"; }
    } },
    window: { confirm: () => true },
    XMLHttpRequest: class {
      upload = {};
      status = 201;
      responseText = JSON.stringify({ id: ID, provider: "cloudinary" });
      open(method, url) { assert.equal(method, "POST"); assert.equal(url, ROOT + "/api/admin/video-backgrounds"); }
      setRequestHeader() {}
      send() { uploads++; this.upload.onload(); this.onload(); }
    }
  };
  for (const [key, value] of Object.entries(globals)) {
    const old = globalThis[key];
    globalThis[key] = value;
    t.after(() => { if (old === undefined) delete globalThis[key]; else globalThis[key] = old; });
  }
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, method: options.method || "GET", body: options.body });
    if (url.endsWith("/status")) return response({ mongodbConfigured: true, cloudinaryConfigured: true });
    duringRequest();
    if (!options.method) return response({ enabled: true });
    if (url.endsWith("/video-design")) return response({ design: { surface: "glass", blur: 8 }, model: "gemini-3.5-flash-lite" });
    return sceneResponse;
  });
  const file = new Blob([new Uint8Array(2048)], { type: "video/mp4" });
  Object.defineProperty(file, "name", { value: "sample.mp4" });
  element("#video-html-file").files = [file];
  element("#admin-api-key").value = "test-admin-key";
  element("#video-html-enable-ai").checked = true; // Simulate browser-restored state.
  initVideoHtmlTab();
  return { element, calls, get jpegCalls() { return jpegCalls; }, get uploads() { return uploads; },
    onRequest(callback) { duringRequest = callback; },
    setSceneResponse(value) { sceneResponse = value; } };
}

test("AI controls default off and local upload ignores a retained AI prompt", async t => {
  const ui = mockAdmin(t), el = ui.element;
  const toggle = el("#video-html-enable-ai"), prompt = el("#video-html-design-prompt");
  assert.equal(toggle.checked, false);
  assert.equal(el("#video-html-ai-fields").hidden, true);
  assert.equal(prompt.disabled, true);
  assert.equal(el("#video-html-retry-ai").hidden, true);
  prompt.value = "x".repeat(1201); // Hidden invalid prompt must not block local generation.
  await el("#video-html-create").click();
  assert.equal(ui.uploads, 1);
  assert.equal(ui.jpegCalls, 0);
  assert.deepEqual(ui.calls.map(row => row.url), [ROOT + "/api/video-backgrounds/status"]);
  assert.ok(el("#video-html-code").value.includes("data-wedding-background"));
  assert.ok(el("#video-html-visual-report").textContent.includes("AI assistance off"));
  assert.equal(el("#video-html-upload-progress").value, 100);
  assert.equal(toggle.disabled, false);
  assert.equal(prompt.disabled, true);
  assert.equal(el("#video-html-retry-ai").hidden, true);
  await el("#video-html-retry-ai").click(); // Even a forced handler call is gated.
  assert.equal(ui.calls.length, 1);
});

test("Enabling assistance exposes saved-video retry; disabling it preserves code and prompt", async t => {
  const ui = mockAdmin(t), el = ui.element;
  const toggle = el("#video-html-enable-ai"), prompt = el("#video-html-design-prompt");
  const existing = buildVideoInvitationSource({ id: ID, url: SOURCE, title: "Existing" });
  el("#video-html-code").value = existing;
  el("#video-html-analyze").click();
  toggle.checked = true; toggle.change();
  assert.equal(el("#video-html-ai-fields").hidden, false);
  assert.equal(prompt.disabled, false);
  assert.equal(el("#video-html-retry-ai").hidden, false);
  prompt.value = "Make it royal";
  toggle.checked = false; toggle.change();
  assert.equal(el("#video-html-code").value, existing);
  assert.equal(prompt.value, "Make it royal");
  assert.equal(prompt.disabled, true);
  assert.equal(el("#video-html-retry-ai").disabled, true);
  await el("#video-html-retry-ai").click();
  assert.equal(ui.calls.length, 1);
  toggle.checked = true; toggle.change();
  ui.onRequest(() => {
    assert.equal(toggle.disabled, true);
    assert.equal(prompt.disabled, true);
  });
  await el("#video-html-retry-ai").click();
  assert.equal(ui.uploads, 0);
  assert.ok(ui.calls.some(row => row.method === "POST" && row.url.endsWith("/video-design")));
  assert.equal(toggle.disabled, false);
  assert.ok(el("#video-html-code").value.includes("data-wedding-background"));
});

test("Enabled initial generation uses existing AI stages, then switching off blocks future retries", async t => {
  const ui = mockAdmin(t), el = ui.element;
  const toggle = el("#video-html-enable-ai");
  toggle.checked = true; toggle.change();
  el("#video-html-design-prompt").value = "Glass design";
  ui.onRequest(() => assert.equal(toggle.disabled, true));
  await el("#video-html-create").click();
  assert.equal(ui.uploads, 1);
  assert.ok(ui.jpegCalls > 0);
  assert.ok(ui.calls.some(row => row.method === "POST" && row.url.endsWith("/video-analysis")));
  assert.ok(ui.calls.some(row => row.method === "POST" && row.url.endsWith("/video-design")));
  const code = el("#video-html-code").value, count = ui.calls.length;
  assert.ok(code.includes("wedding-ai-design:v1"));
  toggle.checked = false; toggle.change();
  await el("#video-html-retry-ai").click();
  assert.equal(ui.calls.length, count);
  assert.equal(el("#video-html-code").value, code);
  assert.equal(el("#video-html-retry-ai").hidden, true);
});

test("A cached successful AI session does not enable AI in a later local-only call", async () => {
  const localPlan = { duration: 30, warnings: [] };
  const session = { source: SOURCE, localPlan, images: [{ time: 1, jpeg: "mock" }],
    scenePlan: { ...localPlan, aiAssisted: true }, design: { surface: "glass" } };
  assert.equal(await analyzeVideoVisual(SOURCE, () => {}, { session, designPrompt: "x".repeat(1500) }), localPlan);
  assert.equal(await runVideoAiStages(session, {}), localPlan);
  assert.equal(session.design.surface, "glass");
});

test("HTML and library handoff enforce default-off behavior", () => {
  const html = readFileSync(new URL("../admin.html", import.meta.url), "utf8");
  const checkbox = html.match(/<input id="video-html-enable-ai"[^>]*>/)?.[0];
  assert.ok(checkbox?.includes('type="checkbox"'));
  assert.ok(!/\schecked(?:\s|=|>)/.test(checkbox));
  assert.match(html, /id="video-html-ai-fields"[^>]*\shidden/);
  const handoff = readFileSync(new URL("../src/admin-workspace-state.js", import.meta.url), "utf8");
  assert.match(handoff, /analyzeVideoVisual\(url, percent => \{[\s\S]*?\}\); \/\/ Library handoff/);
  assert.ok(!handoff.includes("ai: {"));
});

test("Declined create and retry preserve the current invitation and report", async t => {
  const ui = mockAdmin(t), el = ui.element;
  await el("#video-html-create").click();
  const report = el("#video-html-visual-report");
  const code = el("#video-html-code").value, message = report.textContent;
  const toggle = el("#video-html-enable-ai");
  toggle.checked = true;
  toggle.change();
  let confirmations = 0;
  window.confirm = () => { confirmations++; return false; };
  for (const action of ["#video-html-create", "#video-html-retry-ai"]) {
    await el(action).click();
    assert.equal(report.hidden, false);
    assert.equal(report.textContent, message);
    assert.equal(el("#video-html-code").value, code);
  }
  assert.equal(confirmations, 2);
  assert.equal(ui.uploads, 1);
  assert.equal(ui.calls.length, 1);
});

test("A workspace change during assisted generation prevents upload and source replacement", async t => {
  const ui = mockAdmin(t);
  const { workspaceReplaced } = await import("../src/admin-workspace-version.js");
  const toggle = ui.element("#video-html-enable-ai");
  toggle.checked = true; toggle.change();
  ui.onRequest(() => workspaceReplaced());
  await ui.element("#video-html-create").click();
  assert.equal(ui.uploads, 0);
  assert.equal(ui.element("#video-html-code").value, "");
  assert.equal(ui.element("#video-html-create").disabled, false);
});
