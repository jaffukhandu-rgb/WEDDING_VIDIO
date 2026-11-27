import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();
const skip = !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH && !existsSync(executablePath)
  && "Install Playwright Chromium or set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to run the dialog test.";

test("Customer export keeps the dialog editable and retries securely after UUID failure", { skip, timeout: 45000 }, async t => {
  const vite = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  t.after(() => vite.close());
  await vite.listen();
  const browser = await chromium.launch({ executablePath });
  t.after(() => browser.close());
  const page = await browser.newPage({ acceptDownloads: true });
  page.setDefaultTimeout(8000);
  const master = {
    id: "a".repeat(24), revision: "b".repeat(64), title: "Recovery fixture", eventCount: 0, photoCount: 0,
    html: '<!doctype html><html><head></head><body><main class="stage"><section class="scene" style="--i:0"></section></main><script>const CONFIG = {partner1:"Mira"};</script></body></html>'
  };
  await page.route("**/api/templates?*", route => route.fulfill({ json: { templates: [master] } }));
  await page.route("**/api/templates/" + master.id, route => route.fulfill({ json: { template: master } }));
  const jobs = [];
  // Minimal MP4-signature fixture: verify browser download handoff, not video decoding.
  const mp4 = Buffer.from([0, 0, 0, 12, 102, 116, 121, 112, 105, 115, 111, 109]);
  let polls = 0;
  await page.route("**/api/customer/render/progress", route => {
    polls++;
    return route.fulfill({ status: 404 });
  });
  await page.route("**/api/customer/render", route => {
    jobs.push(route.request().headers()["x-render-job"]);
    if (jobs.length === 1) return route.fulfill({ status: 502, contentType: "text/html", body: "<h1>Bad gateway</h1>" });
    if (jobs.length === 3) return route.fulfill({ status: 200, contentType: "video/mp4", body: mp4 });
    return route.fulfill({ status: 429, json: { error: "Renderer busy" } });
  });
  await page.goto(vite.resolvedUrls.local[0]);
  await page.getByRole("button", { name: /Wedding/i }).first().click();
  await page.getByRole("button", { name: "Preview Recovery fixture", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const edit = dialog.getByRole("button", { name: "Edit details" });
  const generate = dialog.getByRole("button", { name: "Generate MP4" });
  await dialog.getByLabel("First partner’s name").fill("Mira Rose");
  await dialog.getByRole("button", { name: "Preview invitation" }).click();
  await page.evaluate(() => Object.defineProperty(window, "isSecureContext", { configurable: true, value: false }));
  await generate.click();
  await dialog.getByRole("alert").filter({ hasText: "HTTPS" }).waitFor();
  await page.evaluate(() => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(crypto, "randomUUID", { configurable: true, value: undefined });
  });
  await generate.click();
  await dialog.getByRole("alert").filter({ hasText: "secure export ID" }).waitFor();
  await edit.click();
  assert.equal(await dialog.getByLabel("First partner’s name").inputValue(), "Mira Rose");
  await dialog.getByRole("button", { name: "Preview invitation" }).click();
  await page.evaluate(() => Object.defineProperty(crypto, "randomUUID", {
    configurable: true, value() { throw new Error("UUID provider denied access"); }
  }));
  await generate.click();
  await dialog.getByRole("alert").filter({ hasText: "secure export ID" }).waitFor();
  assert.equal(await edit.isEnabled(), true);
  assert.equal(await dialog.getByRole("status").count(), 0);
  assert.equal(jobs.length, 0);
  assert.equal(polls, 0);
  await page.evaluate(() => { delete crypto.randomUUID; });
  for (let attempt = 0; attempt < 2; attempt++) {
    const posted = page.waitForResponse(response => response.url().endsWith("/api/customer/render"));
    await generate.click();
    await posted;
    await dialog.getByRole("alert").filter({ hasText: attempt === 0 ? "Please try again" : "Renderer busy" }).waitFor();
  }
  assert.equal(new Set(jobs).size, 2);
  for (const id of jobs) assert.match(id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);

  await generate.click();
  const link = dialog.getByRole("link", { name: "Download MP4", exact: true });
  await link.waitFor();
  const [saved] = await Promise.all([page.waitForEvent("download"), link.click()]);
  assert.equal(saved.suggestedFilename(), "personalized-invitation.mp4");
  assert.equal(await saved.failure(), null);
  assert.deepEqual(readFileSync(await saved.path()), mp4);
  const done = dialog.getByRole("link", { name: "Done — download MP4 again" });
  await done.waitFor();
  await dialog.getByRole("status").filter({ hasText: "Check your browser downloads." }).waitFor();
  const [again] = await Promise.all([page.waitForEvent("download"), done.click()]);
  assert.equal(await again.failure(), null);
  assert.equal(jobs.length, 3);
  await edit.click();
  await dialog.getByRole("button", { name: "Preview invitation" }).click();
  assert.equal(await done.count(), 0);
  assert.equal(await generate.isEnabled(), true);
});
