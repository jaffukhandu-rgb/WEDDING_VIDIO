import { AbsoluteFill, Audio, Img, Video, useCurrentFrame, useVideoConfig } from "remotion";

function sourceOf(asset) {
  return typeof asset === "string" ? asset : asset?.src || asset?.url || "";
}

export function WeddingMediaLayer({ photos = [], videos = [], musicUrl = "" }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const items = [
    ...photos.map((asset) => ({ src: sourceOf(asset), type: "image" })),
    ...videos.map((asset) => ({ src: sourceOf(asset), type: "video" })),
  ].filter((asset) => asset.src);
  const segmentFrames = Math.max(1, Math.floor(durationInFrames / Math.max(1, items.length)));
  const activeIndex = items.length
    ? Math.min(items.length - 1, Math.floor(frame / segmentFrames))
    : -1;
  const activeAsset = activeIndex >= 0 ? items[activeIndex] : null;

  return (
    <>
      {musicUrl && <Audio src={musicUrl} />}
      {activeAsset && (
        <div
          style={{
            position: "absolute",
            zIndex: 60,
            left: "15%",
            right: "15%",
            bottom: "13%",
            height: "23%",
            overflow: "hidden",
            border: "5px solid rgba(246,235,211,.92)",
            borderRadius: 8,
            background: "#211a15",
            boxShadow: "0 12px 32px rgba(0,0,0,.38)",
          }}
        >
          {activeAsset.type === "video" ? (
            <Video
              src={activeAsset.src}
              loop
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Img
              src={activeAsset.src}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
      )}
    </>
  );
}
