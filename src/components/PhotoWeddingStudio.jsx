import { useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";
import "../styles/photo-wedding-studio.css";

const PHOTO_SLOTS = [
  "Main couple portrait",
  "Together moment",
  "Wedding detail",
  "Favourite memory",
  "Family or celebration",
  "A candid moment",
];

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = PHOTO_SLOTS.length;
const DURATION_FRAMES = 900;
const FPS = 30;

function PhotoFrame({
  src,
  previousSrc,
  style,
  label,
  frameType,
  sceneFrame,
  index,
}) {
  const reveal = interpolate(sceneFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imageFade = interpolate(sceneFrame, [0, 12, 28], [0, 0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const drift = Math.sin((sceneFrame / 35) + index) * 3;
  const isPolaroid = frameType === "polaroid";
  const frameBackground =
    frameType === "gallery" ? "#f4ead8" :
    frameType === "journal" ? "#e9ddc6" :
    frameType === "golden" ? "#d5b77b" :
    "#fffaf1";

  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: isPolaroid ? "7px 7px 27px" : frameType === "gallery" ? 7 : 5,
        border: frameType === "golden" ? "2px solid #d7b56f" : "1px solid rgba(255,250,240,.92)",
        background: frameBackground,
        boxShadow: "0 18px 48px rgba(0,0,0,.28)",
        opacity: reveal,
        ...style,
        transform:
          (style.transform || "") +
          " translateY(" + ((1 - reveal) * 28 + drift) + "px) scale(" + (.96 + reveal * .04) + ")",
      }}
    >
      {previousSrc && (
        <Img
          src={previousSrc}
          style={{
            position: "absolute",
            inset: isPolaroid ? "7px 7px 27px" : 5,
            width: "calc(100% - " + (isPolaroid ? 14 : 10) + "px)",
            height: "calc(100% - " + (isPolaroid ? 34 : 10) + "px)",
            objectFit: "cover",
            opacity: 1 - imageFade,
          }}
        />
      )}
      {src ? (
        <Img
          src={src}
          style={{
            position: "absolute",
            inset: isPolaroid ? "7px 7px 27px" : 5,
            width: "calc(100% - " + (isPolaroid ? 14 : 10) + "px)",
            height: "calc(100% - " + (isPolaroid ? 34 : 10) + "px)",
            objectFit: "cover",
            opacity: previousSrc ? imageFade : 1,
          }}
        />
      ) : !previousSrc ? (
        <div
          style={{
            position: "absolute",
            inset: isPolaroid ? "7px 7px 27px" : 5,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,.82)",
            fontFamily: "Georgia,serif",
            fontSize: 15,
            textAlign: "center",
            padding: 12,
            boxSizing: "border-box",
            background: "linear-gradient(145deg, #b9a58b, #6f5b48)",
          }}
        >
          {label}
        </div>
      ) : null}
      {isPolaroid && (
        <span
          style={{
            position: "absolute",
            right: 4,
            bottom: 5,
            left: 4,
            color: "#69543d",
            font: "italic 9px Georgia,serif",
            textAlign: "center",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function PhotoStyleDecor({ styleId, accent, sceneFrame, scene }) {
  const shimmer = 0.5 + Math.sin(sceneFrame / 18) * 0.2;

  if (styleId === "photo-cinematic") {
    return (
      <>
        <div style={{ position: "absolute", inset: "0 0 auto", height: "9%", background: "#08090c", zIndex: 8 }} />
        <div style={{ position: "absolute", inset: "auto 0 0", height: "12%", background: "#08090c", zIndex: 8 }} />
        {[0, 1].map((row) => (
          <div
            key={row}
            style={{
              position: "absolute",
              zIndex: 9,
              top: row === 0 ? "2.5%" : "90%",
              left: 0,
              right: 0,
              height: "4%",
              background: "repeating-linear-gradient(90deg, #eee6d5 0 13px, transparent 13px 25px)",
              opacity: 0.92,
            }}
          />
        ))}
        <div style={{ position: "absolute", inset: "9% 0 12%", background: "linear-gradient(135deg, transparent 38%, rgba(220,185,118,.12), transparent 66%)", pointerEvents: "none" }} />
      </>
    );
  }

  if (styleId === "photo-album") {
    return (
      <>
        <div style={{ position: "absolute", top: "8%", bottom: "9%", left: "49.2%", width: "1.6%", zIndex: 7, background: "linear-gradient(90deg, rgba(75,54,34,.18), rgba(255,255,255,.6), rgba(75,54,34,.2))", boxShadow: "0 0 18px rgba(68,48,28,.2)" }} />
        <div style={{ position: "absolute", top: "8%", left: "5%", right: "5%", height: "1px", background: accent, opacity: 0.65 }} />
        <div style={{ position: "absolute", bottom: "8%", left: "5%", right: "5%", height: "1px", background: accent, opacity: 0.65 }} />
      </>
    );
  }

  if (styleId === "photo-journey") {
    return (
      <div style={{ position: "absolute", top: "15%", bottom: "17%", left: "17%", width: 2, background: "linear-gradient(180deg, transparent, " + accent + ", " + accent + ", transparent)", opacity: 0.72 }}>
        {[0, 1, 2, 3, 4].map((step) => (
          <span
            key={step}
            style={{
              position: "absolute",
              left: -5,
              top: (step * 24) + "%",
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px solid " + accent,
              background: "#f4efe4",
              boxShadow: "0 0 0 4px rgba(255,255,255,.22)",
            }}
          />
        ))}
      </div>
    );
  }

  if (styleId === "photo-gallery") {
    return (
      <>
        <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(92,78,62,.32)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "7%", left: "12%", right: "12%", height: "1px", background: accent, opacity: shimmer }} />
        <div style={{ position: "absolute", bottom: "7%", left: "12%", right: "12%", height: "1px", background: accent, opacity: shimmer }} />
      </>
    );
  }

  if (styleId === "photo-journal") {
    return (
      <>
        <div style={{ position: "absolute", inset: "5% 7%", border: "1px solid rgba(103,78,48,.28)", boxShadow: "inset 0 0 0 5px rgba(255,249,230,.18)", pointerEvents: "none" }} />
        {[0, 1, 2, 3, 4, 5].map((ring) => (
          <span
            key={ring}
            style={{
              position: "absolute",
              zIndex: 8,
              left: "6%",
              top: (14 + ring * 13) + "%",
              width: 13,
              height: 13,
              border: "2px solid #9c8667",
              borderRadius: "50%",
              background: "#e6d7bb",
              boxShadow: "inset 0 0 0 2px rgba(255,255,255,.45)",
            }}
          />
        ))}
        <div style={{ position: "absolute", top: "8%", right: "13%", width: "21%", height: "4%", background: "rgba(226,202,153,.65)", transform: "rotate(5deg)" }} />
      </>
    );
  }

  if (styleId === "photo-golden") {
    return (
      <>
        <div style={{ position: "absolute", top: "-12%", right: "-16%", width: "75%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,220,150,.3), transparent 68%)", filter: "blur(8px)", opacity: shimmer }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(250,202,115,.08), transparent 35%, rgba(218,164,77,.12))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "6%", left: "8%", right: "8%", bottom: "6%", border: "1px solid rgba(224,189,120,.42)", pointerEvents: "none" }} />
      </>
    );
  }

  if (styleId === "photo-editorial") {
    return (
      <>
        <div style={{ position: "absolute", top: "7%", left: "10%", right: "10%", height: 1, background: accent }} />
        <div style={{ position: "absolute", top: "9%", left: "10%", color: accent, font: "700 9px Arial,sans-serif", letterSpacing: 3 }}>THE WEDDING EDITION</div>
        <div style={{ position: "absolute", top: "12%", right: "10%", color: accent, font: "italic 11px Georgia,serif" }}>No. 01</div>
      </>
    );
  }

  return (
    <>
      <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(141,111,74,.38)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "7%", left: "10%", right: "10%", height: 1, background: accent, opacity: shimmer }} />
      <span style={{ position: "absolute", top: "8%", left: "12%", color: accent, fontSize: 10, letterSpacing: 4 }}>♡ &nbsp; MEMORIES &nbsp; ♡</span>
    </>
  );
}

function getPhotoLayout(styleId) {
  switch (styleId) {
    case "photo-polaroid":
      return [
        { left: "8%", top: "13%", width: "42%", height: "31%", transform: "rotate(-7deg)" },
        { left: "52%", top: "16%", width: "39%", height: "29%", transform: "rotate(6deg)" },
        { left: "27%", top: "48%", width: "48%", height: "34%", transform: "rotate(-2deg)" },
      ];
    case "photo-cinematic":
      return [
        { left: "8%", top: "13%", width: "84%", height: "56%" },
        { left: "10%", top: "70%", width: "24%", height: "16%" },
        { left: "38%", top: "70%", width: "24%", height: "16%" },
        { left: "66%", top: "70%", width: "24%", height: "16%" },
      ];
    case "photo-album":
      return [
        { left: "7%", top: "15%", width: "41%", height: "31%" },
        { left: "52%", top: "15%", width: "41%", height: "31%" },
        { left: "7%", top: "52%", width: "41%", height: "31%" },
        { left: "52%", top: "52%", width: "41%", height: "31%" },
      ];
    case "photo-editorial":
      return [
        { left: "12%", top: "18%", width: "76%", height: "48%" },
        { left: "8%", top: "69%", width: "25%", height: "16%" },
        { left: "37%", top: "69%", width: "25%", height: "16%" },
        { left: "66%", top: "69%", width: "25%", height: "16%" },
      ];
    case "photo-journey":
      return [
        { left: "20%", top: "12%", width: "60%", height: "25%", transform: "rotate(-2deg)" },
        { left: "25%", top: "39%", width: "60%", height: "25%", transform: "rotate(2deg)" },
        { left: "17%", top: "66%", width: "60%", height: "19%", transform: "rotate(-1deg)" },
      ];
    case "photo-gallery":
      return [
        { left: "8%", top: "14%", width: "25%", height: "28%" },
        { left: "37%", top: "10%", width: "26%", height: "30%" },
        { left: "67%", top: "14%", width: "25%", height: "28%" },
        { left: "8%", top: "49%", width: "25%", height: "28%" },
        { left: "37%", top: "46%", width: "26%", height: "30%" },
        { left: "67%", top: "49%", width: "25%", height: "28%" },
      ];
    case "photo-journal":
      return [
        { left: "11%", top: "14%", width: "78%", height: "34%" },
        { left: "11%", top: "54%", width: "34%", height: "25%", transform: "rotate(-3deg)" },
        { left: "54%", top: "54%", width: "34%", height: "25%", transform: "rotate(3deg)" },
      ];
    case "photo-golden":
    default:
      return [
        { left: "10%", top: "14%", width: "80%", height: "46%" },
        { left: "8%", top: "63%", width: "38%", height: "22%" },
        { left: "54%", top: "63%", width: "38%", height: "22%" },
      ];
  }
}

export function PhotoWeddingMotionPreview({ template, photos = [] }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const sceneFrame = frame % 150;
  const title = template.previewTitle || "Our Wedding";
  const subtitle = template.previewSubtitle || "A story made for two";
  const accent = template.colors?.accent || "#d8bd88";
  const light = ["photo-polaroid", "photo-album", "photo-editorial", "photo-gallery", "photo-journey", "photo-journal"].includes(template.styleId);
  const backgroundByStyle = {
    "photo-polaroid": "linear-gradient(140deg, #e5dac5, #c3b297)",
    "photo-cinematic": "#111720",
    "photo-album": "linear-gradient(90deg, #eee4d1 0%, #e3d4b9 49%, #d4c2a4 50%, #eee4d1 100%)",
    "photo-editorial": "#eee9df",
    "photo-journey": "linear-gradient(140deg, #dce3d8, #aebeb0)",
    "photo-gallery": "linear-gradient(145deg, #e4e1d8, #c9c5b9)",
    "photo-journal": "repeating-linear-gradient(0deg, #d8c8a9 0 2px, #d2c09d 2px 4px)",
    "photo-golden": "linear-gradient(145deg, #241b13, #6c4b25 58%, #17130f)",
  };
  const titles = [
    title,
    "The moments we treasure",
    "Two hearts, one journey",
    "A day to remember",
    "Forever begins here",
    "With love, always",
  ];
  const layouts = useMemo(() => getPhotoLayout(template.styleId), [template.styleId]);
  const uploadedPhotos = photos.filter(Boolean);
  const photoFor = (slotIndex, sceneIndex) =>
    uploadedPhotos.length
      ? uploadedPhotos[(slotIndex + sceneIndex * layouts.length) % uploadedPhotos.length]
      : null;
  const titleOpacity = interpolate(sceneFrame, [0, 18, 125, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const overlayOpacity = interpolate(sceneFrame, [0, 14, 136, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frameType =
    template.styleId === "photo-polaroid" ? "polaroid" :
    template.styleId === "photo-gallery" ? "gallery" :
    template.styleId === "photo-journal" ? "journal" :
    template.styleId === "photo-golden" ? "golden" :
    template.styleId === "photo-cinematic" ? "cinematic" :
    "standard";

  return (
    <AbsoluteFill
      style={{
        background: backgroundByStyle[template.styleId] || "#e8dece",
        color: light ? "#30271f" : template.colors?.ink || "#fff8ec",
        fontFamily: "Georgia,serif",
        overflow: "hidden",
      }}
    >
      <PhotoStyleDecor
        styleId={template.styleId}
        accent={accent}
        sceneFrame={sceneFrame}
        scene={scene}
      />
      {layouts.map((position, index) => {
        const current = photoFor(index, scene);
        const previous = scene > 0 ? photoFor(index, scene - 1) : null;
        return (
          <PhotoFrame
            key={index}
            src={current}
            previousSrc={previous}
            label={PHOTO_SLOTS[index % MAX_PHOTOS]}
            index={index}
            frameType={frameType}
            sceneFrame={sceneFrame}
            style={position}
          />
        );
      })}
      {template.styleId === "photo-journey" && (
        <div style={{ position: "absolute", top: "13%", right: "8%", color: accent, font: "italic 10px Georgia,serif", letterSpacing: 2 }}>CHAPTER {scene + 1} / 6</div>
      )}
      {template.styleId === "photo-journal" && (
        <div style={{ position: "absolute", top: "9%", right: "12%", color: "#725c40", font: "italic 12px Georgia,serif", transform: "rotate(3deg)" }}>dear diary…</div>
      )}
      {template.styleId === "photo-cinematic" && (
        <div style={{ position: "absolute", zIndex: 10, top: "7%", left: 0, right: 0, textAlign: "center", color: accent, font: "700 8px Arial,sans-serif", letterSpacing: 4 }}>A LOVE STORY IN FRAMES</div>
      )}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          left: "7%",
          right: "7%",
          bottom: template.styleId === "photo-cinematic" ? "13%" : "6%",
          textAlign: "center",
          opacity: titleOpacity,
          transform: "translateY(" + ((1 - titleOpacity) * 16) + "px)",
          textShadow: light ? "none" : "0 3px 24px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ color: accent, fontFamily: "Arial,sans-serif", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>
          {template.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 31, lineHeight: 1.1 }}>{titles[scene]}</div>
        <div style={{ fontSize: 14, fontStyle: "italic", marginTop: 8, opacity: .82 }}>{subtitle}</div>
      </div>
      {template.styleId === "photo-golden" && (
        <div style={{ position: "absolute", zIndex: 9, inset: 0, background: "radial-gradient(ellipse at 78% 18%, rgba(255,218,150,.16), transparent 38%)", opacity: overlayOpacity, pointerEvents: "none" }} />
      )}
      <div style={{ position: "absolute", zIndex: 12, top: "5%", left: 0, right: 0, textAlign: "center", color: accent, font: "700 8px Arial,sans-serif", letterSpacing: 3 }}>
        {String(Math.min(100, Math.round((frame / (DURATION_FRAMES - 1)) * 100))).padStart(2, "0")} · OUR WEDDING FILM
      </div>
      <div style={{ position: "absolute", zIndex: 13, bottom: 0, left: 0, height: 3, width: (frame / (DURATION_FRAMES - 1)) * 100 + "%", background: accent, boxShadow: "0 0 12px " + accent }} />
    </AbsoluteFill>
  );
}

export function PhotoWeddingStudio({ template }) {
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState("");
  const inputRefs = useRef([]);
  const photoUrlsRef = useRef({});

  useEffect(() => () => {
    Object.values(photoUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const photoCount = photos.filter(Boolean).length;
  const canPreview = photoCount > 0;

  const handleFiles = (event, slotIndex) => {
    const files = Array.from(event.target.files || []);
    setError("");
    if (!files.length) return;

    const file = files[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Each photo must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const previousUrl = photoUrlsRef.current[slotIndex];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    photoUrlsRef.current[slotIndex] = nextUrl;
    setPhotos((current) => {
      const next = [...current];
      next[slotIndex] = nextUrl;
      return next;
    });
    event.target.value = "";
  };

  const removePhoto = (slotIndex) => {
    const previousUrl = photoUrlsRef.current[slotIndex];
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    delete photoUrlsRef.current[slotIndex];
    setPhotos((current) => {
      const next = [...current];
      next[slotIndex] = null;
      return next;
    });
  };

  return (
    <section className="photo-wedding-studio" aria-labelledby="your-photos-title">
      <div className="photo-studio-heading">
        <div>
          <p className="photo-studio-eyebrow">PERSONALISE YOUR VIDEO</p>
          <h2 id="your-photos-title">Your Photos</h2>
          <p>Add your own pictures to the frames in this template. Your preview updates as you upload.</p>
        </div>
        <span className="photo-count">{photoCount} / {MAX_PHOTOS} added</span>
      </div>

      <div className="photo-studio-layout">
        <div className="photo-upload-panel">
          <div className="photo-slot-grid">
            {PHOTO_SLOTS.map((label, index) => (
              <div className="photo-upload-slot" key={label}>
                <input
                  ref={(node) => { inputRefs.current[index] = node; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleFiles(event, index)}
                  aria-label={"Upload " + label}
                  hidden
                />
                {photos[index] ? (
                  <div className="photo-slot-filled">
                    <img src={photos[index]} alt={label} />
                    <span>{label}</span>
                    <div className="photo-slot-actions">
                      <button type="button" onClick={() => inputRefs.current[index]?.click()}>Replace</button>
                      <button type="button" onClick={() => removePhoto(index)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="photo-slot-empty"
                    type="button"
                    onClick={() => inputRefs.current[index]?.click()}
                  >
                    <span className="photo-slot-plus" aria-hidden="true">+</span>
                    <strong>{label}</strong>
                    <small>Add your photo</small>
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="photo-upload-help">JPG, PNG, WebP · Maximum 10 MB per photo · Up to 6 photos</p>
          {error && <p className="photo-upload-error" role="alert">{error}</p>}
        </div>

        <div className="photo-live-preview">
          <div className="photo-preview-heading">
            <strong>Live video preview</strong>
            <span>9:16 · 30 seconds</span>
          </div>
          <div className="photo-player-frame">
            <Player
              component={PhotoWeddingMotionPreview}
              inputProps={{ template, photos }}
              durationInFrames={DURATION_FRAMES}
              compositionWidth={540}
              compositionHeight={960}
              fps={FPS}
              loop
              autoPlay
              controls
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          {!canPreview && <p className="photo-preview-hint">Upload a photo to see your own image in the video.</p>}
        </div>
      </div>
    </section>
  );
}
