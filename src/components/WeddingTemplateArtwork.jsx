const SCENE_COPY = {
  royal: {
    eyebrow: "A ROYAL BEGINNING",
    title: "The Wedding",
    subtitle: "An invitation fit for a fairytale",
    footer: "A MOMENT OF GRANDEUR",
  },
  glass: {
    eyebrow: "A LOVE IN LIGHT",
    title: "Two Souls",
    subtitle: "One beautiful story",
    footer: "MADE OF LIGHT & LOVE",
  },
  "three-d": {
    eyebrow: "A TIMELESS ANNOUNCEMENT",
    title: "Save the Date",
    subtitle: "A day to remember, forever",
    footer: "THE STORY BEGINS",
  },
  cinematic: {
    eyebrow: "UNDER THE SAME SKY",
    title: "Our Wedding",
    subtitle: "A night written in the stars",
    footer: "THE BEGINNING OF ALWAYS",
  },
  floral: {
    eyebrow: "A JOURNEY TO FOREVER",
    title: "Destination Wedding",
    subtitle: "Love takes us somewhere beautiful",
    footer: "A PLACE · A PROMISE · A MEMORY",
  },
  heritage: {
    eyebrow: "A CELEBRATION OF HERITAGE",
    title: "Wedding Invitation",
    subtitle: "Tradition woven into every detail",
    footer: "ROOTED IN LOVE",
  },
  editorial: {
    eyebrow: "THE ART OF TOGETHERNESS",
    title: "A Timeless Union",
    subtitle: "A refined celebration of love",
    footer: "A NEW CHAPTER",
  },
};

function PalaceIllustration({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 900 430" role="presentation" aria-hidden="true">
      <path d="M30 372H870" stroke="#dfbd80" strokeWidth="3" fill="none" opacity=".7" />
      <path d="M95 370V202h105v168M700 370V202h105v168" fill="#24152a" stroke="#d5ad70" strokeWidth="3" />
      <path d="M78 204Q147 110 217 204M683 204Q752 110 822 204" fill="none" stroke="#e8c58d" strokeWidth="5" />
      <path d="M235 370V166h430v204" fill="#35203a" stroke="#e0bb7d" strokeWidth="4" />
      <path d="M220 168L450 42l230 126Z" fill="#5c3850" stroke="#e5c28a" strokeWidth="4" />
      <path d="M300 166Q450 27 600 166" fill="none" stroke="#f1d39a" strokeWidth="5" />
      <path d="M390 370V239a60 60 0 0 1 120 0v131" fill="#160f20" stroke="#e2be82" strokeWidth="4" />
      <path d="M273 370V255a34 34 0 0 1 68 0v115M559 370V255a34 34 0 0 1 68 0v115" fill="#160f20" stroke="#c99a65" strokeWidth="3" />
      <path d="M125 202V154l25-32 25 32v48M730 202V154l25-32 25 32v48" fill="#4c3048" stroke="#e5c28a" strokeWidth="3" />
      <path d="M425 74V25h50v49M416 25l34-22 34 22" fill="#654257" stroke="#f0d49a" strokeWidth="3" />
      <g fill="#f2d49a" opacity=".78">
        <circle cx="145" cy="246" r="5" /><circle cx="755" cy="246" r="5" />
        <circle cx="305" cy="218" r="5" /><circle cx="595" cy="218" r="5" />
        <circle cx="450" cy="135" r="6" />
      </g>
    </svg>
  );
}

function MapIllustration() {
  return (
    <svg className="wa-map-illustration" viewBox="0 0 900 470" role="presentation" aria-hidden="true">
      <path d="M0 285Q115 210 228 280T450 276T680 250T900 280V470H0Z" fill="#93bac1" opacity=".72" />
      <path d="M0 330Q135 268 244 327T468 310T690 290T900 335" fill="none" stroke="#e8f1e4" strokeWidth="9" opacity=".8" />
      <path d="M0 245L115 112l88 96 86-135 119 172 102-104 99 132 95-116 196 123v125H0Z" fill="#b4b8a0" />
      <path d="M0 271L115 112l88 96 86-135 119 172 102-104 99 132 95-116 196 123" fill="none" stroke="#f5e6c9" strokeWidth="7" />
      <path d="M80 390l100-83 75 42 74-68 72 53 70-47 76 57 85-44 100 62" fill="none" stroke="#9a8064" strokeWidth="5" opacity=".75" />
      <path d="M185 190Q310 84 450 208T735 180" fill="none" stroke="#f7f0dd" strokeWidth="5" strokeDasharray="13 12" />
      <g fill="#f3e1bd" stroke="#9b704a" strokeWidth="4">
        <path d="M510 278h150v88H510z" /><path d="M496 281l89-68 89 68Z" />
        <path d="M545 366v-46a20 20 0 0 1 40 0v46" fill="#d2a878" />
      </g>
      <g fill="#6d7864"><circle cx="486" cy="298" r="24" /><circle cx="682" cy="295" r="28" /><circle cx="717" cy="332" r="20" /></g>
    </svg>
  );
}

function MandapIllustration() {
  return (
    <svg className="wa-mandap-illustration" viewBox="0 0 900 470" role="presentation" aria-hidden="true">
      <path d="M115 420V206Q450-95 785 206V420" fill="#4d1c2f" stroke="#e9bd72" strokeWidth="11" />
      <path d="M158 420V226Q450-30 742 226V420" fill="none" stroke="#f2d79f" strokeWidth="5" />
      <path d="M215 420V283Q450 48 685 283V420" fill="#2c1528" stroke="#bd8c58" strokeWidth="5" />
      <path d="M90 420V244M145 420V232M755 420V232M810 420V244" stroke="#e7bf79" strokeWidth="22" />
      <path d="M90 244l55-65 55 65M700 244l55-65 55 65" fill="none" stroke="#f0d39a" strokeWidth="7" />
      <path d="M210 250Q450 345 690 250" fill="none" stroke="#d9a06b" strokeWidth="13" />
      <path d="M265 240Q450 310 635 240" fill="none" stroke="#f6dca7" strokeWidth="6" />
      <path d="M450 62v130M432 82h36" stroke="#f6dca7" strokeWidth="6" />
      <g fill="#e7a4a0"><circle cx="220" cy="230" r="14" /><circle cx="263" cy="202" r="14" /><circle cx="307" cy="178" r="14" /><circle cx="593" cy="178" r="14" /><circle cx="637" cy="202" r="14" /><circle cx="680" cy="230" r="14" /></g>
      <g fill="#f4d28a"><circle cx="170" cy="310" r="9" /><circle cx="730" cy="310" r="9" /><circle cx="450" cy="160" r="8" /></g>
    </svg>
  );
}

export function WeddingTemplateArtwork({ template, frame = null }) {
  const styleId = template.styleId;
  const copy = SCENE_COPY[styleId] || SCENE_COPY.royal;
  const entrance = frame === null ? 1 : Math.max(0, Math.min(1, (frame - 6) / 22));
  const floatOffset = frame === null ? 0 : Math.sin(frame / 11) * 5;
  const rootStyle = {
    "--wa-accent": template.colors?.accent || "#d8b477",
    "--wa-soft": template.colors?.soft || "#f3dba9",
    "--wa-float": floatOffset + "px",
    "--wa-opacity": String(entrance),
    "--wa-enter-y": (1 - entrance) * 24 + "px",
  };

  return (
    <div className={"wedding-artwork wedding-artwork--" + styleId} style={rootStyle}>
      {styleId === "royal" && (
        <>
          <div className="wa-star-field" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <i key={index} style={{ left: ((index * 37) % 96) + 2 + "%", top: ((index * 53) % 72) + 2 + "%", opacity: 0.35 + (index % 5) * 0.12 }} />
            ))}
          </div>
          <div className="wa-royal-halo" />
          <PalaceIllustration className="wa-royal-palace" />
          <div className="wa-royal-reflection" />
          <div className="wa-royal-frame">
            <div className="wa-royal-copy wa-copy">
              <span className="wa-eyebrow">{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
              <span className="wa-royal-subtitle">Invitation</span>
              <i />
              <small>{copy.subtitle}</small>
            </div>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "glass" && (
        <>
          <div className="wa-glass-orb wa-glass-orb-one" />
          <div className="wa-glass-orb wa-glass-orb-two" />
          <div className="wa-glass-petal wa-glass-petal-one" />
          <div className="wa-glass-petal wa-glass-petal-two" />
          <div className="wa-glass-arch">
            <div className="wa-glass-monogram">A <i>&</i> R</div>
            <div className="wa-glass-copy wa-copy">
              <span className="wa-eyebrow">{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
              <span>{copy.subtitle}</span>
              <i />
              <small>THE WEDDING INVITATION</small>
            </div>
          </div>
          <span className="wa-glass-caption">{copy.footer}</span>
        </>
      )}

      {styleId === "three-d" && (
        <>
          <div className="wa-vintage-grain" />
          <div className="wa-vintage-corner wa-vintage-corner-tl">❧</div>
          <div className="wa-vintage-corner wa-vintage-corner-br">❧</div>
          <div className="wa-vintage-sheet">
            <span className="wa-vintage-topline">WITH LOVE & JOY · A FORMAL ANNOUNCEMENT</span>
            <div className="wa-vintage-emblem">✦</div>
            <div className="wa-vintage-copy wa-copy">
              <span className="wa-eyebrow">{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
              <span>{copy.subtitle}</span>
              <small>THE CELEBRATION OF A LIFETIME</small>
            </div>
            <div className="wa-wax-seal">A <i>&</i> R</div>
          </div>
          <span className="wa-vintage-feather">✒</span>
          <span className="wa-scene-footer wa-vintage-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "cinematic" && (
        <>
          <div className="wa-cinema-moon" />
          <div className="wa-cinema-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <div className="wa-lantern wa-lantern-one"><i /></div>
          <div className="wa-lantern wa-lantern-two"><i /></div>
          <div className="wa-lantern wa-lantern-three"><i /></div>
          <PalaceIllustration className="wa-cinema-palace" />
          <div className="wa-cinema-water" />
          <div className="wa-cinema-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>{copy.footer}</small>
          </div>
        </>
      )}

      {styleId === "floral" && (
        <>
          <div className="wa-map-paper">
            <MapIllustration />
            <svg className="wa-map-route" viewBox="0 0 900 470" role="presentation" aria-hidden="true">
              <path d="M115 330C230 70 420 90 510 240S700 365 795 210" />
            </svg>
            <div className="wa-map-pin wa-map-pin-one">✦</div>
            <div className="wa-map-pin wa-map-pin-two">♥</div>
            <span className="wa-map-label wa-map-label-one">THE JOURNEY</span>
            <span className="wa-map-label wa-map-label-two">YOUR DESTINATION</span>
          </div>
          <div className="wa-map-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <small>{copy.footer}</small>
          </div>
        </>
      )}

      {styleId === "heritage" && (
        <>
          <div className="wa-heritage-glow" />
          <MandapIllustration />
          <div className="wa-heritage-bells"><i>✧</i><i>✧</i><i>✧</i><i>✧</i><i>✧</i></div>
          <div className="wa-heritage-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>{copy.footer}</small>
          </div>
          <div className="wa-heritage-border" />
        </>
      )}

      {styleId === "editorial" && (
        <>
          <div className="wa-modern-orbit wa-modern-orbit-one" />
          <div className="wa-modern-orbit wa-modern-orbit-two" />
          <div className="wa-modern-arch">
            <div className="wa-modern-monogram">A <i>&</i> R</div>
            <div className="wa-modern-copy wa-copy">
              <span className="wa-eyebrow">{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
              <span>{copy.subtitle}</span>
              <i />
              <small>THE WEDDING INVITATION</small>
            </div>
          </div>
          <svg className="wa-modern-branch wa-modern-branch-left" viewBox="0 0 170 280" role="presentation" aria-hidden="true">
            <path d="M20 260C55 190 65 92 150 20" />
            <path d="M52 186C14 180 8 146 18 126C53 135 66 158 52 186Z" />
            <path d="M80 133C113 133 135 108 130 80C98 85 80 105 80 133Z" />
            <path d="M112 76C80 66 75 39 89 20C114 34 125 55 112 76Z" />
          </svg>
          <svg className="wa-modern-branch wa-modern-branch-right" viewBox="0 0 170 280" role="presentation" aria-hidden="true">
            <path d="M20 260C55 190 65 92 150 20" />
            <path d="M52 186C14 180 8 146 18 126C53 135 66 158 52 186Z" />
            <path d="M80 133C113 133 135 108 130 80C98 85 80 105 80 133Z" />
            <path d="M112 76C80 66 75 39 89 20C114 34 125 55 112 76Z" />
          </svg>
          <span className="wa-modern-footer">{copy.footer}</span>
        </>
      )}
    </div>
  );
}
