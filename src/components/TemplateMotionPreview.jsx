import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

export function TemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();
  const styleId = template.styleId;
  const colors = template.colors;
  const titleOpacity = interpolate(frame, [7, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [7, 25], [44, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imageScale = interpolate(frame, [0, 90], [1, 1.075], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ornamentOpacity = interpolate(frame, [0, 34, 90], [0.35, 1, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lightSweep = interpolate(frame, [0, 90], [-40, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const previewImageUrl =
    styleId === "royal" && template.occasionId === "wedding"
      ? "https://images.unsplash.com/photo-1757098737757-828619fb8e6c?auto=format&fit=crop&w=1800&q=90"
      : styleId === "heritage" && template.occasionId === "wedding"
        ? "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?auto=format&fit=crop&w=1800&q=90"
        : styleId === "floral" && ["wedding", "engagement", "anniversary"].includes(template.occasionId)
          ? "https://images.unsplash.com/photo-1769812343775-85a27e6a076c?auto=format&fit=crop&w=1800&q=90"
          : styleId === "glass" && template.occasionId === "corporate"
            ? "https://images.unsplash.com/photo-1617381519438-e92c226b236b?auto=format&fit=crop&w=1800&q=90"
            : template.imageUrl;

  const image = (
    <Img
      src={previewImageUrl}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: "scale(" + imageScale + ")",
      }}
    />
  );

  const overlineStyle = {
    fontFamily: "Arial, sans-serif",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: 6,
    textTransform: "uppercase",
    color: colors.soft,
    opacity: 0.92,
  };
  const titleStyle = {
    fontFamily: "Georgia, serif",
    fontSize: template.previewTitle.length > 13 ? 58 : 76,
    lineHeight: 1.02,
    fontWeight: 500,
    opacity: titleOpacity,
    transform: "translateY(" + titleY + "px)",
  };
  const subtitleStyle = {
    fontFamily: "Georgia, serif",
    fontSize: 29,
    lineHeight: 1.35,
    fontStyle: "italic",
    color: colors.soft,
  };
  const detailStyle = {
    fontFamily: "Arial, sans-serif",
    maxWidth: "88%",
    fontSize: 16,
    lineHeight: 1.65,
    letterSpacing: 1,
    color: colors.soft,
    opacity: 0.78,
  };

  if (styleId === "royal") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.background,
          color: colors.ink,
          overflow: "hidden",
          alignItems: "center",
        }}
      >
        {image}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(18,7,12,.12), rgba(18,7,12,.12) 32%, rgba(18,7,12,.94) 100%), linear-gradient(90deg, rgba(18,7,12,.3), transparent 28%, transparent 72%, rgba(18,7,12,.3))",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "9%",
            left: "9%",
            right: "9%",
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: 18,
            borderBottom: "1px solid " + colors.accent,
            color: colors.soft,
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 5,
          }}
        >
          <span>EST. MMXXVI</span>
          <span style={{ fontSize: 26 }}>{template.motif}</span>
          <span>BY INVITATION</span>
        </div>
        <div
          style={{
            position: "absolute",
            left: "8%",
            right: "8%",
            bottom: "17%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 17,
            padding: "38px 24px",
            border: "1px solid " + colors.accent,
            background: "rgba(22,8,14,.46)",
            textAlign: "center",
            opacity: titleOpacity,
            transform: "translateY(" + titleY + "px)",
          }}
        >
          <div style={overlineStyle}>{template.occasionId.toUpperCase()} CELEBRATION</div>
          <div style={{ width: 110, height: 2, background: colors.accent }} />
          <div style={titleStyle}>{template.previewTitle}</div>
          <div style={subtitleStyle}>{template.previewSubtitle}</div>
          <div style={detailStyle}>{template.detailLine}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            color: colors.accent,
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
            letterSpacing: 7,
          }}
        >
          A MOMENT OF GRANDEUR
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "glass") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.background,
          color: colors.ink,
          overflow: "hidden",
        }}
      >
        {image}
        <AbsoluteFill
          style={{
            background: "linear-gradient(135deg, rgba(4,30,43,.38), rgba(9,83,97,.55))",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: "72%",
            height: "54%",
            top: "20%",
            right: "-4%",
            borderRadius: 48,
            border: "1px solid rgba(255,255,255,.4)",
            background: "rgba(255,255,255,.13)",
            backdropFilter: "blur(18px)",
            transform: "rotate(7deg) translateY(" + (1 - titleOpacity) * 34 + "px)",
            opacity: ornamentOpacity,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "13%",
            left: "9%",
            color: "#f4ffff",
            fontFamily: "Arial, sans-serif",
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: 6,
          }}
        >
          ◦ {template.styleName.toUpperCase()}
        </div>
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "8%",
            right: "8%",
            padding: "48px 40px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            borderRadius: 34,
            border: "1px solid rgba(255,255,255,.55)",
            background: "linear-gradient(135deg, rgba(255,255,255,.26), rgba(255,255,255,.09))",
            backdropFilter: "blur(22px)",
            boxShadow: "0 30px 85px rgba(0,0,0,.25)",
            opacity: titleOpacity,
            transform: "translateY(" + titleY + "px)",
          }}
        >
          <div style={overlineStyle}>{template.occasionId.toUpperCase()} · {template.cultureId || "GENERAL"}</div>
          <div style={titleStyle}>{template.previewTitle}</div>
          <div style={{ height: 2, width: 90, background: colors.accent }} />
          <div style={subtitleStyle}>{template.previewSubtitle}</div>
          <div style={detailStyle}>{template.detailLine}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "9%",
            left: "9%",
            color: "#f0ffff",
            fontFamily: "Arial, sans-serif",
            fontSize: 14,
            letterSpacing: 6,
          }}
        >
          A MOMENT, BEAUTIFULLY MADE
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "three-d") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.background,
          color: colors.ink,
          overflow: "hidden",
          alignItems: "center",
        }}
      >
        {image}
        <AbsoluteFill
          style={{
            background: "linear-gradient(180deg, rgba(17,8,3,.1), rgba(17,8,3,.85) 72%, rgba(17,8,3,.96))",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "18%",
            width: 180,
            height: 180,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: "#4c260e",
            fontFamily: "Georgia, serif",
            fontSize: 84,
            border: "3px solid " + colors.accent,
            background: "radial-gradient(circle at 30% 25%, #fff0c7, " + colors.accent + " 48%, #623616 86%)",
            boxShadow: "0 14px 0 #49240f, 0 34px 60px rgba(0,0,0,.42), inset 0 0 0 12px rgba(255,255,255,.12)",
            transform: "scale(" + interpolate(frame, [0, 38, 90], [.78, 1.04, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) + ")",
            opacity: ornamentOpacity,
          }}
        >
          {template.motif}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "17%",
            left: "7%",
            right: "7%",
            padding: "34px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 15,
            border: "2px solid " + colors.accent,
            background: "rgba(29,13,5,.62)",
            textAlign: "center",
            opacity: titleOpacity,
            transform: "translateY(" + titleY + "px) perspective(1000px) rotateX(2deg)",
            boxShadow: "0 18px 0 rgba(0,0,0,.24), 0 30px 50px rgba(0,0,0,.28)",
          }}
        >
          <div style={overlineStyle}>{template.styleName.toUpperCase()}</div>
          <div
            style={{
              ...titleStyle,
              fontSize: 77,
              textShadow: "0 2px 0 #75441c, 0 6px 0 #4d2915, 0 13px 25px rgba(0,0,0,.48)",
            }}
          >
            {template.previewTitle}
          </div>
          <div style={subtitleStyle}>{template.previewSubtitle}</div>
          <div style={detailStyle}>{template.detailLine}</div>
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "cinematic") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.background,
          color: "#f7f5ef",
          overflow: "hidden",
        }}
      >
        {image}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(90deg, rgba(4,11,19,.87), rgba(4,11,19,.2) 90%), linear-gradient(0deg, rgba(4,11,19,.9), transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: lightSweep + "%",
            width: "22%",
            transform: "skewX(-14deg)",
            background: "linear-gradient(90deg, transparent, " + colors.accent + "33, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "10%",
            top: "12%",
            color: "#e2e5e6",
            fontFamily: "Arial, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 7,
          }}
        >
          A FILM BY YOUR FAMILY
        </div>
        <div
          style={{
            position: "absolute",
            left: "12%",
            bottom: "18%",
            width: "78%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 19,
            opacity: titleOpacity,
            transform: "translateY(" + titleY + "px)",
          }}
        >
          <div style={overlineStyle}>{template.occasionId.toUpperCase()} · {template.styleName.toUpperCase()}</div>
          <div style={{ width: 3, height: 75, background: colors.accent }} />
          <div style={{ ...titleStyle, fontSize: 82 }}>{template.previewTitle}</div>
          <div style={subtitleStyle}>{template.previewSubtitle}</div>
          <div style={detailStyle}>{template.detailLine}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            left: "9%",
            right: "9%",
            display: "flex",
            justifyContent: "space-between",
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,.45)",
            color: "#e9e4d9",
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
            letterSpacing: 5,
          }}
        >
          <span>01</span>
          <span>THE BEGINNING</span>
          <span>2026</span>
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "editorial") {
    return (
      <AbsoluteFill
        style={{
          background: "linear-gradient(145deg, #f5f0e7, #e8dfd0)",
          color: "#28251f",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "7%",
            left: "8%",
            right: "8%",
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid #8d7b63",
            paddingBottom: 18,
            fontFamily: "Arial, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 5,
          }}
        >
          <span>THE CELEBRATION JOURNAL</span>
          <span>VOL. 01 / 2026</span>
        </div>
        <div
          style={{
            position: "absolute",
            top: "17%",
            right: "8%",
            width: "64%",
            height: "43%",
            overflow: "hidden",
            boxShadow: "0 18px 45px rgba(47,40,30,.2)",
            opacity: titleOpacity,
          }}
        >
          <Img src={previewImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + imageScale + ")" }} />
        </div>
        <div
          style={{
            position: "absolute",
            left: "9%",
            bottom: "14%",
            width: "78%",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 16,
            opacity: titleOpacity,
            transform: "translateY(" + titleY + "px)",
          }}
        >
          <div style={{ ...overlineStyle, color: "#927a5a" }}>{template.occasionId.toUpperCase()} / {template.styleName.toUpperCase()}</div>
          <div style={{ ...titleStyle, color: "#2b261f", fontSize: 85 }}>{template.previewTitle}</div>
          <div style={{ ...subtitleStyle, color: "#78664f" }}>{template.previewSubtitle}</div>
          <div style={{ height: 2, width: 90, background: "#a88b5f" }} />
          <div style={{ ...detailStyle, color: "#746b5d" }}>{template.detailLine}</div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "6%",
            left: "8%",
            right: "8%",
            display: "flex",
            justifyContent: "space-between",
            color: "#887862",
            fontFamily: "Arial, sans-serif",
            fontSize: 12,
            letterSpacing: 4,
          }}
        >
          <span>AN OCCASION TO REMEMBER</span>
          <span>01 — 07</span>
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "heritage") {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: colors.background,
          color: colors.ink,
          overflow: "hidden",
          alignItems: "center",
        }}
      >
        {image}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(30,11,8,.12), rgba(30,11,8,.56) 65%, rgba(30,11,8,.92))" }} />
        <div
          style={{
            position: "absolute",
            inset: "5%",
            border: "5px double " + colors.accent,
            boxShadow: "inset 0 0 0 9px rgba(255,255,255,.035)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "11%",
            width: "74%",
            height: "56%",
            border: "3px solid " + colors.accent,
            borderBottom: 0,
            borderRadius: "50% 50% 0 0 / 34% 34% 0 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "30px 20px",
            gap: 17,
            background: "linear-gradient(180deg, transparent, rgba(31,10,7,.62))",
            opacity: ornamentOpacity,
          }}
        >
          <div style={{ fontSize: 86, color: colors.soft }}>{template.motif}</div>
          <div style={overlineStyle}>{template.occasionId.toUpperCase()} · HERITAGE</div>
          <div style={{ ...titleStyle, fontSize: 76, textAlign: "center" }}>{template.previewTitle}</div>
          <div style={subtitleStyle}>{template.previewSubtitle}</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: "11%",
            right: "11%",
            bottom: "12%",
            padding: "25px 18px",
            borderTop: "1px solid " + colors.accent,
            borderBottom: "1px solid " + colors.accent,
            background: "rgba(31,10,7,.58)",
            textAlign: "center",
            opacity: titleOpacity,
          }}
        >
          <div style={detailStyle}>{template.detailLine}</div>
          <div style={{ ...overlineStyle, marginTop: 15 }}>TRADITION IN EVERY DETAIL</div>
        </div>
      </AbsoluteFill>
    );
  }

  if (styleId === "floral") {
    return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(145deg, #f4e8e4, #e8d5d0)",
        color: "#3a3030",
        overflow: "hidden",
        alignItems: "center",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "64%", overflow: "hidden" }}>
        <Img src={previewImageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(" + imageScale + ")" }} />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 32%, rgba(241,229,224,.9) 62%, #eee5df 78%)" }} />
      <div
        style={{
          position: "absolute",
          bottom: "13%",
          left: "10%",
          right: "10%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 17,
          textAlign: "center",
          opacity: titleOpacity,
          transform: "translateY(" + titleY + "px)",
        }}
      >
        <div style={{ ...overlineStyle, color: "#9b7379" }}>{template.occasionId.toUpperCase()} · FLORAL EDITION</div>
        <div style={{ ...titleStyle, color: "#3c3031", fontSize: 80 }}>{template.previewTitle}</div>
        <div style={{ ...subtitleStyle, color: "#795e63" }}>{template.previewSubtitle}</div>
        <div style={{ height: 2, width: 90, background: "#b88b91" }} />
        <div style={{ ...detailStyle, color: "#7e6c6d" }}>{template.detailLine}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: "9%",
          right: "7%",
          fontSize: 85,
          color: "#f4e6e2",
          opacity: ornamentOpacity,
          textShadow: "0 7px 25px rgba(0,0,0,.28)",
          transform: "translateY(" + interpolate(frame, [0,45,90], [0,-14,0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) + "px)",
        }}
      >
        ❀
      </div>
    </AbsoluteFill>
    );
  }

  return null;
}