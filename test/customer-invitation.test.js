import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTemplate } from "../src/admin-engine.js";
import { prepareCustomerInvitation } from "../src/customer-invitation.js";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { findVideoBackground } from "../src/video-html-contract.js";

const html = `<!doctype html><html><head><title>Wedding</title></head><body><main class="stage">
<section class="scene" style="--i:0"></section></main><script>
const CONFIG = {partner1:"A",date:"2028-02-29",photos:["",""],theme:"plum"};
document.title=CONFIG.partner1;document.querySelector('main').dataset.photo=CONFIG.photos[1];
</script></body></html>`;
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

test("Customer preparation preserves design keys, discovers indexed slots and uses literal values", () => {
  const analysis = analyzeTemplate(html);
  assert.deepEqual(analysis.fields, ["partner1","date","photos"]);
  const prepared = prepareCustomerInvitation(html,{partner1:'Amélie & "Kai"'},{"photos:1":png});
  assert.match(prepared,/theme:"plum"/);
  assert.ok(prepared.includes(png));
  assert.ok(prepared.includes("Content-Security-Policy"));
  assert.equal(analyzeTemplate(html).config.partner1,"A");
  assert.throws(()=>prepareCustomerInvitation(html,{},{"photos:0":png}),/slot/);
});

test("Customer contract rejects unknown fields, markup, invalid dates, lengths and media", () => {
  for (const details of [{partner1:" "},{partner1:"x".repeat(301)},{date:"2027-02-29"},
    {backgroundUrl:"https://example.org/"},{html:"..."},{partner1:"<b>Bad</b>"},{music:"data:audio/mp3,..."}]) {
    assert.throws(()=>prepareCustomerInvitation(html,details,{}));
  }
  for (const photo of ["https://example.org/a.png","data:image/png;base64,ZmFrZQ==",
    "data:image/png;base64,"+"A".repeat(4*1024*1024+4)]) {
    assert.throws(()=>prepareCustomerInvitation(html,{},{"photos:1":photo}));
  }
});

test("Customer event editing keeps the background, timing and event count from the master", () => {
  const id = "12345678-1234-4234-9234-123456789abc";
  const source = buildVideoInvitationSource({id,url:"http://localhost/api/video-backgrounds/"+id,title:"Reception"});
  const analysis = analyzeTemplate(source);
  assert.deepEqual(analysis.photoSlots,[]);
  const events = analysis.config.events.map(()=>({name:"Sangeet",time:"6 PM",date:"2027-01-01"}));
  const result = prepareCustomerInvitation(source,{events},{});
  assert.deepEqual(findVideoBackground(result),findVideoBackground(source));
  assert.ok(result.includes(source.slice(analysis.range.end+1)));
  assert.ok(result.includes('"name":"Sangeet"'));
  for (const bad of [[],[{name:""}],[{time:""}],[{date:"yesterday"}],[{unexpected:"property"}]]) {
    assert.throws(()=>prepareCustomerInvitation(source,{events:bad},{}));
  }
  assert.throws(()=>prepareCustomerInvitation(source,{},{photo:png}));
});

test("Embedded template music remains intact unless a separate soundtrack is selected", () => {
  const master = html.replace('theme:"plum"','theme:"plum",music:"data:audio/wav;base64,QUJDRA=="');
  assert.ok(prepareCustomerInvitation(master,{},{}).includes('music:"data:audio/wav;base64,QUJDRA=="'));
  assert.ok(prepareCustomerInvitation(master,{},{},analyzeTemplate(master),true).includes('"music":""'));
});

test("Personalized initials cannot be interpreted as replacement patterns", () => {
  const master = html.replace('date:"2028','partner2:"B",date:"2028').replace('<main class="stage">','<main class="stage" data-bind-initials="partner1,partner2">');
  assert.ok(prepareCustomerInvitation(master,{partner1:"$arah",partner2:"\'Ali"},{}).includes('data-expected-initials="$\'"'));
});

test("Compressed photos with oversized raster dimensions are rejected", () => {
  const bytes = Buffer.from(png.split(",")[1],"base64");
  bytes.writeUInt32BE(50000,16);
  bytes.writeUInt32BE(50000,20);
  assert.throws(()=>prepareCustomerInvitation(html,{},{"photos:1":"data:image/png;base64,"+bytes.toString("base64")}),/megapixels/);
});
