import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDrafts, saveDraft, getDraft, deleteDraft } from "../src/admin-draft-store.js";
import { buildVideoInvitationSource, uploadWithProgress } from "../src/admin-video-html.js";
import { analyzeTemplate } from "../src/admin-engine.js";
import { findVideoBackground } from "../src/video-html-contract.js";

test("Drafts are local only and retain original HTML for later editing", () => {
  const previous = globalThis.localStorage;
  const entries = new Map();
  globalThis.localStorage = {
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key)
  };
  try {
    const draft = saveDraft({
      title: "Royal invitation",
      html: "<html><body>My draft</body></html>",
      kind: "html"
    });
    assert.equal(getDraft(draft.id).html, "<html><body>My draft</body></html>");
    assert.equal(readDrafts().length, 1);
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
    title: "Original Wedding"
  });
  assert.equal(analyzeTemplate(html).photoSlots.length, 0);
  assert.equal(findVideoBackground(html)?.id, id);
  assert.ok(Buffer.byteLength(html, "utf8") < 1024 * 1024);
});

test("All admin pages have distinct navigation targets and no duplicate IDs", () => {
  for (const name of ["admin.html","admin-templates.html","admin-videos.html","admin-drafts.html"]) {
    const html = readFileSync(new URL("../" + name, import.meta.url), "utf8");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, name + " has duplicate IDs");
    for (const destination of ["/admin.html", "/admin-templates.html?kind=video",
      "/admin-templates.html?kind=html", "/admin-videos.html", "/admin-drafts.html"]) {
      assert.ok(html.includes('href="' + destination + '"'), name + " missing " + destination);
    }
  }
});
