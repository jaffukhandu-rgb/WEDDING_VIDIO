import { useState } from 'react'

const designs = [
  {
    id: 'royal',
    name: 'Royal',
    description: 'Rich, elegant, cinematic',
    className: 'design-royal',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, modern, timeless',
    className: 'design-minimal',
  },
  {
    id: 'floral',
    name: 'Floral',
    description: 'Soft, romantic, graceful',
    className: 'design-floral',
  },
]

export default function App() {
  const [selectedDesign, setSelectedDesign] = useState('royal')

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="topbar">
          <div className="brand-mark">W</div>
          <span className="brand-name">Wedding Video Maker</span>
          <span className="step-label">01 / 05</span>
        </nav>

        <div className="hero-copy">
          <p className="eyebrow">Create without editing</p>
          <h1>
            Your story.
            <br />
            <span>Beautifully made.</span>
          </h1>
          <p className="hero-description">
            Choose a design, tell us about your celebration, add your photos and music —
            we handle the video.
          </p>
        </div>
      </section>

      <section className="design-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2>Choose your design</h2>
          </div>
          <p className="heading-note">You can change this later.</p>
        </div>

        <div className="design-grid">
          {designs.map((design) => {
            const isSelected = selectedDesign === design.id

            return (
              <button
                className={`design-card ${design.className} ${isSelected ? 'is-selected' : ''}`}
                key={design.id}
                type="button"
                onClick={() => setSelectedDesign(design.id)}
                aria-pressed={isSelected}
              >
                <span className="design-preview">
                  <span className="preview-orb" />
                  <span className="preview-frame">
                    <span className="preview-kicker">Together with their families</span>
                    <strong>{design.id === 'royal' ? 'The Wedding' : design.name}</strong>
                    <span className="preview-line" />
                    <small>Taha &amp; Munira</small>
                  </span>
                </span>
                <span className="card-footer">
                  <span>
                    <strong>{design.name}</strong>
                    <small>{design.description}</small>
                  </span>
                  <span className="selection-indicator">{isSelected ? '✓' : ''}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="continue-row">
          <span className="selection-summary">
            Selected: <strong>{designs.find((design) => design.id === selectedDesign)?.name}</strong>
          </span>
          <button className="primary-button" type="button">
            Continue <span>→</span>
          </button>
        </div>
      </section>
    </main>
  )
}
