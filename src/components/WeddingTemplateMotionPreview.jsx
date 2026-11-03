import { AbsoluteFill, useCurrentFrame } from "remotion";
import { WeddingTemplateArtwork } from "./WeddingTemplateArtwork.jsx";

export function WeddingTemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <WeddingTemplateArtwork template={template} frame={frame} />
    </AbsoluteFill>
  );
}
