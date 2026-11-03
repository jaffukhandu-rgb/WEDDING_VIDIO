import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export function TemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();
  const glowOpacity = interpolate(frame, [0, 45, 90], [0.25, 0.85, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleOpacity = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [8, 28], [42, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ornamentScale = interpolate(frame, [0, 38, 90], [0.82, 1.04, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const colors = template.colors;

  const frameStyle = {
    position: "absolute",
    inset: "7%",
    border: "2px solid " + colors.accent,
    borderRadius: template.styleId === "glass" ? "34px" : "180px 180px 18px 18px",
    opacity: 0.7,
    transform: "scale(" + ornamentScale + ")",
  };

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, " +
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
            "55, transparent 42%)",
          opacity: glowOpacity,
        }}
      />
      {template.styleId === "glass" && (
        <>
          <div
            style={{
              position: "absolute",
              width: "82%",
              height: "58%",
              top: "20%",
              left: "9%",
              borderRadius: 42,
              border: "1px solid rgba(255,255,255,.42)",
              background: "rgba(255,255,255,.10)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 20px 70px rgba(0,0,0,.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "42%",
              height: "42%",
              top: "10%",
              right: "-10%",
              borderRadius: "50%",
              background: colors.accent,
              filter: "blur(70px)",
              opacity: 0.4,
            }}
          />
        </>
      )}
      {template.styleId !== "glass" && <div style={frameStyle} />}
      <div
        style={{
          position: "absolute",
          top: "18%",
          color: colors.soft,
          fontSize: 74,
          opacity: glowOpacity,
          transform: "scale(" + ornamentScale + ")",
        }}
      >
        {template.styleMotif}
      </div>
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "76%",
          textAlign: "center",
          opacity: titleOpacity,
          transform: "translateY(" + titleY + "px)",
          padding: 28,
          border:
            template.styleId === "glass"
              ? "1px solid rgba(255,255,255,.46)"
              : "1px solid " + colors.accent + "88",
          borderRadius: template.styleId === "glass" ? 26 : 8,
          background:
            template.styleId === "glass"
              ? "rgba(255,255,255,.10)"
              : "rgba(0,0,0,.12)",
          boxShadow: template.styleId === "three-d"
            ? "0 18px 0 rgba(0,0,0,.22), 0 28px 50px rgba(0,0,0,.28)"
            : "0 20px 60px rgba(0,0,0,.18)",
        }}
      >
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 18,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: colors.soft,
            marginBottom: 24,
          }}
        >
          {template.styleName}
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.08, marginBottom: 22 }}>
          {template.previewTitle}
        </div>
        <div
          style={{
            width: 90,
            height: 2,
            margin: "0 auto 22px",
            background: colors.accent,
          }}
        />
        <div style={{ fontSize: 27, lineHeight: 1.5, color: colors.soft }}>
          {template.previewSubtitle}
        </div>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 16,
            lineHeight: 1.7,
            letterSpacing: 1,
            marginTop: 28,
            opacity: 0.8,
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
          letterSpacing: 7,
          fontSize: 15,
          color: colors.soft,
          opacity: 0.7,
        }}
      >
        MADE AUTOMATICALLY
      </div>
    </AbsoluteFill>
  );
}
