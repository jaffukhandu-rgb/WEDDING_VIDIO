import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { validateTemplateSource, validateRuntimeReport } from "../src/admin-template-validator.js";

// A small representative fixture of the 30-second Royal Book page-turn layout.
const bookHtml = `<!DOCTYPE html><html lang="en"><head>
<title>Wedding Invitation Film — Royal Book (30s)</title>
<style>.go .bar i{animation:fill 30s linear both}</style>
</head><body><main class="stage"><div class="book">
<div class="pg"></div>
<div class="pg fl" style="--fd:23s"></div>
<div class="pg fl" style="--fd:15.5s"></div>
<div class="pg fl" style="--fd:9.5s"></div>
<div class="pg cov fl" style="--fd:2.2s"></div>
</div></main><script>
const CONFIG = {
  partner1: "Taha",
  partner2: "Munira",
  events: [
    {name: "Mehndi", date: "2027-01-05", time: "07:00 PM", venue: "Courtyard"},
    {name: "Nikah", date: "2027-01-07", time: "07:30 PM", venue: "Palace"}
  ],
  venue: "Royal Palace", address: "Rajasthan", message: "Join us",
  photo: "https://YOUR-PHOTO-LINK.jpg",
  music: ""
};
const photoUrl = CONFIG.photo;
</script></body></html>`;

const sceneHtml = `<!DOCTYPE html><html><head><title>Scene invitation</title></head><body>
<main class="stage">
<section class="scene" style="--i:0"></section>
<section class="scene" style="--i:1"></section>
</main>
<script>const CONFIG = {partner1:"Ali",partner2:"Noor",venue:"Hall",message:"Welcome"};</script>
</body></html>`;

test("Royal Book detects five pages, editable events, and the singular photo slot", () => {
  const analysis = analyzeTemplate(bookHtml);
  assert.equal(analysis.layoutType, "book");
  assert.equal(analysis.sceneCount, 5);
  assert.equal(analysis.config.events.length, 2);
  assert.equal(analysis.photoSlots.length, 1);
  assert.equal(analysis.photoSlots[0].key, "photo");
  assert.ok(analysis.fields.includes("photos"));
  assert.ok(analysis.fields.includes("events"));
  assert.ok(!analysis.fields.includes("photo"));
});

test("Royal Book preserves page-turn source while preparing edited customer data", () => {
  const photoData = "data:image/png;base64,aGVsbG8=";
  const prepared = prepareTemplate(bookHtml, { partner1: "Amina", photo: photoData });
  assert.ok(prepared.includes('"partner1":"Amina"'));
  assert.ok(prepared.includes('"photo":"' + photoData + '"'));
  assert.ok(prepared.includes('class="pg cov fl"'));
  assert.ok(prepared.includes("Content-Security-Policy"));
});

test("Royal Book static and runtime verification recognize the same page count", () => {
  const analysis = analyzeTemplate(bookHtml);
  const checks = validateTemplateSource(bookHtml, analysis);
  assert.equal(checks.find(check => check.id === "structure").status, "pass");
  assert.equal(checks.find(check => check.id === "timeline").status, "pass");
  assert.equal(checks.find(check => check.id === "media").status, "warning");
  const runtime = validateRuntimeReport({
    sceneCount: 5, stageWidth: 540, stageHeight: 960, started: true, errors: []
  }, analysis.sceneCount);
  assert.equal(runtime.status, "pass");
});

test("Existing numbered scene templates remain supported", () => {
  const analysis = analyzeTemplate(sceneHtml);
  assert.equal(analysis.layoutType, "scenes");
  assert.equal(analysis.sceneCount, 2);
  assert.ok(prepareTemplate(sceneHtml, { partner1: "Updated" }).includes('"partner1":"Updated"'));
});

test("Do not accept lookalike CSS class names or invalid scene numbering", () => {
  assert.throws(() => analyzeTemplate(bookHtml.replace('class="book"', 'class="not-book"')),
    /Unsupported layout/);
  assert.throws(() => analyzeTemplate(bookHtml.replaceAll('class="pg', 'class="fake-pg')),
    /Unsupported layout/);
  assert.throws(() => analyzeTemplate(sceneHtml.replace("--i:1", "--i:3")),
    /sequential/);
});
