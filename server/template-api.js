import { createHash } from "node:crypto";
import { Router } from "express";
import { analyzeTemplate } from "../src/admin-engine.js";
import { validateTemplateSource } from "../src/admin-template-validator.js";
import { requireAdmin } from "./admin-access.js";
import {
  isDatabaseConfigured,
  listPublishedTemplates,
  getPublishedTemplate,
  publishTemplate
} from "./template-store.js";

export const CATEGORIES = Object.freeze([
  "wedding", "festival", "birthday", "engagement",
  "anniversary", "baby-shower", "corporate"
]);
const MAX_SOURCE_BYTES = 1024 * 1024;
const ALLOWED_CATEGORY = new Set(CATEGORIES);

function publicError(res, error) {
  console.error("Template storage error:", error);
  return res.status(503).json({ error: "Template storage is temporarily unavailable. Check the MongoDB server configuration." });
}

export function templateRouter() {
  const router = Router();

  router.get("/templates", async (req, res) => {
    if (!ALLOWED_CATEGORY.has(req.query.category)) {
      return res.status(400).json({ error: "Select a valid template category." });
    }
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Template catalogue is not connected to MongoDB." });
    }
    try {
      const templates = await listPublishedTemplates(req.query.category);
      res.set("Cache-Control", "no-store");
      return res.json({ templates });
    } catch (error) {
      return publicError(res, error);
    }
  });

  router.get("/templates/:id", async (req, res) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Template catalogue is not connected to MongoDB." });
    }
    try {
      const document = await getPublishedTemplate(req.params.id);
      if (!document) return res.status(404).json({ error: "Published template not found." });
      res.set("Cache-Control", "no-store");
      return res.json({
        template: {
          id: document._id.toString(),
          category: document.category,
          title: document.title,
          html: document.html,
          fields: document.fields,
          config: document.config,
          photoSlots: document.photoSlots,
          sceneCount: document.sceneCount
        }
      });
    } catch (error) {
      return publicError(res, error);
    }
  });

  router.post("/admin/templates", requireAdmin, async (req, res) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Set MONGODB_URI on the server before publishing." });
    }
    const { html, category, visualReviewConfirmed } = req.body || {};
    if (!ALLOWED_CATEGORY.has(category)) {
      return res.status(400).json({ error: "Select a valid category before publishing." });
    }
    if (!visualReviewConfirmed) {
      return res.status(400).json({ error: "Review the complete invitation before publishing." });
    }
    if (typeof html !== "string" || Buffer.byteLength(html, "utf8") > MAX_SOURCE_BYTES) {
      return res.status(413).json({ error: "A source HTML document no larger than 1 MB is required." });
    }
    let analysis;
    try {
      analysis = analyzeTemplate(html);
    } catch (error) {
      return res.status(400).json({ error: "Template analysis failed: " + String(error.message || error).slice(0, 200) });
    }
    const checks = validateTemplateSource(html, analysis);
    if (checks.some(check => check.status === "fail")) {
      return res.status(400).json({ error: "Template failed source validation." });
    }
    const title = analysis.name.trim().slice(0, 120) || "Wedding invitation";
    const sourceHash = createHash("sha256").update(html, "utf8").digest("hex");
    try {
      const published = await publishTemplate({
        category, title, sourceHash, html,
        fields: analysis.fields,
        config: analysis.config,
        photoSlots: analysis.photoSlots,
        sceneCount: analysis.sceneCount,
        eventCount: analysis.config.events?.length || 0,
        photoCount: analysis.photoSlots.length,
        contractVersion: 1
      });
      res.set("Cache-Control", "no-store");
      return res.status(201).json({ template: published });
    } catch (error) {
      return publicError(res, error);
    }
  });
  return router;
}
