import "../styles/wedding-template-artwork.css";

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
    eyebrow: "THE ART OF A KEEPSAKE",
    title: "The Invitation",
    subtitle: "A beautiful beginning, thoughtfully presented",
    footer: "A KEEPSAKE IN PRINT",
  },
  garden: {
    eyebrow: "A GARDEN OF LOVE",
    title: "The Garden Wedding",
    subtitle: "Where our forever begins",
    footer: "IN FULL BLOOM",
  },
  celestial: {
    eyebrow: "WRITTEN IN THE STARS",
    title: "Celestial Vows",
    subtitle: "Two paths, one constellation",
    footer: "A LOVE BEYOND THE STARS",
  },
  "art-deco": {
    eyebrow: "AN EVENING OF ELEGANCE",
    title: "The Grand Affair",
    subtitle: "A celebration in timeless style",
    footer: "ESTABLISHED IN ELEGANCE",
  },
  mediterranean: {
    eyebrow: "MEET US BY THE SEA",
    title: "Mediterranean Wedding",
    subtitle: "A celebration under the sun",
    footer: "AMORE · ALWAYS",
  },
  monogram: {
    eyebrow: "A NEW CHAPTER BEGINS",
    title: "A & R",
    subtitle: "An invitation to celebrate",
    footer: "SIMPLY · BEAUTIFULLY · FOREVER",
  },
};

function PalaceIllustration({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 900 520"
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M20 483H880" stroke="#e3bd80" strokeWidth="4" opacity=".8" />
      <path d="M35 483V245h128v238M737 483V245h128v238" fill="#4b2d49" stroke="#e3bd7e" strokeWidth="4" />
      <path d="M18 247Q99 116 180 247M720 247Q801 116 882 247" fill="none" stroke="#f0d39a" strokeWidth="8" />
      <path d="M165 483V212h570v271" fill="#4b2d49" stroke="#e5c38b" strokeWidth="5" />
      <path d="M143 216L450 28l307 188Z" fill="#553451" stroke="#edca8d" strokeWidth="5" />
      <path d="M246 214Q450 17 654 214" fill="none" stroke="#f8dca7" strokeWidth="7" />
      <path d="M300 213L450 104l150 109" fill="none" stroke="#c99b64" strokeWidth="3" />
      <path d="M410 125V58h80v67M399 58l51-37 51 37" fill="#65445d" stroke="#f2d39b" strokeWidth="4" />
      <path d="M354 483V330a96 96 0 0 1 192 0v153" fill="#170f1d" stroke="#e3bd80" strokeWidth="7" />
      <path d="M378 483V337a72 72 0 0 1 144 0v146" fill="none" stroke="#b98a59" strokeWidth="3" />
      <path d="M225 483V316a43 43 0 0 1 86 0v167M589 483V316a43 43 0 0 1 86 0v167" fill="#1a1220" stroke="#d6ad74" strokeWidth="5" />
      <path d="M245 483V321a23 23 0 0 1 46 0v162M609 483V321a23 23 0 0 1 46 0v162" fill="none" stroke="#a87c50" strokeWidth="2" />
      <path d="M74 247V181l25-39 25 39v66M776 247V181l25-39 25 39v66" fill="#59384f" stroke="#f0d39a" strokeWidth="4" />
      <path d="M450 483V407M423 410h54M398 483l52-76 52 76" fill="none" stroke="#e7c58b" strokeWidth="3" opacity=".7" />
      <path d="M180 262H720M180 286H720" stroke="#c99b67" strokeWidth="2" opacity=".7" />
      <g fill="#f7d99b" opacity=".9">
        <circle cx="100" cy="294" r="6" /><circle cx="800" cy="294" r="6" />
        <circle cx="267" cy="275" r="6" /><circle cx="633" cy="275" r="6" />
        <circle cx="450" cy="178" r="7" />
      </g>
      <g fill="none" stroke="#e8c58a" strokeWidth="2" opacity=".8">
        <path d="M92 355q30-38 60 0q-30 38-60 0ZM748 355q30-38 60 0q-30 38-60 0Z" />
        <path d="M259 375q22-32 44 0q-22 32-44 0ZM597 375q22-32 44 0q-22 32-44 0Z" />
        <path d="M418 250q32-28 64 0q-32 28-64 0Z" />
      </g>
      <g fill="#e3b77d" opacity=".9">
        <path d="M52 483q-18-48 10-67q26 17 12 67ZM838 483q-18-48 10-67q26 17 12 67Z" />
        <path d="M188 483q-10-32 13-47q25 14 15 47ZM684 483q-10-32 13-47q25 14 15 47Z" />
      </g>
    </svg>
  );
}

function MapIllustration() {
  return (
    <svg
      className="wa-map-illustration"
      viewBox="0 0 900 600"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M0 355Q150 272 278 345T520 326T900 338V600H0Z" fill="#8eb9bd" opacity=".85" />
      <path d="M0 408Q145 332 278 400T530 386T900 398" fill="none" stroke="#eff0dc" strokeWidth="12" opacity=".8" />
      <path d="M0 300L105 157l70 93 104-169 104 166 100-132 110 144 83-106 224 148v135H0Z" fill="#aeb99f" />
      <path d="M0 326L105 157l70 93 104-169 104 166 100-132 110 144 83-106 224 148" fill="none" stroke="#f5e8ca" strokeWidth="8" />
      <path d="M0 333L105 157l70 93 104-169 104 166 100-132 110 144 83-106 224 148" fill="none" stroke="#d5d9c1" strokeWidth="3" opacity=".8" />
      <path d="M52 520l132-95 82 46 103-72 87 60 83-64 94 74 90-46 113 72" fill="none" stroke="#8f795c" strokeWidth="6" opacity=".75" />
      <path d="M90 230Q270 66 442 222T805 205" fill="none" stroke="#fff5e0" strokeWidth="6" strokeDasharray="15 15" />
      <g fill="#f0dfbd" stroke="#9d7651" strokeWidth="4">
        <path d="M512 340h172v105H512z" />
        <path d="M494 342l104-86 105 86Z" />
        <path d="M548 445v-58a23 23 0 0 1 46 0v58" fill="#cba77c" />
      </g>
      <g fill="#647e68">
        <circle cx="481" cy="359" r="29" /><circle cx="697" cy="360" r="32" /><circle cx="728" cy="407" r="22" />
      </g>
      <g stroke="#647e68" strokeWidth="7" fill="none" strokeLinecap="round">
        <path d="M130 450q-8-75 7-130M137 352q-53-41-67-18M138 347q10-49 54-62M138 380q-43-24-59-6" />
        <path d="M787 464q-8-77 9-134M795 358q-48-40-66-17M796 354q12-50 52-65M795 389q-39-24-56-7" />
      </g>
      <g fill="#718b70">
        <path d="M62 320q25-28 54 8q-38 5-54-8ZM144 288q31-20 49 8q-34 9-49-8ZM70 373q31-15 47 13q-34 4-47-13Z" />
        <path d="M732 324q25-28 54 8q-38 5-54-8ZM813 290q31-20 49 8q-34 9-49-8ZM740 378q31-15 47 13q-34 4-47-13Z" />
      </g>
      <g transform="translate(318 410)">
        <path d="M0 34l21-24h76l22 24v24H0Z" fill="#f9f1df" stroke="#8f6349" strokeWidth="4" />
        <path d="M27 12h58l16 19H12Z" fill="#8db1b5" stroke="#8f6349" strokeWidth="3" />
        <circle cx="25" cy="58" r="10" fill="#493c37" /><circle cx="94" cy="58" r="10" fill="#493c37" />
      </g>
    </svg>
  );
}

function MandapIllustration() {
  return (
    <svg
      className="wa-mandap-illustration"
      viewBox="0 0 900 600"
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M100 560V228Q450-105 800 228V560" fill="#4b1d32" stroke="#edc37e" strokeWidth="13" />
      <path d="M143 560V249Q450-28 757 249V560" fill="none" stroke="#f6dca8" strokeWidth="6" />
      <path d="M204 560V305Q450 83 696 305V560" fill="#2d1528" stroke="#c28f5c" strokeWidth="6" />
      <path d="M76 560V280M137 560V254M763 560V254M824 560V280" stroke="#e6be80" strokeWidth="25" />
      <path d="M76 281l61-79 61 79M702 281l61-79 61 79" fill="none" stroke="#f5d69d" strokeWidth="9" />
      <path d="M180 284Q450 397 720 284" fill="none" stroke="#dca16f" strokeWidth="15" />
      <path d="M228 272Q450 358 672 272" fill="none" stroke="#f7dfad" strokeWidth="7" />
      <path d="M450 45v170M426 79h48" stroke="#f8dba5" strokeWidth="8" />
      <g fill="#e7a4a0">
        {Array.from({ length: 13 }, (_, index) => (
          <circle key={index} cx={202 + index * 83 / 2} cy={238 + Math.sin(index / 12 * Math.PI) * 46} r="12" />
        ))}
      </g>
      <g fill="#f4d28a"><circle cx="170" cy="365" r="10" /><circle cx="730" cy="365" r="10" /><circle cx="450" cy="164" r="9" /></g>
      <g fill="none" stroke="#d9ad73" strokeWidth="3">
        <path d="M110 410q30-36 60 0q-30 36-60 0ZM730 410q30-36 60 0q-30 36-60 0Z" />
        <path d="M185 500q24-30 48 0q-24 30-48 0ZM667 500q24-30 48 0q-24 30-48 0Z" />
      </g>
    </svg>
  );
}

function BotanicalBranch({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 180 320"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M20 300C61 225 70 112 158 18" />
      <path d="M52 226C10 216 2 180 17 154C57 164 70 194 52 226Z" />
      <path d="M82 170C119 168 145 138 137 104C100 113 81 137 82 170Z" />
      <path d="M118 105C82 95 75 60 91 36C123 51 136 79 118 105Z" />
      <path d="M32 271C75 259 103 282 101 315C62 320 37 301 32 271Z" />
    </svg>
  );
}

export function WeddingTemplateArtwork({ template, frame = null }) {
  const styleId = template.styleId;
  const copy = SCENE_COPY[styleId] || SCENE_COPY.royal;
  const entrance =
    frame === null ? 1 : Math.max(0, Math.min(1, (frame - 6) / 22));
  const floatOffset = frame === null ? 0 : Math.sin(frame / 11) * 5;
  const rootStyle = {
    "--wa-accent": template.colors?.accent || "#d8b477",
    "--wa-soft": template.colors?.soft || "#f3dba9",
    "--wa-float": floatOffset + "px",
    "--wa-opacity": String(entrance),
    "--wa-enter-y": (1 - entrance) * 24 + "px",
  };

  return (
    <div
      className={"wedding-artwork wedding-artwork--" + styleId}
      style={rootStyle}
    >
      {styleId === "royal" && (
        <>
          <div className="wa-star-field" aria-hidden="true">
            {Array.from({ length: 36 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: ((index * 37) % 96) + 2 + "%",
                  top: ((index * 53) % 78) + 2 + "%",
                  opacity: 0.3 + (index % 5) * 0.13,
                }}
              />
            ))}
          </div>
          <div className="wa-royal-halo" />
          <div className="wa-royal-garland wa-royal-garland-left" />
          <div className="wa-royal-garland wa-royal-garland-right" />
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
          <div className="wa-glass-orb wa-glass-orb-three" />
          <div className="wa-glass-petal wa-glass-petal-one" />
          <div className="wa-glass-petal wa-glass-petal-two" />
          <div className="wa-glass-petal wa-glass-petal-three" />
          <div className="wa-glass-arch-back" />
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
          <div className="wa-vintage-corner wa-vintage-corner-tr">❧</div>
          <div className="wa-vintage-corner wa-vintage-corner-bl">❧</div>
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
            <div className="wa-vintage-wax-stamp">
              <span>A</span><i>&</i><span>R</span>
            </div>
          </div>
          <span className="wa-vintage-feather">✒</span>
          <span className="wa-scene-footer wa-vintage-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "cinematic" && (
        <>
          <div className="wa-cinema-moon" />
          <div className="wa-cinema-stars" aria-hidden="true">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="wa-lantern wa-lantern-one"><i /></div>
          <div className="wa-lantern wa-lantern-two"><i /></div>
          <div className="wa-lantern wa-lantern-three"><i /></div>
          <div className="wa-cinema-chandelier">
            <i /><i /><i /><i /><i />
          </div>
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
            <svg
              className="wa-map-route"
              viewBox="0 0 900 600"
              preserveAspectRatio="xMidYMid slice"
              role="presentation"
              aria-hidden="true"
            >
              <path d="M115 450C235 100 405 100 510 315S705 440 795 255" />
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
          <div className="wa-heritage-bells">
            <i>✧</i><i>✧</i><i>✧</i><i>✧</i><i>✧</i><i>✧</i><i>✧</i>
          </div>
          <div className="wa-heritage-flower-strings" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </div>
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

      {styleId === "garden" && (
        <>
          <div className="wa-garden-glow" />
          <div className="wa-garden-arch">
            <div className="wa-garden-arch-inner" />
          </div>
          <svg className="wa-garden-vine wa-garden-vine-left" viewBox="0 0 180 360" role="presentation" aria-hidden="true">
            <path d="M20 350C65 260 30 145 155 12" />
            <path d="M45 280q-38-20-31-58q42 8 31 58ZM55 235q44-5 55-44q-48-3-55 44ZM91 156q-41-18-34-57q44 10 34 57ZM119 94q42-9 47-47q-43 1-47 47Z" />
          </svg>
          <svg className="wa-garden-vine wa-garden-vine-right" viewBox="0 0 180 360" role="presentation" aria-hidden="true">
            <path d="M20 350C65 260 30 145 155 12" />
            <path d="M45 280q-38-20-31-58q42 8 31 58ZM55 235q44-5 55-44q-48-3-55 44ZM91 156q-41-18-34-57q44 10 34 57ZM119 94q42-9 47-47q-43 1-47 47Z" />
          </svg>
          <div className="wa-garden-blooms"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="wa-garden-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>THE CELEBRATION OF A LIFETIME</small>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "celestial" && (
        <>
          <div className="wa-celestial-moon" />
          <div className="wa-celestial-halo" />
          <div className="wa-celestial-orbit wa-celestial-orbit-one" />
          <div className="wa-celestial-orbit wa-celestial-orbit-two" />
          <svg className="wa-celestial-constellation" viewBox="0 0 900 600" role="presentation" aria-hidden="true">
            <path d="M110 170L245 105L344 214L485 125L610 236L765 135M180 360L320 300L455 395L595 320L760 390" />
            <g><circle cx="110" cy="170" r="6"/><circle cx="245" cy="105" r="8"/><circle cx="344" cy="214" r="5"/><circle cx="485" cy="125" r="7"/><circle cx="610" cy="236" r="5"/><circle cx="765" cy="135" r="6"/><circle cx="180" cy="360" r="5"/><circle cx="320" cy="300" r="6"/><circle cx="455" cy="395" r="5"/><circle cx="595" cy="320" r="6"/><circle cx="760" cy="390" r="5"/></g>
          </svg>
          <div className="wa-celestial-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>UNDER ONE INFINITE SKY</small>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "art-deco" && (
        <>
          <div className="wa-deco-sunburst" />
          <div className="wa-deco-frame wa-deco-frame-outer" />
          <div className="wa-deco-frame wa-deco-frame-inner" />
          <svg className="wa-deco-fan" viewBox="0 0 900 440" role="presentation" aria-hidden="true">
            <path d="M450 420V30M450 420L120 105M450 420L215 42M450 420L330 12M450 420L570 12M450 420L685 42M450 420L780 105" />
            <path d="M120 105Q450-115 780 105M215 42Q450-100 685 42" />
          </svg>
          <div className="wa-deco-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>AN INVITATION IN PURE ART DECO STYLE</small>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "mediterranean" && (
        <>
          <div className="wa-mediterranean-sun" />
          <div className="wa-mediterranean-horizon" />
          <div className="wa-mediterranean-arch wa-mediterranean-arch-back" />
          <div className="wa-mediterranean-arch wa-mediterranean-arch-front">
            <div className="wa-mediterranean-window" />
          </div>
          <svg className="wa-mediterranean-olive wa-mediterranean-olive-left" viewBox="0 0 180 360" role="presentation" aria-hidden="true">
            <path d="M20 350C65 260 30 145 155 12" />
            <path d="M45 280q-38-20-31-58q42 8 31 58ZM55 235q44-5 55-44q-48-3-55 44ZM91 156q-41-18-34-57q44 10 34 57ZM119 94q42-9 47-47q-43 1-47 47Z" />
          </svg>
          <svg className="wa-mediterranean-olive wa-mediterranean-olive-right" viewBox="0 0 180 360" role="presentation" aria-hidden="true">
            <path d="M20 350C65 260 30 145 155 12" />
            <path d="M45 280q-38-20-31-58q42 8 31 58ZM55 235q44-5 55-44q-48-3-55 44ZM91 156q-41-18-34-57q44 10 34 57ZM119 94q42-9 47-47q-43 1-47 47Z" />
          </svg>
          <div className="wa-mediterranean-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <i />
            <small>A CELEBRATION BY THE SEA</small>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "monogram" && (
        <>
          <div className="wa-monogram-border wa-monogram-border-outer" />
          <div className="wa-monogram-border wa-monogram-border-inner" />
          <div className="wa-monogram-rule wa-monogram-rule-top" />
          <div className="wa-monogram-rule wa-monogram-rule-bottom" />
          <div className="wa-monogram-mark">A <i>&</i> R</div>
          <div className="wa-monogram-copy wa-copy">
            <span className="wa-eyebrow">{copy.eyebrow}</span>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
            <small>TOGETHER WITH THEIR FAMILIES</small>
          </div>
          <span className="wa-scene-footer">{copy.footer}</span>
        </>
      )}

      {styleId === "editorial" && (
        <>
          <div className="wa-stationery-table" />
          <div className="wa-stationery-halo" />
          <div className="wa-stationery-card-shadow" />
          <div className="wa-stationery-card-back" />
          <div className="wa-stationery-card">
            <span className="wa-stationery-overline">TOGETHER WITH THEIR FAMILIES</span>
            <span className="wa-stationery-ornament">❦</span>
            <div className="wa-stationery-copy wa-copy">
              <span className="wa-eyebrow">{copy.eyebrow}</span>
              <strong>{copy.title}</strong>
              <span>{copy.subtitle}</span>
              <i />
              <small>WE INVITE YOU TO CELEBRATE</small>
            </div>
            <div className="wa-stationery-monogram">A <i>&</i> R</div>
            <span className="wa-stationery-bottom">WITH LOVE · ALWAYS</span>
          </div>
          <div className="wa-stationery-wax-seal">A <i>&</i> R</div>
          <div className="wa-stationery-candle">
            <span />
            <i />
          </div>
          <svg
            className="wa-stationery-botanical wa-stationery-botanical-left"
            viewBox="0 0 180 320"
            role="presentation"
            aria-hidden="true"
          >
            <path d="M20 300C61 225 70 112 158 18" />
            <path d="M52 226C10 216 2 180 17 154C57 164 70 194 52 226Z" />
            <path d="M82 170C119 168 145 138 137 104C100 113 81 137 82 170Z" />
            <path d="M118 105C82 95 75 60 91 36C123 51 136 79 118 105Z" />
          </svg>
          <svg
            className="wa-stationery-botanical wa-stationery-botanical-right"
            viewBox="0 0 180 320"
            role="presentation"
            aria-hidden="true"
          >
            <path d="M20 300C61 225 70 112 158 18" />
            <path d="M52 226C10 216 2 180 17 154C57 164 70 194 52 226Z" />
            <path d="M82 170C119 168 145 138 137 104C100 113 81 137 82 170Z" />
            <path d="M118 105C82 95 75 60 91 36C123 51 136 79 118 105Z" />
          </svg>
          <span className="wa-stationery-caption">{copy.footer}</span>
        </>
      )}
    </div>
  );
}
