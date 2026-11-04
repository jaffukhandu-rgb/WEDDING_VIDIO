import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

const SEGMENT_FRAMES = 150;
const TOTAL_SCENES = 6;

const SCENES = [
  {
    eyebrow: "A BEAUTIFUL CELEBRATION",
    title: "preview",
    subtitle: "previewSubtitle",
    note: "AN INVITATION TO CELEBRATE",
  },
  {
    eyebrow: "TWO FAMILIES · ONE STORY",
    title: "A & R",
    subtitle: "Together, forever",
    note: "A NEW CHAPTER BEGINS",
  },
  {
    eyebrow: "SAVE THE DATE",
    title: "YOUR WEDDING DATE",
    subtitle: "A day to remember",
    note: "DATE · TIME · CELEBRATION",
  },
  {
    eyebrow: "TOGETHER WITH THEIR FAMILIES",
    title: "THE WEDDING INVITATION",
    subtitle: "Request the pleasure of your company",
    note: "YOU ARE CORDIALLY INVITED",
  },
  {
    eyebrow: "THE CELEBRATION",
    title: "YOUR VENUE",
    subtitle: "Venue and location details",
    note: "WE LOOK FORWARD TO WELCOMING YOU",
  },
  {
    eyebrow: "WITH LOVE",
    title: "WE CAN'T WAIT TO CELEBRATE",
    subtitle: "Your presence will make our day complete",
    note: "A & R · FOREVER STARTS HERE",
  },
];

const clamp = (value, input, output) =>
  interpolate(value, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

function SceneTypography({
  scene,
  template,
  opacity,
  translateY,
  color,
  accent,
  isLight,
}) {
  const title =
    scene.title === "preview" ? template.previewTitle : scene.title;
  const subtitle =
    scene.subtitle === "previewSubtitle"
      ? template.previewSubtitle
      : scene.subtitle;
  const titleSize =
    title.length > 23 ? 43 : title.length > 16 ? 51 : 65;

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 30,
        top: "37%",
        left: "8%",
        right: "8%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 19,
        color,
        textAlign: "center",
        opacity,
        transform: "translateY(" + translateY + "px)",
      }}
    >
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 5,
          lineHeight: 1.7,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {scene.eyebrow}
      </div>
      <div
        style={{
          width: 74,
          height: 1,
          background: accent,
          boxShadow: "0 0 18px " + accent,
        }}
      />
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: titleSize,
          fontWeight: 500,
          lineHeight: 1.06,
          letterSpacing: "-.035em",
          textShadow: isLight ? "none" : "0 5px 30px rgba(0,0,0,.22)",
          maxWidth: "100%",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 23,
          fontStyle: "italic",
          lineHeight: 1.4,
          color: isLight ? "#71634f" : "rgba(255,248,235,.86)",
          maxWidth: "92%",
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          marginTop: 2,
          fontFamily: "Arial, sans-serif",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 3,
          lineHeight: 1.6,
          color: isLight ? "#8e7a5f" : "rgba(255,244,220,.68)",
        }}
      >
        {scene.note}
      </div>
    </div>
  );
}

function RoyalArchitecture({ scene, progress, accent }) {
  const doorOpen = clamp(progress, [0.05, 0.8], [0, 1]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: "5% 6%",
          border: "1px solid " + accent,
          borderRadius: "48% 48% 5px 5px",
          boxShadow: "inset 0 0 0 7px rgba(220,185,119,.055), 0 0 55px rgba(205,158,86,.12)",
        }}
      />
      <svg
        viewBox="0 0 540 600"
        style={{ position: "absolute", inset: "13% 0 0", width: "100%", height: "82%" }}
      >
        <path d="M22 560V250h74v310M444 560V250h74v310" fill="#3d1d2a" stroke={accent} strokeWidth="3" />
        <path d="M10 252Q60 125 108 252M432 252Q480 125 530 252" fill="none" stroke={accent} strokeWidth="4" />
        <path d="M90 560V205h360v355" fill="#512737" stroke={accent} strokeWidth="4" />
        <path d="M66 210L270 55l204 155Z" fill="#673548" stroke={accent} strokeWidth="4" />
        <path d="M168 210Q270 65 372 210" fill="none" stroke="#f0d69b" strokeWidth="5" />
        <path d="M195 560V366a75 75 0 0 1 150 0v194" fill="#160d15" stroke={accent} strokeWidth="5" />
        <path d="M215 560V370a55 55 0 0 1 110 0v190" fill="none" stroke="#ba9257" strokeWidth="2" />
        <path d="M270 55V18M246 34h48" stroke="#f2d99f" strokeWidth="4" />
        <g fill="#f4d79d">
          <circle cx="60" cy="310" r="4"/><circle cx="480" cy="310" r="4"/>
          <circle cx="150" cy="260" r="4"/><circle cx="390" cy="260" r="4"/>
          <circle cx="270" cy="145" r="5"/>
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: "8%",
          width: "50%",
          height: "72%",
          background: "linear-gradient(90deg, #180d14, transparent)",
          transform: "translateX(" + doorOpen * -54 + "%)",
          opacity: .84,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: "8%",
          width: "50%",
          height: "72%",
          background: "linear-gradient(270deg, #180d14, transparent)",
          transform: "translateX(" + doorOpen * 54 + "%)",
          opacity: .84,
        }}
      />
    </>
  );
}

function GlassArchitecture({ scene, progress, accent }) {
  const float = Math.sin(progress * Math.PI * 2) * 22;
  return (
    <>
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          style={{
            position: "absolute",
            width: item % 2 ? "66%" : "48%",
            height: item % 2 ? "46%" : "58%",
            left: item % 2 ? "27%" : "-8%",
            top: 13 + item * 15 + "%",
            border: "1px solid rgba(255,255,255,.58)",
            borderRadius: item % 2 ? 42 : "50%",
            background:
              "linear-gradient(140deg, rgba(255,255,255,.38), rgba(255,255,255,.035))",
            boxShadow: "0 25px 75px rgba(8,22,36,.2), inset 0 0 30px rgba(255,255,255,.2)",
            backdropFilter: "blur(20px)",
            transform:
              "rotate(" + (item % 2 ? 8 : -7) + "deg) translateY(" + (float * (item + 1) / 5) + "px)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: "13%",
          right: "15%",
          width: "28%",
          aspectRatio: "1",
          borderRadius: "50%",
          background: "radial-gradient(circle at 28% 25%, #fff, #d8e9e7 65%, #97b7c1)",
          boxShadow: "0 0 55px rgba(255,255,255,.42)",
          opacity: .84,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "12%",
          right: "12%",
          height: 1,
          background: "linear-gradient(90deg, transparent, " + accent + ", transparent)",
        }}
      />
    </>
  );
}

function VintageArchitecture({ scene, progress, accent }) {
  const sealScale = clamp(progress, [0.25, 0.65], [.55, 1]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "7%",
          bottom: "7%",
          left: "9%",
          right: "9%",
          border: "1px solid #9f8057",
          background:
            "repeating-linear-gradient(0deg, rgba(120,83,49,.04) 0 1px, transparent 1px 6px), linear-gradient(135deg,#f4e8cf,#d4bb95)",
          boxShadow: "0 25px 70px rgba(0,0,0,.32), inset 0 0 0 7px rgba(255,255,255,.23)",
          transform: "rotate(" + (1 - progress) * 2 + "deg)",
        }}
      >
        <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(138,102,66,.45)" }} />
        <div style={{ position: "absolute", inset: "8%", border: "1px solid rgba(138,102,66,.18)" }} />
        <div style={{ position: "absolute", top: "12%", left: 0, right: 0, textAlign: "center", fontFamily: "Georgia,serif", color: "#876d4c", fontSize: 12, letterSpacing: 4 }}>THE WEDDING ANNOUNCEMENT</div>
        <div style={{ position: "absolute", top: "23%", left: 0, right: 0, color: "#ac8b61", textAlign: "center", fontSize: 44 }}>❦</div>
        <div style={{ position: "absolute", bottom: "12%", left: "10%", right: "10%", height: 1, background: "#b5966c" }} />
      </div>
      <div
        style={{
          position: "absolute",
          right: "13%",
          bottom: "16%",
          width: 78,
          height: 78,
          display: "grid",
          placeItems: "center",
          border: "4px double #e3c19b",
          borderRadius: "50%",
          color: "#f4d9b8",
          background: "radial-gradient(circle at 30% 25%, #c8755f, #7d3031 70%, #4a2026)",
          boxShadow: "0 12px 30px rgba(57,28,23,.35), inset 0 0 0 5px rgba(255,255,255,.09)",
          transform: "scale(" + sealScale + ") rotate(" + progress * 18 + "deg)",
          fontFamily: "Georgia,serif",
          fontSize: 22,
        }}
      >
        A&R
      </div>
    </>
  );
}

function CinematicArchitecture({ scene, progress, accent }) {
  const lightX = -35 + progress * 140;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "16%",
          width: "21%",
          aspectRatio: "1",
          borderRadius: "50%",
          background: "radial-gradient(circle at 30% 25%, #fff4d5, #b6b3a6 74%, #6c7180)",
          boxShadow: "0 0 80px rgba(255,230,186,.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "2%",
          bottom: "4%",
          left: lightX + "%",
          width: "34%",
          transform: "skewX(-18deg)",
          background: "linear-gradient(90deg, transparent, rgba(231,194,126,.18), transparent)",
          filter: "blur(12px)",
        }}
      />
      <svg viewBox="0 0 540 400" style={{ position: "absolute", bottom: "7%", left: 0, width: "100%", height: "42%" }}>
        <path d="M0 370V200h65v170M475 370V200h65v170M80 370V148h380v222" fill="#101b29" stroke={accent} strokeWidth="2" />
        <path d="M55 150L270 20l215 130Z" fill="#17273a" stroke={accent} strokeWidth="3" />
        <path d="M210 370V255a60 60 0 0 1 120 0v115" fill="#070d17" stroke={accent} strokeWidth="3" />
      </svg>
      {[0,1,2,3,4,5,6].map((item) => (
        <div
          key={item}
          style={{
            position: "absolute",
            top: 0,
            left: 8 + item * 14 + "%",
            width: 2,
            height: 100 + item % 3 * 30,
            background: "linear-gradient(180deg, transparent, " + accent + ")",
            opacity: .6,
          }}
        />
      ))}
    </>
  );
}

function DestinationArchitecture({ scene, progress, accent }) {
  const markerX = 12 + progress * 72;
  return (
    <>
      <svg viewBox="0 0 540 620" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M0 360Q95 285 190 350T380 330T540 340V620H0Z" fill="#7fa6a0" />
        <path d="M0 405Q130 344 230 400T540 395" fill="none" stroke="#e9e0c9" strokeWidth="9" />
        <path d="M0 300L86 160l70 92 82-164 100 163 80-115 122 160v120H0Z" fill="#aab69e" />
        <path d="M0 315L86 160l70 92 82-164 100 163 80-115 122 160" fill="none" stroke="#f1e6ce" strokeWidth="7" />
        <path d="M52 200Q180 80 285 190T485 180" fill="none" stroke="#fff4df" strokeWidth="4" strokeDasharray="10 10" />
        <path d="M72 492L150 420L216 456L300 370L380 438L465 345" fill="none" stroke={accent} strokeWidth="3" strokeDasharray="8 9" />
        <g fill="#f0e2c5" stroke="#9b7654" strokeWidth="3">
          <path d="M310 365h125v95H310z" /><path d="M296 368l75-64 78 64Z" />
          <path d="M350 460v-48a18 18 0 0 1 36 0v48" fill="#c69d71" />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          top: "39%",
          left: markerX + "%",
          width: 17,
          height: 17,
          borderRadius: "50% 50% 50% 4px",
          background: accent,
          border: "3px solid #fff4df",
          transform: "rotate(-45deg)",
          boxShadow: "0 4px 16px rgba(40,45,34,.25)",
        }}
      />
    </>
  );
}

function HeritageArchitecture({ scene, progress, accent }) {
  const garlandY = 10 + progress * 14;
  return (
    <>
      <svg viewBox="0 0 540 620" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M58 600V240Q270 5 482 240V600" fill="#5a2638" stroke={accent} strokeWidth="10" />
        <path d="M98 600V260Q270 65 442 260V600" fill="none" stroke="#f0d59a" strokeWidth="4" />
        <path d="M150 600V340Q270 190 390 340V600" fill="#261321" stroke="#bb8b58" strokeWidth="4" />
        <path d="M30 600V280M90 600V250M450 600V250M510 600V280" stroke="#ddba7c" strokeWidth="16" />
        <path d="M130 280Q270 385 410 280" fill="none" stroke="#edc58b" strokeWidth="11" />
      </svg>
      {[0,1,2,3,4,5,6].map((item) => (
        <div
          key={item}
          style={{
            position: "absolute",
            top: garlandY + "%",
            left: 12 + item * 12 + "%",
            width: 3,
            height: 115 + (item % 2) * 45,
            background: "linear-gradient(180deg, " + accent + ", rgba(238,190,126,.04))",
            transform: "rotate(" + (item % 2 ? 4 : -4) + "deg)",
          }}
        >
          <div style={{ position: "absolute", bottom: -6, left: -6, width: 15, height: 15, borderRadius: "50%", background: item % 2 ? "#e6a1a1" : "#edc578", boxShadow: "0 0 12px rgba(238,196,122,.25)" }} />
        </div>
      ))}
    </>
  );
}

function StationeryArchitecture({ scene, progress, accent }) {
  const cardY = interpolate(progress, [0, 1], [65, 0]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "13%",
          left: "17%",
          width: "66%",
          height: "72%",
          background: "rgba(0,0,0,.4)",
          filter: "blur(20px)",
          transform: "translate(18px,24px) rotate(3deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "16%",
          width: "66%",
          height: "74%",
          background: "linear-gradient(145deg,#fff9e9,#d7c4a4)",
          border: "1px solid #bba17a",
          boxShadow: "0 30px 65px rgba(0,0,0,.33), inset 0 0 0 8px rgba(255,255,255,.32)",
          transform: "translateY(" + cardY + "px) rotate(-1deg)",
        }}
      >
        <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(147,112,72,.42)" }} />
        <div style={{ position: "absolute", top: "14%", left: 0, right: 0, color: "#8e7857", textAlign: "center", fontSize: 11, letterSpacing: 3 }}>TOGETHER WITH THEIR FAMILIES</div>
        <div style={{ position: "absolute", top: "28%", left: 0, right: 0, color: "#9e8057", textAlign: "center", fontSize: 42 }}>❦</div>
        <div style={{ position: "absolute", bottom: "11%", left: "12%", right: "12%", height: 1, background: "#b59a72" }} />
      </div>
      <div
        style={{
          position: "absolute",
          right: "14%",
          bottom: "15%",
          width: 70,
          height: 70,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          border: "4px double #f0cda0",
          color: "#fff0dc",
          background: "radial-gradient(circle at 28% 22%, #c46c55, #762f35 70%)",
          boxShadow: "0 10px 28px rgba(0,0,0,.4)",
          transform: "scale(" + clamp(progress, [.1,.5], [.1,1]) + ") rotate(" + progress * 20 + "deg)",
          fontFamily: "Georgia,serif",
          fontSize: 18,
        }}
      >
        A&R
      </div>
    </>
  );
}

function GardenArchitecture({ scene, progress, accent }) {
  return (
    <>
      <div style={{ position: "absolute", top: "9%", left: "15%", right: "15%", height: "75%", border: "3px solid " + accent, borderBottom: 0, borderRadius: "50% 50% 0 0", boxShadow: "0 0 40px rgba(240,210,184,.12)" }} />
      <svg viewBox="0 0 540 620" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", fill: "rgba(160,188,145,.18)", stroke: "#9eb891", strokeWidth: 3 }}>
        <path d="M10 585Q90 430 75 110M530 585Q450 430 465 110" fill="none" />
        <path d="M42 470q-42-24-32-62q49 5 32 62ZM56 370q47-7 58-54q-57-4-58 54ZM70 262q-43-24-31-66q48 8 31 66ZM480 470q42-24 32-62q-49 5-32 62ZM464 370q-47-7-58-54q57-4 58 54ZM450 262q43-24 31-66q-48 8-31 66Z" />
      </svg>
      {[0,1,2,3,4,5,6,7,8,9].map((item) => (
        <div
          key={item}
          style={{
            position: "absolute",
            top: 23 + ((item * 17 + progress * 22) % 58) + "%",
            left: (item % 2 ? 12 + item * 7 : 75 - item * 6) + "%",
            width: 10 + (item % 3) * 3,
            height: 10 + (item % 3) * 3,
            borderRadius: "50%",
            background: item % 2 ? "#e7b9aa" : "#f2d4bd",
            opacity: .45 + (item % 4) * .12,
            transform: "translateY(" + Math.sin(progress * 6 + item) * 11 + "px)",
            boxShadow: "0 0 10px rgba(255,222,199,.25)",
          }}
        />
      ))}
    </>
  );
}

function CelestialArchitecture({ scene, progress, accent }) {
  const spin = progress * 18;
  return (
    <>
      <div style={{ position: "absolute", top: "10%", right: "13%", width: "23%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle at 32% 25%, #fff8e5,#d7c9a5 72%,#8f8e96)", boxShadow: "0 0 75px rgba(236,219,181,.3)" }} />
      <div style={{ position: "absolute", top: "19%", left: "12%", width: "76%", height: "38%", border: "1px solid rgba(219,205,174,.55)", borderRadius: "50%", transform: "rotate(" + (spin - 28) + "deg)" }} />
      <div style={{ position: "absolute", top: "15%", left: "16%", width: "68%", height: "47%", border: "1px dashed rgba(219,205,174,.5)", borderRadius: "50%", transform: "rotate(" + (28 - spin) + "deg)" }} />
      <svg viewBox="0 0 540 420" style={{ position: "absolute", top: "14%", width: "100%", height: "48%", fill: accent, stroke: "rgba(229,214,183,.5)", strokeWidth: 2 }}>
        <path d="M42 130L130 70L211 170L320 65L410 185L500 105" fill="none" />
        <circle cx="42" cy="130" r="5"/><circle cx="130" cy="70" r="7"/><circle cx="211" cy="170" r="5"/><circle cx="320" cy="65" r="6"/><circle cx="410" cy="185" r="5"/><circle cx="500" cy="105" r="6"/>
      </svg>
    </>
  );
}

function DecoArchitecture({ scene, progress, accent }) {
  return (
    <>
      <div style={{ position: "absolute", top: "-18%", left: "20%", width: "60%", aspectRatio: "1", borderRadius: "50%", background: "repeating-conic-gradient(from -45deg, rgba(220,185,118,.2) 0deg 1deg, transparent 1deg 10deg)", maskImage: "linear-gradient(180deg,#000,transparent 85%)" }} />
      <svg viewBox="0 0 540 560" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", fill: "none", stroke: accent, strokeWidth: 2 }}>
        <path d="M55 565V170Q270-45 485 170V565M82 565V185Q270 5 458 185V565M110 565V208Q270 45 430 208V565" />
        <path d="M270 565V55M120 210L270 55L420 210M90 245L270 82L450 245" />
        <path d="M30 565h480M55 535h430M80 505h380" opacity=".6" />
      </svg>
      <div style={{ position: "absolute", top: "12%", left: 0, right: 0, color: accent, fontFamily: "Georgia,serif", fontSize: 56, textAlign: "center", opacity: .5 + progress * .35 }}>✦</div>
    </>
  );
}

function MediterraneanArchitecture({ scene, progress, accent }) {
  return (
    <>
      <div style={{ position: "absolute", top: "8%", left: "34%", width: "32%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle at 30% 25%,#fff0cb,#e5b982 74%,#b87c60)", boxShadow: "0 0 65px rgba(255,222,178,.28)" }} />
      <div style={{ position: "absolute", bottom: "8%", left: "4%", width: "57%", height: "70%", border: "16px solid #f1ddbd", borderBottom: 0, borderRadius: "50% 50% 0 0", opacity: .75, background: "linear-gradient(180deg,rgba(255,233,200,.12),rgba(55,41,34,.7))" }} />
      <div style={{ position: "absolute", bottom: "8%", right: "8%", width: "55%", height: "60%", border: "12px solid #f7e8cf", borderBottom: 0, borderRadius: "50% 50% 0 0", background: "linear-gradient(180deg,transparent,rgba(43,54,52,.55))", boxShadow: "inset 0 0 0 4px rgba(128,83,60,.15)" }} />
      <svg viewBox="0 0 540 450" style={{ position: "absolute", bottom: "8%", left: 0, width: "100%", height: "55%", fill: "rgba(79,105,70,.24)", stroke: "#526c4c", strokeWidth: 3 }}>
        <path d="M20 420Q85 310 55 40M520 420Q455 310 485 40" fill="none" />
        <path d="M45 310q-50-30-35-70q54 8 35 70ZM62 220q50-8 66-53q-58-5-66 53ZM478 310q50-30 35-70q-54 8-35 70ZM460 220q-50-8-66-53q58-5 66 53Z" />
      </svg>
    </>
  );
}

function MonogramArchitecture({ scene, progress, accent }) {
  const line = clamp(progress, [0, .7], [0, 100]);
  return (
    <>
      <div style={{ position: "absolute", inset: "6%", border: "1px solid " + accent }} />
      <div style={{ position: "absolute", inset: "9%", border: "1px solid rgba(201,170,108,.38)" }} />
      <div style={{ position: "absolute", left: "22%", right: "22%", top: "21%", height: 1, background: accent, transform: "scaleX(" + line / 100 + ")" }} />
      <div style={{ position: "absolute", left: "22%", right: "22%", bottom: "20%", height: 1, background: accent, transform: "scaleX(" + line / 100 + ")" }} />
      <div style={{ position: "absolute", top: "23%", left: 0, right: 0, color: "#e8d9b8", fontFamily: "Georgia,serif", textAlign: "center", fontSize: 92, letterSpacing: "-.08em", opacity: clamp(progress, [0,.45], [0,1]), transform: "translateY(" + (1-progress)*22 + "px)" }}>A<span style={{ color: accent, fontSize: 48 }}> & </span>R</div>
    </>
  );
}

function ArtDirection({ template, scene, progress, frame }) {
  const styleId = template.styleId;
  const accent = template.colors?.accent || "#d7b46f";

  if (styleId === "royal") return <RoyalArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "glass") return <GlassArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "three-d") return <VintageArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "cinematic") return <CinematicArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "floral") return <DestinationArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "heritage") return <HeritageArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "editorial") return <StationeryArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "garden") return <GardenArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "celestial") return <CelestialArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "art-deco") return <DecoArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "mediterranean") return <MediterraneanArchitecture scene={scene} progress={progress} accent={accent} />;
  if (styleId === "monogram") return <MonogramArchitecture scene={scene} progress={progress} accent={accent} />;
  return <RoyalArchitecture scene={scene} progress={progress} accent={accent} />;
}

export function WeddingTemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();
  const colors = template.colors || {};
  const sceneIndex = Math.min(TOTAL_SCENES - 1, Math.floor(frame / SEGMENT_FRAMES));
  const scene = SCENES[sceneIndex];
  const localFrame = frame - sceneIndex * SEGMENT_FRAMES;
  const progress = localFrame / (SEGMENT_FRAMES - 1);
  const sceneOpacity = Math.min(
    clamp(localFrame, [0, 18], [0, 1]),
    clamp(localFrame, [130, 149], [1, 0]),
  );
  const titleY = clamp(localFrame, [0, 28], [34, 0]);
  const artScale = clamp(localFrame, [0, 149], [1.08, 1]);
  const drift = Math.sin(progress * Math.PI * 2) * 8;
  const accent = colors.accent || "#d7b46f";
  const isLight = ["floral", "editorial", "mediterranean"].includes(template.styleId);
  const foreground = isLight ? "#352d25" : colors.ink || "#fff4df";
  const background = colors.background || "#101112";

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        backgroundColor: background,
        color: foreground,
        fontFamily: "'DM Sans', Arial, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: .94,
          transform: "scale(" + artScale + ") translateY(" + drift + "px)",
        }}
      >
        <ArtDirection
          template={template}
          scene={sceneIndex}
          progress={progress}
          frame={frame}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background: isLight
            ? "linear-gradient(180deg,rgba(250,245,231,.08),rgba(250,245,231,.16) 42%,rgba(250,245,231,.9) 100%)"
            : "linear-gradient(180deg,rgba(4,7,11,.38),rgba(4,7,11,.02) 30%,rgba(4,7,11,.72) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          zIndex: 31,
          top: "6%",
          left: "8%",
          right: "8%",
          display: "flex",
          justifyContent: "space-between",
          color: isLight ? "#75654f" : "rgba(255,246,226,.72)",
          fontFamily: "Arial, sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 3,
        }}
      >
        <span>THE WEDDING FILM</span>
        <span>0{sceneIndex + 1} / 06</span>
      </div>

      <SceneTypography
        scene={scene}
        template={template}
        opacity={sceneOpacity}
        translateY={titleY}
        color={foreground}
        accent={accent}
        isLight={isLight}
      />

      <div
        style={{
          position: "absolute",
          zIndex: 40,
          left: "8%",
          right: "8%",
          bottom: "6%",
          height: 2,
          background: isLight ? "rgba(86,70,51,.18)" : "rgba(255,255,255,.18)",
        }}
      >
        <div
          style={{
            width: (frame / 899) * 100 + "%",
            height: "100%",
            background: accent,
            boxShadow: "0 0 12px " + accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
}
