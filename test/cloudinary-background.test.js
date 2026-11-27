import test from "node:test";
import assert from "node:assert/strict";
import {
  cloudinaryPublicId,
  cloudinaryUploadSignature,
  cloudinaryDeliveryUrl,
  isCloudinaryConfigured,
  listCloudinaryBackgrounds,
  destroyCloudinaryBackground
} from "../server/cloudinary-background.js";

const id = "12345678-1234-4234-9234-123456789abc";

test("Cloudinary server signature matches the official reference example", () => {
  // Cloudinary documents timestamp=1315060510 and secret 'abcd'.
  assert.equal(
    cloudinaryUploadSignature({ timestamp: "1315060510" }, "abcd"),
    "a21ad0f63beb4de2e5575204b79ab90bffb02c10"
  );
  assert.equal(
    cloudinaryUploadSignature({ timestamp: "5", public_id: "test" }, "private"),
    cloudinaryUploadSignature({ public_id: "test", timestamp: "5" }, "private")
  );
});

test("Cloudinary paths accept only an unguessable background UUID", () => {
  assert.equal(cloudinaryPublicId(id), "wedding_backgrounds/" + id);
  assert.throws(() => cloudinaryPublicId("../../private"));
  assert.throws(() => cloudinaryPublicId("https://example.com/video.mp4"));
});

test("Cloudinary credentials stay server-side and delivery URLs contain no secret", () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const originals = keys.map(key => process.env[key]);
  try {
    process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
    process.env.CLOUDINARY_API_KEY = "testing-key";
    process.env.CLOUDINARY_API_SECRET = "top-secret-test-value";
    assert.equal(isCloudinaryConfigured(), true);
    const url = cloudinaryDeliveryUrl(id);
    assert.equal(url, "https://res.cloudinary.com/test_cloud/video/upload/wedding_backgrounds/" + id + ".mp4");
    assert.equal(url.includes("top-secret"), false);
    process.env.CLOUDINARY_API_SECRET = "";
    assert.equal(isCloudinaryConfigured(), false);
  } finally {
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});


test("Cloudinary inventory recovery only returns our own UUID-named MP4 backgrounds", async () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const originals = keys.map(key => process.env[key]);
  const fetchBefore = globalThis.fetch;
  try {
    process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).includes("/resources/video/upload?"));
      assert.ok(options.headers.Authorization.startsWith("Basic "));
      return {
        ok: true,
        json: async () => ({
          resources: [
            { public_id: "wedding_backgrounds/" + id, format: "mp4",
              bytes: 1200000, created_at: "2026-11-22T10:00:00Z" },
            { public_id: "other/" + id, format: "mp4", bytes: 1000 },
            { public_id: "wedding_backgrounds/not-a-uuid", format: "mp4", bytes: 1000 },
            { public_id: "wedding_backgrounds/12345678-1234-4234-9234-123456789abd", format: "jpg", bytes: 1000 }
          ]
        })
      };
    };
    const found = await listCloudinaryBackgrounds();
    assert.equal(found.length, 1);
    assert.equal(found[0].id, id);
  } finally {
    globalThis.fetch = fetchBefore;
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});

test("Cloudinary video deletion is signed and requires provider acknowledgement", async () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const originals = keys.map(key => process.env[key]);
  const fetchBefore = globalThis.fetch;
  try {
    process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith("/video/destroy"));
      assert.equal(options.method, "POST");
      assert.equal(options.body.get("public_id"), "wedding_backgrounds/" + id);
      assert.equal(options.body.get("invalidate"), "true");
      assert.ok(options.body.get("signature"));
      return { ok: true, json: async () => ({ result: "ok" }) };
    };
    assert.equal(await destroyCloudinaryBackground(id), "ok");
  } finally {
    globalThis.fetch = fetchBefore;
    keys.forEach((key, index) => {
      if (originals[index] === undefined) delete process.env[key];
      else process.env[key] = originals[index];
    });
  }
});
