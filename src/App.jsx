import { useMemo, useState } from 'react'

const CULTURE_OCCASIONS = ['wedding', 'festival']

const occasionCatalog = [
  { id: 'wedding', name: 'Wedding', icon: '✦', description: 'A beautiful celebration of two lives.' },
  { id: 'festival', name: 'Festival', icon: '✺', description: 'Celebrate traditions, faith and togetherness.' },
  { id: 'birthday', name: 'Birthday', icon: '🎂', description: 'Make their special day unforgettable.' },
  { id: 'engagement', name: 'Engagement', icon: '◇', description: 'Celebrate the beginning of forever.' },
  { id: 'anniversary', name: 'Anniversary', icon: '∞', description: 'Turn memories into a beautiful story.' },
  { id: 'baby-shower', name: 'Baby Shower', icon: '♡', description: 'Welcome a beautiful new chapter.' },
  { id: 'corporate', name: 'Corporate', icon: '▣', description: 'Create a polished event video.' },
]

const cultureCatalog = [
  { id: 'general', name: 'General / Modern', icon: '✦', description: 'A contemporary look without specific religious styling.' },
  { id: 'islamic', name: 'Islamic', icon: '☾', description: 'Geometric patterns, crescents and elegant ornament.' },
  { id: 'hindu', name: 'Hindu', icon: 'ॐ', description: 'Traditional motifs, mandap details and festive colour.' },
  { id: 'christian', name: 'Christian', icon: '✝', description: 'Church-inspired details, crosses and floral elements.' },
  { id: 'sikh', name: 'Sikh', icon: 'ੴ', description: 'Khanda, Ik Onkar and Gurdwara-inspired details.' },
  { id: 'jain', name: 'Jain', icon: 'अ', description: 'Ahimsa-inspired details, lotus and temple ornament.' },
  { id: 'bohra', name: 'Bohra', icon: '۞', description: 'Bohra-inspired geometry, arches and refined ornament.' },
  { id: 'other', name: 'Other / Custom', icon: '+', description: 'A flexible style for other traditions and preferences.' },
]

const createTemplate = (
  id,
  name,
  description,
  theme,
  motif,
  previewTitle,
  previewSubtitle,
  detailLine,
) => ({
  id,
  name,
  description,
  themeClass: \`theme-\${theme}\`,
  motif,
  previewTitle,
  previewSubtitle,
  detailLine,
})

const culturalTemplatesByOccasion = {
  wedding: {
    islamic: [
      createTemplate('islamic-noor-arch', 'Noor Arch', 'Elegant, refined and timeless', 'islamic', '☾', 'Nikah', 'A blessed beginning', 'Crescent · arabesque · antique gold'),
      createTemplate('islamic-mehrab-pearl', 'Mehrab Pearl', 'Ornamental and softly luxurious', 'islamic', '۞', 'Bismillah', 'Together in grace', 'Geometric arch · pearl · emerald'),
    ],
    hindu: [
      createTemplate('hindu-shubh-vivah', 'Shubh Vivah', 'Traditional mandap-inspired elegance', 'hindu', 'ॐ', 'Shubh Vivah', 'A sacred union', 'Mandap · marigold · kalash'),
      createTemplate('hindu-lotus-mandap', 'Lotus Mandap', 'Warm, floral and ceremonial', 'hindu', 'श्री', 'Mangal Parinay', 'A beautiful new beginning', 'Temple arch · lotus · gold'),
    ],
    christian: [
      createTemplate('christian-sacred-vows', 'Sacred Vows', 'Graceful, classic and romantic', 'christian', '✝', 'Sacred Vows', 'Two lives, one promise', 'Church arch · lilies · ivory'),
      createTemplate('christian-everlasting-grace', 'Everlasting Grace', 'Soft florals with a formal finish', 'christian', '✧', 'Forever & Always', 'A love blessed with grace', 'Cross detail · stained glass · roses'),
    ],
    sikh: [
      createTemplate('sikh-anand-karaj', 'Anand Karaj', 'Traditional and richly detailed', 'sikh', 'ੴ', 'Anand Karaj', 'A union in divine love', 'Ik Onkar · floral arch · warm gold'),
      createTemplate('sikh-golden-gurdwara', 'Golden Gurdwara', 'Architectural, elegant and serene', 'sikh', '☬', 'Blessed Union', 'A beautiful shared journey', 'Khanda · Gurdwara arch · ivory'),
    ],
    jain: [
      createTemplate('jain-ahimsa-vows', 'Ahimsa Vows', 'Peaceful, meaningful and refined', 'jain', 'अहिंसा', 'A Sacred Union', 'Together in harmony', 'Lotus · temple carving · ivory'),
      createTemplate('jain-lotus-serenity', 'Lotus Serenity', 'Minimal ornament with a graceful feel', 'jain', '❀', 'With Grace', 'A timeless celebration', 'Lotus petals · carved arch · sage'),
    ],
    bohra: [
      createTemplate('bohra-noorani-nikah', 'Noorani Nikah', 'Community-inspired and elegant', 'bohra', '☾', 'Nikah Mubarak', 'A blessed new chapter', 'Geometric floral work · pearl · gold'),
      createTemplate('bohra-mehfil-elegance', 'Mehfil Elegance', 'Rich detail with a premium finish', 'bohra', '۞', 'A Celebration', 'Together with family and love', 'Ornamental arch · burgundy · gold'),
    ],
    general: [
      createTemplate('general-modern-vows', 'Modern Vows', 'Clean typography and contemporary style', 'general', '✦', 'The Wedding', 'A story made for two', 'Minimal frame · soft light · modern type'),
      createTemplate('general-classic-romance', 'Classic Romance', 'Warm, graceful and versatile', 'general', '♡', 'Forever Begins', 'A day to remember', 'Floral detail · champagne · ivory'),
    ],
    other: [
      createTemplate('other-custom-heritage', 'Custom Heritage', 'A flexible traditional design direction', 'other', '❖', 'A Celebration', 'Made around your traditions', 'Custom motifs · ornate frame · rich detail'),
      createTemplate('other-custom-modern', 'Custom Modern', 'A clean design ready for personalization', 'other', '✧', 'Together', 'Your story, your style', 'Custom palette · modern type · soft light'),
    ],
  },
  festival: {
    islamic: [
      createTemplate('islamic-eid-radiance', 'Eid Radiance', 'Festive lanterns and elegant ornament', 'islamic', '☾', 'Eid Mubarak', 'A season of blessings', 'Crescent · lantern · geometric stars'),
      createTemplate('islamic-moonlit-mosaic', 'Moonlit Mosaic', 'A rich, atmospheric festive style', 'islamic', '۞', 'Festive Lights', 'Celebrate together', 'Arabesque pattern · moonlight · gold'),
    ],
    hindu: [
      createTemplate('hindu-deepotsav', 'Deepotsav', 'Warm light, rangoli and festive detail', 'hindu', 'दीप', 'Shubh Utsav', 'May your home shine with joy', 'Diya · rangoli · marigold'),
      createTemplate('hindu-temple-utsav', 'Temple Utsav', 'Temple-inspired architecture and ornament', 'hindu', 'ॐ', 'Divine Celebration', 'A festival of devotion', 'Temple arch · toran · deity artwork space'),
    ],
    christian: [
      createTemplate('christian-christmas-glow', 'Christmas Glow', 'Warm festive light and classic details', 'christian', '✧', 'Season of Joy', 'Peace, hope and togetherness', 'Star · candlelight · evergreen'),
      createTemplate('christian-easter-light', 'Easter Light', 'Fresh, bright and reverent', 'christian', '✝', 'Easter Blessings', 'A celebration of hope', 'Cross · lilies · sunrise'),
    ],
    sikh: [
      createTemplate('sikh-gurpurab-lights', 'Gurpurab Lights', 'Radiant and community-centred', 'sikh', 'ੴ', 'Gurpurab', 'Celebrate the light of wisdom', 'Ik Onkar · Gurdwara arch · light'),
      createTemplate('sikh-prakash-parv', 'Prakash Parv', 'Traditional details with a golden finish', 'sikh', '☬', 'Prakash Parv', 'A joyful gathering', 'Khanda · floral border · warm gold'),
    ],
    jain: [
      createTemplate('jain-paryushan-peace', 'Paryushan Peace', 'Calm, thoughtful and minimal', 'jain', 'अहिंसा', 'Maitri Bhav', 'A time for peace and reflection', 'Ahimsa motif · lotus · ivory'),
      createTemplate('jain-mahavir-jayanti', 'Jain Utsav', 'A serene temple-inspired celebration', 'jain', '❖', 'A Sacred Celebration', 'Celebrate with kindness', 'Temple arch · lotus · soft gold'),
    ],
    bohra: [
      createTemplate('bohra-eid-gathering', 'Eid Gathering', 'Warm community celebration styling', 'bohra', '☾', 'Eid Mubarak', 'Together in gratitude', 'Lantern · floral geometry · gold'),
      createTemplate('bohra-festive-noor', 'Festive Noor', 'Elegant geometry with a luminous finish', 'bohra', '۞', 'A Time to Celebrate', 'Joy shared with loved ones', 'Crescent · ornamental border · pearl'),
    ],
    general: [
      createTemplate('general-festival-glow', 'Festival Glow', 'Bright, welcoming and versatile', 'general', '✺', 'Festival of Joy', 'Celebrate every moment', 'Warm light · floral accents · gold'),
      createTemplate('general-celebration-mosaic', 'Celebration Mosaic', 'Colourful, modern and energetic', 'general', '✦', 'Let’s Celebrate', 'A gathering to remember', 'Geometric colour · confetti · modern type'),
    ],
    other: [
      createTemplate('other-cultural-celebration', 'Cultural Celebration', 'A flexible base for your tradition', 'other', '❖', 'A Special Celebration', 'Made around your culture', 'Custom symbols · decorative border · colour'),
      createTemplate('other-custom-festive', 'Custom Festive', 'A modern festive design direction', 'other', '✧', 'Festival Moments', 'Your celebration, your way', 'Custom palette · light effects · modern type'),
    ],
  },
}

const designsByOccasion = {
  birthday: [
    { id: 'celebration', name: 'Celebration', description: 'Bold, joyful, energetic', className: 'design-celebration', label: 'Happy Birthday', motif: '✺', previewSubtitle: 'A day full of happiness' },
    { id: 'elegant', name: 'Elegant', description: 'Refined, stylish, modern', className: 'design-elegant', label: 'A Special Day', motif: '✧', previewSubtitle: 'Made to feel unforgettable' },
    { id: 'playful', name: 'Playful', description: 'Fun, colourful, expressive', className: 'design-playful', label: 'Let’s Celebrate', motif: '♡', previewSubtitle: 'Big smiles and bright moments' },
  ],
  engagement: [
    { id: 'romance', name: 'Romance', description: 'Intimate, soft, cinematic', className: 'design-romance', label: 'The Engagement', motif: '♡', previewSubtitle: 'The beginning of forever' },
    { id: 'luxury', name: 'Luxury', description: 'Polished, premium, dramatic', className: 'design-luxury', label: 'Forever Begins', motif: '✦', previewSubtitle: 'A moment worth celebrating' },
    { id: 'minimal', name: 'Minimal', description: 'Clean, modern, timeless', className: 'design-minimal', label: 'Together', motif: '◇', previewSubtitle: 'Simple, meaningful, yours' },
  ],
  anniversary: [
    { id: 'classic', name: 'Classic', description: 'Warm, elegant, heartfelt', className: 'design-classic', label: 'Our Story', motif: '∞', previewSubtitle: 'Celebrating every chapter' },
    { id: 'cinematic', name: 'Cinematic', description: 'Dramatic, emotional, refined', className: 'design-cinematic', label: 'Years Together', motif: '✦', previewSubtitle: 'A story still unfolding' },
    { id: 'minimal', name: 'Minimal', description: 'Clean, modern, timeless', className: 'design-minimal', label: 'Still Us', motif: '♡', previewSubtitle: 'Always and forever' },
  ],
  'baby-shower': [
    { id: 'soft', name: 'Soft', description: 'Gentle, warm, delicate', className: 'design-soft', label: 'A Little Wonder', motif: '♡', previewSubtitle: 'A beautiful new chapter' },
    { id: 'floral', name: 'Floral', description: 'Fresh, graceful, joyful', className: 'design-floral', label: 'Coming Soon', motif: '❀', previewSubtitle: 'Love is growing' },
    { id: 'playful', name: 'Playful', description: 'Sweet, cheerful, charming', className: 'design-playful', label: 'Baby Love', motif: '✺', previewSubtitle: 'Tiny moments, big love' },
  ],
  corporate: [
    { id: 'executive', name: 'Executive', description: 'Premium, confident, polished', className: 'design-executive', label: 'Our Event', motif: '▣', previewSubtitle: 'A professional impression' },
    { id: 'modern', name: 'Modern', description: 'Clean, sharp, contemporary', className: 'design-modern', label: 'Let’s Connect', motif: '◇', previewSubtitle: 'Ideas into moments' },
    { id: 'minimal', name: 'Minimal', description: 'Simple, clear, professional', className: 'design-minimal', label: 'Together', motif: '✦', previewSubtitle: 'A clear, confident story' },
  ],
}

export default function App() {
  const [selectedOccasion, setSelectedOccasion] = useState(null)
  const [selectedCulture, setSelectedCulture] = useState(null)
  const [isCultureStepComplete, setIsCultureStepComplete] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState(null)
  const [isDesignConfirmed, setIsDesignConfirmed] = useState(false)

  const needsCultureStep = CULTURE_OCCASIONS.includes(selectedOccasion)
  const cultureKey = selectedCulture || 'general'

  const designs = useMemo(() => {
    if (!selectedOccasion) return []

    if (CULTURE_OCCASIONS.includes(selectedOccasion)) {
      return culturalTemplatesByOccasion[selectedOccasion]?.[cultureKey]
        || culturalTemplatesByOccasion[selectedOccasion]?.general
        || []
    }

    return designsByOccasion[selectedOccasion] || []
  }, [selectedOccasion, cultureKey])

  const selectedOccasionData = occasionCatalog.find((occasion) => occasion.id === selectedOccasion)
  const selectedCultureData = cultureCatalog.find((culture) => culture.id === selectedCulture)
  const effectiveCultureData = selectedCultureData || cultureCatalog.find((culture) => culture.id === 'general')
  const canShowDesigns = Boolean(selectedOccasion) && (!needsCultureStep || isCultureStepComplete)
  const selectedDesignData = designs.find((design) => design.id === selectedDesign)

  const handleOccasionChange = (occasionId) => {
    setSelectedOccasion(occasionId)
    setSelectedCulture(null)
    setIsCultureStepComplete(false)
    setSelectedDesign(null)
    setIsDesignConfirmed(false)
  }

  const handleCultureChange = (cultureId) => {
    setSelectedCulture(cultureId)
    setIsCultureStepComplete(true)
    setSelectedDesign(null)
    setIsDesignConfirmed(false)
  }

  const handleSkipCulture = () => {
    setSelectedCulture(null)
    setIsCultureStepComplete(true)
    setSelectedDesign(null)
    setIsDesignConfirmed(false)
  }

  const handleDesignChange = (designId) => {
    setSelectedDesign(designId)
    setIsDesignConfirmed(false)
  }

  const handleDesignContinue = () => {
    if (!selectedDesignData) return
    setIsDesignConfirmed(true)
  }

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />

        <nav className="topbar">
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
            Choose your occasion and, for weddings or festivals, a cultural style. We’ll find a
            design direction that fits your celebration.
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
          {occasionCatalog.map((occasion) => {
            const isSelected = selectedOccasion === occasion.id

            return (
              <button
                className={\`occasion-card \${isSelected ? 'is-selected' : ''}\`}
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
                <span className="selection-indicator" aria-hidden="true">{isSelected ? '✓' : ''}</span>
              </button>
            )
          })}
        </div>
      </section>

      {selectedOccasion && needsCultureStep && (
        <section className="culture-section culture-section-reveal" aria-labelledby="culture-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Step 02 · Optional</p>
              <h2 id="culture-heading">Choose your cultural style</h2>
            </div>
            <p className="heading-note">Shown for weddings and festivals. You can skip this step.</p>
          </div>

          <div className="culture-grid">
            {cultureCatalog.map((culture) => {
              const isSelected = selectedCulture === culture.id

              return (
                <button
                  className={\`culture-card \${isSelected ? 'is-selected' : ''}\`}
                  key={culture.id}
                  type="button"
                  onClick={() => handleCultureChange(culture.id)}
                  aria-pressed={isSelected}
                >
                  <span className="culture-card-top">
                    <span className="culture-icon" aria-hidden="true">{culture.icon}</span>
                    <span className="selection-indicator" aria-hidden="true">{isSelected ? '✓' : ''}</span>
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
        <section className="design-section design-section-reveal" aria-labelledby="design-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Step 03 · {selectedOccasionData?.name}
                {needsCultureStep ? \` · \${effectiveCultureData?.name}\` : ''}
              </p>
              <h2 id="design-heading">Choose your design</h2>
            </div>
            <p className="heading-note">
              {needsCultureStep
                ? \`Templates curated for \${selectedOccasionData?.name.toLowerCase()} and \${effectiveCultureData?.name.toLowerCase()} style.\`
                : 'Choose a visual theme for your event video.'}
            </p>
          </div>

          {selectedCulture === 'hindu' && (
            <p className="culture-guidance" role="note">
              Hindu designs use tradition-aware motifs. The exact festival or ceremony and deity artwork,
              where relevant, should be selected in Event Details so the video never shows the wrong deity.
            </p>
          )}

          {needsCultureStep && (
            <div className="design-context">
              <span>Occasion <strong>{selectedOccasionData?.name}</strong></span>
              <span>Style <strong>{effectiveCultureData?.name}</strong></span>
              {selectedCulture === null && <span className="context-hint">General templates selected because you skipped culture.</span>}
            </div>
          )}

          <div className="design-grid">
            {designs.map((design) => {
              const isSelected = selectedDesign === design.id
              const previewTitle = design.previewTitle || design.label
              const previewSubtitle = design.previewSubtitle || 'Made automatically'
              const previewMotif = design.motif || '✦'

              return (
                <button
                  className={\`design-card \${design.className || ''} \${isSelected ? 'is-selected' : ''}\`}
                  key={design.id}
                  type="button"
                  onClick={() => handleDesignChange(design.id)}
                  aria-pressed={isSelected}
                >
                  <span className={\`design-preview template-preview \${design.themeClass || ''}\`}>
                    <span className="template-content">
                      <span className="template-motif" aria-hidden="true">{previewMotif}</span>
                      <span className="preview-kicker">
                        {design.previewKicker || (selectedCultureData ? selectedCultureData.name : selectedOccasionData?.name)}
                      </span>
                      <strong>{previewTitle}</strong>
                      <span className="preview-line" />
                      <small>{previewSubtitle}</small>
                      <span className="template-detail-line">{design.detailLine || design.description}</span>
                    </span>
                    <span className="template-corner template-corner-top" aria-hidden="true">✧</span>
                    <span className="template-corner template-corner-bottom" aria-hidden="true">✧</span>
                  </span>
                  <span className="card-footer">
                    <span className="card-footer-copy">
                      <strong>{design.name}</strong>
                      <small>{design.description}</small>
                    </span>
                    <span className="selection-indicator" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="continue-row">
            <span className="selection-summary">
              {selectedOccasionData?.name}
              {needsCultureStep ? \` · \${effectiveCultureData?.name}\` : ''}
              {' · '}
              <strong>{selectedDesignData?.name || 'Choose a design'}</strong>
            </span>
            <button
              className="primary-button"
              type="button"
              disabled={!selectedDesignData}
              onClick={handleDesignContinue}
            >
              {isDesignConfirmed ? 'Design selected ✓' : 'Continue'}
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
    </main>
  )
}
