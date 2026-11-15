import { useEffect, useRef, useState } from "react";
import "./WeddingVideoEditor.css";

const DURATION_MS = 30_000;

export function WeddingVideoEditor({ title, previewDocument, onSave, saveMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = window.setInterval(() => {
      const nextElapsed = Math.min(Date.now() - startedAtRef.current, DURATION_MS);
      setElapsedMs(nextElapsed);

      if (nextElapsed >= DURATION_MS) {
        setIsPlaying(false);
        setHasCompleted(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  const startPreview = () => {
    setElapsedMs(0);
    setHasCompleted(false);
    startedAtRef.current = Date.now();
    setPreviewKey((current) => current + 1);
    setIsPlaying(true);
  };

  const progress = Math.min((elapsedMs / DURATION_MS) * 100, 100);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(30 - elapsedSeconds, 0);

  return (
    <section className="video-editor-workspace" aria-labelledby="video-editor-title">
      <div className="video-editor-heading">
        <div>
          <p className="video-editor-eyebrow">VIDEO PROJECT</p>
          <h2 id="video-editor-title">{title || "Untitled wedding design"}</h2>
          <p>Review your complete HTML invitation in a timed, portrait video preview.</p>
        </div>
        <button className="video-editor-save" type="button" onClick={onSave}>Save project</button>
      </div>

      <div className="video-editor-layout">
        <section className="video-editor-player-panel" aria-label="Wedding video preview">
          <div className="video-editor-panel-heading">
            <strong>Preview monitor</strong>
            <span>PORTRAIT · 9:16</span>
          </div>
          <div className="video-editor-preview-stage">
            <div className="video-editor-phone">
              {isPlaying ? (
                <iframe
                  key={previewKey}
                  title="Timed wedding video preview"
                  className="video-editor-iframe"
                  sandbox="allow-scripts"
                  srcDoc={previewDocument}
                />
              ) : (
                <div className="video-editor-preview-placeholder">
                  <span aria-hidden="true">{hasCompleted ? "✓" : "✦"}</span>
                  <strong>{hasCompleted ? "Preview complete" : "Your video preview"}</strong>
                  <small>{hasCompleted ? "Replay to watch it again." : "Start playback to run your HTML design for 30 seconds."}</small>
                </div>
              )}
            </div>
          </div>
          <div className="video-editor-playback">
            <button type="button" onClick={startPreview}>
              {hasCompleted || elapsedMs > 0 ? "↻ Replay 30 seconds" : "▶ Play 30-second preview"}
            </button>
            <span role="status" aria-live="polite">
              {isPlaying ? "Preview playing" : hasCompleted ? "Preview finished" : "Ready to preview"}
            </span>
          </div>
        </section>

        <section className="video-editor-controls" aria-label="Video project settings and timeline">
          <div className="video-editor-panel-heading">
            <strong>Project settings</strong>
            <span>FIXED FORMAT</span>
          </div>
          <div className="video-editor-settings">
            <div><span>Duration</span><strong>00:30</strong></div>
            <div><span>Canvas</span><strong>9:16 Portrait</strong></div>
            <div><span>Frame rate</span><strong>30 FPS</strong></div>
            <div><span>Source</span><strong>Complete HTML + JS</strong></div>
          </div>

          <div className="video-editor-timeline-heading">
            <strong>Playback timeline</strong>
            <span>00:{String(elapsedSeconds).padStart(2, "0")} / 00:30</span>
          </div>
          <div
            className="video-editor-timeline"
            role="progressbar"
            aria-label="30-second preview progress"
            aria-valuemin={0}
            aria-valuemax={30}
            aria-valuenow={elapsedSeconds}
          >
            <div className="video-editor-timeline-fill" style={{ width: progress + "%" }} />
          </div>
          <div className="video-editor-time-markers"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span></div>
          <p className="video-editor-remaining">
            {isPlaying ? remainingSeconds + " seconds remaining" : hasCompleted ? "30-second preview finished" : "Ready for a 30-second preview"}
          </p>

          <div className="video-editor-notice">
            <strong>Preview mode only</strong>
            <p>This runs your HTML and JavaScript in the same isolated preview environment as Design Studio. The timer measures playback time; it does not render or export an MP4. Export and server-side rendering will be added in Checkpoint 2.</p>
          </div>
          <p className="video-editor-save-status" role="status" aria-live="polite">{saveMessage}</p>
        </section>
      </div>
    </section>
  );
}
