import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTemplate, prepareTemplate } from '../src/admin-engine.js';
import { validateRuntimeReport } from '../src/admin-template-validator.js';

const makeTemplate = (events) => `<!DOCTYPE html><html><head><title>Wedding</title></head><body><main class="stage"><section class="scene" style="--i:0"></section><section class="scene" style="--i:1"></section></main><script>const CONFIG = { partner1: "Taha", partner2: "Munira", date: "2027-01-12", venue: "Home", events: [${events}] };</script></body></html>`;
const event = '{name:"Mehendi",date:"2027-01-08",time:"2:30 PM",venue:"Hall"}';

test('analyzes a complete five-event wedding invitation', () => {
  const report = analyzeTemplate(makeTemplate(Array(5).fill(event).join(',')));
  assert.equal(report.config.events.length, 5);
  assert.equal(report.sceneCount, 2);
});
test('rejects event properties with unsupported expressions', () => {
  assert.throws(() => analyzeTemplate(makeTemplate('{name:"Mehendi",date:"2027-01-08",time:someVariable,venue:"Hall"}')), /unsupported properties/i);
});
test('rejects missing event details instead of silently accepting them', () => {
  assert.throws(() => analyzeTemplate(makeTemplate('{name:"Mehendi",date:"2027-01-08",venue:"Hall"}')), /name, time and venue/i);
});
test('personalization updates event time and names', () => {
  const html = makeTemplate(event);
  const output = prepareTemplate(html, {partner1:'Amina',events:[{name:'Mehendi',date:'2027-01-08',time:'4:00 PM',venue:'Hall'}]});
  assert.match(output, /Amina/);
  assert.match(output, /4:00 PM/);
});
test('rejects invalid calendar dates', () => {
  assert.throws(() => analyzeTemplate(makeTemplate('{name:"Mehendi",date:"2027-02-30",time:"2:30 PM",venue:"Hall"}')), /invalid sample date/i);
});
test('rejects external script dependencies', () => {
  assert.throws(() => analyzeTemplate(makeTemplate(event).replace('</head>','<script src="https://example.com/lib.js"></script></head>')), /External.*script/i);
});
test('runtime validation warns about missing images and text overflow', () => {
  const result = validateRuntimeReport({sceneCount:2,stageWidth:540,stageHeight:960,started:true,errors:[],brokenImages:1,overflowingText:1},2);
  assert.equal(result.status,'warning');
});
test('runtime validation fails on JavaScript errors', () => {
  const result = validateRuntimeReport({sceneCount:2,stageWidth:540,stageHeight:960,started:true,errors:['Uncaught Error']},2);
  assert.equal(result.status,'fail');
});
