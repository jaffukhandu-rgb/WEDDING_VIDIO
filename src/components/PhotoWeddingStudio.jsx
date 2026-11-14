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

  if (styleId === "indian-typewriter") {
    return (
      <>
        <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(118,75,38,.55)", boxShadow: "inset 0 0 0 7px rgba(255,248,226,.32)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "9%", left: "12%", right: "12%", height: "1px", background: accent }} />
        <div style={{ position: "absolute", top: "11%", left: 0, right: 0, textAlign: "center", color: accent, font: "italic 10px Georgia,serif", letterSpacing: 3 }}>AN INVITATION</div>
        <div style={{ position: "absolute", bottom: "13%", left: "15%", right: "15%", height: "21%", borderRadius: "5px 5px 2px 2px", background: "linear-gradient(90deg,#47382c,#88735a 12%,#d7c6a5 20%,#c6b28e 80%,#74604a)", boxShadow: "0 13px 25px rgba(54,35,20,.32)" }}>
          <div style={{ position: "absolute", top: "10%", left: "12%", right: "12%", height: "30%", borderRadius: 4, background: "linear-gradient(90deg,#4b4238,#29241f)" }} />
          <div style={{ position: "absolute", bottom: "12%", left: "18%", right: "18%", height: "30%", borderRadius: 8, background: "repeating-linear-gradient(90deg,#b89a6d 0 4px,#40372d 4px 7px)" }} />
        </div>
        <div style={{ position: "absolute", bottom: "8%", left: "45%", width: "10%", height: "4%", borderRadius: "50%", background: "#a44735", boxShadow: "0 0 0 3px rgba(164,71,53,.22)" }} />
      </>
    );
  }

  if (styleId === "indian-royal-mandap") {
    return (
      <>
        <div style={{ position: "absolute", top: "10%", left: "12%", right: "12%", bottom: "9%", border: "3px double " + accent, borderRadius: "48% 48% 3% 3%", boxShadow: "inset 0 0 0 8px rgba(229,189,114,.12), 0 0 28px rgba(229,189,114,.15)" }} />
        <div style={{ position: "absolute", top: "14%", left: "18%", right: "18%", height: "22%", border: "2px solid " + accent, borderRadius: "50% 50% 0 0", borderBottom: 0 }} />
        {[0,1,2,3,4,5,6].map((item) => <span key={item} style={{ position: "absolute", top: "10%", left: (18 + item * 10) + "%", width: 7, height: 16, borderRadius: "50%", background: item % 2 ? "#d94f35" : "#f0c56d", boxShadow: "0 0 12px rgba(240,197,109,.45)" }} />)}
        {[0,1,2,3].map((item) => <span key={item} style={{ position: "absolute", bottom: "9%", left: (20 + item * 20) + "%", width: 15, height: 26, borderRadius: "50% 50% 35% 35%", background: "radial-gradient(circle at 50% 20%,#fff0bd,#d98b32 65%,#8a351c)", boxShadow: "0 0 20px rgba(240,177,77,.5)" }} />)}
      </>
    );
  }

  if (styleId === "indian-mehndi-floral") {
    return (
      <>
        <div style={{ position: "absolute", inset: "5%", border: "2px solid " + accent, borderRadius: "45% 45% 8px 8px", boxShadow: "inset 0 0 0 6px rgba(255,220,150,.12)" }} />
        <div style={{ position: "absolute", top: "6%", left: "10%", right: "10%", height: "16%", borderRadius: "50%", borderTop: "3px solid #e4ad4d" }} />
        {[0,1,2,3,4,5,6,7,8].map((item) => <span key={item} style={{ position: "absolute", top: (9 + Math.sin(item / 8 * Math.PI) * 8) + "%", left: (8 + item * 10.5) + "%", width: 11, height: 17, borderRadius: "80% 0 80% 0", transform: "rotate(" + (item % 2 ? 35 : -35) + "deg)", background: item % 3 ? "#d9a94f" : "#d65b42", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }} />)}
        <div style={{ position: "absolute", bottom: "8%", left: "12%", right: "12%", height: "1px", background: accent }} />
      </>
    );
  }

  if (styleId === "indian-rose-arch") {
    return (
      <>
        <div style={{ position: "absolute", top: "9%", left: "12%", right: "12%", bottom: "8%", border: "3px solid " + accent, borderRadius: "50% 50% 0 0", boxShadow: "0 0 0 7px rgba(224,182,110,.12), inset 0 0 28px rgba(224,182,110,.12)" }} />
        {[0,1,2,3,4,5,6,7,8,9,10,11].map((item) => <span key={item} style={{ position: "absolute", top: (10 + Math.sin(item / 11 * Math.PI) * 8) + "%", left: (10 + item * 7.2) + "%", width: 17, height: 17, borderRadius: "50% 50% 45% 45%", background: "radial-gradient(circle at 35% 30%,#ffb0a4,#a91d39 68%,#5c1024)", boxShadow: "0 2px 9px rgba(0,0,0,.35)" }} />)}
        <div style={{ position: "absolute", top: "33%", left: "38%", width: "24%", aspectRatio: "1", display: "grid", placeItems: "center", border: "1px solid " + accent, borderRadius: "50%", color: accent, font: "italic 25px Georgia,serif", background: "rgba(32,7,15,.72)" }}>A ♥ R</div>
        <div style={{ position: "absolute", bottom: "10%", left: "10%", right: "10%", height: "1px", background: accent }} />
      </>
    );
  }

  if (styleId === "indian-rustic-save-date") {
    return (
      <>
        <div style={{ position: "absolute", inset: "7%", border: "8px solid #69452b", boxShadow: "inset 0 0 0 2px #d2b47c, inset 0 0 0 7px rgba(63,39,22,.4), 0 0 0 1px #d2b47c", background: "repeating-linear-gradient(3deg,rgba(255,255,255,.025) 0 3px,rgba(0,0,0,.04) 3px 6px)" }} />
        <div style={{ position: "absolute", top: "18%", left: "15%", right: "15%", height: "1px", background: accent }} />
        <div style={{ position: "absolute", top: "20%", left: 0, right: 0, textAlign: "center", color: accent, font: "italic 11px Georgia,serif", letterSpacing: 2 }}>TOGETHER WITH THEIR FAMILIES</div>
        {[0,1,2,3,4,5].map((item) => <span key={item} style={{ position: "absolute", top: (25 + item * 7) + "%", left: item % 2 ? "12%" : "84%", width: 9, height: 15, borderRadius: "90% 0 90% 0", transform: "rotate(" + (item % 2 ? 35 : -35) + "deg)", background: "#82906a" }} />)}
        <div style={{ position: "absolute", bottom: "13%", left: "20%", right: "20%", height: "1px", background: accent }} />
      </>
    );
  }

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
    case "indian-typewriter":
      return [
        { left: "12%", top: "15%", width: "76%", height: "48%" },
        { left: "20%", top: "66%", width: "60%", height: "17%", transform: "rotate(-2deg)" },
      ];
    case "indian-royal-mandap":
      return [
        { left: "15%", top: "20%", width: "70%", height: "43%" },
        { left: "8%", top: "65%", width: "36%", height: "19%", transform: "rotate(-3deg)" },
        { left: "56%", top: "65%", width: "36%", height: "19%", transform: "rotate(3deg)" },
      ];
    case "indian-mehndi-floral":
      return [
        { left: "23%", top: "21%", width: "54%", height: "38%" },
        { left: "7%", top: "57%", width: "32%", height: "23%", transform: "rotate(-5deg)" },
        { left: "61%", top: "57%", width: "32%", height: "23%", transform: "rotate(5deg)" },
      ];
    case "indian-rose-arch":
      return [
        { left: "18%", top: "18%", width: "64%", height: "52%" },
        { left: "8%", top: "68%", width: "27%", height: "16%", transform: "rotate(-4deg)" },
        { left: "65%", top: "68%", width: "27%", height: "16%", transform: "rotate(4deg)" },
      ];
    case "indian-rustic-save-date":
      return [
        { left: "14%", top: "19%", width: "72%", height: "48%" },
        { left: "24%", top: "69%", width: "52%", height: "15%", transform: "rotate(-1deg)" },
      ];
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

function scenePhoto(photos, slot, scene) {
  const available = photos.filter(Boolean);
  return available.length ? available[(slot + scene * 2) % available.length] : null;
}

function AnimatedPhotoPanel({ src, caption, style, frame, delay = 0, polaroid = false }) {
  const reveal = interpolate(frame, [delay, delay + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: polaroid ? "8px 8px 30px" : 7,
        background: polaroid ? "#fffaf1" : "#f8f3e9",
        border: "1px solid rgba(255,255,255,.7)",
        boxShadow: "0 18px 42px rgba(28,20,12,.25)",
        opacity: reveal,
        ...style,
        transform: (style.transform || "") +
          " translateY(" + ((1 - reveal) * 34) + "px) scale(" + (.96 + reveal * .04) + ")",
      }}
    >
      {src ? (
        <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "grid", placeItems: "center",
          background: "linear-gradient(145deg,#cbb99d,#8d765c)", color: "#fff8ed",
          font: "italic 13px Georgia,serif", textAlign: "center", padding: 10,
          boxSizing: "border-box",
        }}>
          Add your photo
        </div>
      )}
      {caption && (
        <span style={{
          position: "absolute", left: 5, right: 5, bottom: polaroid ? 7 : 9,
          color: "#66513a", textAlign: "center", font: "italic 10px Georgia,serif",
        }}>{caption}</span>
      )}
    </div>
  );
}

function PhotoStoryHeading({ template, scene, light = false }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame % 150, [0, 18, 128, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chapterTitles = [
    template.previewTitle || "Our Wedding",
    "The moments we treasure",
    "A story made for two",
    "Every little forever",
    "The day we dreamed of",
    "With love, always",
  ];
  return (
    <div style={{
      position: "absolute", zIndex: 20, left: "8%", right: "8%", bottom: "6%",
      textAlign: "center", color: light ? "#3a3025" : "#fff8ed", opacity,
      textShadow: light ? "none" : "0 3px 20px rgba(0,0,0,.45)",
    }}>
      <div style={{ color: template.colors?.accent || "#d8bd88", font: "700 9px Arial,sans-serif", letterSpacing: 3, marginBottom: 8 }}>
        {template.name.toUpperCase()} · {String(scene + 1).padStart(2, "0")} / 06
      </div>
      <div style={{ font: "34px/1.05 Georgia,serif" }}>{chapterTitles[scene]}</div>
      <div style={{ marginTop: 7, font: "italic 13px Georgia,serif", opacity: .82 }}>
        {template.previewSubtitle || "A story made for two"}
      </div>
    </div>
  );
}

function PolaroidMemoryComposition({ template, photos }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const phase = frame % 150;
  const drift = Math.sin(phase / 24) * 5;
  const positions = [
    { left: "7%", top: "14%", width: "43%", height: "31%", transform: "rotate(-8deg)" },
    { left: "53%", top: "12%", width: "39%", height: "30%", transform: "rotate(6deg)" },
    { left: "12%", top: "51%", width: "37%", height: "29%", transform: "rotate(4deg)" },
    { left: "52%", top: "47%", width: "40%", height: "34%", transform: "rotate(-5deg)" },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(145deg,#eee4d3,#c8b79d)", color: "#3d3024", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "4%", border: "1px solid rgba(125,93,58,.42)", boxShadow: "inset 0 0 0 7px rgba(255,250,239,.28)" }} />
      <div style={{ position: "absolute", top: "7%", left: "10%", color: "#8b6b45", font: "700 9px Arial,sans-serif", letterSpacing: 4 }}>OUR LITTLE SCRAPBOOK</div>
      {positions.map((position, index) => (
        <AnimatedPhotoPanel
          key={index}
          src={scenePhoto(photos, index, scene)}
          caption={["our beginning ♡", "the best day", "together", "forever & always"][index]}
          frame={phase}
          delay={index * 9}
          polaroid
          style={{ ...position, transform: position.transform + " translateY(" + drift + "px)" }}
        />
      ))}
      <div style={{ position: "absolute", top: "43%", left: "43%", width: "18%", height: "7%", background: "rgba(250,239,218,.8)", transform: "rotate(-7deg)", boxShadow: "0 2px 8px rgba(0,0,0,.08)" }} />
      <PhotoStoryHeading template={template} scene={scene} light />
      <div style={{ position: "absolute", top: "8%", right: "10%", color: "#8b6b45", font: "italic 11px Georgia,serif" }}>handmade with love</div>
    </AbsoluteFill>
  );
}

function CinematicLoveComposition({ template, photos }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const phase = frame % 150;
  const pan = interpolate(phase, [0, 149], [0, -5]);
  const strip = [0, 1, 2, 3].map((item) => scenePhoto(photos, item + 1, scene));
  return (
    <AbsoluteFill style={{ background: "#080d15", color: "#fff8ed", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "10%", background: "#05070a", zIndex: 8 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "13%", background: "#05070a", zIndex: 8 }} />
      <div style={{ position: "absolute", top: "10%", left: "5%", width: "90%", height: "61%", overflow: "hidden", border: "1px solid rgba(218,190,139,.6)", boxShadow: "0 18px 55px rgba(0,0,0,.5)" }}>
        {scenePhoto(photos, 0, scene) ? (
          <Img src={scenePhoto(photos, 0, scene)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + (1.08 + phase / 1500) + ") translateX(" + pan + "%)" }} />
        ) : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#d8bd8b", font: "italic 18px Georgia,serif" }}>Your hero photograph</div>}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(0,0,0,.42),transparent 58%)" }} />
      </div>
      <div style={{ position: "absolute", top: "3.5%", left: 0, right: 0, textAlign: "center", color: "#d8bd8b", font: "700 8px Arial,sans-serif", letterSpacing: 5 }}>A LOVE STORY IN FRAMES</div>
      <div style={{ position: "absolute", top: "74%", left: "5%", right: "5%", height: "12%", display: "flex", gap: 7 }}>
        {strip.map((src, index) => (
          <div key={index} style={{ flex: 1, overflow: "hidden", border: "2px solid #d8bd8b", background: "#26303a", transform: "translateY(" + (Math.sin(phase / 20 + index) * 3) + "px)" }}>
            {src ? <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: "9%", left: 0, right: 0, height: 5, zIndex: 10, background: "repeating-linear-gradient(90deg,#e9e0d0 0 11px,transparent 11px 23px)" }} />
      <div style={{ position: "absolute", bottom: "12%", left: 0, right: 0, height: 5, zIndex: 10, background: "repeating-linear-gradient(90deg,#e9e0d0 0 11px,transparent 11px 23px)" }} />
      <PhotoStoryHeading template={template} scene={scene} />
    </AbsoluteFill>
  );
}

function ForeverAlbumComposition({ template, photos }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const phase = frame % 150;
  const pageReveal = interpolate(phase, [0, 28], [82, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center,#d5c2a2,#9b8060)", overflow: "hidden", perspective: 1200 }}>
      <div style={{ position: "absolute", left: "4%", right: "4%", top: "13%", bottom: "16%", display: "flex", borderRadius: 8, background: "#f7efdf", boxShadow: "0 24px 65px rgba(37,24,13,.4)", overflow: "hidden" }}>
        <div style={{ flex: 1, position: "relative", padding: "7% 5%", background: "linear-gradient(90deg,#f3ead8,#fffaf0)" }}>
          <div style={{ position: "absolute", inset: "5%", border: "1px solid #d6c4a5" }} />
          {scenePhoto(photos, 0, scene) ? <Img src={scenePhoto(photos, 0, scene)} style={{ position: "relative", width: "100%", height: "58%", objectFit: "cover", boxShadow: "0 7px 18px rgba(0,0,0,.16)" }} /> : <div style={{ height: "58%", background: "#d8c9ae", display: "grid", placeItems: "center", color: "#80694b" }}>Your favourite photo</div>}
          <div style={{ marginTop: 12, color: "#80694b", textAlign: "center", font: "italic 13px Georgia,serif" }}>the beginning of forever</div>
          <div style={{ margin: "12px auto 0", width: "65%", height: 2, background: "#d9c7a7" }} />
        </div>
        <div style={{ width: 8, background: "linear-gradient(90deg,#bba27e,#fff7e7,#bba27e)", boxShadow: "0 0 15px rgba(60,42,22,.25)" }} />
        <div style={{ flex: 1, position: "relative", padding: "7% 5%", background: "linear-gradient(90deg,#fffaf0,#f1e5d0)" }}>
          <div style={{ position: "absolute", inset: "5%", border: "1px solid #d6c4a5" }} />
          {scenePhoto(photos, 1, scene) ? <Img src={scenePhoto(photos, 1, scene)} style={{ position: "relative", width: "100%", height: "42%", objectFit: "cover", boxShadow: "0 7px 18px rgba(0,0,0,.16)" }} /> : <div style={{ height: "42%", background: "#d8c9ae", display: "grid", placeItems: "center", color: "#80694b" }}>Your memory</div>}
          {scenePhoto(photos, 2, scene) ? <Img src={scenePhoto(photos, 2, scene)} style={{ position: "relative", width: "72%", height: "27%", objectFit: "cover", margin: "8% 0 0 13%", border: "5px solid #fffaf0", boxShadow: "0 5px 14px rgba(0,0,0,.14)" }} /> : null}
          <div style={{ position: "absolute", bottom: "8%", left: "10%", right: "10%", textAlign: "center", color: "#80694b", font: "italic 12px Georgia,serif" }}>a lifetime in little moments</div>
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: "50%", background: "rgba(236,222,198,.96)", transformOrigin: "left center", transform: "rotateY(" + pageReveal + "deg)", backfaceVisibility: "hidden", boxShadow: "-8px 0 22px rgba(50,35,18,.16)" }} />
      </div>
      <div style={{ position: "absolute", top: "6%", left: 0, right: 0, textAlign: "center", color: "#fff4df", font: "italic 13px Georgia,serif", letterSpacing: 2 }}>OUR WEDDING ALBUM</div>
      <PhotoStoryHeading template={template} scene={scene} light />
    </AbsoluteFill>
  );
}

function EditorialRomanceComposition({ template, photos }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const phase = frame % 150;
  const slide = interpolate(phase, [0, 30], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "#eee8dc", color: "#292720", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "5%", left: "8%", right: "8%", height: 1, background: "#9c805b" }} />
      <div style={{ position: "absolute", top: "7%", left: "8%", color: "#8c704f", font: "700 8px Arial,sans-serif", letterSpacing: 4 }}>THE WEDDING EDITION</div>
      <div style={{ position: "absolute", top: "7%", right: "8%", color: "#8c704f", font: "italic 10px Georgia,serif" }}>VOL. 01 · 2026</div>
      <div style={{ position: "absolute", top: "16%", left: "8%", width: "57%", height: "55%", overflow: "hidden", background: "#c9bba6", transform: "translateY(" + slide + "px)" }}>
        {scenePhoto(photos, 0, scene) ? <Img src={scenePhoto(photos, 0, scene)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#fff" }}>Your portrait</div>}
      </div>
      <div style={{ position: "absolute", top: "19%", right: "8%", width: "24%", color: "#302b24" }}>
        <div style={{ font: "italic 30px/1 Georgia,serif", writingMode: "vertical-rl", transform: "rotate(180deg)", height: 230 }}>A LOVE STORY</div>
        <div style={{ marginTop: 12, color: "#8b704e", font: "700 8px Arial,sans-serif", letterSpacing: 2 }}>THE TWO OF US</div>
      </div>
      <div style={{ position: "absolute", top: "74%", left: "8%", right: "8%", display: "flex", gap: 12, height: "13%" }}>
        {[1, 2].map((slot) => (
          <div key={slot} style={{ flex: 1, overflow: "hidden", border: "5px solid #fffaf0", boxShadow: "0 5px 15px rgba(0,0,0,.12)" }}>
            {scenePhoto(photos, slot, scene) ? <Img src={scenePhoto(photos, slot, scene)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
          </div>
        ))}
        <div style={{ flex: 1, alignSelf: "center", color: "#8b704e", font: "italic 11px/1.5 Georgia,serif" }}>An elegant collection of moments, made timeless.</div>
      </div>
      <PhotoStoryHeading template={template} scene={scene} light />
    </AbsoluteFill>
  );
}

function OurJourneyComposition({ template, photos }) {
  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const phase = frame % 150;
  const lineProgress = interpolate(phase, [0, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cards = [
    { left: "12%", top: "17%", width: "58%", height: "21%", rotate: "-3deg" },
    { left: "30%", top: "42%", width: "58%", height: "21%", rotate: "3deg" },
    { left: "12%", top: "67%", width: "58%", height: "19%", rotate: "-2deg" },
  ];
  return (
    <AbsoluteFill style={{ background: "linear-gradient(145deg,#e4e8dc,#b9c6b8)", color: "#314139", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "13%", bottom: "14%", left: "17%", width: 2, background: "#8b9c83", opacity: lineProgress }} />
      {[0, 1, 2, 3, 4, 5].map((node) => (
        <span key={node} style={{ position: "absolute", left: "calc(17% - 5px)", top: (17 + node * 13) + "%", width: 12, height: 12, borderRadius: "50%", background: "#f7f1e4", border: "2px solid #718a75", opacity: lineProgress }} />
      ))}
      {cards.map((card, index) => (
        <AnimatedPhotoPanel
          key={index}
          src={scenePhoto(photos, index, scene)}
          caption={["where it began", "the days we cherish", "our forever"][index]}
          frame={phase}
          delay={index * 16}
          style={{
            ...card,
            transform: "rotate(" + card.rotate + ") translateX(" + ((1 - lineProgress) * (index % 2 ? 24 : -24)) + "px)",
          }}
        />
      ))}
      <div style={{ position: "absolute", top: "8%", right: "8%", color: "#617b67", font: "italic 11px Georgia,serif", letterSpacing: 2 }}>CHAPTER {scene + 1} / 6</div>
      <PhotoStoryHeading template={template} scene={scene} light />
    </AbsoluteFill>
  );
}

export function PhotoWeddingMotionPreview({ template, photos = [] }) {
  const styleId = template.styleId;
  if (styleId === "photo-polaroid") return <PolaroidMemoryComposition template={template} photos={photos} />;
  if (styleId === "photo-cinematic") return <CinematicLoveComposition template={template} photos={photos} />;
  if (styleId === "photo-album") return <ForeverAlbumComposition template={template} photos={photos} />;
  if (styleId === "photo-editorial") return <EditorialRomanceComposition template={template} photos={photos} />;
  if (styleId === "photo-journey") return <OurJourneyComposition template={template} photos={photos} />;

  const frame = useCurrentFrame();
  const scene = Math.min(5, Math.floor(frame / 150));
  const sceneFrame = frame % 150;
  const title = template.previewTitle || "Our Wedding";
  const subtitle = template.previewSubtitle || "A story made for two";
  const accent = template.colors?.accent || "#d8bd88";
  const light = ["photo-gallery", "photo-journal"].includes(styleId);
  const layouts = useMemo(() => getPhotoLayout(styleId), [styleId]);
  const uploadedPhotos = photos.filter(Boolean);
  const photoFor = (slotIndex, sceneIndex) =>
    uploadedPhotos.length ? uploadedPhotos[(slotIndex + sceneIndex * layouts.length) % uploadedPhotos.length] : null;
  const titleOpacity = interpolate(sceneFrame, [0, 18, 125, 149], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const backgroundByStyle = {
    "photo-gallery": "linear-gradient(145deg,#e4e1d8,#c9c5b9)",
    "photo-journal": "repeating-linear-gradient(0deg,#d8c8a9 0 2px,#d2c09d 2px 4px)",
    "photo-golden": "linear-gradient(145deg,#241b13,#6c4b25 58%,#17130f)",
  };
  return (
    <AbsoluteFill style={{
      background: backgroundByStyle[styleId] || "#e8dece",
      color: light ? "#30271f" : template.colors?.ink || "#fff8ec",
      fontFamily: "Georgia,serif",
      overflow: "hidden",
    }}>
      <PhotoStyleDecor styleId={styleId} accent={accent} sceneFrame={sceneFrame} scene={scene} />
      {layouts.map((position, index) => (
        <AnimatedPhotoPanel
          key={index}
          src={photoFor(index, scene)}
          caption={PHOTO_SLOTS[index % MAX_PHOTOS]}
          frame={sceneFrame}
          delay={index * 7}
          style={position}
        />
      ))}
      <div style={{
        position: "absolute", zIndex: 10, left: "7%", right: "7%", bottom: "7%",
        textAlign: "center", opacity: titleOpacity,
        textShadow: light ? "none" : "0 3px 24px rgba(0,0,0,.55)",
      }}>
        <div style={{ color: accent, font: "700 10px Arial,sans-serif", letterSpacing: 3, marginBottom: 8 }}>{template.name.toUpperCase()}</div>
        <div style={{ fontSize: 31, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 14, fontStyle: "italic", marginTop: 8, opacity: .82 }}>{subtitle}</div>
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
