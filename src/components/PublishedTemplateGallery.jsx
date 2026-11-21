import { useEffect, useRef, useState } from "react";
import { analyzeTemplate, prepareTemplate } from "../admin-engine.js";
import "../styles/published-template-gallery.css";

const API_ROOT = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\\/$/, "");
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function thumbnailHtml(html) {
  // Freeze a representative early frame; hover mounts the original animation instead.
  const freeze = '<style>*,*::before,*::after{animation-play-state:paused!important;animation-delay:-1.5s!important;transition:none!important}</style>';
  return html.replace(/<head\\b[^>]*>/i, tag => tag + freeze);
}

function PublishedCard({ template, onOpen, disabled }) {
  const [html, setHtml] = useState("");
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef(null);
  useEffect(() => {
    if (!cardRef.current) return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(API_ROOT + "/api/templates/" + encodeURIComponent(template.id), { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const safe = prepareTemplate(data.template.html, {});
        if (!controller.signal.aborted) setHtml(safe);
      } catch { /* Keep the fallback card if this particular thumbnail cannot load. */ }
    })();
    return () => controller.abort();
  }, [visible, template.id]);

  return (
    <article className="published-card" ref={cardRef}
      onMouseEnter={() => setActive(true)} onMouseLeave={() => setActive(false)}>
      <button className="published-card-art" type="button" onClick={() => onOpen(template)}
        disabled={disabled} aria-label={"Preview " + template.title}>
        {html ? (
          <iframe key={active ? "motion" : "still"} title="" tabIndex={-1}
            aria-hidden="true" sandbox="allow-scripts" referrerPolicy="no-referrer"
            loading="lazy" srcDoc={active ? html : thumbnailHtml(html)} />
        ) : <span className="published-card-fallback" aria-hidden="true">✦</span>}
        <span className="published-card-view">View invitation</span>
      </button>
      <div className="published-card-footer">
        <h3>{template.title}</h3>
        <p>{template.eventCount} events · {template.photoCount} photo slots</p>
        <button type="button" onClick={() => onOpen(template)} disabled={disabled}>
          {disabled ? "Opening…" : "Preview invitation"}
        </button>
      </div>
    </article>
  );
}

export function PublishedTemplateGallery({ category, categoryName }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [photoStep, setPhotoStep] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setTemplates([]);
    setError("");
    setPreview(null);
    setPhotoStep(null);
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
    if (!preview && !photoStep) return undefined;
    const previous = document.body.style.overflow;
    const closeOnEscape = event => {
      if (event.key === "Escape") { setPreview(null); setPhotoStep(null); setPhotoError(""); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [preview, photoStep]);

  const openPreview = async template => {
    if (previewLoading) return;
    setPreviewLoading(true);
    setError("");
    setPhotoError("");
    try {
      const response = await fetch(API_ROOT + "/api/templates/" + encodeURIComponent(template.id));
      if (!response.ok) throw new Error("Unable to load that invitation.");
      const json = await response.json();
      const html = json.template.html;
      const analysis = analyzeTemplate(html);
      const slots = analysis.photoSlots || [];
      if (slots.length) {
        setPhotoStep({ title: template.title, html, slots, values: {} });
      } else {
        setPreview({ title: template.title, html: prepareTemplate(html, {}) });
      }
    } catch (previewError) {
      setError(previewError.message || "Invitation preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const choosePhoto = async (slot, file) => {
    if (!file) return;
    if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Choose a JPG, PNG or WebP image under 3 MB.");
      return;
    }
    try {
      const url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read the image."));
        reader.readAsDataURL(file);
      });
      setPhotoStep(current => {
        if (!current) return current;
        const values = { ...current.values };
        if (slot.key === "photos") {
          const photos = [...(values.photos || analyzeTemplate(current.html).config.photos || [])];
          photos[slot.index] = url;
          values.photos = photos;
        } else {
          values[slot.key] = url;
        }
        return { ...current, values };
      });
      setPhotoError("");
    } catch {
      setPhotoError("Could not read the image. Please choose another file.");
    }
  };

  const finishPhotoStep = (skip = false) => {
    if (!photoStep) return;
    try {
      const html = prepareTemplate(photoStep.html, skip ? {} : photoStep.values);
      setPreview({ title: photoStep.title, html });
      setPhotoStep(null);
      setPhotoError("");
    } catch (error) {
      setPhotoError(error.message || "Could not prepare this preview.");
    }
  };

  return (
    <section className="published-gallery design-section" aria-labelledby="published-gallery-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 02 · {categoryName}</p>
          <h2 id="published-gallery-heading">Invitation templates</h2>
        </div>
        <p className="heading-note">Hover to see the animation, or tap to preview.</p>
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
            <PublishedCard key={template.id} template={template} onOpen={openPreview} disabled={previewLoading} />
          ))}
        </div>
      )}
      {photoStep && (
        <div className="published-preview-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget) setPhotoStep(null);
        }}>
          <section className="published-photo-dialog" role="dialog" aria-modal="true" aria-label="Add photos to invitation">
            <div className="published-preview-heading">
              <h3>Add your photos</h3>
              <button type="button" onClick={() => setPhotoStep(null)}>Close ×</button>
            </div>
            <p>Upload photos to see them in {photoStep.title}, or skip to view the sample design.</p>
            <div className="published-photo-fields">
              {photoStep.slots.map((slot, index) => (
                <label key={slot.key + "-" + slot.index} className="published-photo-field">
                  <span>{slot.label || "Photo " + (index + 1)}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={event => void choosePhoto(slot, event.target.files?.[0])} />
                </label>
              ))}
            </div>
            {photoError && <p className="published-error" role="alert">{photoError}</p>}
            <div className="published-photo-actions">
              <button type="button" onClick={() => finishPhotoStep(true)}>Skip for now</button>
              <button type="button" onClick={() => finishPhotoStep(false)}
                disabled={!Object.keys(photoStep.values).length}>Preview with photos</button>
            </div>
          </section>
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
