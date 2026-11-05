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

export function PhotoWeddingMotionPreview({ template, photos = [] }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const sceneFrame = frame % 150;
  const title = template.previewTitle || "Our Wedding";
  const subtitle = template.previewSubtitle || "A story made for two";
  const accent = template.colors?.accent || "#d8bd88";
  const light = ["photo-polaroid", "photo-editorial", "photo-gallery"].includes(template.styleId);
  const photo = (index) => photos[index] || null;
  const sceneTitles = [
    title,
    "The moments we treasure",
    "Two hearts, one journey",
    "A day to remember",
    "Forever begins here",
    "With love, always",
  ];

  const positions = useMemo(() => {
    switch (template.styleId) {
      case "photo-polaroid":
        return [
          { left: "10%", top: "14%", width: "42%", height: "31%", transform: "rotate(-7deg)" },
          { left: "51%", top: "18%", width: "38%", height: "29%", transform: "rotate(6deg)" },
          { left: "27%", top: "49%", width: "48%", height: "34%", transform: "rotate(-2deg)" },
        ];
      case "photo-cinematic":
        return [
          { left: "7%", top: "10%", width: "86%", height: "59%" },
          { left: "10%", top: "68%", width: "25%", height: "17%" },
          { left: "38%", top: "68%", width: "25%", height: "17%" },
          { left: "66%", top: "68%", width: "25%", height: "17%" },
        ];
      case "photo-album":
        return [
          { left: "7%", top: "14%", width: "41%", height: "32%" },
          { left: "52%", top: "14%", width: "41%", height: "32%" },
          { left: "7%", top: "51%", width: "41%", height: "32%" },
          { left: "52%", top: "51%", width: "41%", height: "32%" },
        ];
      case "photo-editorial":
        return [
          { left: "13%", top: "10%", width: "74%", height: "52%" },
          { left: "7%", top: "64%", width: "27%", height: "18%" },
          { left: "37%", top: "67%", width: "27%", height: "18%" },
          { left: "67%", top: "64%", width: "26%", height: "18%" },
        ];
      case "photo-journey":
        return [
          { left: "8%", top: "12%", width: "56%", height: "32%", transform: "rotate(-3deg)" },
          { left: "36%", top: "39%", width: "56%", height: "32%", transform: "rotate(3deg)" },
          { left: "9%", top: "68%", width: "35%", height: "17%", transform: "rotate(-2deg)" },
        ];
      case "photo-gallery":
        return [
          { left: "8%", top: "14%", width: "25%", height: "29%" },
          { left: "37%", top: "9%", width: "26%", height: "31%" },
          { left: "67%", top: "14%", width: "25%", height: "29%" },
          { left: "8%", top: "51%", width: "25%", height: "29%" },
          { left: "37%", top: "48%", width: "26%", height: "31%" },
          { left: "67%", top: "51%", width: "25%", height: "29%" },
        ];
      case "photo-journal":
        return [
          { left: "10%", top: "11%", width: "80%", height: "38%" },
          { left: "10%", top: "54%", width: "36%", height: "27%", transform: "rotate(-3deg)" },
          { left: "54%", top: "54%", width: "36%", height: "27%", transform: "rotate(3deg)" },
        ];
      case "photo-golden":
      default:
        return [
          { left: "10%", top: "13%", width: "80%", height: "47%" },
          { left: "8%", top: "62%", width: "38%", height: "23%" },
          { left: "54%", top: "62%", width: "38%", height: "23%" },
        ];
    }
  }, [template.styleId]);

  const titleOpacity = interpolate(sceneFrame, [0, 20, 125, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sceneFade = interpolate(sceneFrame, [0, 14, 136, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const frameType =
    template.styleId === "photo-polaroid" ? "polaroid" :
    template.styleId === "photo-gallery" ? "gallery" :
    template.styleId === "photo-journal" ? "journal" :
    template.styleId === "photo-golden" ? "golden" :
    "standard";

  return (
    <AbsoluteFill
      style={{
        background: light ? "#eee7d9" : template.colors?.background || "#171820",
        color: light ? "#30271f" : template.colors?.ink || "#fff8ec",
        fontFamily: "Georgia,serif",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: sceneFade,
          background:
            template.styleId === "photo-cinematic"
              ? "radial-gradient(ellipse at 50% 35%, rgba(216,189,136,.3), transparent 58%)"
              : template.styleId === "photo-gallery"
                ? "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.24), transparent 68%)"
                : "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.10), transparent 65%)",
        }}
      />
      {positions.map((position, index) => {
        const photoIndex = (index + scene * positions.length) % MAX_PHOTOS;
        const previousIndex = (index + (scene - 1) * positions.length + MAX_PHOTOS) % MAX_PHOTOS;
        return (
          <PhotoFrame
            key={index}
            src={photo(photoIndex)}
            previousSrc={scene > 0 ? photo(previousIndex) : null}
            label={PHOTO_SLOTS[photoIndex]}
            frameType={frameType}
            sceneFrame={sceneFrame}
            style={position}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          bottom: "5%",
          textAlign: "center",
          opacity: titleOpacity,
          transform: "translateY(" + ((1 - titleOpacity) * 16) + "px)",
          textShadow: light ? "none" : "0 3px 24px rgba(0,0,0,.55)",
          zIndex: 10,
        }}
      >
        <div style={{ color: accent, fontFamily: "Arial,sans-serif", fontSize: 11, letterSpacing: 4, marginBottom: 10 }}>
          {template.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 35, lineHeight: 1.12 }}>{sceneTitles[scene]}</div>
        <div style={{ fontSize: 16, fontStyle: "italic", marginTop: 9, opacity: .82 }}>{subtitle}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: "4%",
          left: "8%",
          right: "8%",
          height: 1,
          background: accent,
          opacity: .65,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: "Arial,sans-serif",
          fontSize: 9,
          letterSpacing: 4,
          color: accent,
        }}
      >
        {String(Math.min(100, Math.round((frame / (DURATION_FRAMES - 1)) * 100))).padStart(2, "0")} · OUR WEDDING FILM
      </div>
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
