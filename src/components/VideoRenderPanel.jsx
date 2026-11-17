import { useEffect, useState } from "react";
import "./VideoRenderPanel.css";

const RENDER_API = (import.meta.env.VITE_RENDER_API_URL || "http://127.0.0.1:4174").replace(/\/$/, "");

export function VideoRenderPanel({ html, title, audioDataUrl = "" }) {
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl("");
    setVideoName("");
    setError("");
  // A new source means the previous MP4 is stale.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, audioDataUrl]);

  const generateVideo = async () => {
    if (rendering) return;
    setRendering(true);
    setError("");
    try {
      let audioPayload = {};
      if (audioDataUrl) {
        const match = audioDataUrl.match(/^data:(audio\\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
        if (!match) throw new Error("The selected music could not be prepared for export.");
        if (match[2].length > 11 * 1024 * 1024) throw new Error("Choose a music file smaller than 8 MB.");
        audioPayload = { audioMimeType: match[1], audioBase64: match[2] };
      }
      const response = await fetch(`${RENDER_API}/api/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, ...audioPayload }),
      });
      if (!response.ok) {
        let message = "Video generation failed. Please try again.";
        try {
          const result = await response.json();
          if (result.error) message = result.error;
        } catch {
          // Keep the readable fallback message for non-JSON server errors.
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      if (!blob.type.includes("video/mp4") || blob.size === 0) {
        throw new Error("The renderer returned an invalid or empty MP4 file.");
      }
      const nextUrl = URL.createObjectURL(blob);
      setVideoUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
      setVideoName((title || "wedding-invitation").trim().replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() + ".mp4");
    } catch (renderError) {
      setError(renderError instanceof Error ? renderError.message : "Could not connect to the rendering service.");
    } finally {
      setRendering(false);
    }
  };

  return (
    <section className="video-render-panel" aria-label="MP4 video rendering">
      <div className="video-render-heading">
        <div>
          <p className="visual-eyebrow">VIDEO EXPORT</p>
          <h3>Generate your invitation video</h3>
          <p>Render this exact invitation preview into a 30-second MP4, including the selected music.</p>
        </div>
        <button type="button" onClick={generateVideo} disabled={rendering || !html?.trim()}>
          {rendering ? "Rendering 30-second video…" : videoUrl ? "↻ Regenerate MP4" : "▶ Generate 30-second MP4"}
        </button>
      </div>

      {rendering && (
        <div className="video-render-progress" role="status">
          <span className="video-render-spinner" />
          <div><strong>Rendering your video</strong><p>Capturing 900 frames and encoding the MP4. This can take a few minutes.</p></div>
        </div>
      )}
      {error && <p className="video-render-error" role="alert">{error}</p>}

      {videoUrl ? (
        <div className="video-render-result">
          <video key={videoUrl} controls playsInline preload="metadata" src={videoUrl}>
            Your browser does not support MP4 playback.
          </video>
          <div className="video-render-download">
            <span>MP4 ready · 540 × 960 · 30 FPS · 30 seconds</span>
            <a href={videoUrl} download={videoName}>Download MP4</a>
          </div>
        </div>
      ) : (
        <div className="video-render-empty">
          <span>MP4</span>
          <p>Your finished video will appear here after rendering.</p>
        </div>
      )}
      <p className="video-render-footnote">The rendering service must be running. Preview text, photos and the selected music are included in the exported MP4.</p>
    </section>
  );
}
