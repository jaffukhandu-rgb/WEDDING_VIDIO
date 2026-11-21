import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoInvitationSource } from "../src/admin-video-html.js";
import { findVideoBackground, isVideoBackgroundMarkerPresent } from "../src/video-html-contract.js";
import { analyzeTemplate, prepareTemplate } from "../src/admin-engine.js";
import { backgroundByteRange, backgroundResponseHeaders } from "../server/video-backgrounds.js";

const id = "12345678-1234-4234-9234-123456789abc";
const url = "http://127.0.0.1:4174/api/video-backgrounds/" + id;

test("Video + HTML source is a compact, valid invitation with no photo slots", () => {
  const html = buildVideoInvitationSource({ id, url, title: "Royal Henna" });
  const report = analyzeTemplate(html);
  assert.equal(report.sceneCount, 2);
  assert.equal(report.name, "Royal Henna");
  assert.deepEqual(report.photoSlots, []);
  assert.equal(report.config.partner1, "Ayaan");
  assert.equal(report.config.events[0].name, "Wedding Celebration");
  assert.ok(report.fields.includes("partner1"));
  assert.ok(report.fields.includes("events"));
  assert.ok(Buffer.byteLength(html) < 1024 * 1024);
  assert.equal(html.includes("<script src="), false);
  assert.equal(html.includes("const CONFIG = {"), true);
  assert.equal(html.includes('class="background"'), true);
});

test("Customer details remain editable and scoped CSP permits only the video host", () => {
  const html = buildVideoInvitationSource({ id, url, title: "Royal Henna" });
  const edited = prepareTemplate(html, {
    partner1: "New Partner",
    partner2: "Other Partner",
    venue: "New Venue",
    events: [{
      name: "Henna",
      date: "2027-02-14",
      time: "8:00 PM",
      venue: "New Venue",
      note: "Celebrate with us"
    }]
  });
  assert.ok(edited.includes('"partner1":"New Partner"'));
  assert.ok(edited.includes('"venue":"New Venue"'));
  assert.ok(edited.includes("media-src data: blob: http://127.0.0.1:4174"));
  // Prepared HTML is the final executable artifact; the existing v1 analyzer
  // intentionally accepts only unquoted source keys, not serialized JSON keys.
  assert.ok(edited.includes('"events":[{"name":"Henna"'));
  assert.equal(findVideoBackground(edited)?.id, id);
});

test("Reject invalid external background references", () => {
  const html = buildVideoInvitationSource({ id, url, title: "Royal Henna" });
  assert.equal(findVideoBackground(html)?.url, url);
  assert.equal(isVideoBackgroundMarkerPresent(html), true);
  assert.equal(findVideoBackground(html.replace(url, "https://other.test/video.mp4")), null);
  assert.throws(() => buildVideoInvitationSource({ id: "wrong", url, title: "X" }));
  assert.throws(() => buildVideoInvitationSource({ id, url: "https://example.com/any.mp4", title: "X" }));
  assert.ok(html.includes("&lt;") === false);
});

test("Existing Via Code invitations retain the original, restricted media CSP", () => {
  const html = '<!doctype html><html><head><title>Code only</title></head><body>' +
    '<main class="stage go"><section class="scene" style="--i:0"></section></main>' +
    '<script>const CONFIG = {partner1:"A",partner2:"B",date:"2027-02-14",time:"8 PM",venue:"Hall"};</script>' +
    '</body></html>';
  const prepared = prepareTemplate(html, {});
  assert.ok(prepared.includes("media-src data: blob:;"));
  assert.equal(findVideoBackground(prepared), null);
});

test("MP4 range slicing covers startup, seeks, suffix and invalid ranges", () => {
  assert.deepEqual(backgroundByteRange(100, null), { start: 0, end: 99, partial: false });
  assert.deepEqual(backgroundByteRange(100, "bytes=10-19"), { start: 10, end: 19, partial: true });
  assert.deepEqual(backgroundByteRange(100, "bytes=50-"), { start: 50, end: 99, partial: true });
  assert.deepEqual(backgroundByteRange(100, "bytes=-20"), { start: 80, end: 99, partial: true });
  assert.equal(backgroundByteRange(100, "bytes=200-"), null);
  assert.equal(backgroundByteRange(100, "bytes=20-10"), null);
  assert.equal(backgroundByteRange(100, "bytes=0-5,20-30"), null);
  const headers = backgroundResponseHeaders(100, backgroundByteRange(100, "bytes=50-"));
  assert.equal(headers["Content-Range"], "bytes 50-99/100");
  assert.equal(headers["Content-Length"], "50");
});
