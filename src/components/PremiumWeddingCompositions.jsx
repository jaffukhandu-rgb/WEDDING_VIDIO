import { AbsoluteFill } from "remotion";

const gold = "#d8b978";

export function RoyalNoirComposition({ scene, progress, accent = gold }) {
  const glow = 0.48 + Math.sin(progress * Math.PI * 2) * 0.12;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, #382b23 0%, #171310 43%, #080909 100%)" }}>
      <AbsoluteFill style={{ opacity: glow, background: "radial-gradient(ellipse at 50% 12%, rgba(226,190,119,.3), transparent 48%)" }} />
      <div style={{ position: "absolute", inset: "7% 8%", border: "1px solid rgba(216,185,120,.72)", borderRadius: "48% 48% 2px 2px / 25% 25% 2px 2px", boxShadow: "inset 0 0 0 7px rgba(216,185,120,.07), 0 0 45px rgba(216,185,120,.08)" }} />
      <div style={{ position: "absolute", inset: "10% 11%", border: "1px solid rgba(216,185,120,.35)", borderRadius: "48% 48% 2px 2px / 25% 25% 2px 2px" }} />
      {[0, 1, 2, 3].map((item) => (
        <div key={item} style={{ position: "absolute", top: "18%", bottom: "12%", left: item % 2 ? "15%" : "85%", width: 1, background: "linear-gradient(transparent, rgba(216,185,120,.72), transparent)", opacity: .45 }} />
      ))}
      <div style={{ position: "absolute", top: "20%", left: "50%", width: 86, height: 86, transform: "translateX(-50%) rotate(45deg)", border: "1px solid " + accent, opacity: .75 }} />
      <div style={{ position: "absolute", top: "22%", left: "50%", transform: "translateX(-50%)", color: accent, fontFamily: "Georgia,serif", fontSize: 42 }}>✦</div>
      <div style={{ position: "absolute", left: "17%", right: "17%", bottom: "17%", height: 1, background: "linear-gradient(90deg, transparent, " + accent + ", transparent)", opacity: .75 }} />
      <div style={{ position: "absolute", left: "50%", bottom: "12%", transform: "translateX(-50%)", color: "#e9d7ae", fontSize: 9, letterSpacing: 5, whiteSpace: "nowrap" }}>
        {["A NIGHT OF DISTINCTION", "THE UNION", "A DATE TO REMEMBER", "THE INVITATION", "THE GRAND ADDRESS", "FOREVER BEGINS"][scene]}
      </div>
    </AbsoluteFill>
  );
}

export function MaharajaLegacyComposition({ scene, progress, accent = "#e2bd78" }) {
  const light = 0.5 + Math.sin(progress * Math.PI * 2) * 0.15;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(145deg, #260d13 0%, #4a1722 48%, #17090d 100%)" }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 38%, rgba(226,189,120,.22), transparent 55%)", opacity: light }} />
      <div style={{ position: "absolute", inset: "8% 7% 9%", border: "1px solid rgba(226,189,120,.65)", borderRadius: "50% 50% 0 0 / 25% 25% 0 0" }} />
      <div style={{ position: "absolute", inset: "11% 12% 9%", border: "2px solid rgba(226,189,120,.3)", borderRadius: "50% 50% 0 0 / 25% 25% 0 0" }} />
      <div style={{ position: "absolute", top: "13%", left: "50%", width: "58%", height: "44%", transform: "translateX(-50%)", border: "1px solid " + accent, borderBottom: 0, borderRadius: "50% 50% 0 0 / 34% 34% 0 0", boxShadow: "0 0 28px rgba(226,189,120,.12)" }} />
      {[0, 1].map((item) => (
        <div key={item} style={{ position: "absolute", top: "24%", bottom: "10%", left: item ? "16%" : "84%", width: "5%", borderLeft: "2px solid rgba(226,189,120,.55)", borderRight: "2px solid rgba(226,189,120,.2)", background: "linear-gradient(90deg, rgba(226,189,120,.09), transparent)" }} />
      ))}
      <div style={{ position: "absolute", top: "17%", left: "50%", transform: "translateX(-50%)", color: accent, fontSize: 34 }}>❖</div>
      <div style={{ position: "absolute", left: "12%", right: "12%", bottom: "14%", height: 1, background: "linear-gradient(90deg, transparent, " + accent + ", transparent)" }} />
      <div style={{ position: "absolute", bottom: "9%", left: "50%", transform: "translateX(-50%)", color: "#f4dfb7", fontSize: 9, letterSpacing: 4, whiteSpace: "nowrap" }}>
        {["A ROYAL CELEBRATION", "TWO FAMILIES · ONE LEGACY", "THE AUSPICIOUS DATE", "WITH THE BLESSINGS OF FAMILY", "THE PALACE OF CELEBRATION", "A LEGACY OF LOVE"][scene]}
      </div>
    </AbsoluteFill>
  );
}

export function ModernHeirloomComposition({ scene, progress, accent = "#a58a62" }) {
  const reveal = 0.82 + Math.sin(progress * Math.PI) * 0.08;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #e9e1d3 0%, #f7f3eb 48%, #d9cebd 100%)", color: "#29251f" }}>
      <div style={{ position: "absolute", inset: "5%", border: "1px solid rgba(92,77,58,.28)" }} />
      <div style={{ position: "absolute", inset: "7% 8%", border: "1px solid rgba(92,77,58,.14)" }} />
      <div style={{ position: "absolute", top: "12%", left: "12%", right: "12%", display: "flex", justifyContent: "space-between", color: "#76664f", fontSize: 8, letterSpacing: 3 }}>
        <span>THE WEDDING EDITION</span><span>NO. 01</span>
      </div>
      <div style={{ position: "absolute", top: "24%", left: "50%", transform: "translateX(-50%)", width: "56%", aspectRatio: "1", border: "1px solid " + accent, borderRadius: "50%", opacity: reveal }} />
      <div style={{ position: "absolute", top: "27%", left: "50%", transform: "translateX(-50%)", color: accent, fontFamily: "Georgia,serif", fontSize: 64, fontStyle: "italic", opacity: reveal }}>&</div>
      <div style={{ position: "absolute", top: "67%", left: "16%", right: "16%", height: 1, background: "linear-gradient(90deg, transparent, " + accent + ", transparent)" }} />
      <div style={{ position: "absolute", bottom: "11%", left: "50%", transform: "translateX(-50%)", color: "#74634d", fontSize: 8, letterSpacing: 3, whiteSpace: "nowrap" }}>
        {["A STUDY IN FOREVER", "THE TWO OF US", "MARK THE DATE", "AN INVITATION", "THE PLACE", "ALWAYS, TOGETHER"][scene]}
      </div>
    </AbsoluteFill>
  );
}
