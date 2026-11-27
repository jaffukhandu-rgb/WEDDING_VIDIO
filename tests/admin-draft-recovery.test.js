import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { createServer } from "vite";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();
test("New invitation flushes the latest edit and refuses to replace a workspace when saving fails", {
  skip: !existsSync(executablePath) && "Chromium is required for the Studio regression."
}, async t => {
  const vite = await createServer({ server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  t.after(() => vite.close());
  await vite.listen();
  const browser = await chromium.launch({ executablePath });
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.on("dialog", dialog => dialog.accept());
  await page.goto(vite.resolvedUrls.local[0] + "admin.html");
  const source = page.locator("#code-input");
  await source.fill("unfinished HTML");
  const id = new URL(page.url()).searchParams.get("draft");
  assert.ok(id);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error("Quota exceeded"); }; });
  await source.fill("newer unfinished HTML");
  await page.locator("#workspace-new").click();
  assert.equal(await source.inputValue(), "newer unfinished HTML");
  assert.equal(new URL(page.url()).searchParams.get("draft"), id);
  await page.locator("#draft-autosave-status").filter({ hasText: "failed" }).waitFor();
  await page.reload();
  await source.fill("third edit");
  await page.locator("#workspace-new").click();
  assert.equal(await source.inputValue(), "");
  await page.goto(vite.resolvedUrls.local[0] + "admin.html?draft=" + id);
  assert.equal(await source.inputValue(), "third edit");
});
