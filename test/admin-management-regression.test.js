import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import { readDrafts, saveDraft, getDraft, deleteDraft, findDraftsForVideo } from "../src/admin-draft-store.js";
import { buildVideoInvitationSource, uploadWithProgress } from "../src/admin-video-html.js";
import { analyzeTemplate, diagnoseFieldBindings, updateTemplateSourceConfig } from "../src/admin-engine.js";
import { findVideoBackground } from "../src/video-html-contract.js";
import { decodeHtmlEntities, isEquivalentRendererOrigin, normalizeTemplateTitle } from "../src/template-metadata.js";
import { templateRouter } from "../server/template-api.js";
import { videoBackgroundRouter } from "../server/video-backgrounds.js";

test("Drafts are local only, update in place by ID, preserve legacy records and do not drop older drafts when full", () => {
  const previous = globalThis.localStorage;
  const entries = new Map();
  globalThis.localStorage = {
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
  };
  try {
    // Seed a legacy draft without mode/templateId/videoBackgroundId fields
    const vidId = "12345678-1234-4234-9234-123456789abc";
    entries.set("wedding_admin_drafts_v1", JSON.stringify([{
      id: "legacy-1",
      title: "Legacy &amp; Co",
      html: buildVideoInvitationSource({ id: vidId, url: "http://127.0.0.1:4174/api/video-backgrounds/" + vidId, title: "Legacy" }),
      kind: "video",
      savedAt: "2026-11-01T00:00:00.000Z"
    }]));
    const loaded = readDrafts();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, "Legacy & Co");
    assert.equal(loaded[0].videoBackgroundId, vidId);
    assert.equal(findDraftsForVideo(vidId).length, 1);

    // Save & update in place using stable draft ID (no duplicates!)
    const draft = saveDraft({
      title: "Royal invitation",
      html: "<html><body>Partial incomplete draft",
      kind: "html",
      templateId: "a".repeat(24),
      autoSaved: true
    });
    const updated = saveDraft({
      id: draft.id,
      title: "Royal invitation updated",
      html: "<html><body>Updated draft</body></html>",
      kind: "html",
      templateId: "a".repeat(24),
      autoSaved: true
    });
    assert.equal(updated.id, draft.id);
    assert.equal(readDrafts().length, 2);
    assert.equal(getDraft(draft.id).templateId, "a".repeat(24));

    // Storage quota error must NOT discard existing drafts
    globalThis.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    assert.throws(() => saveDraft({ title: "Overflow", html: "<html>ok</html>", kind: "html" }), /storage is full/i);
    assert.equal(readDrafts().length, 2);

    globalThis.localStorage.setItem = (key, value) => entries.set(key, value);
    assert.equal(deleteDraft(draft.id), true);
    assert.equal(getDraft(draft.id), null);
    assert.throws(() => saveDraft({ title: "Empty", html: "", kind: "html" }));
    assert.throws(() => saveDraft({ title: "Oversized", html: "x".repeat(1024 * 1024 + 1), kind: "html" }));
    assert.equal([...entries.values()].join("").includes("ADMIN_API_KEY"), false);
  } finally {
    if (previous === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previous;
  }
});

test("Uploader reports actual transmitted bytes separately from server completion", async () => {
  const previous = globalThis.XMLHttpRequest;
  const progress = [];
  class MockXHR {
    upload = {};
    status = 201;
    responseText = JSON.stringify({ id: "12345678-1234-4234-9234-123456789abc", provider: "cloudinary" });
    open(method) { assert.equal(method, "POST"); }
    setRequestHeader(name, value) {
      if (name === "X-Admin-Key") assert.equal(value, "test-private-key");
    }
    send(file) {
      assert.equal(file, "sample.mp4");
      this.upload.onprogress({ lengthComputable: true, loaded: 25, total: 100 });
      this.upload.onprogress({ lengthComputable: true, loaded: 75, total: 100 });
      this.upload.onload();
      this.onload();
    }
  }
  globalThis.XMLHttpRequest = MockXHR;
  try {
    const result = await uploadWithProgress("sample.mp4", "test-private-key",
      (percentage, transferred) => progress.push([percentage, transferred]));
    assert.equal(result.provider, "cloudinary");
    assert.deepEqual(progress, [[25, false], [75, false], [100, true]]);
  } finally {
    if (previous === undefined) delete globalThis.XMLHttpRequest;
    else globalThis.XMLHttpRequest = previous;
  }
});

test("Video + HTML source still matches the existing analyzer", () => {
  const id = "12345678-1234-4234-9234-123456789abc";
  const html = buildVideoInvitationSource({
    id, url: "http://127.0.0.1:4174/api/video-backgrounds/" + id,
    title: "Original & Wedding"
  });
  const analysis = analyzeTemplate(html);
  assert.equal(analysis.name, "Original & Wedding");
  assert.equal(analysis.photoSlots.length, 0);
  assert.equal(findVideoBackground(html)?.id, id);
  assert.ok(Buffer.byteLength(html, "utf8") < 1024 * 1024);
});

test("All admin pages share the exact four-entry sidebar and have no duplicate IDs", () => {
  const expected = ["/admin.html", "/admin-templates.html", "/admin-drafts.html", "/admin-videos.html"];
  for (const name of ["admin.html", "admin-templates.html", "admin-videos.html", "admin-drafts.html"]) {
    const html = readFileSync(new URL("../" + name, import.meta.url), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, name + " has duplicate IDs");
    const navMatch = html.match(/<nav aria-label="Admin pages">([\s\S]*?)<\/nav>/);
    assert.ok(navMatch, name + " missing Admin pages nav");
    const hrefs = [...navMatch[1].matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(hrefs, expected, name + " sidebar links mismatch");
  }
});

test("HTML entities decode safely and loopback origins are recognized without weakening external hosts", () => {
  assert.equal(decodeHtmlEntities("Taha &amp; Munira &#x2665; &lt;2027&gt;"), "Taha & Munira ♥ <2027>");
  assert.equal(normalizeTemplateTitle("  Glowish | Taha &amp; Munira \n "), "Glowish | Taha & Munira");
  assert.equal(isEquivalentRendererOrigin("http://localhost:4174", "http://127.0.0.1:4174"), true);
  assert.equal(isEquivalentRendererOrigin("https://evil.example:4174", "http://127.0.0.1:4174"), false);
});

test("updateTemplateSourceConfig updates master CONFIG defaults safely while preserving unknown properties and video URLs", () => {
  const vidId = "12345678-1234-4234-9234-123456789abc";
  const src = `<!doctype html><html><head><title>Aarav &amp; Meera</title></head><body><main class="stage go"><section class="scene" style="--i:0"><video data-wedding-background="${vidId}" src="http://127.0.0.1:4174/api/video-backgrounds/${vidId}"></video><h1 data-bind="partner1"></h1></section></main><script>
const CONFIG = {
  partner1: "Aarav",
  partner2: "Meera",
  date: "2027-02-14",
  venue: "Old Venue",
  customNote: "Keep this intact",
  events: [{ name: "Nikah", date: "2027-02-14", time: "5:00 PM", venue: "Mosque" }]
};
document.querySelector('[data-bind="partner1"]').textContent = CONFIG.partner1;
</script></body></html>`;

  const bindings = diagnoseFieldBindings(src);
  assert.ok(bindings.bound.includes("partner1"));
  assert.ok(bindings.unbound.includes("partner2"));

  const updated = updateTemplateSourceConfig(src, {
    partner1: "Zaid & Ali",
    partner2: "Sana",
    date: "2027-03-20",
    venue: "Taj Palace",
    events: [{ name: "Walima", date: "2027-03-21", time: "8:00 PM", venue: "Grand Hall" }]
  });
  assert.ok(!updated.includes("Content-Security-Policy"));
  assert.ok(updated.includes('customNote: "Keep this intact"'));
  assert.ok(updated.includes("data-wedding-background=\"" + vidId + "\""));
  const reAnalyzed = analyzeTemplate(updated);
  assert.equal(reAnalyzed.config.partner1, "Zaid & Ali");
  assert.equal(reAnalyzed.config.events[0].name, "Walima");
});

test("Rename routes enforce admin authentication and input validation", async () => {
  const oldKey = process.env.ADMIN_API_KEY;
  process.env.ADMIN_API_KEY = "testing-admin-secret-with-more-than-24-bytes";
  const app = express();
  app.use(express.json());
  app.use("/api", templateRouter());
  app.use("/api", videoBackgroundRouter());
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.once("listening", resolve));
    const root = "http://127.0.0.1:" + server.address().port;
    assert.equal((await fetch(root + "/api/admin/templates/" + "a".repeat(24), {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New" })
    })).status, 401);
    assert.equal((await fetch(root + "/api/admin/video-backgrounds/12345678-1234-4234-9234-123456789abc", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: "New" })
    })).status, 401);
    assert.equal((await fetch(root + "/api/admin/video-backgrounds/not-a-uuid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": process.env.ADMIN_API_KEY },
      body: JSON.stringify({ displayName: "Valid" })
    })).status, 400);
    assert.equal((await fetch(root + "/api/admin/video-backgrounds/12345678-1234-4234-9234-123456789abc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": process.env.ADMIN_API_KEY },
      body: JSON.stringify({ displayName: "   " })
    })).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = oldKey;
  }
});
