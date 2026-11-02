import { useMemo, useState } from 'react'

const occasionCatalog = [
  { id: 'wedding', name: 'Wedding', icon: '✦', description: 'A beautiful celebration of two lives.' },
  { id: 'birthday', name: 'Birthday', icon: '✺', description: 'Make their special day unforgettable.' },
  { id: 'engagement', name: 'Engagement', icon: '◇', description: 'Celebrate the beginning of forever.' },
  { id: 'anniversary', name: 'Anniversary', icon: '∞', description: 'Turn memories into a beautiful story.' },
  { id: 'baby-shower', name: 'Baby Shower', icon: '♡', description: 'Welcome a beautiful new chapter.' },
  { id: 'corporate', name: 'Corporate', icon: '▣', description: 'Create a polished event video.' },
]

const designsByOccasion = {
  wedding: [
    { id: 'royal', name: 'Royal', description: 'Rich, elegant, cinematic', className: 'design-royal', label: 'The Wedding' },
    { id: 'heritage', name: 'Heritage', description: 'Traditional, warm, timeless', className: 'design-heritage', label: 'A Celebration' },
    { id: 'floral', name: 'Floral', description: 'Soft, romantic, graceful', className: 'design-floral', label: 'Forever' },
  ],
  birthday: [
    { id: 'celebration', name: 'Celebration', description: 'Bold, joyful, energetic', className: 'design-celebration', label: 'Happy Birthday' },
    { id: 'elegant', name: 'Elegant', description: 'Refined, stylish, modern', className: 'design-elegant', label: 'A Special Day' },
    { id: 'playful', name: 'Playful', description: 'Fun, colorful, expressive', className: 'design-playful', label: 'Let’s Celebrate' },
  ],
  engagement: [
    { id: 'romance', name: 'Romance', description: 'Intimate, soft, cinematic', className: 'design-romance', label: 'The Engagement' },
    { id: 'luxury', name: 'Luxury', description: 'Polished, premium, dramatic', className: 'design-luxury', label: 'Forever Begins' },
    { id: 'minimal', name: 'Minimal', description: 'Clean, modern, timeless', className: 'design-minimal', label: 'Together' },
  ],
  anniversary: [
    { id: 'classic', name: 'Classic', description: 'Warm, elegant, heartfelt', className: 'design-classic', label: 'Our Story' },
    { id: 'cinematic', name: 'Cinematic', description: 'Dramatic, emotional, refined', className: 'design-cinematic', label: 'Years Together' },
    { id: 'minimal', name: 'Minimal', description: 'Clean, modern, timeless', className: 'design-minimal', label: 'Still Us' },
  ],
  'baby-shower': [
    { id: 'soft', name: 'Soft', description: 'Gentle, warm, delicate', className: 'design-soft', label: 'A Little Wonder' },
    { id: 'floral', name: 'Floral', description: 'Fresh, graceful, joyful', className: 'design-floral', label: 'Coming Soon' },
    { id: 'playful', name: 'Playful', description: 'Sweet, cheerful, charming', className: 'design-playful', label: 'Baby Love' },
  ],
  corporate: [
    { id: 'executive', name: 'Executive', description: 'Premium, confident, polished', className: 'design-executive', label: 'Our Event' },
    { id: 'modern', name: 'Modern', description: 'Clean, sharp, contemporary', className: 'design-modern', label: 'Let’s Connect' },
    { id: 'minimal', name: 'Minimal', description: 'Simple, clear, professional', className: 'design-minimal', label: 'Together' },
  ],
}

export default function App() {
  const [selectedOccasion, setSelectedOccasion] = useState(null)
  const [selectedDesign, setSelectedDesign] = useState(null)

  const designs = useMemo(
    () => (selectedOccasion ? designsByOccasion[selectedOccasion] : []),
    [selectedOccasion],
  )
  const selectedOccasionData = occasionCatalog.find((occasion) => occasion.id === selectedOccasion)

  const handleOccasionChange = (occasionId) => {
    setSelectedOccasion(occasionId)
    setSelectedDesign(null)
  }

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
            Choose what you are celebrating. We’ll show you designs made for that occasion.
          </p>
        </div>
      </section>

      <section className="occasion-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Step 01</p>
            <h2>What are you celebrating?</h2>
          </div>
          <p className="heading-note">Choose one occasion to get started.</p>
        </div>

        <div className="occasion-grid">
          {occasionCatalog.map((occasion) => {
            const isSelected = selectedOccasion === occasion.id

            return (
              <button
                className={`occasion-card ${isSelected ? 'is-selected' : ''}`}
                key={occasion.id}
                type="button"
                onClick={() => handleOccasionChange(occasion.id)}
                aria-pressed={isSelected}
              >
                <span className="occasion-icon">{occasion.icon}</span>
                <span className="occasion-copy">
                  <strong>{occasion.name}</strong>
                  <small>{occasion.description}</small>
                </span>
                <span className="selection-indicator">{isSelected ? '✓' : ''}</span>
              </button>
            )
          })}
        </div>
      </section>

      {selectedOccasion && (
        <section className="design-section design-section-reveal">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Step 02 · {selectedOccasionData?.name}</p>
              <h2>Choose your design</h2>
            </div>
            <p className="heading-note">These designs are made for your occasion.</p>
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
                      <span className="preview-kicker">{selectedOccasionData?.name}</span>
                      <strong>{design.label}</strong>
                      <span className="preview-line" />
                      <small>Made automatically</small>
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
              {selectedOccasionData?.name} · <strong>{designs.find((design) => design.id === selectedDesign)?.name || 'Choose a design'}</strong>
            </span>
            <button className="primary-button" type="button" disabled={!selectedDesign}>
              Continue <span>→</span>
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
