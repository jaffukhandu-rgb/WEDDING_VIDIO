import { useState } from "react";
import { OCCASIONS } from "./data/templateCatalog.js";

// Only the customer landing page remains active until new code-based templates are ready.
// The Admin Studio and renderer are independent of this customer-facing component.
export default function App() {
  const [selectedOccasion, setSelectedOccasion] = useState(null);
  const handleOccasionChange = (occasionId) => setSelectedOccasion(occasionId);

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="topbar" aria-label="Main">
          <div className="brand-mark" aria-hidden="true">W</div>
          <span className="brand-name">Event Video Maker</span>
          <a
            href="/admin.html"
            aria-label="Open Admin Studio"
            style={{ marginLeft: "auto", color: "inherit", border: "1px solid currentColor", borderRadius: "8px", padding: "8px 14px", textDecoration: "none" }}
          >
            Admin
          </a>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow">Create without editing</p>
          <h1>
            Your story.
            <br />
            <span>Beautifully made.</span>
          </h1>
          <p className="hero-description">
            Choose an occasion to explore available invitation designs.
            New templates will appear here when they are ready.
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

      {selectedOccasion && (
        <section className="design-section" aria-labelledby="no-templates-heading">
          <div className="empty-gallery" role="status">
            <strong id="no-templates-heading">No templates available yet</strong>
            <span>New invitation templates will appear here when available.</span>
          </div>
        </section>
      )}
    </main>
  );
}
