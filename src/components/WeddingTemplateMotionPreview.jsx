import { useCurrentFrame } from "remotion";
import { WeddingTemplateArtwork } from "./WeddingTemplateArtwork.jsx";

export function WeddingTemplateMotionPreview({ template }) {
  const frame = useCurrentFrame();

  return <WeddingTemplateArtwork template={template} frame={frame} />;
}
