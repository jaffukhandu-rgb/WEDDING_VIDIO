import test from "node:test";
import assert from "node:assert/strict";
import { createVideoGenerationProgress } from "../src/video-generation-progress.js";

test("One progress bar never drops or reaches 100 before generated HTML is ready", () => {
  let clock = 0, tick, stopped = 0;
  const updates = [];
  const progress = createVideoGenerationProgress(update => updates.push(update), {
    now: () => clock, schedule: fn => { tick = fn; return 1; }, cancel: () => { stopped++; }
  });
  progress.start("Starting");
  progress.set("validate", "Checking");
  progress.set("frames", "Frames", 1);
  progress.set("evidence", "Samples");
  progress.set("scene", "Scene");
  clock += 80_000; tick();
  progress.set("design", "Design");
  clock += 100_000; tick();
  progress.set("upload", "Upload", 1);
  progress.set("upload", "Saving", 0);
  progress.set("generate", "Generating");
  assert.ok(updates.every((item, index) => item.value < 100 &&
    (index === 0 || item.value >= updates[index - 1].value)));
  assert.ok(updates.some(item => item.estimated));
  progress.complete();
  assert.equal(updates.at(-1).value, 100);
  assert.equal(updates.at(-1).state, "complete");
  assert.ok(stopped >= 2);
});

test("Failure stops estimated progress and a new attempt starts at zero", () => {
  let tick;
  const updates = [];
  const progress = createVideoGenerationProgress(update => updates.push(update),
    { now: () => 0, schedule: fn => { tick = fn; return 1; }, cancel: () => {} });
  progress.start("Start"); progress.set("design", "Refine");
  progress.fail("Existing HTML preserved");
  const count = updates.length;
  tick(); progress.complete();
  assert.equal(updates.length, count);
  assert.equal(updates.at(-1).state, "failed");
  assert.ok(updates.at(-1).value < 100);
  progress.start("Retry");
  assert.equal(updates.at(-1).value, 0);
});
