import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeTemplate, prepareTemplate } from "../admin-engine.js";
import "../styles/published-template-gallery.css";

const API_ROOT = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Used only when the published design has no usable embedded example photo.
// Do not substitute anyone's private wedding photograph in a public gallery.
const SAMPLE_PHOTO = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">' +
  '<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#e8d3bd"/><stop offset=".55" stop-color="#b58489"/><stop offset="1" stop-color="#5d465f"/></linearGradient>' +
  '<radialGradient id="sun"><stop stop-color="#fff2d6"/><stop offset="1" stop-color="#fff2d6" stop-opacity="0"/></radialGradient></defs>' +
  '<rect width="720" height="960" fill="url(#bg)"/><circle cx="370" cy="270" r="330" fill="url(#sun)"/>' +
  '<path d="M0 830Q150 620 360 800Q520 610 720 780V960H0Z" fill="#784d63" opacity=".37"/>' +
  '<path d="M115 960Q140 645 270 635Q330 630 354 820L365 960Z" fill="#efe4da"/>' +
  '<path d="M355 960L369 740Q392 626 475 636Q585 655 613 960Z" fill="#443847"/>' +
  '<ellipse cx="270" cy="538" rx="65" ry="85" fill="#bf8b76"/><ellipse cx="472" cy="538" rx="66" ry="85" fill="#b9836b"/>' +
  '<path d="M195 510Q215 390 280 425Q342 425 335 525Q320 468 293 466Q235 488 195 510Z" fill="#503b43"/>' +
  '<path d="M404 510Q406 412 475 418Q551 415 540 515Q500 464 404 510Z" fill="#3c333f"/>' +
  '<path d="M174 715Q155 570 198 484Q200 650 275 650Q340 644 356 575Q385 670 367 790Z" fill="#f7ede0" opacity=".77"/>' +
  '<path d="M35 870Q170 785 250 910M468 918Q600 795 700 880" fill="none" stroke="#e9c7b9" stroke-width="22" opacity=".55"/>' +
  '</svg>'
);

function slotId(slot) {
  return slot.key === "photos" ? "photos:" + slot.index : slot.key;
}

function isEmbeddedPhoto(value) {
  return typeof value === "string" && /^data:image\/(?:jpeg|png|webp|svg\+xml);/i.test(value);
}

function getPhotoValues(analysis, chosen = {}) {
  const values = {};
  const original = analysis.config;
  let photos = Array.isArray(original.photos) ? original.photos.slice() : null;
  let hasSample = false;

  for (const slot of analysis.photoSlots) {
    const selected = chosen[slotId(slot)];
    if (slot.key === "photos") {
      if (!photos) photos = [];
      while (photos.length <= slot.index) photos.push("");
      if (selected) {
        photos[slot.index] = selected;
      } else if (!isEmbeddedPhoto(photos[slot.index])) {
        photos[slot.index] = SAMPLE_PHOTO;
        hasSample = true;
      }
    } else {
      const sample = original[slot.key];
      if (selected) {
        values[slot.key] = selected;
      } else if (!isEmbeddedPhoto(sample)) {
        values[slot.key] = SAMPLE_PHOTO;
        hasSample = true;
      }
    }
  }

  if (photos && analysis.photoSlots.some(slot => slot.key === "photos")) {
    values.photos = photos;
  }
  return { values, hasSample };
}

function prepareDisplayHtml(source, analysis, chosen = {}) {
  const photos = getPhotoValues(analysis, chosen);
  return { html: prepareTemplate(source, photos.values), sample: photos.hasSample };
}

// Freeze an early frame *inside the sandboxed thumbnail only*. The original
// HTML and full-size preview continue running their own untouched animations.
function stillFrameHtml(html) {
  const freezeStyle = '<style>*,*::before,*::after{animation-play-state:paused!important;transition:none!important}</style>';
  const freezeScript = '<script>window.addEventListener("load",function(){requestAnimationFrame(function(){' +
    'document.getAnimations().forEach(function(animation){try{animation.pause();animation.currentTime=1200}catch(error){}});' +
    'document.querySelectorAll("video,audio").forEach(function(media){media.pause()});' +
    '})},{once:true});</script>';
  return html.replace(/<head\b[^>]*>/i, opening => opening + freezeStyle + freezeScript);
}

function InvitationCard({ template, fetchPublished, onPreview, busy }) {
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!cardRef.current) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "180px" });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    fetchPublished(template.id).then(published => {
      const analysis = analyzeTemplate(published.html);
      const result = prepareDisplayHtml(published.html, analysis);
      if (!cancelled) setThumbnail({
        motion: result.html,
        still: stillFrameHtml(result.html),
        sample: result.sample
      });
    }).catch(() => {
      // The named card and its preview action remain accessible on a failed fetch.
    });
    return () => { cancelled = true; };
  }, [visible, fetchPublished, template.id]);

  const canHover = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  return (
    <article className="published-card" ref={cardRef}
      onMouseEnter={() => { if (canHover()) setHovering(true); }}
      onMouseLeave={() => setHovering(false)}>
      <div className="published-card-art">
        {thumbnail ? (
          <iframe key={hovering ? "playing" : "cover"} title=""
            tabIndex={-1} aria-hidden="true" sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={hovering ? thumbnail.motion : thumbnail.still} />
        ) : (
          <span className="published-cover-loading" aria-hidden="true">
            <span>✦</span><small>Loading invitation artwork…</small>
          </span>
        )}
        {thumbnail?.sample && <span className="published-sample-note">Sample image</span>}
        <span className="published-cover-hint">{hovering ? "Playing preview" : "View invitation"}</span>
        <button className="published-card-open" type="button"
          aria-label={"Preview " + template.title}
          disabled={busy} onClick={() => onPreview(template)} />
      </div>
      <div className="published-card-footer">
        <h3>{template.title}</h3>
        <p>{template.eventCount} events · {template.photoCount} photo slots</p>
        <button type="button" onClick={() => onPreview(template)} disabled={busy}>
          {busy ? "Opening…" : "Preview invitation"}
        </button>
      </div>
    </article>
  );
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read this photo."));
    };
    reader.onerror = () => reject(new Error("Unable to read this photo."));
    reader.readAsDataURL(file);
  });
}

export function PublishedTemplateGallery({ category, categoryName }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [photoStep, setPhotoStep] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const htmlCache = useRef(new Map());
  const closeButton = useRef(null);

  const fetchPublished = useCallback(id => {
    const cache = htmlCache.current;
    if (cache.has(id)) return cache.get(id);
    const task = fetch(API_ROOT + "/api/templates/" + encodeURIComponent(id))
      .then(async response => {
        if (!response.ok) throw new Error("Unable to load that invitation.");
        const json = await response.json();
        if (!json.template || typeof json.template.html !== "string") {
          throw new Error("The published invitation is incomplete.");
        }
        return json.template;
      }).catch(error => {
        cache.delete(id);
        throw error;
      });
    cache.set(id, task);
    return task;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    htmlCache.current.clear();
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

  const modalOpen = Boolean(preview || photoStep);
  useEffect(() => {
    if (!modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onEscape = event => {
      if (event.key === "Escape") {
        setPreview(null);
        setPhotoStep(null);
        setPhotoError("");
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [modalOpen]);

  const openPreview = async template => {
    if (previewLoading) return;
    setPreviewLoading(true);
    setError("");
    setPhotoError("");
    try {
      const published = await fetchPublished(template.id);
      const analysis = analyzeTemplate(published.html);
      if (analysis.photoSlots.length) {
        setPhotoStep({
          id: template.id,
          title: template.title,
          html: published.html,
          analysis,
          selected: {},
          filenames: {}
        });
      } else {
        setPreview({ title: template.title, html: prepareTemplate(published.html, {}) });
      }
    } catch (previewError) {
      setError(previewError.message || "Invitation preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectPhoto = async (slot, file) => {
    if (!file || !photoStep) return;
    if (!PHOTO_TYPES.has(file.type) || file.size < 1 || file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Please choose a JPG, PNG or WebP photo under 3 MB.");
      return;
    }
    const expectedId = photoStep.id;
    try {
      const dataUrl = await readPhoto(file);
      setPhotoStep(current => {
        if (!current || current.id !== expectedId) return current;
        const id = slotId(slot);
        return {
          ...current,
          selected: { ...current.selected, [id]: dataUrl },
          filenames: { ...current.filenames, [id]: file.name }
        };
      });
      setPhotoError("");
    } catch (readError) {
      setPhotoError(readError.message || "Unable to read this photo.");
    }
  };

  const finishPhotoStep = skip => {
    if (!photoStep) return;
    try {
      const values = skip ? {} : photoStep.selected;
      const result = prepareDisplayHtml(photoStep.html, photoStep.analysis, values);
      setPreview({ title: photoStep.title, html: result.html });
      setPhotoStep(null);
      setPhotoError("");
    } catch (prepareError) {
      setPhotoError(prepareError.message || "Unable to prepare this invitation.");
    }
  };

  return (
    <section className="published-gallery design-section" aria-labelledby="published-gallery-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 02 · {categoryName}</p>
          <h2 id="published-gallery-heading">Invitation templates</h2>
        </div>
        <p className="heading-note">Real design previews · Hover on desktop to watch, or tap to open.</p>
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
            <InvitationCard key={template.id} template={template}
              fetchPublished={fetchPublished} onPreview={openPreview} busy={previewLoading} />
          ))}
        </div>
      )}

      {photoStep && (
        <div className="published-preview-backdrop"
          onMouseDown={event => { if (event.target === event.currentTarget) setPhotoStep(null); }}>
          <section className="published-photo-dialog" role="dialog" aria-modal="true"
            aria-label={"Choose photos for " + photoStep.title}>
            <div className="published-preview-heading">
              <h3>Preview with your photos</h3>
              <button ref={closeButton} type="button" onClick={() => setPhotoStep(null)}>Close ×</button>
            </div>
            <p>Choose your photos to see them inside the invitation. You can also skip and view the sample design.</p>
            <div className="published-photo-fields">
              {photoStep.analysis.photoSlots.map(slot => (
                <label className="published-photo-field" key={slotId(slot)}>
                  <span>{slot.label || "Photo"} {photoStep.filenames[slotId(slot)] ? "✓" : ""}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={event => { void selectPhoto(slot, event.target.files?.[0]); }} />
                  {photoStep.filenames[slotId(slot)] && <small>{photoStep.filenames[slotId(slot)]}</small>}
                </label>
              ))}
            </div>
            {photoError && <p className="published-error" role="alert">{photoError}</p>}
            <div className="published-photo-actions">
              <button type="button" onClick={() => finishPhotoStep(true)}>Skip for now</button>
              <button type="button" disabled={!Object.keys(photoStep.selected).length}
                onClick={() => finishPhotoStep(false)}>Preview with photos</button>
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
              <button ref={closeButton} type="button" onClick={() => setPreview(null)}
                aria-label="Close invitation preview">Close ×</button>
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
