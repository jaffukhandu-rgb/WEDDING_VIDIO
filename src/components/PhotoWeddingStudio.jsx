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

function PhotoFrame({ src, index, style, label }) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [index * 18, index * 18 + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        background: "rgba(255,255,255,.12)",
        border: "5px solid rgba(255,250,240,.92)",
        boxShadow: "0 18px 48px rgba(0,0,0,.28)",
        opacity: reveal,
        transform: (style.transform || "") + " translateY(" + ((1 - reveal) * 34) + "px) scale(" + (.94 + reveal * .06) + ")",
        ...style,
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,.76)",
            fontFamily: "Georgia,serif",
            fontSize: 17,
            textAlign: "center",
            padding: 12,
            boxSizing: "border-box",
            background: "linear-gradient(145deg, rgba(255,255,255,.16), rgba(0,0,0,.18))",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function PhotoWeddingMotionPreview({ template, photos = [] }) {
  const frame = useCurrentFrame();
  const scene = Math.floor(frame / 150);
  const progress = (frame % 150) / 150;
  const names = template.previewTitle || "Our Wedding";
  const subtitle = template.previewSubtitle || "A story made for two";
  const accent = template.colors?.accent || "#d8bd88";
  const light = template.styleId === "photo-editorial" || template.styleId === "photo-cover";
  const photo = (index) => photos[index] || null;

  const positions = useMemo(() => {
    switch (template.styleId) {
      case "photo-cover":
        return [
          { left: "12%", top: "12%", width: "76%", height: "48%", zIndex: 2 },
          { left: "9%", top: "55%", width: "35%", height: "23%", zIndex: 3 },
          { left: "53%", top: "59%", width: "35%", height: "23%", zIndex: 3 },
        ];
      case "photo-cinematic":
        return [
          { left: "9%", top: "13%", width: "82%", height: "55%" },
          { left: "14%", top: "65%", width: "30%", height: "19%" },
          { left: "56%", top: "65%", width: "30%", height: "19%" },
        ];
      case "photo-album":
        return [
          { left: "8%", top: "16%", width: "39%", height: "31%" },
          { left: "53%", top: "16%", width: "39%", height: "31%" },
          { left: "8%", top: "52%", width: "39%", height: "31%" },
          { left: "53%", top: "52%", width: "39%", height: "31%" },
        ];
      case "photo-editorial":
        return [
          { left: "13%", top: "11%", width: "74%", height: "51%" },
          { left: "8%", top: "62%", width: "27%", height: "19%" },
          { left: "38%", top: "65%", width: "27%", height: "19%" },
          { left: "68%", top: "62%", width: "24%", height: "19%" },
        ];
      case "photo-journey":
        return [
          { left: "10%", top: "13%", width: "57%", height: "34%" },
          { left: "37%", top: "42%", width: "53%", height: "34%" },
          { left: "9%", top: "69%", width: "24%", height: "16%" },
        ];
      case "photo-canvas":
        return [
          { left: "24%", top: "22%", width: "52%", height: "39%", zIndex: 4 },
          { left: "5%", top: "12%", width: "30%", height: "22%", transform: "rotate(-8deg)" },
          { left: "65%", top: "12%", width: "30%", height: "22%", transform: "rotate(8deg)" },
          { left: "8%", top: "61%", width: "29%", height: "22%", transform: "rotate(6deg)" },
          { left: "64%", top: "61%", width: "29%", height: "22%", transform: "rotate(-6deg)" },
        ];
      case "photo-journal":
        return [
          { left: "10%", top: "12%", width: "80%", height: "37%" },
          { left: "12%", top: "53%", width: "35%", height: "27%" },
          { left: "53%", top: "53%", width: "35%", height: "27%" },
        ];
      default:
        return [
          { left: "12%", top: "12%", width: "76%", height: "48%" },
          { left: "8%", top: "58%", width: "39%", height: "25%" },
          { left: "53%", top: "58%", width: "39%", height: "25%" },
        ];
    }
  }, [template.styleId]);

  const titleOpacity = interpolate(frame % 150, [0, 24, 118, 149], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const title = scene === 0 ? "A story made for two" : scene === 4 ? "Forever begins here" : names;

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
          background: template.styleId === "photo-cinematic"
            ? "radial-gradient(ellipse at 50% 35%, rgba(216,189,136,.24), transparent 58%)"
            : "radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.10), transparent 65%)",
        }}
      />
      {positions.map((position, index) => (
        <PhotoFrame
          key={index}
          src={photo(index)}
          index={index}
          label={PHOTO_SLOTS[index]}
          style={{
            ...position,
            top: position.top,
            transform: (position.transform || "") + " translateY(" + (Math.sin((frame / 35) + index) * 3) + "px)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          bottom: "5%",
          textAlign: "center",
          opacity: titleOpacity,
          textShadow: light ? "none" : "0 3px 24px rgba(0,0,0,.55)",
          zIndex: 10,
        }}
      >
        <div style={{ color: accent, fontFamily: "Arial,sans-serif", fontSize: 11, letterSpacing: 4, marginBottom: 10 }}>
          {template.name.toUpperCase()}
        </div>
        <div style={{ fontSize: 35, lineHeight: 1.12 }}>{title}</div>
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
    if (!file.type.startsWith("image/")) {
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
                  accept="image/*"
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
