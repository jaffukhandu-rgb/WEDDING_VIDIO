import { useState } from "react";
import "./WeddingVideoEditor.css";

export function WeddingVideoEditor({ title, previewDocument, onSave }) {
  const [previewKey, setPreviewKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");

  const save = () => {
    onSave?.();
    setSaveMessage("Your current Design Studio draft has been saved.");
  };

  return (
    <section className="visual-editor" aria-label="Wedding video editor">
      <header className="visual-editor-header">
        <div>
          <p className="visual-eyebrow">VIDEO CANVAS</p>
          <h2>{title || "Untitled wedding design"}</h2>
          <p>This canvas uses your actual Design Studio HTML, CSS and JavaScript preview.</p>
        </div>
        <div className="visual-header-actions">
          <button type="button" className="visual-secondary" onClick={() => setPreviewKey((value) => value + 1)}>Refresh preview</button>
          <button type="button" className="visual-primary" onClick={save}>Save draft</button>
        </div>
      </header>

      <div className="visual-editor-layout visual-editor-preview-layout">
        <aside className="visual-tool-panel">
          <h3>Your design</h3>
          <p className="visual-tool-note">This is the same live design document used by Design Studio. Edit the HTML, CSS or JavaScript in Design Studio and return here to see the exact result.</p>
          <div className="visual-sync-status"><i /> Connected to Design Studio preview</div>
          <button type="button" onClick={() => setPreviewKey((value) => value + 1)}>↻ Reload current design</button>
        </aside>

        <section className="visual-canvas-panel" aria-label="Live wedding design canvas">
          <div className="visual-canvas-top"><strong>Live design canvas</strong><span>9:16 PORTRAIT</span></div>
          <div className="visual-canvas-stage">
            <div className="visual-live-phone">
              <iframe
                key={previewKey}
                title="Wedding design live canvas"
                className="visual-live-iframe"
                sandbox="allow-scripts"
                srcDoc={previewDocument || "<!doctype html><html><body><p>No design preview is available.</p></body></html>"}
              />
            </div>
          </div>
          <div className="visual-canvas-footer"><span>Same source as Design Studio</span><span>Live HTML + CSS + JS preview</span></div>
        </section>

        <aside className="visual-properties-panel">
          <h3>Design connection</h3>
          <p className="visual-tool-note">The preview is now shared with Design Studio, so it no longer displays a separate sample invitation.</p>
          <div className="visual-connection-detail"><span>Design</span><strong>{title || "Untitled wedding design"}</strong></div>
          <div className="visual-connection-detail"><span>Source</span><strong>Complete HTML + CSS + JS</strong></div>
          <div className="visual-connection-detail"><span>Canvas</span><strong>Portrait · 9:16</strong></div>
          <div className="visual-connection-note">Direct selection and editing of individual HTML elements is the next integration step. This preview connection does not pretend those controls are already active.</div>
        </aside>
      </div>
      <footer className="visual-editor-footer"><span role="status" aria-live="polite">{saveMessage || "Showing your current Design Studio draft."}</span><span>Preview is shared · MP4 export is not connected yet</span></footer>
    </section>
  );
}
