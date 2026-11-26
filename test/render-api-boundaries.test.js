import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

test("Renderer authenticates before parsing and preserves JSON upload limits", async t => {
  const key = randomUUID();
  const child = spawn(process.execPath, [fileURLToPath(new URL("../server/render-server.js", import.meta.url))], {
    env: { ...process.env, RENDER_PORT: "0", RENDER_HOST: "127.0.0.1", ADMIN_API_KEY: key, MONGODB_URI: "" },
    stdio: ["ignore", "pipe", "inherit"]
  });
  const closed = once(child, "close");
  t.after(async () => { child.kill(); await closed; });
  const output = createInterface({ input: child.stdout });
  const [line] = await once(output, "line", { signal: AbortSignal.timeout(15000) });
  const root = line.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  for (const path of ["/API/AdMiN/templates/", "/ApI/ReNdEr/"]) {
    const response = await fetch(root + path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{"
    });
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /Admin key/i);
  }
  assert.equal((await fetch(root + "/API/ADMIN/templates", { method: "OPTIONS" })).status, 204);
  assert.equal((await fetch(root + "/api/health")).status, 200);

  await t.test("Public renders require a job ID, published-template contract and JSON", async () => {
    const endpoint = root + "/api/customer/render";
    const headers = { "Content-Type": "application/json", "X-Render-Job": randomUUID() };
    const payload = { templateId: "a".repeat(24), revision: "b".repeat(64), details: {}, photos: {} };
    const post = (body, h = headers) => fetch(endpoint, { method: "POST", headers: h, body: JSON.stringify(body) });
    assert.equal((await post(payload, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await post(payload, { "Content-Type": "application/json" })).status, 400);
    assert.equal((await post({ ...payload, html: "<script></script>" })).status, 400);
    assert.equal((await post({ ...payload, backgroundUrl: "https://example.org/movie" })).status, 400);
    assert.equal((await post({ ...payload, templateId: { $ne: null } })).status, 400);
    assert.equal((await post(payload)).status, 503); // Valid contract reaches the disabled fixture database.
    assert.equal((await fetch(endpoint + "/progress", { headers })).status, 404);
  });

  const max = 32 * 1024 * 1024;
  const bytes = Buffer.alloc(max + 1);
  bytes.write("ftyp", 4);
  for (const [length, status, message] of [
    [max, 503, /storage unavailable/i], // Accepted by both size checks and reached the disabled store.
    [max + 1, 413, /32 MiB/],
    [1023, 400, /valid MP4/i]
  ]) {
    const response = await fetch(root + "/api/admin/video-backgrounds", {
      method: "POST", headers: { "Content-Type": "video/mp4", "X-Admin-Key": key },
      body: bytes.subarray(0, length)
    });
    assert.equal(response.status, status);
    assert.match((await response.json()).error, message);
  }
});

test("A timed-out render holds the slot until the original browser close settles", { timeout: 15000 }, async t => {
  const key = randomUUID();
  const child = spawn(process.execPath, [fileURLToPath(new URL("../tests/fixtures/delayed-browser-close.mjs", import.meta.url))], {
    env: { ...process.env, RENDER_PORT: "0", RENDER_HOST: "127.0.0.1", ADMIN_API_KEY: key, MONGODB_URI: "" },
    stdio: ["ignore", "pipe", "inherit", "ipc"]
  });
  const closed = once(child, "close");
  t.after(async () => { child.kill(); await closed; });
  const [line] = await once(createInterface({ input: child.stdout }), "line", { signal: AbortSignal.timeout(10000) });
  const root = line.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const id = randomUUID();
  const headers = { "Content-Type": "application/json", "X-Admin-Key": key, "X-Render-Job": id };
  const render = () => fetch(root + "/api/render", { method: "POST", headers, body: JSON.stringify({ html: "<html></html>" }) });
  const progress = () => fetch(root + "/api/render/progress/" + id, { headers });
  assert.equal((await render()).status, 500);
  assert.equal((await progress()).status, 200);
  assert.equal((await render()).status, 429);
  const released = once(child, "message");
  child.send("finish closing");
  const [result] = await released;
  assert.equal(result.closeCalls, 1);
  for (let attempt = 0; attempt < 100 && (await progress()).status === 200; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal((await progress()).status, 404);
});
