import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  WEDDING_VIDEO_DURATION_FRAMES,
  WEDDING_VIDEO_SCENE_FRAMES,
} from "../data/weddingVideoConfig.js";
import "../styles/vintage-storybook-video.css";

const TOTAL_SCENES = 5;

const clamp = (value, input, output) =>
  interpolate(value, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

function fitFontSize(value, baseSize, minSize, maxWidth = 440) {
  const text = String(value || "");
  if (!text) return baseSize;

  const estimatedWidth = Math.max(1, text.length * baseSize * 0.56);
  return Math.max(minSize, Math.min(baseSize, (maxWidth * baseSize) / estimatedWidth));
}

function firstInitial(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0]
    ?.charAt(0)
    .toUpperCase() || "";
}

function resolveMonogram(partner1Name, partner2Name, monogram) {
  const initials = [firstInitial(partner1Name), firstInitial(partner2Name)]
    .filter(Boolean);

  if (initials.length) return initials.join(" & ");
  return String(monogram || "").trim() || "✦";
}

function getPhotoSource(photo) {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo === "object") {
    return photo.src || photo.url || "";
  }
  return "";
}

function PaperTexture({ tone = "warm" }) {
  return (
    <>
      <div className={"vintage-paper vintage-paper--" + tone} />
      <svg
        className="vintage-paper-grain"
        viewBox="0 0 540 960"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <filter id="vintage-storybook-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".78"
            numOctaves="3"
            seed="8"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 .15" />
          </feComponentTransfer>
        </filter>
        <rect
          width="540"
          height="960"
          filter="url(#vintage-storybook-grain)"
          opacity=".42"
        />
      </svg>
      <div className="vintage-paper-vignette" />
    </>
  );
}

function EngravedDivider({ className = "" }) {
  return (
    <svg
      className={"vintage-engraved-divider " + className}
      viewBox="0 0 300 34"
      role="presentation"
      aria-hidden="true"
    >
      <path d="M5 17H112M188 17H295" />
      <path d="M150 4c-8 8-8 18 0 26c8-8 8-18 0-26Z" />
      <path d="M130 17q10-12 20 0q10-12 20 0M138 9q12 16 24 0" />
      <circle cx="112" cy="17" r="2" />
      <circle cx="188" cy="17" r="2" />
    </svg>
  );
}

function Candle({ frame = 0, className = "" }) {
  const flicker = 1 + Math.sin(frame * 0.31) * 0.045;
  const glow = 0.65 + (Math.sin(frame * 0.22) + 1) * 0.13;

  return (
    <div className={"vintage-candle " + className}>
      <div className="vintage-candle-glow" style={{ opacity: glow }} />
      <div className="vintage-candle-body" />
      <div
        className="vintage-candle-flame"
        style={{
          transform: "translateX(-50%) scale(" + flicker + ")",
          opacity: 0.82 + (Math.sin(frame * 0.27) + 1) * 0.08,
        }}
      />
      <div className="vintage-candle-wick" />
    </div>
  );
}

function WaxSeal({ monogram, style = {}, small = false }) {
  return (
    <div
      className={"vintage-wax-seal" + (small ? " vintage-wax-seal--small" : "")}
      style={style}
    >
      <span className="vintage-wax-seal-inner">
        <span className="vintage-wax-monogram">{monogram}</span>
        <span className="vintage-wax-leaf vintage-wax-leaf--left">❧</span>
        <span className="vintage-wax-leaf vintage-wax-leaf--right">❧</span>
      </span>
    </div>
  );
}

function OpeningScene({ frame, fps, monogram }) {
  const envelopeSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: { damping: 20, stiffness: 72, mass: 1 },
  });
  const sealSpring = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 10, stiffness: 180, mass: 0.7 },
  });
  const flapRotation = clamp(frame, [55, 100], [0, -174]);
  const letterLift = clamp(frame, [64, 142], [205, -152]);
  const letterOpacity = clamp(frame, [58, 78], [0, 1]);
  const sealOpacity = clamp(frame, [65, 79], [1, 0]);
  const crackOpacity = clamp(frame, [42, 62, 76], [0, 1, 0]);

  return (
    <AbsoluteFill className="vintage-scene vintage-scene--opening">
      <PaperTexture tone="warm" />

      <Candle frame={frame} className="vintage-candle--opening" />

      <div className="vintage-opening-kicker">
        <span>A LETTER, SEALED WITH LOVE</span>
        <EngravedDivider />
      </div>

      <div
        className="vintage-envelope-stage"
        style={{
          transform:
            "translateY(" + (1 - envelopeSpring) * 36 + "px) scale(" +
            (0.96 + envelopeSpring * 0.04) + ")",
        }}
      >
        <div
          className="vintage-letter-from-envelope"
          style={{
            transform: "translateY(" + letterLift + "px)",
            opacity: letterOpacity,
          }}
        >
          <div className="vintage-letter-inner-border" />
          <span className="vintage-letter-top-mark">✦</span>
          <span className="vintage-letter-heading">A STORY IN INK</span>
          <EngravedDivider />
          <p>To a love that deserves to be remembered.</p>
          <span className="vintage-letter-bottom-mark">❦</span>
        </div>

        <div className="vintage-envelope-body">
          <div className="vintage-envelope-side vintage-envelope-side--left" />
          <div className="vintage-envelope-side vintage-envelope-side--right" />
          <div className="vintage-envelope-pocket" />
          <div
            className="vintage-envelope-flap"
            style={{
              transform: "rotateX(" + flapRotation + "deg)",
              zIndex: flapRotation < -80 ? 1 : 5,
            }}
          />
          <div
            className="vintage-envelope-seal-anchor"
            style={{ opacity: sealOpacity, transform: "scale(" + (0.9 + sealSpring * 0.1) + ")" }}
          >
            <WaxSeal monogram="✦" />
            <span
              className="vintage-wax-crack"
              style={{ opacity: crackOpacity }}
            />
          </div>
          <div className="vintage-envelope-seal-fragment vintage-envelope-seal-fragment--left"
            style={{ opacity: crackOpacity, transform: "translate(" + (-frame * 0.15) + "px,-" + (frame * 0.09) + "px) rotate(-18deg)" }}
          />
          <div className="vintage-envelope-seal-fragment vintage-envelope-seal-fragment--right"
            style={{ opacity: crackOpacity, transform: "translate(" + (frame * 0.15) + "px,-" + (frame * 0.08) + "px) rotate(18deg)" }}
          />
        </div>
      </div>

      <div className="vintage-opening-caption">
        <span>THE WEDDING INVITATION</span>
        <span className="vintage-caption-rule" />
        <span>AN HEIRLOOM OF THE HEART</span>
      </div>
    </AbsoluteFill>
  );
}

function IllustratedCoupleFallback() {
  return (
    <svg
      viewBox="0 0 300 390"
      className="vintage-couple-fallback"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vintage-photo-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#d9bd91" />
          <stop offset="1" stopColor="#96724f" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="300" height="390" fill="url(#vintage-photo-sky)" />
      <circle cx="222" cy="78" r="37" fill="#ead4ad" opacity=".75" />
      <path d="M0 270Q70 205 145 255T300 235V390H0Z" fill="#87684b" opacity=".56" />
      <path d="M0 316Q85 255 160 303T300 290V390H0Z" fill="#5e4938" opacity=".62" />
      <g fill="#392a22">
        <path d="M63 202c0-44 20-71 48-71s48 27 48 71v120H63Z" />
        <path d="M161 211c0-51 23-82 55-82s55 31 55 82v111H161Z" />
        <circle cx="111" cy="123" r="35" />
        <circle cx="216" cy="124" r="39" />
      </g>
      <path d="M192 118q24-46 49-8q-14 1-28 14Z" fill="#d5bd93" />
      <path d="M64 210q47 26 94 0M160 220q49 28 110-3" fill="none" stroke="#d6b48b" strokeWidth="5" opacity=".55" />
      <g fill="none" stroke="#f0ddbf" strokeWidth="2" opacity=".7">
        <path d="M25 345q18-26 36 0M238 350q16-22 32 0" />
        <path d="M34 358q116 28 231 0" />
      </g>
    </svg>
  );
}

function PhotoPrint({ photos }) {
  const safePhotos = Array.isArray(photos)
    ? photos.map(getPhotoSource).filter(Boolean).slice(0, 3)
    : [];
  const secondaryPhotos = safePhotos.slice(1);

  return (
    <div className="vintage-photo-stack">
      {secondaryPhotos.map((src, index) => (
        <div
          className={
            "vintage-photo-print vintage-photo-print--back vintage-photo-print--back-" +
            (index + 1)
          }
          key={src + "-" + index}
        >
          <Img src={src} className="vintage-photo-image" />
          <span className="vintage-photo-corner vintage-photo-corner--tl" />
          <span className="vintage-photo-corner vintage-photo-corner--tr" />
          <span className="vintage-photo-corner vintage-photo-corner--bl" />
          <span className="vintage-photo-corner vintage-photo-corner--br" />
        </div>
      ))}

      <div className="vintage-photo-print vintage-photo-print--front">
        {safePhotos.length ? (
          <Img src={safePhotos[0]} className="vintage-photo-image" />
        ) : (
          <IllustratedCoupleFallback />
        )}
        <span className="vintage-photo-corner vintage-photo-corner--tl" />
        <span className="vintage-photo-corner vintage-photo-corner--tr" />
        <span className="vintage-photo-corner vintage-photo-corner--bl" />
        <span className="vintage-photo-corner vintage-photo-corner--br" />
        <span className="vintage-photo-caption">A MOMENT TO KEEP</span>
      </div>
    </div>
  );
}

function CoupleRevealScene({
  frame,
  partner1Name,
  partner2Name,
  photos,
}) {
  const nameReveal = spring({
    frame: Math.max(0, frame - 24),
    fps: 30,
    config: { damping: 22, stiffness: 70, mass: 0.9 },
  });
  const photoReveal = spring({
    frame: Math.max(0, frame - 38),
    fps: 30,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });
  const namesPresent = [partner1Name, partner2Name].filter(Boolean);
  const nameFontSize = fitFontSize(
    namesPresent.join(" & "),
    59,
    25,
    255,
  );
  const showNames = namesPresent.length > 0;
  const showFallback = !showNames;

  return (
    <AbsoluteFill className="vintage-scene vintage-scene--couple">
      <PaperTexture tone="warm" />
      <div className="vintage-letter-page">
        <div className="vintage-letter-inner-border" />
        <div className="vintage-letter-engraving vintage-letter-engraving--top">❦</div>
        <div className="vintage-letter-engraving vintage-letter-engraving--bottom">❦</div>
        <div className="vintage-couple-copy">
          <span className="vintage-scene-eyebrow">THE WEDDING OF</span>
          <EngravedDivider className="vintage-divider--couple" />

          {showNames ? (
            <div
              className="vintage-couple-names"
              style={{
                fontSize: nameFontSize,
                clipPath: "inset(0 " + (100 - nameReveal * 100) + "% 0 0)",
                opacity: nameReveal,
              }}
            >
              {partner1Name && <span>{partner1Name}</span>}
              {partner1Name && partner2Name && <i>&</i>}
              {partner2Name && <span>{partner2Name}</span>}
            </div>
          ) : (
            <div className="vintage-couple-fallback-title">A STORY IN INK</div>
          )}

          <span className="vintage-couple-subtitle">A LOVE LETTER, FOREVER KEPT</span>
          <EngravedDivider />
        </div>

        <div
          className="vintage-photo-reveal"
          style={{
            opacity: photoReveal,
            transform:
              "translateY(" + ((1 - photoReveal) * 44) + "px) rotate(" +
              (3 - photoReveal * 5) + "deg)",
          }}
        >
          <PhotoPrint photos={photos} />
        </div>

        <div className="vintage-letter-bottom-copy">
          <span>WRITTEN WITH LOVE</span>
          <span>✦</span>
          <span>KEPT FOR ALWAYS</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SaveTheDateScene({ frame, eventDate }) {
  const press = spring({
    frame: Math.max(0, frame - 54),
    fps: 30,
    config: { damping: 9, stiffness: 185, mass: 0.68 },
  });
  const stampDrop = interpolate(press, [0, 0.55, 0.82, 1], [-72, 10, -4, 0]);
  const stampScale = interpolate(press, [0, 0.7, 0.88, 1], [1.3, 0.95, 1.03, 1]);
  const dateText = String(eventDate || "").trim() || "DATE TO BE ANNOUNCED";
  const dateSize = fitFontSize(dateText, 52, 22, 440);

  return (
    <AbsoluteFill className="vintage-scene vintage-scene--date">
      <PaperTexture tone="warm" />
      <div className="vintage-date-ornament vintage-date-ornament--top">❧</div>
      <div className="vintage-date-ornament vintage-date-ornament--bottom">❧</div>
      <div className="vintage-date-heading">A DAY TO REMEMBER</div>
      <div className="vintage-date-frame">
        <div className="vintage-date-frame-inner" />
        <span className="vintage-date-topline">SAVE THE DATE</span>
        <EngravedDivider className="vintage-divider--date" />
        <div
          className="vintage-date-stamp"
          style={{
            transform:
              "translateY(" + stampDrop + "px) scale(" + stampScale + ") rotate(-2deg)",
            opacity: press,
          }}
        >
          <span className="vintage-date-stamp-star">✦</span>
          <span
            className="vintage-date-value"
            style={{ fontSize: dateSize }}
          >
            {dateText}
          </span>
          <span className="vintage-date-stamp-star">✦</span>
        </div>
        <span className="vintage-date-bottomline">A NEW CHAPTER BEGINS</span>
      </div>
    </AbsoluteFill>
  );
}

function VenueMapIllustration({ frame }) {
  const pathProgress = spring({
    frame: Math.max(0, frame - 22),
    fps: 30,
    config: { damping: 25, stiffness: 45, mass: 1 },
  });
  const dashOffset = interpolate(pathProgress, [0, 1], [620, 0]);

  return (
    <svg
      className="vintage-map-illustration"
      viewBox="0 0 500 290"
      role="presentation"
      aria-hidden="true"
    >
      <g fill="none" stroke="#6f5036" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 234q43-26 86-2t91-9q45-27 94-2t86-7q37-17 82-3" strokeDasharray="5 7" opacity=".6" />
        <path d="M30 245q55 17 110-1t105 0t117-2t108 7" opacity=".35" />
        <path d="M52 195q37-68 87-66q31 7 38 63M305 185q29-69 78-74q37 8 54 75" />
        <path d="M65 190l25-18l28 18l-28 20Z" />
        <path d="M326 182l26-18l28 18l-28 20Z" />
        <path d="M90 127v-38m0 0l-14 20m14-20l15 20M360 105V66m0 0l-14 19m14-19l15 19" />
        <path d="M180 190q24-54 60-58q40 7 53 58M191 190v-35h96v35M210 155v-35h58v35" />
        <path d="M212 119h55l-27-25Z" />
        <path d="M224 189v-21a15 15 0 0 1 30 0v21" />
        <path d="M191 204q49 30 99 0M202 216q39 20 79 0" opacity=".65" />
        <path d="M145 53q-15-17 0-32q15 15 0 32Zm0-28v-16m-8 8h16" />
      </g>
      <path
        d="M55 246C92 211 104 194 142 206S191 247 235 215S303 170 344 194S401 214 438 142"
        fill="none"
        stroke="#8c3f32"
        strokeWidth="3.5"
        strokeDasharray="620"
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
      />
      <g transform="translate(438 142)">
        <path d="M0-21c-12 0-21 9-21 21c0 14 21 38 21 38S21 14 21 0C21-12 12-21 0-21Z" fill="#8c3f32" stroke="#542a22" strokeWidth="2" />
        <circle cy="0" r="6" fill="#f0d6ae" />
      </g>
    </svg>
  );
}

function InvitationVenueScene({
  frame,
  eventTime,
  venueName,
  venueCity,
  invitationMessage,
  hostLine,
}) {
  const routeOpacity = spring({
    frame: Math.max(0, frame - 12),
    fps: 30,
    config: { damping: 20, stiffness: 55 },
  });
  const venue = String(venueName || "").trim();
  const city = String(venueCity || "").trim();
  const time = String(eventTime || "").trim();
  const message = String(invitationMessage || "").trim();
  const host = String(hostLine || "").trim();
  const venueSize = fitFontSize(venue || "THE CELEBRATION", 30, 17, 430);
  const messageSize = fitFontSize(
    message || "REQUEST THE PLEASURE OF YOUR COMPANY",
    23,
    15,
    430,
  );

  return (
    <AbsoluteFill className="vintage-scene vintage-scene--venue">
      <PaperTexture tone="warm" />
      <div className="vintage-venue-heading">A PLACE TO GATHER</div>
      <div
        className="vintage-map-panel"
        style={{ opacity: routeOpacity }}
      >
        <VenueMapIllustration frame={frame} />
      </div>

      <div className="vintage-invitation-scroll">
        <div className="vintage-scroll-top">TOGETHER WITH THEIR FAMILIES</div>
        <EngravedDivider className="vintage-divider--scroll" />
        <p
          className="vintage-invitation-message"
          style={{ fontSize: messageSize }}
        >
          {message || "Request the pleasure of your company as this new chapter begins."}
        </p>
        {host && (
          <p className="vintage-host-line">{host}</p>
        )}
        <EngravedDivider className="vintage-divider--scroll" />
        <div
          className="vintage-venue-name"
          style={{ fontSize: venueSize }}
        >
          {venue || "THE CELEBRATION"}
        </div>
        {city && <div className="vintage-venue-city">{city}</div>}
        {time && <div className="vintage-venue-time">{time}</div>}
      </div>
    </AbsoluteFill>
  );
}

function ClosingScene({ frame, monogram }) {
  const stamp = spring({
    frame: Math.max(0, frame - 48),
    fps: 30,
    config: { damping: 11, stiffness: 160, mass: 0.8 },
  });
  const burn = clamp(frame, [36, 170], [0.12, 0.72]);
  const stampY = interpolate(stamp, [0, 1], [-160, 0]);
  const sealScale = interpolate(stamp, [0, 0.72, 0.9, 1], [1.35, 0.93, 1.05, 1]);
  const sealOpacity = clamp(frame, [43, 62], [0, 1]);
  const glowOpacity = 0.2 + Math.sin(frame * 0.12) * 0.055;

  return (
    <AbsoluteFill className="vintage-scene vintage-scene--closing">
      <PaperTexture tone="warm" />
      <div
        className="vintage-burn-vignette"
        style={{ opacity: burn }}
      />
      <div className="vintage-closing-heading">SEALED WITH LOVE</div>
      <div className="vintage-closing-filigree">❦</div>
      <div
        className="vintage-closing-seal-wrap"
        style={{
          opacity: sealOpacity,
          transform:
            "translateY(" + stampY + "px) scale(" + sealScale + ")",
          filter: "drop-shadow(0 20px 22px rgba(50,20,10,.35))",
        }}
      >
        <WaxSeal monogram={monogram} />
      </div>
      <div
        className="vintage-closing-glow"
        style={{ opacity: glowOpacity }}
      />
      <div className="vintage-closing-caption">
        <span>A STORY WRITTEN IN INK</span>
        <EngravedDivider />
        <span>FOREVER KEPT</span>
      </div>
    </AbsoluteFill>
  );
}

export function VintageStorybookMotionPreview({
  template,
  partner1Name = "",
  partner2Name = "",
  monogram = "",
  eventDate = "",
  eventTime = "",
  venueName = "",
  venueCity = "",
  invitationMessage = "",
  hostLine = "",
  photos = [],
  musicUrl = "",
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneIndex = Math.min(
    TOTAL_SCENES - 1,
    Math.floor(frame / WEDDING_VIDEO_SCENE_FRAMES),
  );
  const sceneFrame = frame - sceneIndex * WEDDING_VIDEO_SCENE_FRAMES;
  const transitionOpacity = clamp(
    sceneFrame,
    [0, 12, WEDDING_VIDEO_SCENE_FRAMES - 14, WEDDING_VIDEO_SCENE_FRAMES - 1],
    [0, 1, 1, 0],
  );
  const resolvedMonogram = resolveMonogram(
    partner1Name,
    partner2Name,
    monogram,
  );
  const safeMusicUrl = String(musicUrl || "").trim();

  let scene;
  if (sceneIndex === 0) {
    scene = (
      <OpeningScene
        frame={sceneFrame}
        fps={fps}
        monogram={resolvedMonogram}
      />
    );
  } else if (sceneIndex === 1) {
    scene = (
      <CoupleRevealScene
        frame={sceneFrame}
        partner1Name={partner1Name}
        partner2Name={partner2Name}
        photos={photos}
      />
    );
  } else if (sceneIndex === 2) {
    scene = (
      <SaveTheDateScene
        frame={sceneFrame}
        eventDate={eventDate}
      />
    );
  } else if (sceneIndex === 3) {
    scene = (
      <InvitationVenueScene
        frame={sceneFrame}
        eventTime={eventTime}
        venueName={venueName}
        venueCity={venueCity}
        invitationMessage={invitationMessage}
        hostLine={hostLine}
      />
    );
  } else {
    scene = (
      <ClosingScene
        frame={sceneFrame}
        monogram={resolvedMonogram}
      />
    );
  }

  return (
    <AbsoluteFill className="vintage-storybook-video">
      <AbsoluteFill
        style={{
          opacity: transitionOpacity,
          backgroundColor: "#2f1c14",
        }}
      >
        {scene}
      </AbsoluteFill>
      {safeMusicUrl && (
        <Audio
          src={safeMusicUrl}
          volume={(audioFrame) =>
            clamp(
              audioFrame,
              [
                WEDDING_VIDEO_DURATION_FRAMES - fps * 1.5,
                WEDDING_VIDEO_DURATION_FRAMES - 1,
              ],
              [1, 0],
            )
          }
        />
      )}
    </AbsoluteFill>
  );
}
