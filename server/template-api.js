import { createHash } from "node:crypto";
import express from "express";
import { analyzeTemplate } from "../src/admin-engine.js";
import { validateTemplateSource } from "../src/admin-template-validator.js";
import { findVideoBackground, isVideoBackgroundMarkerPresent } from "../src/video-html-contract.js";
import { isValidDisplayName, normalizeTemplateTitle } from "../src/template-metadata.js";
import { backgroundExists, deleteVideoBackgroundAsset } from "./video-backgrounds.js";
import { requireAdmin } from "./admin-access.js";
import {
  isDatabaseConfigured,
  listPublishedTemplates,
  getPublishedTemplate,
  publishTemplate,
  listAdminTemplates,
  getAdminTemplate,
  updateAdminTemplate,
  markAdminTemplateDeleting,
  finishAdminTemplateDeletion,
  countVideoTemplateReferences
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
  const router = express.Router();

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
          title: normalizeTemplateTitle(document.title, "Wedding invitation"),
          html: document.html,
          revision: document.sourceHash || createHash("sha256").update(document.html).digest("hex"),
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

  // All admin template operations require the existing strong server key.
  router.get("/admin/templates", requireAdmin, async (_req, res) => {
    try {
      const templates = await listAdminTemplates();
      return res.set("Cache-Control", "no-store").json({ templates });
    } catch (error) {
      return publicError(res, error);
    }
  });

  router.get("/admin/templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await getAdminTemplate(req.params.id);
      if (!template) return res.status(404).json({ error: "Template not found." });
      return res.set("Cache-Control", "no-store").json({
        template: {
          id: template._id.toString(),
          title: normalizeTemplateTitle(template.title, "Wedding invitation"),
          titleCustomized: Boolean(template.titleCustomized),
          category: template.category, status: template.status,
          html: template.html,
          revision: template.sourceHash || createHash("sha256").update(template.html).digest("hex"),
          videoBackgroundId: template.videoBackgroundId || findVideoBackground(template.html)?.id || null
        }
      });
    } catch (error) {
      return publicError(res, error);
    }
  });

  // Dedicated rename: updates display metadata only without altering HTML, CONFIG or media.
  router.patch("/admin/templates/:id", requireAdmin, async (req, res) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Set MONGODB_URI on the server before renaming." });
    }
    const { title } = req.body || {};
    if (!isValidDisplayName(title)) {
      return res.status(400).json({ error: "Enter a template display name between 1 and 120 characters." });
    }
    const normalizedTitle = normalizeTemplateTitle(title);
    try {
      const updated = await updateAdminTemplate(req.params.id, {
        title: normalizedTitle,
        titleCustomized: true,
        updatedAt: new Date()
      });
      if (!updated) return res.status(404).json({ error: "Published template not found or is being deleted." });
      return res.set("Cache-Control", "no-store").json({
        template: {
          id: updated._id.toString(),
          title: normalizeTemplateTitle(updated.title, normalizedTitle),
          category: updated.category
        }
      });
    } catch (error) {
      return publicError(res, error);
    }
  });

  // Editing preserves the MongoDB template ID. It cannot bypass the existing
  // review/export step because the admin delivery controller still gates PUT.
  router.put("/admin/templates/:id", requireAdmin, async (req, res) => {
    const { html, category, visualReviewConfirmed, title: requestedTitle, expectedRevision } = req.body || {};
    if (!ALLOWED_CATEGORY.has(category) || visualReviewConfirmed !== true) {
      return res.status(400).json({ error: "Select a category and confirm your visual review." });
    }
    if (requestedTitle !== undefined && (typeof requestedTitle !== "string" || (requestedTitle.trim() && !isValidDisplayName(requestedTitle)))) {
      return res.status(400).json({ error: "Template display name must be between 1 and 120 characters." });
    }
    if (typeof html !== "string" || Buffer.byteLength(html, "utf8") > MAX_SOURCE_BYTES) {
      return res.status(413).json({ error: "HTML must be 1 MB or smaller." });
    }
    let analysis;
    try { analysis = analyzeTemplate(html); }
    catch (error) {
      return res.status(400).json({
        error: "Template analysis failed: " + String(error.message || error).slice(0, 200)
      });
    }
    const background = findVideoBackground(html);
    if (isVideoBackgroundMarkerPresent(html) && !background) {
      return res.status(400).json({ error: "Invalid video-background reference." });
    }
    try {
      const current = await getAdminTemplate(req.params.id);
      if (!current || current.status !== "published") {
        return res.status(404).json({ error: "Published template not found or is being deleted." });
      }
      if (typeof expectedRevision === "string" && expectedRevision.trim()) {
        const currentRevision = current.sourceHash || createHash("sha256").update(current.html).digest("hex");
        if (currentRevision !== expectedRevision.trim()) {
          return res.status(409).json({ error: "This template was updated elsewhere. Reload it before saving." });
        }
      }
      if (background && !await backgroundExists(background.id)) {
        return res.status(400).json({ error: "The selected video background was not found." });
      }
      const checks = validateTemplateSource(html, analysis);
      if (checks.some(check => check.status === "fail")) {
        return res.status(400).json({ error: "Template failed source validation." });
      }
      const analyzedTitle = normalizeTemplateTitle(analysis.name, "Wedding invitation");
      const hasRequestedTitle = typeof requestedTitle === "string" && requestedTitle.trim().length > 0;
      const nextTitle = hasRequestedTitle
        ? normalizeTemplateTitle(requestedTitle, analyzedTitle)
        : current.titleCustomized
          ? normalizeTemplateTitle(current.title, analyzedTitle)
          : analyzedTitle;
      const titleCustomized = hasRequestedTitle
        ? nextTitle !== analyzedTitle
        : Boolean(current.titleCustomized);
      const sourceHash = createHash("sha256").update(html, "utf8").digest("hex");
      const updated = await updateAdminTemplate(req.params.id, {
        category, html, title: nextTitle, titleCustomized,
        sourceHash,
        fields: analysis.fields, config: analysis.config, photoSlots: analysis.photoSlots,
        sceneCount: analysis.sceneCount, eventCount: analysis.config.events?.length || 0,
        photoCount: analysis.photoSlots.length,
        videoBackgroundId: background?.id || null,
        updatedAt: new Date()
      });
      if (!updated) return res.status(404).json({ error: "Template was not found." });
      return res.set("Cache-Control", "no-store").json({
        template: {
          id: updated._id.toString(), category: updated.category,
          title: normalizeTemplateTitle(updated.title, nextTitle),
          revision: sourceHash
        }
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ error: "An identical template already exists in that category." });
      }
      return publicError(res, error);
    }
  });

  // Irreversible cascade is staged: hide the invitation first, then remove an
  // unshared video, then remove the MongoDB template. Failed partial operations
  // remain 'deleting' for a safe admin retry.
  router.delete("/admin/templates/:id", requireAdmin, async (req, res) => {
    try {
      const template = await markAdminTemplateDeleting(req.params.id);
      if (!template) return res.status(404).json({ error: "Template not found." });
      const videoId = template.videoBackgroundId || findVideoBackground(template.html)?.id;
      let removedVideo = false, sharedReferences = 0;
      if (videoId) {
        sharedReferences = await countVideoTemplateReferences(videoId, req.params.id);
        if (sharedReferences === 0) {
          const result = await deleteVideoBackgroundAsset(videoId);
          removedVideo = Boolean(result.deleted);
        }
      }
      if (!await finishAdminTemplateDeletion(req.params.id)) {
        return res.status(503).json({ error: "Template deletion incomplete. Retry to finish." });
      }
      return res.set("Cache-Control", "no-store").json({
        deleted: true, videoRemoved: removedVideo, sharedReferences
      });
    } catch (error) {
      console.error("Template cascade deletion failed:", error);
      return res.status(503).json({
        error: "Deletion incomplete. This template is hidden from customers and can be retried from Saved Templates."
      });
    }
  });

  router.post("/admin/templates", requireAdmin, async (req, res) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({ error: "Set MONGODB_URI on the server before publishing." });
    }
    const { html, category, visualReviewConfirmed, title: requestedTitle } = req.body || {};
    if (!ALLOWED_CATEGORY.has(category)) {
      return res.status(400).json({ error: "Select a valid category before publishing." });
    }
    if (visualReviewConfirmed !== true) {
      return res.status(400).json({ error: "Review the complete invitation before publishing." });
    }
    if (requestedTitle !== undefined && (typeof requestedTitle !== "string" || (requestedTitle.trim() && !isValidDisplayName(requestedTitle)))) {
      return res.status(400).json({ error: "Template display name must be between 1 and 120 characters." });
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
    // Video + HTML templates must reference an existing uploaded MP4 asset.
    // Ordinary code-only templates continue through the unchanged publishing path.
    if (isVideoBackgroundMarkerPresent(html)) {
      const background = findVideoBackground(html);
      if (!background) {
        return res.status(400).json({ error: "Invalid Video + HTML background reference." });
      }
      try {
        if (!await backgroundExists(background.id)) {
          return res.status(400).json({ error: "The Video + HTML background MP4 was not found." });
        }
      } catch (error) {
        return publicError(res, error);
      }
    }
    const checks = validateTemplateSource(html, analysis);
    if (checks.some(check => check.status === "fail")) {
      return res.status(400).json({ error: "Template failed source validation." });
    }
    const analyzedTitle = normalizeTemplateTitle(analysis.name, "Wedding invitation");
    const hasRequestedTitle = typeof requestedTitle === "string" && requestedTitle.trim().length > 0;
    const title = hasRequestedTitle ? normalizeTemplateTitle(requestedTitle, analyzedTitle) : analyzedTitle;
    const titleCustomized = hasRequestedTitle && title !== analyzedTitle;
    const sourceHash = createHash("sha256").update(html, "utf8").digest("hex");
    try {
      const published = await publishTemplate({
        category, title, titleCustomized, sourceHash, html,
        fields: analysis.fields,
        config: analysis.config,
        photoSlots: analysis.photoSlots,
        sceneCount: analysis.sceneCount,
        eventCount: analysis.config.events?.length || 0,
        photoCount: analysis.photoSlots.length,
        videoBackgroundId: findVideoBackground(html)?.id || null,
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
