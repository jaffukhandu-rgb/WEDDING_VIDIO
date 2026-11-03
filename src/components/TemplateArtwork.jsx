export function TemplateArtwork({ template }) {
  const styleId = template.styleId;
  const isWedding = template.occasionId === "wedding";
  const isFestival = template.occasionId === "festival";

  const imageUrl =
    styleId === "royal" && isWedding
      ? "https://images.unsplash.com/photo-1757098737757-828619fb8e6c?auto=format&fit=crop&w=1400&q=85"
      : styleId === "heritage" && isWedding
        ? "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?auto=format&fit=crop&w=1400&q=85"
        : styleId === "glass" && template.occasionId === "corporate"
          ? "https://images.unsplash.com/photo-1617381519438-e92c226b236b?auto=format&fit=crop&w=1400&q=85"
          : template.imageUrl;

  const eventLabel = isWedding
    ? "THE WEDDING CELEBRATION"
    : isFestival
      ? "A FESTIVAL TO REMEMBER"
      : template.occasionId.replace("-", " ").toUpperCase();

  return (
    <div
      className={"template-art template-art-" + styleId}
      style={{
        "--art-accent": template.colors.accent,
        "--art-soft": template.colors.soft,
        "--art-ink": template.colors.ink,
        "--art-background": template.colors.background,
      }}
    >
      <img
        className="template-art-photo"
        src={imageUrl}
        alt={template.imageAlt || ""}
        loading="lazy"
        decoding="async"
      />

      {styleId === "royal" && (
        <>
          <div className="royal-vignette" />
          <div className="royal-topline">
            <span>EST. MMXXVI</span>
            <span className="royal-top-emblem">{template.motif}</span>
            <span>BY INVITATION</span>
          </div>
          <div className="royal-side-ornament royal-side-left" />
          <div className="royal-side-ornament royal-side-right" />
          <div className="royal-copy">
            <span className="royal-kicker">{eventLabel}</span>
            <span className="royal-rule"><i /></span>
            <strong>{template.previewTitle}</strong>
            <span className="royal-subtitle">{template.previewSubtitle}</span>
            <span className="royal-details">{template.detailLine}</span>
          </div>
          <span className="royal-footer">A MOMENT OF GRANDEUR</span>
        </>
      )}

      {styleId === "glass" && (
        <>
          <div className="glass-image-wash" />
          <div className="glass-floating-orb glass-orb-one" />
          <div className="glass-floating-orb glass-orb-two" />
          <div className="glass-label">
            <span className="glass-label-dot" />
            {template.styleName}
          </div>
          <div className="glass-panel glass-panel-back">
            <span className="glass-panel-number">01</span>
            <span className="glass-panel-line" />
          </div>
          <div className="glass-panel glass-panel-main">
            <span className="glass-overline">{eventLabel}</span>
            <strong>{template.previewTitle}</strong>
            <span className="glass-panel-divider" />
            <span className="glass-subtitle">{template.previewSubtitle}</span>
            <span className="glass-details">{template.detailLine}</span>
          </div>
          <span className="glass-bottom-chip">A MOMENT, BEAUTIFULLY MADE</span>
        </>
      )}

      {styleId === "three-d" && (
        <>
          <div className="three-d-vignette" />
          <div className="three-d-orb three-d-orb-one" />
          <div className="three-d-orb three-d-orb-two" />
          <div className="three-d-topline">
            <span>{template.styleName}</span>
            <span>№ 003</span>
          </div>
          <div className="three-d-medallion">
            <span>{template.motif}</span>
          </div>
          <div className="three-d-copy">
            <span className="three-d-overline">{eventLabel}</span>
            <strong>{template.previewTitle}</strong>
            <span className="three-d-subtitle">{template.previewSubtitle}</span>
            <span className="three-d-details">{template.detailLine}</span>
          </div>
          <span className="three-d-bottom">THE ART OF CELEBRATION</span>
        </>
      )}

      {styleId === "cinematic" && (
        <>
          <div className="cinema-vignette" />
          <span className="cinema-frame-count">A FILM BY YOUR FAMILY</span>
          <div className="cinema-left-rule" />
          <div className="cinema-copy">
            <span className="cinema-overline">{eventLabel}</span>
            <strong>{template.previewTitle}</strong>
            <span className="cinema-subtitle">{template.previewSubtitle}</span>
            <span className="cinema-meta">
              <i />
              {template.detailLine}
            </span>
          </div>
          <div className="cinema-bottom-bar">
            <span>01</span>
            <span className="cinema-bottom-line" />
            <span>THE BEGINNING</span>
          </div>
        </>
      )}

      {styleId === "editorial" && (
        <>
          <div className="editorial-paper">
            <div className="editorial-masthead">
              <span>THE CELEBRATION JOURNAL</span>
              <span>VOL. 01 / 2026</span>
            </div>
            <div className="editorial-photo-window">
              <img src={imageUrl} alt="" loading="lazy" decoding="async" />
              <span className="editorial-photo-index">FIG. 01</span>
            </div>
            <div className="editorial-copy">
              <span className="editorial-overline">{eventLabel}</span>
              <strong>{template.previewTitle}</strong>
              <span className="editorial-subtitle">{template.previewSubtitle}</span>
              <span className="editorial-separator" />
              <span className="editorial-details">{template.detailLine}</span>
            </div>
            <div className="editorial-footer">
              <span>AN OCCASION TO REMEMBER</span>
              <span>01 — 07</span>
            </div>
          </div>
        </>
      )}

      {styleId === "heritage" && (
        <>
          <div className="heritage-topband">
            <span>✦</span>
            <span>{template.styleName}</span>
            <span>✦</span>
          </div>
          <div className="heritage-arch">
            <div className="heritage-arch-inner">
              <span className="heritage-motif">{template.motif}</span>
              <span className="heritage-overline">{eventLabel}</span>
              <strong>{template.previewTitle}</strong>
              <span className="heritage-subtitle">{template.previewSubtitle}</span>
            </div>
          </div>
          <div className="heritage-bottom-panel">
            <span className="heritage-details">{template.detailLine}</span>
            <span className="heritage-footer">TRADITION, IN EVERY DETAIL</span>
          </div>
          <span className="heritage-corner heritage-corner-tl">❧</span>
          <span className="heritage-corner heritage-corner-tr">❧</span>
          <span className="heritage-corner heritage-corner-bl">❧</span>
          <span className="heritage-corner heritage-corner-br">❧</span>
        </>
      )}

      {styleId === "floral" && (
        <>
          <div className="floral-photo-mask" />
          <div className="floral-branch floral-branch-left" aria-hidden="true">
            <svg viewBox="0 0 120 220" role="presentation">
              <path d="M18 205 C35 155 28 92 90 16" />
              <path d="M34 155 C5 151 0 128 8 109 C31 115 44 131 34 155Z" />
              <path d="M48 119 C75 119 93 100 91 78 C66 81 49 96 48 119Z" />
              <path d="M67 75 C41 67 36 47 47 30 C67 40 75 58 67 75Z" />
              <path d="M28 179 C53 174 69 188 68 208 C45 211 30 199 28 179Z" />
            </svg>
          </div>
          <div className="floral-branch floral-branch-right" aria-hidden="true">
            <svg viewBox="0 0 120 220" role="presentation">
              <path d="M18 205 C35 155 28 92 90 16" />
              <path d="M34 155 C5 151 0 128 8 109 C31 115 44 131 34 155Z" />
              <path d="M48 119 C75 119 93 100 91 78 C66 81 49 96 48 119Z" />
              <path d="M67 75 C41 67 36 47 47 30 C67 40 75 58 67 75Z" />
            </svg>
          </div>
          <div className="floral-copy">
            <span className="floral-overline">{eventLabel}</span>
            <strong>{template.previewTitle}</strong>
            <span className="floral-subtitle">{template.previewSubtitle}</span>
            <span className="floral-rule" />
            <span className="floral-details">{template.detailLine}</span>
          </div>
          <span className="floral-footer">MADE WITH LOVE & CARE</span>
        </>
      )}
    </div>
  );
}
