import { useMemo, useState } from "react";
import { WeddingTemplateArtwork } from "./WeddingTemplateArtwork.jsx";
import { WEDDING_TEMPLATE_STYLES } from "../data/templateCatalog.js";
import "../styles/wedding-gallery-theme.css";

const WEDDING_FILTERS = [
  { value: "all", label: "All Templates" },
  ...WEDDING_TEMPLATE_STYLES.map((style) => ({
    value: style.id,
    label: style.category,
  })),
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Most selected" },
  { value: "name", label: "Name: A–Z" },
];


function PhotoTemplateCardArt({ design }) {
  const className = "photo-template-card-art photo-template-card-art--" + design.styleId;
  const frame = (label, extra = "") => (
    <span className={"photo-card-frame " + extra}>{label}</span>
  );

  return (
    <div
      className={className}
      style={{
        background: design.colors.background,
        color: design.colors.ink,
        "--photo-card-accent": design.colors.accent,
      }}
    >
      <span className="photo-card-kicker">YOUR PHOTOS</span>
      {design.styleId === "photo-polaroid" && (
        <div className="photo-card-polaroid-stack">
          {frame("Our moment", "photo-card-frame-main")}
          {frame("Together", "photo-card-frame-small photo-card-frame-left")}
          {frame("Forever", "photo-card-frame-small photo-card-frame-right")}
        </div>
      )}
      {design.styleId === "photo-cinematic" && (
        <div className="photo-card-filmstrip">
          {Array.from({ length: 3 }, (_, index) => (
            <span className="photo-card-film-frame" key={index}>
              <i />
            </span>
          ))}
        </div>
      )}
      {design.styleId === "photo-album" && (
        <div className="photo-card-album-spread">
          <span className="photo-card-album-page">{frame("Our vows")}</span>
          <span className="photo-card-album-page">{frame("Our day")}</span>
          <i className="photo-card-album-spine" />
        </div>
      )}
      {design.styleId === "photo-editorial" && (
        <div className="photo-card-editorial-layout">
          {frame("The day", "photo-card-editorial-image")}
          <span className="photo-card-editorial-heading">A LOVE<br />STORY</span>
          <span className="photo-card-editorial-copy">THE WEDDING EDITION · NO. 01</span>
        </div>
      )}
      {design.styleId === "photo-journey" && (
        <div className="photo-card-journey-layout">
          <i className="photo-card-journey-line" />
          {["01", "02", "03"].map((step, index) => (
            <span className={"photo-card-journey-photo photo-card-journey-photo--" + (index + 1)} key={step}>
              <b>{step}</b>
            </span>
          ))}
        </div>
      )}
      {design.styleId === "photo-gallery" && (
        <div className="photo-card-gallery-wall">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="photo-card-gallery-frame" key={index} />
          ))}
        </div>
      )}
      {design.styleId === "photo-journal" && (
        <div className="photo-card-journal-page">
          {frame("A favourite memory", "photo-card-journal-image")}
          <span className="photo-card-journal-note">dear diary…</span>
          <span className="photo-card-journal-lines" />
        </div>
      )}
      {design.styleId === "photo-golden" && (
        <div className="photo-card-golden-layout">
          {frame("Golden hour", "photo-card-golden-hero")}
          {frame("Always", "photo-card-golden-small photo-card-golden-small--left")}
          {frame("Us", "photo-card-golden-small photo-card-golden-small--right")}
          <i className="photo-card-golden-flare" />
        </div>
      )}
      <span className="photo-card-title">{design.name}</span>
    </div>
  );
}

export function WeddingTemplateGallery({
  designs,
  selectedDesign,
  selectedDesignData,
  isDesignConfirmed,
  templateUsage,
  sortMode,
  setSortMode,
  onDesignChange,
  onContinue,
  onPreviewSelect,
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDesigns = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = designs.filter((design) => {
      const matchesStyle =
        activeFilter === "all" || design.styleId === activeFilter;
      const searchableText = [
        design.name,
        design.category,
        design.description,
        design.color,
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch =
        !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesStyle && matchesSearch;
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
  }, [designs, activeFilter, searchQuery, sortMode, templateUsage]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  return (
    <section className="wedding-workspace wedding-inline-section" aria-labelledby="wedding-gallery-title">
      <div className="wedding-gallery-shell">
        <div className="wedding-gallery-heading">
          <div className="wedding-heading-main">
            <span className="wedding-rings-icon" aria-hidden="true">
              <i />
              <b />
              <span>♥</span>
            </span>
            <div className="wedding-heading-copy">
              <p className="wedding-eyebrow">20 ANIMATED WEDDING FILMS · 8 PHOTO-FIRST DESIGNS</p>
              <h1 id="wedding-gallery-title">Wedding Templates</h1>
              <p>Choose a professionally animated 30-second wedding invitation video</p>
            </div>
          </div>

          <label className="wedding-search">
            <span className="wedding-search-icon" aria-hidden="true">⌕</span>
            <span className="visually-hidden">Search wedding templates</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search wedding templates..."
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </label>
        </div>

        <div className="wedding-filter-toolbar">
          <div className="wedding-filter-list" role="group" aria-label="Filter wedding templates">
            {WEDDING_FILTERS.map((filter) => (
              <button
                className={
                  "wedding-filter-chip" +
                  (activeFilter === filter.value ? " is-active" : "")
                }
                key={filter.value}
                type="button"
                onClick={() => handleFilterChange(filter.value)}
                aria-pressed={activeFilter === filter.value}
              >
                {filter.label}
                {filter.value === "all" && <span>({designs.length})</span>}
              </button>
            ))}
          </div>

          <label className="wedding-sort">
            <span aria-hidden="true">♛</span>
            <select
              aria-label="Sort wedding templates"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="wedding-gallery-count" role="status" aria-live="polite">
          Showing {filteredDesigns.length} of {designs.length} wedding designs
        </div>

        {filteredDesigns.length > 0 ? (
          <div className="wedding-template-grid">
            {filteredDesigns.map((design) => {
              const isSelected = selectedDesign === design.id;

              return (
                <article
                  className={
                    "wedding-template-card" + (isSelected ? " is-selected" : "")
                  }
                  key={design.id}
                  style={{
                    "--wedding-accent": design.colors.accent,
                    "--wedding-background": design.colors.background,
                  }}
                >
                  <button
                    className="wedding-template-art-button"
                    type="button"
                    onClick={() => onPreviewSelect(design)}
                    aria-label={"Play 30-second video preview of " + design.name}
                  >
                    {design.isPhotoTemplate ? (
                      <PhotoTemplateCardArt design={design} />
                    ) : (
                      <WeddingTemplateArtwork template={design} />
                    )}
                    <span className="wedding-preview-duration">
                      <i aria-hidden="true">▶</i>
                      30s Video
                    </span>
                  </button>

                  <div className="wedding-template-card-content">
                    <div className="wedding-card-title-row">
                      <div className="wedding-card-copy">
                        <h2>{design.name}</h2>
                        <p>{design.description}</p>
                      </div>
                      <span className="wedding-card-heart" aria-hidden="true">♡</span>
                    </div>

                    <div className="wedding-card-meta">
                      <span className="wedding-style-pill">{design.category}</span>
                      <span className="wedding-card-colour">{design.color}</span>
                    </div>

                    <button
                      className={
                        "wedding-select-button" + (isSelected ? " is-selected" : "")
                      }
                      type="button"
                      onClick={() => onDesignChange(design)}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? "Selected ✓" : "Select this design"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="wedding-empty-state">
            <strong>No wedding designs found</strong>
            <span>Try another style or clear your search.</span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                handleFilterChange("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="wedding-continue-row">
          <div>
            <span>Your selection</span>
            <strong>{selectedDesignData?.name || "Choose a wedding design"}</strong>
          </div>
          <button
            className="wedding-continue-button"
            type="button"
            disabled={!selectedDesignData}
            onClick={onContinue}
          >
            {isDesignConfirmed ? "Design confirmed ✓" : "Continue to details"}
            {!isDesignConfirmed && <span aria-hidden="true">→</span>}
          </button>
        </div>

        {isDesignConfirmed && (
          <p className="wedding-confirmation" role="status">
            ✓ {selectedDesignData?.name} is selected. Your next step will be Event Details.
          </p>
        )}
      </div>
    </section>
  );
}
