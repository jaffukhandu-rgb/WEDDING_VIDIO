import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { isAdminConfigured, hasAdminAccess } from "../server/admin-access.js";
import { templateRouter } from "../server/template-api.js";

// These tests deliberately run without a database and verify safe failure behavior.
test("Admin access rejects missing and incorrect keys", () => {
  const oldKey = process.env.ADMIN_API_KEY;
  try {
    process.env.ADMIN_API_KEY = "a".repeat(32);
    assert.equal(isAdminConfigured(), true);
    assert.equal(hasAdminAccess({ get: () => undefined }), false);
    assert.equal(hasAdminAccess({ get: () => "b".repeat(32) }), false);
    assert.equal(hasAdminAccess({ get: () => "a".repeat(32) }), true);
    process.env.ADMIN_API_KEY = "weak";
    assert.equal(isAdminConfigured(), false);
  } finally {
    if (oldKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = oldKey;
  }
});

test("Template API rejects invalid categories, missing MongoDB and unauthenticated publication", async () => {
  const oldKey = process.env.ADMIN_API_KEY;
  const oldMongo = process.env.MONGODB_URI;
  process.env.ADMIN_API_KEY = "testing-admin-secret-with-more-than-24-bytes";
  delete process.env.MONGODB_URI;
  const app = express();
  app.use(express.json());
  app.use("/api", templateRouter());
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise(resolve => server.once("listening", resolve));
    const root = "http://127.0.0.1:" + server.address().port;
    const wrong = await fetch(root + "/api/templates?category=unknown");
    assert.equal(wrong.status, 400);
    const unconfigured = await fetch(root + "/api/templates?category=wedding");
    assert.equal(unconfigured.status, 503);
    const unauthorized = await fetch(root + "/api/admin/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "wedding", html: "<html></html>", visualReviewConfirmed: true })
    });
    assert.equal(unauthorized.status, 401);
    const noDatabase = await fetch(root + "/api/admin/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": process.env.ADMIN_API_KEY
      },
      body: JSON.stringify({ category: "wedding", html: "<html></html>", visualReviewConfirmed: true })
    });
    assert.equal(noDatabase.status, 503);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (oldKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = oldKey;
    if (oldMongo === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = oldMongo;
  }
});
