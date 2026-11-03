import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export function TemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();
  const styleId = template.styleId;
  const colors = template.colors;
  const isGlass = styleId === "glass";
  const isCinematic = styleId === "cinematic";
  const isEditorial = styleId === "editorial";
  const isHeritage = styleId === "heritage";
  const isFloral = styleId === "floral";
  const isThreeD = styleId === "three-d";

  const glowOpacity = interpolate(frame, [0, 45, 90], [0.2, 0.8, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 28], [48, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ornamentScale = interpolate(frame, [0, 38, 90], [0.78, 1.04, 0.99], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const floatY = interpolate(frame, [0, 45, 90], [0, -12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lightSweep = interpolate(frame, [0, 90], [-120, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleSize = template.previewTitle.length > 13 ? 54 : 72;

  const frameStyle = {
    position: "absolute",
    inset: isHeritage ? "5%" : "7%",
    border: isHeritage ? "4px double " + colors.accent : "2px solid " + colors.accent,
    borderRadius: isGlass
      ? 32
      : isCinematic || isEditorial
        ? 0
        : isHeritage
          ? 8
          : "190px 190px 18px 18px",
    opacity: 0.78,
    transform: "scale(" + ornamentScale + ")",
    boxShadow: isRoyalStyle(styleId)
      ? "inset 0 0 0 8px rgba(255,255,255,.025), 0 0 42px rgba(0,0,0,.18)"
      : "none",
  };

  const contentStyle = {
    position: "relative",
    zIndex: 2,
    width: isEditorial ? "72%" : isGlass ? "82%" : "76%",
    textAlign: isEditorial ? "left" : "center",
    opacity: titleOpacity,
    transform:
      "translateY(" +
      titleY +
      "px) " +
      (isThreeD ? "perspective(900px) rotateX(3deg)" : ""),
    padding: isCinematic ? "42px 12px" : 28,
    border: isCinematic || isEditorial
      ? "0"
      : isGlass
        ? "1px solid rgba(255,255,255,.48)"
        : "1px solid " + colors.accent + "88",
    borderRadius: isGlass ? 28 : isCinematic || isEditorial ? 0 : isHeritage ? 5 : 10,
    borderTop: isEditorial ? "1px solid " + colors.accent + "88" : undefined,
    borderBottom: isEditorial ? "1px solid " + colors.accent + "88" : undefined,
    background: isGlass
      ? "rgba(255,255,255,.12)"
      : isCinematic || isEditorial
        ? "transparent"
        : "rgba(0,0,0,.14)",
    backdropFilter: isGlass ? "blur(18px)" : undefined,
    boxShadow: isThreeD
      ? "0 18px 0 rgba(0,0,0,.22), 0 28px 50px rgba(0,0,0,.28)"
      : isGlass
        ? "0 25px 70px rgba(0,0,0,.2)"
        : "0 20px 60px rgba(0,0,0,.16)",
  };

  return (
    <AbsoluteFill
      style={{
        background: isCinematic
          ? "linear-gradient(160deg, #080f19, " + colors.middle + " 48%, #080e16)"
          : "radial-gradient(ellipse at 50% 35%, " +
            colors.middle +
            " 0%, " +
            colors.background +
            " 72%)",
        color: colors.ink,
        fontFamily: "Georgia, serif",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 35%, " +
            colors.accent +
            "66, transparent 44%)",
          opacity: glowOpacity,
        }}
      />

      {isGlass && (
        <>
          <div
            style={{
              position: "absolute",
              width: "84%",
              height: "62%",
              top: "19%",
              left: "8%",
              borderRadius: 42,
              border: "1px solid rgba(255,255,255,.48)",
              background: "rgba(255,255,255,.085)",
              backdropFilter: "blur(18px)",
              transform: "translateY(" + floatY + "px)",
              boxShadow: "0 24px 75px rgba(0,0,0,.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "48%",
              height: "44%",
              top: "8%",
              right: "-12%",
              borderRadius: "50%",
              background: colors.accent,
              filter: "blur(75px)",
              opacity: 0.42,
            }}
          />
        </>
      )}

      {isCinematic && (
        <>
          <div
            style={{
              position: "absolute",
              top: "12%",
              left: 0,
              width: "100%",
              height: "2px",
              background: colors.accent,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              left: 0,
              width: "100%",
              height: "2px",
              background: colors.accent,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: lightSweep + "%",
              width: "24%",
              background: "linear-gradient(90deg, transparent, " + colors.accent + "22, transparent)",
              transform: "skewX(-14deg)",
            }}
          />
        </>
      )}

      {isFloral && (
        <>
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "9%",
              width: 115,
              height: 115,
              borderRadius: "50%",
              background: colors.soft,
              filter: "blur(24px)",
              opacity: 0.18,
              transform: "translateY(" + floatY + "px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "16%",
              right: "7%",
              width: 150,
              height: 150,
              borderRadius: "50%",
              background: colors.accent,
              filter: "blur(30px)",
              opacity: 0.2,
              transform: "translateY(" + -floatY + "px)",
            }}
          />
        </>
      )}

      {!isGlass && <div style={frameStyle} />}

      {!isEditorial && (
        <div
          style={{
            position: "absolute",
            top: isCinematic ? "15%" : "17%",
            color: colors.soft,
            fontSize: isHeritage ? 88 : 76,
            opacity: glowOpacity,
            transform: "scale(" + ornamentScale + ") translateY(" + floatY + "px)",
            textShadow: isThreeD ? "0 8px 0 rgba(0,0,0,.24)" : "none",
          }}
        >
          {template.motif}
        </div>
      )}

      <div style={contentStyle}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: isEditorial ? 5 : 7,
            textTransform: "uppercase",
            color: colors.soft,
            marginBottom: 24,
          }}
        >
          {template.styleName}
        </div>
        <div
          style={{
            fontSize: titleSize,
            lineHeight: 1.08,
            marginBottom: 22,
            textShadow: isThreeD
              ? "0 2px 0 #56341f, 0 5px 0 rgba(0,0,0,.22), 0 12px 28px rgba(0,0,0,.25)"
              : isRoyalStyle(styleId)
                ? "0 4px 28px rgba(0,0,0,.28)"
                : "none",
          }}
        >
          {template.previewTitle}
        </div>
        <div
          style={{
            width: 90,
            height: 2,
            margin: isEditorial ? "0 0 22px" : "0 auto 22px",
            background: colors.accent,
          }}
        />
        <div style={{ fontSize: 27, lineHeight: 1.5, color: colors.soft }}>
          {template.previewSubtitle}
        </div>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 15,
            lineHeight: 1.7,
            letterSpacing: 1,
            marginTop: 28,
            opacity: 0.82,
          }}
        >
          {template.detailLine}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "9%",
          fontFamily: "Arial, sans-serif",
          letterSpacing: 6,
          fontSize: 14,
          color: colors.soft,
          opacity: 0.7,
        }}
      >
        MADE AUTOMATICALLY
      </div>
    </AbsoluteFill>
  );
}

function isRoyalStyle(styleId) {
  return styleId === "royal" || styleId === "heritage";
}
