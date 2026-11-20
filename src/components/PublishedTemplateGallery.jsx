import { useEffect, useState } from "react";
import { prepareTemplate } from "../admin-engine.js";
import "../styles/published-template-gallery.css";

const API_ROOT = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");

export function PublishedTemplateGallery({ category, categoryName }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setTemplates([]);
    setError("");
    setPreview(null);

    async function load() {
      try {
        const response = await fetch(API_ROOT + "/api/templates?category=" + encodeURIComponent(category), {
          signal: controller.signal
        });
        if (!response.ok) throw new Error("The template catalogue is not available yet.");
        const data = await response.json();
        if (!controller.signal.aborted) setTemplates(Array.isArray(data.templates) ? data.templates : []);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message || "Unable to load templates.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [category]);

  useEffect(() => {
    if (!preview) return undefined;
    const previous = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === "Escape") setPreview(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview]);

  const openPreview = async template => {
    setPreviewLoading(true);
    setError("");
    try {
      const response = await fetch(API_ROOT + "/api/templates/" + encodeURIComponent(template.id));
      if (!response.ok) throw new Error("Unable to load that invitation.");
      const json = await response.json();
      const safeHtml = prepareTemplate(json.template.html, {});
      setPreview({ title: template.title, html: safeHtml });
    } catch (previewError) {
      setError(previewError.message || "Invitation preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <section className="published-gallery design-section" aria-labelledby="published-gallery-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 02 · {categoryName}</p>
          <h2 id="published-gallery-heading">Invitation templates</h2>
        </div>
        <p className="heading-note">Only published invitation templates appear here.</p>
      </div>
      {loading && <p className="published-message" role="status">Loading published templates…</p>}
      {error && <p className="published-message published-error" role="alert">{error}</p>}
      {!loading && !error && templates.length === 0 && (
        <div className="empty-gallery" role="status">
          <strong>No templates available yet</strong>
          <span>New {categoryName.toLowerCase()} invitations will appear here after publication.</span>
        </div>
      )}
      {!loading && templates.length > 0 && (
        <div className="published-grid">
          {templates.map(template => (
            <article className="published-card" key={template.id}>
              <div className="published-card-art" aria-hidden="true">
                <span>✦</span><strong>{template.title}</strong>
                <small>{template.sceneCount} scenes · 9:16 portrait</small>
              </div>
              <div className="published-card-footer">
                <h3>{template.title}</h3>
                <p>{template.eventCount} events · {template.photoCount} photo slots</p>
                <button type="button" onClick={() => void openPreview(template)}
                  disabled={previewLoading}>{previewLoading ? "Opening…" : "Preview invitation"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {preview && (
        <div className="published-preview-backdrop" role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null); }}>
          <section className="published-preview-dialog" role="dialog" aria-modal="true"
            aria-label={"Preview " + preview.title}>
            <div className="published-preview-heading">
              <h3>{preview.title}</h3>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close invitation preview">Close ×</button>
            </div>
            <iframe title={"Invitation " + preview.title} sandbox="allow-scripts"
              referrerPolicy="no-referrer" srcDoc={preview.html} />
            <p>Sample invitation preview · Customer personalization will be added next.</p>
          </section>
        </div>
      )}
    </section>
  );
}
