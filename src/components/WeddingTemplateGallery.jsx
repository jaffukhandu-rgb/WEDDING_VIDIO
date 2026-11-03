import { useMemo, useState } from "react";
import { WeddingTemplateArtwork } from "./WeddingTemplateArtwork.jsx";

const WEDDING_FILTERS = [
  { value: "all", label: "All Templates" },
  { value: "royal", label: "Royal" },
  { value: "cinematic", label: "Cinematic" },
  { value: "glass", label: "Glassmorphism" },
  { value: "heritage", label: "Traditional" },
  { value: "floral", label: "Artistic" },
  { value: "editorial", label: "Stationery" },
  { value: "three-d", label: "Vintage" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "popular", label: "Most selected" },
  { value: "name", label: "Name: A–Z" },
];

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
              <p className="wedding-eyebrow">CURATED WEDDING COLLECTION</p>
              <h1 id="wedding-gallery-title">Wedding Templates</h1>
              <p>Choose a beautiful design for your wedding invitation video</p>
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
                    aria-label={"Preview " + design.name}
                  >
                    <WeddingTemplateArtwork template={design} />
                    <span className="wedding-preview-duration">
                      <i aria-hidden="true">▶</i>
                      Preview
                    </span>
                    <span className="wedding-preview-action">Preview design</span>
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
