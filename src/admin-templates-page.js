import { prepareTemplate } from "./admin-engine.js";
const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const params = new URLSearchParams(window.location.search);
const kind = params.get("kind") === "video" ? "video" : "html";
const key = document.querySelector("#library-key");
const loadButton = document.querySelector("#library-load");
const list = document.querySelector("#library-list");
const status = document.querySelector("#library-status");
const previewDialog = document.querySelector("#library-preview-dialog");
const previewFrame = document.querySelector("#library-preview-frame");
const previewHeading = document.querySelector("#library-preview-heading");
const previewClose = document.querySelector("#library-preview-close");
previewClose.addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("close", () => { previewFrame.removeAttribute("srcdoc"); });
document.querySelector("#library-heading").textContent =
  kind === "video" ? "Saved Video + HTML Templates" : "Saved HTML Templates";
document.querySelector("#library-description").textContent = kind === "video"
  ? "Published invitations with an uploaded MP4 background. Editing keeps the template's existing ID."
  : "Published HTML-only invitations. Edit or delete them without affecting other templates.";
document.querySelector("#library-title").textContent =
  kind === "video" ? "Published video templates" : "Published HTML templates";

async function readError(response) {
  try {
    const result = await response.json();
    return typeof result.error === "string" ? result.error : "Request failed (HTTP " + response.status + ").";
  } catch {
    return "Request failed (HTTP " + response.status + ").";
  }
}

async function loadTemplates() {
  if (!key.value.trim()) {
    status.textContent = "Enter your admin key to load templates.";
    key.focus();
    return;
  }
  loadButton.disabled = true;
  loadButton.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Loading saved templates…";
  list.replaceChildren();
  try {
    const response = await fetch(API_ROOT + "/api/admin/templates", {
      headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
    });
    if (!response.ok) throw new Error(await readError(response));
    const data = await response.json();
    const templates = (Array.isArray(data.templates) ? data.templates : []).filter(
      template => template.kind === kind
    );
    status.textContent = templates.length
      ? templates.length + " template(s) found."
      : "No published templates of this type yet.";
    for (const template of templates) {
      const card = document.createElement("article");
      card.className = "admin-item";
      const title = document.createElement("h3");
      title.textContent = template.title || "Untitled template";
      const published = template.publishedAt ? new Date(template.publishedAt) : null;
      const dateLabel = (!published || Number.isNaN(published.getTime())) ? "Unknown date" : published.toLocaleDateString();
      const meta = document.createElement("p");
      meta.textContent = [
        template.category || "Uncategorized",
        (template.sceneCount || 0) + " scenes",
        dateLabel,
        template.status === "deleting" ? "Deletion incomplete" : "Published"
      ].join(" · ");
      const actions = document.createElement("div");
      actions.className = "admin-item-actions";
      if (template.status !== "deleting") {
        const preview = document.createElement("button");
        preview.type = "button";
        preview.textContent = "Preview";
        preview.addEventListener("click", async () => {
          preview.disabled = true;
          preview.setAttribute("aria-busy", "true");
          status.className = "status";
          status.textContent = "Loading sandboxed template preview…";
          try {
            const response = await fetch(
              API_ROOT + "/api/admin/templates/" + encodeURIComponent(template.id), {
                headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
              }
            );
            if (!response.ok) throw new Error(await readError(response));
            const data = await response.json();
            if (!/<head\\b/i.test(data.template.html)) {
              throw new Error("This template needs an HTML <head> for the sandbox media policy. Open Edit to correct it.");
            }
            previewHeading.textContent = template.title || "Template preview";
            previewFrame.srcdoc = prepareTemplate(data.template.html, {});
            previewDialog.showModal();
            status.textContent = "Preview opened. No changes were saved.";
          } catch (error) {
            status.className = "status error";
            status.textContent = error instanceof Error ? error.message : "Preview unavailable.";
          } finally {
            preview.disabled = false;
            preview.removeAttribute("aria-busy");
          }
        });
        actions.append(preview);
      }
      if (template.status !== "deleting") {
        const edit = document.createElement("a");
        edit.className = "button-link";
        edit.href = "/admin.html?edit=" + encodeURIComponent(template.id);
        edit.textContent = "Edit";
        actions.append(edit);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.textContent = template.status === "deleting" ? "Retry Deletion" : "Delete";
      remove.addEventListener("click", async () => {
        const confirmation = window.prompt(
          'Delete "' + template.title + '" from MongoDB, and remove its background video from Cloudinary/GridFS if no other saved template uses it? Browser-local drafts may still refer to this video. Type DELETE to confirm.'
        );
        if (confirmation !== "DELETE") return;
        remove.disabled = true;
        remove.setAttribute("aria-busy", "true");
        status.className = "status";
        status.textContent = "Deleting template and checking whether its background is shared…";
        try {
          const response = await fetch(API_ROOT + "/api/admin/templates/" + encodeURIComponent(template.id), {
            method: "DELETE", headers: { "X-Admin-Key": key.value.trim() }
          });
          if (!response.ok) throw new Error(await readError(response));
          const result = await response.json();
          const notice = result.sharedReferences
            ? "Template deleted. Shared video retained because other templates still use it."
            : result.videoRemoved
              ? "Template and its unshared video deleted from MongoDB and video storage."
              : "Template deleted successfully.";
          await loadTemplates();
          status.className = "status success";
          status.textContent = notice;
        } catch (error) {
          status.className = "status error";
          status.textContent = error instanceof Error ? error.message : "Deletion failed.";
        } finally {
          remove.disabled = false;
          remove.removeAttribute("aria-busy");
        }
      });
      actions.append(remove);
      card.append(title, meta, actions);
      list.append(card);
    }
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Could not load templates.";
  } finally {
    loadButton.disabled = false;
    loadButton.removeAttribute("aria-busy");
  }
}
loadButton.addEventListener("click", () => { void loadTemplates(); });
key.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); void loadTemplates(); }
});
