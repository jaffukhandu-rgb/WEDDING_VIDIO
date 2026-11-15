import { useEffect, useMemo, useState } from "react";
import "./AdminPanel.css";

const STORAGE_KEY = "wedding-admin-draft-v1";

const STARTER_HTML = `<main class="invitation">
  <div class="ornament">✦</div>
  <p class="eyebrow">TOGETHER WITH THEIR FAMILIES</p>
  <h1>Aarav <span>&</span> Kiara</h1>
  <div class="rule"></div>
  <p class="message">Invite you to celebrate the beginning of their forever.</p>
  <p class="date">24 · APRIL · 2026</p>
  <p class="venue">THE ROYAL GARDEN · PUNE</p>
  <div class="ornament bottom">❦</div>
</main>`;

const STARTER_CSS = `* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  color: #f5e9cf;
  background: radial-gradient(circle at 50% 25%, #684052, #21141f 72%);
  font-family: Georgia, serif;
}
.invitation {
  width: 84%;
  min-height: 78vh;
  padding: 12% 8%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid #c9aa6c;
  outline: 1px solid rgba(201,170,108,.35);
  outline-offset: -12px;
  background: linear-gradient(145deg, rgba(255,255,255,.06), transparent);
}
.ornament { color: #e1c58d; font-size: 34px; }
.eyebrow, .date, .venue {
  color: #d7bd8b;
  font: 600 9px/1.8 Arial, sans-serif;
  letter-spacing: .2em;
}
h1 { margin: 24px 0; font-size: clamp(30px, 8vw, 54px); font-weight: 400; }
h1 span { color: #d7bd8b; font-style: italic; }
.rule { width: 54px; height: 1px; background: #d7bd8b; }
.message { max-width: 240px; color: #eadfc9; font-size: 15px; line-height: 1.7; }
.date { margin-top: 26px; }
.venue { margin-top: 4px; }
.bottom { margin-top: 30px; }`;

function makePreviewDocument(html, css) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body { width: 100%; min-height: 100%; }
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

function readDraft() {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "Untitled wedding design",
      html: typeof parsed.html === "string" ? parsed.html : STARTER_HTML,
      css: typeof parsed.css === "string" ? parsed.css : STARTER_CSS,
    };
  } catch {
    return null;
  }
}

export function AdminPanel() {
  const [draft, setDraft] = useState(() => readDraft() || {
    title: "Royal Wedding Invitation",
    html: STARTER_HTML,
    css: STARTER_CSS,
  });
  const [activeEditor, setActiveEditor] = useState("html");
  const [saveMessage, setSaveMessage] = useState("");
  const [previewKey, setPreviewKey] = useState(0);

  const previewDocument = useMemo(
    () => makePreviewDocument(draft.html, draft.css),
    [draft.html, draft.css],
  );

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timeout = window.setTimeout(() => setSaveMessage(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setSaveMessage("Draft saved on this browser.");
    } catch {
      setSaveMessage("Could not save. Browser storage may be unavailable.");
    }
  };

  const resetDraft = () => {
    const confirmed = window.confirm("Replace this draft with the starter design? Your current unsaved edits will be lost.");
    if (!confirmed) return;
    setDraft({
      title: "Royal Wedding Invitation",
      html: STARTER_HTML,
      css: STARTER_CSS,
    });
    setSaveMessage("Starter design restored. Save it to keep this version.");
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Return to customer website">
          <span className="admin-brand-mark">W</span>
          <span><strong>WEDDING</strong><small>CREATOR STUDIO</small></span>
        </a>
        <div className="admin-side-label">WORKSPACE</div>
        <a className="admin-side-link is-active" href="/admin">✦ <span>Design Studio</span></a>
        <div className="admin-side-label admin-side-label-lower">COMING NEXT</div>
        <div className="admin-side-muted">▧ <span>My Templates</span></div>
        <div className="admin-side-muted">◷ <span>Video Editor</span></div>
        <div className="admin-side-muted">⚙ <span>Settings</span></div>
        <div className="admin-sidebar-bottom">
          <span className="admin-status-dot" />
          <span>Local draft mode</span>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-breadcrumb">ADMIN / DESIGN STUDIO</p>
            <h1>Design workspace</h1>
          </div>
          <a className="admin-view-site" href="/">View customer site ↗</a>
        </header>

        <div className="admin-intro-row">
          <div>
            <p className="admin-kicker">CREATE A NEW TEMPLATE</p>
            <h2>Bring your invitation to life.</h2>
            <p className="admin-description">Write your HTML and CSS, then see your design update in the preview.</p>
          </div>
          <div className="admin-duration-pill"><span>◷</span> VIDEO FORMAT <strong>30 SEC · 9:16</strong></div>
        </div>

        <div className="admin-project-bar">
          <label className="admin-title-field">
            <span>DESIGN NAME</span>
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              maxLength={80}
              placeholder="Name your design"
            />
          </label>
          <div className="admin-project-actions">
            <button className="admin-reset-button" type="button" onClick={resetDraft}>Reset</button>
            <button className="admin-save-button" type="button" onClick={saveDraft}>Save draft</button>
          </div>
        </div>

        <div className="admin-workspace-grid">
          <section className="admin-editor-panel" aria-label="Design code editor">
            <div className="admin-panel-heading">
              <div><span className="admin-step-number">01</span><strong>Code editor</strong></div>
              <span className="admin-live-label"><i /> LIVE PREVIEW</span>
            </div>
            <div className="admin-editor-tabs" role="tablist" aria-label="Code type">
              <button type="button" role="tab" aria-selected={activeEditor === "html"} className={activeEditor === "html" ? "active" : ""} onClick={() => setActiveEditor("html")}>〈〉 HTML</button>
              <button type="button" role="tab" aria-selected={activeEditor === "css"} className={activeEditor === "css" ? "active" : ""} onClick={() => setActiveEditor("css")}>✳ CSS</button>
            </div>
            <label className="admin-code-label" htmlFor="admin-code-input">{activeEditor === "html" ? "HTML MARKUP" : "CSS STYLES"}</label>
            <textarea
              id="admin-code-input"
              className="admin-code-input"
              spellCheck="false"
              autoCapitalize="off"
              autoCorrect="off"
              value={draft[activeEditor]}
              onChange={(event) => updateDraft(activeEditor, event.target.value)}
              aria-label={activeEditor === "html" ? "HTML code" : "CSS code"}
            />
            <div className="admin-editor-footer">
              <span>{activeEditor.toUpperCase()} · {draft[activeEditor].length.toLocaleString()} characters</span>
              <span>HTML and CSS only</span>
            </div>
          </section>

          <section className="admin-preview-panel" aria-label="Live design preview">
            <div className="admin-panel-heading">
              <div><span className="admin-step-number">02</span><strong>Live preview</strong></div>
              <button className="admin-refresh-button" type="button" onClick={() => setPreviewKey((value) => value + 1)}>↻ Refresh</button>
            </div>
            <div className="admin-preview-stage">
              <div className="admin-phone-frame">
                <div className="admin-phone-camera" />
                <iframe
                  key={previewKey}
                  title="Isolated wedding invitation preview"
                  className="admin-preview-iframe"
                  sandbox=""
                  srcDoc={previewDocument}
                />
              </div>
            </div>
            <div className="admin-preview-footer">
              <span><i /> 9:16 PORTRAIT CANVAS</span>
              <span>30-second video target</span>
            </div>
          </section>
        </div>

        <div className="admin-notice">
          <span className="admin-notice-icon">i</span>
          <p><strong>Safe preview mode.</strong> Your HTML runs inside an isolated preview frame. Drafts are currently saved only in this browser. Publishing to the customer gallery and exporting MP4 videos will be connected in later steps.</p>
        </div>
        <div className="admin-bottom-row">
          <a href="/">← Back to customer website</a>
          <span role="status" aria-live="polite">{saveMessage}</span>
        </div>
      </section>
    </main>
  );
}
