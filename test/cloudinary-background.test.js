import test from "node:test";
import assert from "node:assert/strict";
import {
  cloudinaryPublicId,
  cloudinaryUploadSignature,
  cloudinaryDeliveryUrl,
  isCloudinaryConfigured
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
