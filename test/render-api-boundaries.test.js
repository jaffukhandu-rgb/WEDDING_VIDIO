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
