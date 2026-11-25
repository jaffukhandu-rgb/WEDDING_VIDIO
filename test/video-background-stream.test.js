import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { boundedBackgroundBuffer, streamCloudinaryBody } from "../server/video-backgrounds.js";

test("Cloudinary stream forwards complete video bytes", async () => {
  const bytes = [1, 2, 3, 4];
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    }
  });
  const response = new PassThrough();
  const received = [];
  response.on("data", chunk => received.push(...chunk));
  await streamCloudinaryBody(body, response);
  assert.deepEqual(received, bytes);
  assert.equal(response.writableFinished, true);
});

test("Already-closed browser response cancels Cloudinary body", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1])); },
    cancel() { cancelled = true; }
  });
  const response = new PassThrough();
  response.destroy();
  await streamCloudinaryBody(body, response);
  assert.equal(cancelled, true);
});

test("Browser cancelling a video range request stops upstream without throwing", async () => {
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])); },
    cancel() { cancelled = true; }
  });
  const response = new PassThrough();
  response.on("data", () => response.destroy());
  await assert.doesNotReject(streamCloudinaryBody(body, response));
  assert.equal(cancelled, true);

  // A later request must still be able to stream the same video normally.
  const next = new PassThrough();
  const received = [];
  next.on("data", chunk => received.push(...chunk));
  await streamCloudinaryBody(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([4, 5]));
      controller.close();
    }
  }), next);
  assert.deepEqual(received, [4, 5]);
});

test("Late upstream timeout after client cancellation stays handled", async () => {
  let controller;
  const body = new ReadableStream({
    start(source) {
      controller = source;
      source.enqueue(new Uint8Array([1]));
    }
  });
  const response = new PassThrough();
  response.on("data", () => {
    response.destroy();
    queueMicrotask(() => {
      controller.error(new DOMException("Cloudinary timed out", "TimeoutError"));
    });
  });
  await assert.doesNotReject(streamCloudinaryBody(body, response));
  await new Promise(resolve => setImmediate(resolve));
});

test("Active Cloudinary read failure rejects for normal HTTP error handling", async () => {
  const body = new ReadableStream({
    start(controller) {
      queueMicrotask(() => controller.error(new Error("upstream failed")));
    }
  });
  const response = new PassThrough();
  await assert.rejects(streamCloudinaryBody(body, response), /upstream failed/);
});

test("Ignored range skips preceding bytes and cancels after the requested end", async () => {
  let cancelled = false;
  const body = new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.of(1, 2, 3));
        controller.enqueue(Uint8Array.of(4, 5, 6));
      },
      cancel() { cancelled = true; }
  });
  const response = new PassThrough();
  const received = [];
  response.on("data", chunk => received.push(...chunk));
  await streamCloudinaryBody(body, response, { start: 2, end: 4 });
  assert.deepEqual(received, [3, 4, 5]);
  assert.equal(cancelled, true);
});

test("Truncated full response cannot fulfill a range beyond its last byte", async () => {
  const response = new PassThrough();
  response.resume();
  const body = new ReadableStream({ start(controller) {
    controller.enqueue(Uint8Array.of(1));
    controller.close();
  } });
  await assert.rejects(streamCloudinaryBody(body, response, { start: 0, end: 1 }), /Incomplete/);
});

test("Unknown-length fallback cancels pending and already-disconnected reads", async () => {
  for (const alreadyClosed of [false, true]) {
    const response = new PassThrough();
    let cancelled = 0;
    const body = new ReadableStream({
      start(controller) { controller.enqueue(Uint8Array.of(1)); },
      cancel() { cancelled++; }
    });
    if (alreadyClosed) response.destroy();
    const result = boundedBackgroundBuffer({ body }, response);
    if (!alreadyClosed) setImmediate(() => response.destroy());
    await assert.rejects(result, { name: "AbortError" });
    assert.equal(cancelled, 1);
    assert.equal(response.listenerCount("close"), 0);
  }
});
