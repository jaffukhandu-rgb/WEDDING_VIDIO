import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  COLOR_FILTER_OPTIONS,
  OCCASIONS,
  STYLE_FILTER_OPTIONS,
  getTemplatesForOccasion,
} from "./data/templateCatalog.js";
import { TemplateMotionPreview } from "./components/TemplateMotionPreview.jsx";
import { WeddingTemplateGallery } from "./components/WeddingTemplateGallery.jsx";
import { WeddingTemplateMotionPreview } from "./components/WeddingTemplateMotionPreview.jsx";
import { TemplateArtwork } from "./components/TemplateArtwork.jsx";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Most selected on this device" },
  { value: "name", label: "Name: A–Z" },
];

const STORAGE_KEY = "event-video-template-usage-v1";

function readTemplateUsage() {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, value]) =>
          typeof key === "string" && Number.isFinite(value) && value >= 0,
      ),
    );
  } catch {
    return {};
  }
}

export default function App() {
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [isDesignConfirmed, setIsDesignConfirmed] = useState(false);

  const [styleFilter, setStyleFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [sortMode, setSortMode] = useState("featured");
  const [templateUsage, setTemplateUsage] = useState(readTemplateUsage);
  const [previewTemplate, setPreviewTemplate] = useState(null);


  const designs = useMemo(
    () => getTemplatesForOccasion(selectedOccasion, null),
    [selectedOccasion],
  );

  const visibleDesigns = useMemo(() => {
    const filtered = designs.filter((design) => {
      const matchesStyle = styleFilter === "all" || design.styleId === styleFilter;
      const matchesColor = colorFilter === "all" || design.colorId === colorFilter;

      return matchesStyle && matchesColor;
    });

    return filtered.sort((a, b) => {
      if (sortMode === "popular") {
        const usageDifference =
          (templateUsage[b.id] || 0) - (templateUsage[a.id] || 0);

        return usageDifference || a.featuredRank - b.featuredRank;
      }

      if (sortMode === "name") {
        return a.name.localeCompare(b.name);
      }

      return a.featuredRank - b.featuredRank;
    });
  }, [designs, styleFilter, colorFilter, sortMode, templateUsage]);

  const selectedOccasionData = OCCASIONS.find(
    (occasion) => occasion.id === selectedOccasion,
  );
  const selectedDesignData = designs.find(
    (design) => design.id === selectedDesign,
  );
  const canShowDesigns = Boolean(selectedOccasion);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templateUsage));
    } catch {
      // Template selection still works when local storage is unavailable.
    }
  }, [templateUsage]);

  useEffect(() => {
    if (!previewTemplate) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPreviewTemplate(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewTemplate]);

  const resetGalleryControls = () => {
    setStyleFilter("all");
    setColorFilter("all");
    setSortMode("featured");
    setPreviewTemplate(null);
  };

  const handleOccasionChange = (occasionId) => {
    setSelectedOccasion(occasionId);
    setSelectedDesign(null);
    setIsDesignConfirmed(false);
    resetGalleryControls();
  };

  const handleDesignChange = (design) => {
    setSelectedDesign(design.id);
    setIsDesignConfirmed(false);
    setTemplateUsage((current) => {
      return { ...current, [design.id]: (current[design.id] || 0) + 1 };
    });
  };

  const handleDesignContinue = () => {
    if (!selectedDesignData) return;
    setIsDesignConfirmed(true);
  };

  const handlePreviewSelect = (design) => {
    setPreviewTemplate(design);
  };

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="topbar" aria-label="Main">
          <div className="brand-mark" aria-hidden="true">W</div>
          <span className="brand-name">Event Video Maker</span>
          <span className="step-label">01 / 09</span>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow">Create without editing</p>
          <h1>
            Your story.
            <br />
            <span>Beautifully made.</span>
          </h1>
          <p className="hero-description">
            Choose an occasion, explore professional styles and preview your favourite design.
            We’ll handle the video creation for you.
          </p>
        </div>
      </section>

      <section className="occasion-section" aria-labelledby="occasion-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2 id="occasion-heading">What are you celebrating?</h2>
          </div>
          <p className="heading-note">Choose one occasion to get started.</p>
        </div>

        <div className="occasion-grid">
          {OCCASIONS.map((occasion) => {
            const isSelected = selectedOccasion === occasion.id;

            return (
              <button
                className={"occasion-card " + (isSelected ? "is-selected" : "")}
                key={occasion.id}
                type="button"
                onClick={() => handleOccasionChange(occasion.id)}
                aria-pressed={isSelected}
              >
                <span className="occasion-icon" aria-hidden="true">{occasion.icon}</span>
                <span className="occasion-copy">
                  <strong>{occasion.name}</strong>
                  <small>{occasion.description}</small>
                </span>
                <span className="selection-indicator" aria-hidden="true">
                  {isSelected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedOccasion === "wedding" && (
        <WeddingTemplateGallery
          designs={designs}
          selectedDesign={selectedDesign}
          selectedDesignData={selectedDesignData}
          isDesignConfirmed={isDesignConfirmed}
          templateUsage={templateUsage}
          sortMode={sortMode}
          setSortMode={setSortMode}
          onDesignChange={handleDesignChange}
          onContinue={handleDesignContinue}
          onPreviewSelect={handlePreviewSelect}
        />
      )}

      {canShowDesigns && selectedOccasion !== "wedding" && (
        <section
          className="design-section design-section-reveal"
          aria-labelledby="design-heading"
        >
          <div className="section-heading design-heading">
            <div>
              <p className="eyebrow">
                Step 02 · {selectedOccasionData?.name}
              </p>
              <h2 id="design-heading">Find your perfect design</h2>
            </div>
            <div className="design-heading-meta">
              <p className="heading-note">
"Seven professional design directions for your event."
              </p>
              <span className="template-count">
                {visibleDesigns.length} of {designs.length} designs
              </span>
            </div>
          </div>

          <div className="gallery-toolbar" aria-label="Template filters">
            <label className="filter-control">
              <span>Design style</span>
              <select
                value={styleFilter}
                onChange={(event) => setStyleFilter(event.target.value)}
              >
                {STYLE_FILTER_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control">
              <span>Colour</span>
              <select
                value={colorFilter}
                onChange={(event) => setColorFilter(event.target.value)}
              >
                {COLOR_FILTER_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-control filter-sort">
              <span>Sort by</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="design-grid">
            {visibleDesigns.map((design) => {
              const isSelected = selectedDesign === design.id;

              return (
                <article
                  className={"design-card " + (isSelected ? "is-selected" : "")}
                  key={design.id}
                  style={{
                    "--template-background": design.colors.background,
                    "--template-middle": design.colors.middle,
                    "--template-accent": design.colors.accent,
                    "--template-ink": design.colors.ink,
                    "--template-soft": design.colors.soft,
                  }}
                >
                  <button
                    className={"template-preview art-" + design.styleId}
                    type="button"
                    onClick={() => handlePreviewSelect(design)}
                    aria-label={"Play animated preview of " + design.name}
                  >
                    <TemplateArtwork template={design} />
                    <span className="preview-play" aria-hidden="true">
                      <span>▶</span>
                      Preview
                    </span>
                  </button>

                  <div className="card-footer">
                    <div className="card-title-row">
                      <div className="card-footer-copy">
                        <strong>{design.name}</strong>
                        <small>{design.description}</small>
                      </div>
                      <span className="style-tag">{design.category}</span>
                    </div>
                    <div className="card-meta-row">
                      <span className="color-dot" aria-hidden="true" />
                      <span>{design.color}</span>
                      <span className="meta-separator">·</span>
                      <span>
                        {templateUsage[design.id]
                          ? "Selected " + templateUsage[design.id] + "× here"
                          : "New design"}
                      </span>
                    </div>
                    <button
                      className={
                        "select-template-button " +
                        (isSelected ? "is-selected" : "")
                      }
                      type="button"
                      onClick={() => handleDesignChange(design)}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? "Selected ✓" : "Select design"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {visibleDesigns.length === 0 && (
            <div className="empty-gallery">
              <strong>No designs match these filters.</strong>
              <span>Try another style or colour to see more templates.</span>
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setStyleFilter("all");
                  setColorFilter("all");
                }}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="continue-row">
            <span className="selection-summary">
              {selectedOccasionData?.name}
              {" · "}
              <strong>{selectedDesignData?.name || "Choose a design"}</strong>
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!selectedDesignData}
              onClick={handleDesignContinue}
            >
              {isDesignConfirmed ? "Design confirmed ✓" : "Continue"}
              {!isDesignConfirmed && <span aria-hidden="true"> →</span>}
            </button>
          </div>

          {isDesignConfirmed && (
            <p className="design-confirmation" role="status">
              <span aria-hidden="true">✓</span>
              {selectedDesignData?.name} is selected. Your next step will be Event Details.
            </p>
          )}
        </section>
      )}

      {previewTemplate && (
        <div
          className="preview-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewTemplate(null);
          }}
        >
          <section
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
          >
            <div className="preview-modal-header">
              <div>
                <p className="eyebrow">Animated template preview</p>
                <h2 id="preview-modal-title">{previewTemplate.name}</h2>
                <p>{previewTemplate.styleName} · {previewTemplate.color}</p>
              </div>
              <button
                className="preview-modal-close"
                type="button"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className="preview-player-shell">
              <Player
                component={
                  previewTemplate.occasionId === "wedding"
                    ? WeddingTemplateMotionPreview
                    : TemplateMotionPreview
                }
                inputProps={{ template: previewTemplate }}
                durationInFrames={
                  previewTemplate.occasionId === "wedding" ? 900 : 90
                }
                compositionWidth={540}
                compositionHeight={960}
                fps={30}
                loop
                autoPlay
                controls
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <div className="preview-modal-footer">
              <span>
                  {previewTemplate.occasionId === "wedding"
                    ? "30-second animated wedding invitation"
                    : "3-second animated style preview"}
                </span>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  handleDesignChange(previewTemplate);
                  setPreviewTemplate(null);
                }}
              >
                {selectedDesign === previewTemplate.id ? "Keep selected" : "Select this design"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
