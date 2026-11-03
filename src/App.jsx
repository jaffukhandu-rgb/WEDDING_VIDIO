import { useMemo, useState } from 'react'

const occasionCatalog = [
  { id: 'wedding', name: 'Wedding', icon: '✦', description: 'A beautiful celebration of two lives.' },
  { id: 'birthday', name: 'Birthday', icon: '✺', description: 'Make their special day unforgettable.' },
  { id: 'engagement', name: 'Engagement', icon: '◇', description: 'Celebrate the beginning of forever.' },
  { id: 'anniversary', name: 'Anniversary', icon: '∞', description: 'Turn memories into a beautiful story.' },
  { id: 'baby-shower', name: 'Baby Shower', icon: '♡', description: 'Welcome a beautiful new chapter.' },
  { id: 'corporate', name: 'Corporate', icon: '▣', description: 'Create a polished event video.' },
]

const cultureCatalog = [
  { id: 'general', name: 'General / Modern', icon: '✦', description: 'A clean look without specific cultural styling.' },
  { id: 'islamic', name: 'Islamic', icon: '☾', description: 'For Islamic celebrations and traditions.' },
  { id: 'hindu', name: 'Hindu', icon: '◈', description: 'For Hindu celebrations and traditions.' },
  { id: 'christian', name: 'Christian', icon: '✧', description: 'For Christian celebrations and traditions.' },
  { id: 'sikh', name: 'Sikh', icon: '◇', description: 'For Sikh celebrations and traditions.' },
  { id: 'jain', name: 'Jain', icon: '❖', description: 'For Jain celebrations and traditions.' },
  { id: 'bohra', name: 'Bohra', icon: '✺', description: 'For Bohra community celebrations.' },
  { id: 'other', name: 'Other / Custom', icon: '+', description: 'Choose a style beyond these options.' },
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
  const [selectedCulture, setSelectedCulture] = useState(null)
  const [isCultureStepComplete, setIsCultureStepComplete] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState(null)

  const designs = useMemo(
    () => (selectedOccasion ? designsByOccasion[selectedOccasion] : []),
    [selectedOccasion],
  )
  const selectedOccasionData = occasionCatalog.find((occasion) => occasion.id === selectedOccasion)
  const selectedCultureData = cultureCatalog.find((culture) => culture.id === selectedCulture)
  const needsCultureStep = selectedOccasion !== 'corporate'
  const canShowDesigns = Boolean(selectedOccasion) && (!needsCultureStep || isCultureStepComplete)

  const handleOccasionChange = (occasionId) => {
    setSelectedOccasion(occasionId)
    setSelectedCulture(null)
    setIsCultureStepComplete(false)
    setSelectedDesign(null)
  }

  const handleCultureChange = (cultureId) => {
    setSelectedCulture(cultureId)
    setIsCultureStepComplete(true)
    setSelectedDesign(null)
  }

  const handleSkipCulture = () => {
    setSelectedCulture(null)
    setIsCultureStepComplete(true)
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
            Choose your occasion and, when relevant, a cultural style. We’ll guide you to a design
            that fits your celebration.
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

      {selectedOccasion && needsCultureStep && (
        <section className="culture-section culture-section-reveal">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Step 02 · Optional</p>
              <h2>Choose your cultural style</h2>
            </div>
            <p className="heading-note">Personalize the look, or skip this step.</p>
          </div>

          <div className="culture-grid">
            {cultureCatalog.map((culture) => {
              const isSelected = selectedCulture === culture.id

              return (
                <button
                  className={`culture-card ${isSelected ? 'is-selected' : ''}`}
                  key={culture.id}
                  type="button"
                  onClick={() => handleCultureChange(culture.id)}
                  aria-pressed={isSelected}
                >
                  <span className="culture-card-top">
                    <span className="culture-icon">{culture.icon}</span>
                    <span className="selection-indicator">{isSelected ? '✓' : ''}</span>
                  </span>
                  <span className="culture-copy">
                    <strong>{culture.name}</strong>
                    <small>{culture.description}</small>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="culture-actions">
            <button className="text-button" type="button" onClick={handleSkipCulture}>
              Skip for now <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      {canShowDesigns && (
        <section className="design-section design-section-reveal">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Step 03 · {selectedOccasionData?.name}
                {selectedCultureData ? ` · ${selectedCultureData.name}` : ''}
              </p>
              <h2>Choose your design</h2>
            </div>
            <p className="heading-note">
              {selectedOccasion === 'corporate'
                ? 'Choose a polished visual theme for your event.'
                : 'Choose the visual theme for your celebration.'}
            </p>
          </div>

          {selectedCultureData && (
            <p className="culture-preference-note">
              Cultural preference: <strong>{selectedCultureData.name}</strong>
            </p>
          )}

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
                      <span className="preview-kicker">
                        {selectedCultureData
                          ? `${selectedOccasionData?.name} · ${selectedCultureData.name}`
                          : selectedOccasionData?.name}
                      </span>
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
              {selectedOccasionData?.name}
              {selectedCultureData ? ` · ${selectedCultureData.name}` : ''}
              {' · '}
              <strong>
                {designs.find((design) => design.id === selectedDesign)?.name || 'Choose a design'}
              </strong>
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
