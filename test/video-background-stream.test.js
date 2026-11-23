import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { streamCloudinaryBody } from "../server/video-backgrounds.js";

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
