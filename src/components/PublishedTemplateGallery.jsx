import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeTemplate, prepareTemplate } from "../admin-engine.js";
import { CustomerInvitationDialog } from "./CustomerInvitationDialog.jsx";
import "../styles/published-template-gallery.css";

const API_ROOT = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");
// Preserve the image supplied with the published design. Do not invent one.
function isOriginalPhoto(value) {
  return typeof value === "string" &&
    (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value) ||
     /^https?:\/\/[^\s"'<>]+$/i.test(value)) &&
    !/example\.com|placeholder|YOUR[-_ ]?PHOTO/i.test(value);
}

// Seek only the isolated gallery thumbnail to a useful moment. The original
// invitation, full preview and export timing remain untouched.
function stillFrameHtml(html, timeMs = 1500) {
  const frameTime = Math.max(0, Math.min(29000, Number(timeMs) || 0));
  const freezeStyle = '<style>*,*::before,*::after{animation-play-state:paused!important;transition:none!important}</style>';
  const freezeScript = '<script>window.addEventListener("load",function(){requestAnimationFrame(function(){' +
    'document.getAnimations().forEach(function(animation){try{animation.pause();animation.currentTime=' +
    frameTime + '}catch(error){}});' +
    'document.querySelectorAll("video,audio").forEach(function(media){media.pause()});' +
    '})},{once:true});</script>';
  return html.replace(/<\/head>/i, closing => freezeStyle + freezeScript + closing);
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
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: "180px" });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      setThumbnail(null);
      return undefined;
    }
    let cancelled = false;
    fetchPublished(template.id).then(published => {
      if (cancelled) return;
      const analysis = analyzeTemplate(published.html);
      const html = prepareTemplate(published.html, {}, { preserveConfig: true, analysis });
      const slot = analysis.photoSlots[0];
      const photo = slot?.key === "photos" ? analysis.config.photos[slot.index] : analysis.config[slot?.key];
      setThumbnail({
        motion: html,
        still: stillFrameHtml(html, analysis.photoSlots.length ? 15500 : 1500),
        photo: isOriginalPhoto(photo) ? photo : null
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
        {thumbnail?.photo && !hovering && (
          <span className="published-cover-photo" aria-hidden="true">
            <img src={thumbnail.photo} alt="" onError={event => { event.currentTarget.hidden = true; }} />
          </span>
        )}
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

export function PublishedTemplateGallery({ category, categoryName }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [catalogueError, setCatalogueError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const htmlCache = useRef(new Map());
  const selection = useRef(0);

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
    setCatalogueError("");
    setPreview(null); setPreviewLoading(false);
    selection.current++;

    async function load() {
      try {
        const response = await fetch(API_ROOT + "/api/templates?category=" + encodeURIComponent(category), {
          signal: controller.signal
        });
        if (!response.ok) throw new Error("The template catalogue is not available yet.");
        const data = await response.json();
        if (!controller.signal.aborted) setTemplates(Array.isArray(data.templates) ? data.templates : []);
      } catch (loadError) {
        if (!controller.signal.aborted) setCatalogueError(loadError.message || "Unable to load templates.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => { controller.abort(); selection.current++; };
  }, [category, retryAttempt]);

  const retryCatalogue = () => {
    if (loading || !catalogueError) return;
    setLoading(true);
    setCatalogueError("");
    setRetryAttempt(retryAttempt + 1);
  };

  const openPreview = async template => {
    if (previewLoading) return;
    setPreviewLoading(true);
    setError("");
    const request = ++selection.current;
    try {
      const published = await fetchPublished(template.id);
      if (selection.current === request) setPreview({ template: published, analysis: analyzeTemplate(published.html) });
    } catch (err) {
      if (selection.current === request) setError(err.message || "Invitation preview failed.");
    } finally { if (selection.current === request) setPreviewLoading(false); }
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
      {!loading && catalogueError && (
        <div className="published-message published-error">
          <p role="alert">{catalogueError}</p>
          <button className="published-retry" type="button" onClick={retryCatalogue}>Retry</button>
        </div>
      )}
      {error && <p className="published-message published-error" role="alert">{error}</p>}
      {!loading && !error && !catalogueError && templates.length === 0 && (
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

      {preview && <CustomerInvitationDialog {...preview} apiRoot={API_ROOT} close={() => setPreview(null)} />}
    </section>
  );
}
