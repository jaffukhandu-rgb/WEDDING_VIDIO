import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { validateTemplateSource, validateRuntimeReport } from "../src/admin-template-validator.js";

const html = `<!doctype html><html><head><title>Invitation</title></head><body>
<main class="stage">
  <section class="scene" style="--i:0"></section>
  <section class="scene" style="--i:1"></section>
  <div id="mono"><svg>
    <g id="K"><path d="M0 0"/></g><g id="R"><path d="M1 1"/></g>
  </svg></div>
</main>
<script>
const CONFIG = {partner1:"Krish", partner2:"Riya", date:"2026-12-25", venue:"Udaipur"};
</script></body></html>`;

test("flags original unbound hand-drawn initials rather than approving them", () => {
  const analysis = analyzeTemplate(html);
  assert.equal(analysis.artworkBindingIssues.length, 1);
  assert.equal(validateTemplateSource(html, analysis)
    .find(check => check.id === "bindings").status, "fail");
});

test("prepares expected initials for a marked dynamic monogram", () => {
  const bound = html.replace("</svg>",
    '<g data-bind-initials="partner1,partner2"><text>K</text><text>R</text></g></svg>');
  const analysis = analyzeTemplate(bound);
  assert.equal(analysis.artworkBindingIssues.length, 0);
  assert.equal(validateTemplateSource(bound, analysis)
    .find(check => check.id === "bindings").status, "pass");
  const prepared = prepareTemplate(bound, {partner1: "Munira", partner2: "Taha"});
  assert.match(prepared, /data-expected-initials="MT"/);
  assert.match(prepared, /"partner1":"Munira"/);
  assert.match(prepared, /"partner2":"Taha"/);
});

test("runtime validation rejects stale SVG monogram letters", () => {
  const data = {sceneCount: 2, stageWidth: 540, stageHeight: 960,
    started: true, errors: [], monogram: {expected: "MT", actual: "KR"}};
  assert.equal(validateRuntimeReport(data, 2).status, "fail");
  assert.match(validateRuntimeReport(data, 2).detail, /MT/);
  assert.equal(validateRuntimeReport({...data, monogram: {...data.monogram, actual: "MT"}}, 2).status, "pass");
});

test("ordinary invitations without an SVG monogram retain existing behavior", () => {
  const plain = html.replace(/<div id="mono">[\s\S]*?<\/svg><\/div>/, "");
  const analysis = analyzeTemplate(plain);
  assert.deepEqual(analysis.artworkBindingIssues, []);
  assert.equal(validateTemplateSource(plain, analysis)
    .find(check => check.id === "bindings").status, "pass");
});
