const API_ROOT = (import.meta.env?.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const key = document.querySelector("#video-library-key");
const load = document.querySelector("#video-library-load");
const reconcile = document.querySelector("#video-library-reconcile");
const status = document.querySelector("#video-library-status");
const list = document.querySelector("#video-library-list");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readError(response) {
  try {
    const json = await response.json();
    return typeof json.error === "string" ? json.error : "Request failed (HTTP " + response.status + ").";
  } catch {
    return "Request failed (HTTP " + response.status + ").";
  }
}

async function loadVideos() {
  if (!key.value.trim()) { status.textContent = "Enter your admin key first."; key.focus(); return; }
  load.disabled = true;
  load.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Loading saved video assets…";
  list.replaceChildren();
  try {
    const response = await fetch(API_ROOT + "/api/admin/video-backgrounds", {
      headers: { "X-Admin-Key": key.value.trim() }, cache: "no-store"
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json();
    const videos = (Array.isArray(result.videos) ? result.videos : []).filter(
      video => UUID.test(video.id)
    );
    status.textContent = videos.length ? videos.length + " uploaded video(s) found." : "No recorded videos found. Use Recover Cloudinary uploads if an older upload is missing.";
    for (const item of videos) {
      const card = document.createElement("article");
      card.className = "admin-item";
      const preview = document.createElement("video");
      preview.src = API_ROOT + "/api/video-backgrounds/" + item.id;
      preview.controls = true;
      preview.muted = true;
      preview.playsInline = true;
      preview.preload = "none";
      preview.setAttribute("aria-label", "Uploaded video preview");
      const title = document.createElement("h3");
      title.textContent = item.provider === "cloudinary" ? "Cloudinary video" : "MongoDB video";
      const text = document.createElement("p");
      const date = new Date(item.uploadedAt);
      text.textContent = [
        Number.isFinite(item.bytes) ? (item.bytes / 1048576).toFixed(1) + " MB" : "Unknown size",
        Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString(),
        item.status === "ready" ? "Available" : "Recovery needed"
      ].join(" · ");
      const actions = document.createElement("div");
      actions.className = "admin-item-actions";
      if (item.status === "ready") {
        const use = document.createElement("a");
        use.className = "button-link";
        use.textContent = "Use in Studio";
        use.href = "/admin.html?video=" + encodeURIComponent(item.id);
        actions.append(use);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "danger";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        const answer = window.prompt(
          "Permanently delete this MP4 and its MongoDB asset record? Videos used by saved templates are protected. Type DELETE to confirm."
        );
        if (answer !== "DELETE") return;
        remove.disabled = true;
        remove.setAttribute("aria-busy", "true");
        status.className = "status";
        status.textContent = "Checking template dependencies and deleting video…";
        try {
          const response = await fetch(API_ROOT + "/api/admin/video-backgrounds/" + item.id, {
            method: "DELETE", headers: { "X-Admin-Key": key.value.trim() }
          });
          if (!response.ok) throw new Error(await readError(response));
          await loadVideos();
          status.className = "status success";
          status.textContent = "Video deleted from storage and its MongoDB record removed.";
        } catch (error) {
          status.className = "status error";
          status.textContent = error instanceof Error ? error.message : "Video deletion failed.";
        } finally { remove.disabled = false; remove.removeAttribute("aria-busy"); }
      });
      actions.append(remove);
      card.append(preview, title, text, actions);
      list.append(card);
    }
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Video inventory unavailable.";
  } finally {
    load.disabled = false;
    load.removeAttribute("aria-busy");
  }
}

reconcile.addEventListener("click", async () => {
  if (!key.value.trim()) { status.textContent = "Enter your admin key first."; key.focus(); return; }
  reconcile.disabled = true;
  reconcile.setAttribute("aria-busy", "true");
  status.className = "status";
  status.textContent = "Checking Cloudinary for missing MongoDB records…";
  try {
    const response = await fetch(API_ROOT + "/api/admin/video-backgrounds/reconcile", {
      method: "POST", headers: { "X-Admin-Key": key.value.trim() }
    });
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json();
    await loadVideos();
    status.className = "status success";
    status.textContent = "Checked " + result.checked + " Cloudinary video(s), recovered " +
      result.recovered + " missing MongoDB record(s).";
  } catch (error) {
    status.className = "status error";
    status.textContent = error instanceof Error ? error.message : "Cloudinary recovery failed.";
  } finally { reconcile.disabled = false; reconcile.removeAttribute("aria-busy"); }
});
load.addEventListener("click", () => { void loadVideos(); });
key.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); void loadVideos(); }
});
