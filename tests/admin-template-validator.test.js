import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { validateTemplateSource, validateRuntimeReport } from "../src/admin-template-validator.js";

function invitation(config, extraScript = "") {
  const scenes = Array.from({ length: 5 }, (_, i) =>
    '<section class="scene" style="--i:' + i + '"></section>').join("");
  return '<!doctype html><html><head><style>' +
    '.go .scene{animation:scn 6s both;animation-delay:calc(var(--i)*6s)}' +
    '</style></head><body><main class="stage">' + scenes + '</main>' +
    '<script>const CONFIG = ' + config + ';' + extraScript + '</script></body></html>';
}

test("single-date invitation preserves a validated 30-second scene schedule", () => {
  const html = invitation('{partner1:"Rohan",partner2:"Meera",date:"2027-02-14",venue:"Hall"}');
  const analysis = analyzeTemplate(html);
  const checks = validateTemplateSource(html, analysis);
  assert.equal(analysis.sceneCount, 5);
  assert.equal(checks.find(check => check.id === "timeline").status, "pass");
  assert.equal(checks.find(check => check.id === "dates").status, "pass");
  assert.equal(checks.find(check => check.id === "export").status, "pending");
});

test("multi-event invitation checks valid dates without assuming CONFIG.date", () => {
  const html = invitation('{partner1:"Aryan",partner2:"Ishita",' +
    'events:[{name:"Mehndi",date:"2027-02-18",time:"04:00 PM",venue:"Lawn"},' +
    '{name:"Wedding",date:"2027-02-21",time:"06:30 PM",venue:"Palace"}],' +
    'venue:"Palace",photos:["",""]}', 'CONFIG.photos[0];CONFIG.photos[1]');
  const analysis = analyzeTemplate(html);
  const checks = validateTemplateSource(html, analysis);
  assert.equal(analysis.config.events.length, 2);
  assert.equal(analysis.photoSlots.length, 2);
  assert.equal(checks.find(check => check.id === "dates").status, "pass");
  assert.match(prepareTemplate(html, { events: analysis.config.events }), /"Mehndi"/);
});

test("commented photo links remain readable and placeholders are flagged", () => {
  const html = invitation('{partner1:"Taha",partner2:"Munira",blessing:"",' +
    'events:[{name:"Nikah",date:"2027-01-07",time:"07:30 PM",venue:"Palace"}],' +
    'venue:"Palace",photos:["https://YOUR-PHOTO-LINK-1.jpg", // opening\n' +
    '"https://YOUR-PHOTO-LINK-2.jpg" // portrait\n' +
    ']}', 'CONFIG.photos[0];CONFIG.photos[1]');
  const analysis = analyzeTemplate(html);
  assert.equal(analysis.config.photos.length, 2);
  assert.ok(analysis.fields.includes("blessing"));
  assert.equal(validateTemplateSource(html, analysis)
    .find(check => check.id === "media").status, "warning");
});

test("invalid sample dates and non-literal photo expressions are rejected", () => {
  assert.throws(() => analyzeTemplate(invitation(
    '{partner1:"A",partner2:"B",date:"2027-02-30",venue:"Hall"}'
  )), /date/i);
  assert.throws(() => analyzeTemplate(invitation(
    '{partner1:"A",partner2:"B",date:"2027-02-14",venue:"Hall",photos:[imageVariable]}',
    'CONFIG.photos[0]'
  )), /Photos must be literal strings/);
});

test("runtime smoke report distinguishes pending, pass, warning and failure", () => {
  const healthy = { sceneCount: 5, stageWidth: 200, stageHeight: 356, started: true, errors: [] };
  assert.equal(validateRuntimeReport(null, 5).status, "pending");
  assert.equal(validateRuntimeReport(healthy, 5).status, "pass");
  assert.equal(validateRuntimeReport({ ...healthy, started: false }, 5).status, "warning");
  assert.equal(validateRuntimeReport({ ...healthy, sceneCount: 4 }, 5).status, "fail");
  assert.equal(validateRuntimeReport({ ...healthy, errors: ["Script error"] }, 5).status, "fail");
});

test("Video runtime smoke check requires playback and detects decoding errors", () => {
  const healthy = { sceneCount: 2, stageWidth: 540, stageHeight: 960,
    started: true, errors: [], brokenImages: 0, overflowingText: 0 };
  assert.equal(validateRuntimeReport({ ...healthy,
    videoBackground: { ready: false, advancing: false, error: null } }, 2).status, "warning");
  assert.equal(validateRuntimeReport({ ...healthy,
    videoBackground: { ready: true, advancing: true, error: "decode failed" } }, 2).status, "fail");
  assert.equal(validateRuntimeReport({ ...healthy,
    videoBackground: { ready: true, advancing: true, error: null } }, 2).status, "pass");
});

test("Automatic text overflow blocks preview validation", () => {
  const runtime = { sceneCount: 2, stageWidth: 540, stageHeight: 960,
    started: true, errors: [], smartTextFit: .55, smartTextFitRequired: .40 };
  assert.equal(validateRuntimeReport(runtime, 2).status, "fail");
});
