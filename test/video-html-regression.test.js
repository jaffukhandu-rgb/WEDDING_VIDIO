import test from "node:test";
import assert from "node:assert/strict";
import { buildVideoInvitationSource, describeVideoTiming } from "../src/admin-video-html.js";
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

test("Smart invitation follows MP4 time rather than a separate looping CSS clock", () => {
  const smart = buildVideoInvitationSource({
    id, url, title: "Smart Wedding",
    visualAnalysis: { version: 1, revealAt: 25.8,
      textArea: { left: 16, top: 28, width: 68, height: 46 },
      ink: "#fff1d2", shadow: "rgba(12,6,2,.7)" }
  });
  assert.ok(smart.includes("animation:none;transition:none"));
  assert.ok(smart.includes("backgroundVideo.currentTime"));
  assert.ok(smart.includes("textFitRequired"));
  const scriptStart = smart.indexOf("<script>") + 8;
  const scriptEnd = smart.indexOf("</script>", scriptStart);
  assert.ok(scriptStart >= 8 && scriptEnd > scriptStart);
  assert.doesNotThrow(() => new Function(smart.slice(scriptStart, scriptEnd)));
  assert.equal(findVideoBackground(smart)?.id, id);
});

test("Video + HTML accepts bounded durations and computes exact 30fps frame counts", async () => {
  const { isSupportedVideoDuration, videoFrameCount } = await import("../src/video-html-contract.js");
  assert.equal(videoFrameCount(30), 900);
  assert.equal(videoFrameCount(38.8), 1164);
  assert.equal(videoFrameCount(120), 3600);
  assert.equal(isSupportedVideoDuration(5), true);
  assert.equal(isSupportedVideoDuration(4.99), false);
  assert.equal(isSupportedVideoDuration(120.01), false);
  assert.equal(isSupportedVideoDuration(Infinity), false);
  assert.throws(() => videoFrameCount(121), /Unsupported video duration/);
});

test("Generated Video + HTML uses source duration for smart reveal timeline", () => {
  const smart = buildVideoInvitationSource({ id, url, title: "Variable Wedding",
    visualAnalysis: { version: 1, duration: 38.8, revealAt: 34,
      textArea: { left: 16, top: 28, width: 68, height: 46 },
      ink: "#fff1d2", shadow: "rgba(12,6,2,.7)" } });
  assert.ok(smart.includes("const revealAt = 34.00"));
  assert.ok(smart.includes("animation:none;transition:none"));
  assert.ok(smart.includes("data-wedding-background"));
  assert.equal(findVideoBackground(smart)?.id, id);
});

function runInvitation(html) {
  const listeners = new Map();
  let updateFrame;
  const video = {
    currentTime: 0,
    addEventListener: (event, listener) => listeners.set(event, listener),
    requestVideoFrameCallback: listener => { updateFrame = listener; }
  };
  const root = {
    nodes: new Map(),
    querySelector(selector) {
      if (!this.nodes.has(selector)) this.nodes.set(selector, createNode());
      return this.nodes.get(selector);
    },
    ...createNode()
  };
  function createNode() {
    return {
      textContent: "", hidden: false, style: {}, dataset: {}, children: [],
      clientWidth: 270, scrollWidth: 250, clientHeight: 480, scrollHeight: 220,
      appendChild(node) { this.children.push(node); }
    };
  }
  const document = { querySelector: selector => selector === ".copy" ? root : video, createElement: createNode };
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new Function("document", "window", script)(document, { addEventListener() {} });
  return {
    root,
    playAt(time, event) {
      video.currentTime = time;
      if (event) listeners.get(event)();
      else updateFrame();
    }
  };
}

const textArea = { left: 16, top: 28, width: 68, height: 46 };
const ink = "#fff1d2";

test("Personalized reading slots and event pages remain inside decoded windows on frame updates and seeks", () => {
  const safeWindows = [[3, 14], [17, 34], [37, 53], [56, 72], [75, 85]].map(([start, end]) =>
    ({ start, end, textArea, ink }));
  const analysis = { version: 1, duration: 88, revealAt: 3, textArea, ink, motionRefined: true, safeWindows };
  const html = buildVideoInvitationSource({ id, url, visualAnalysis: analysis });
  const events = ["Mehendi", "Sangeet", "Nikah", "Reception", "Farewell"].map(name =>
    ({ name, date: "2027-02-14", time: "7 PM", venue: "The Royal Courtyard", note: "Please join our family" }));
  const template = html.replace(/events: \[\{[\s\S]*?\}\]/, "events: [" +
    events.map(event => "{" + Object.entries(event).map(([key, value]) =>
      key + ": " + JSON.stringify(value)).join(", ") + "}").join(", ") + "]");
  const address = "Second floor, opposite the main garden entrance, above the old library on Royal Courtyard Road";
  const { root, playAt } = runInvitation(prepareTemplate(template, {
    partner1: "Abdul Rahman Muhammed Al Husseini",
    partner2: "Zoya Mariam Noor Abdullah",
    address,
    events
  }));
  const readEvents = new Set();
  let sawAddress = false;
  for (let time = .25; time < analysis.duration; time += .25) {
    playAt(time);
    if (Number(root.style.opacity) < .9) continue;
    assert.ok(safeWindows.some(window => time >= window.start && time < window.end));
    const field = root.querySelector(".address");
    sawAddress ||= !field.hidden && field.textContent === address;
    const programme = root.querySelector(".events-list");
    if (!programme.hidden) {
      assert.equal(root.querySelector(".ceremony").hidden, true);
      for (const page of programme.children.filter(node => !node.hidden)) {
        for (const entry of page.children) readEvents.add(entry.children[0].textContent);
      }
    }
  }
  assert.equal(sawAddress, true);
  assert.deepEqual([...readEvents], events.map(event => event.name));
  assert.equal(root.dataset.timelineReadability, "ok");
  playAt(4, "seeked");
  assert.equal(root.style.opacity, "1");
  assert.equal(root.querySelector(".message").hidden, false);
  playAt(15, "seeked");
  assert.equal(root.style.opacity, "0");
  playAt(0, "playing");
  assert.equal(root.style.opacity, "0");
});

test("A motion-refined analysis without readable footage keeps text hidden and reports the shortage", () => {
  const analysis = { version: 1, duration: 8, revealAt: 0, textArea, ink, motionRefined: true, safeWindows: [] };
  const { root, playAt } = runInvitation(buildVideoInvitationSource({ id, url, visualAnalysis: analysis }));
  playAt(6, "seeked");
  assert.equal(root.style.opacity, "0");
  assert.equal(root.dataset.timelineReadability, "short");
  assert.equal(describeVideoTiming(analysis), "No stable window long enough for text.");
});
