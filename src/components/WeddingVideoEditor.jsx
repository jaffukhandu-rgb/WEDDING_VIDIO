import { useCallback, useEffect, useRef, useState } from "react";
import "./WeddingVideoEditor.css";
import { VideoRenderPanel } from "./VideoRenderPanel.jsx";

const BRIDGE = String.raw`<script id="wedding-editor-bridge">
(() => {
  let picked = null;
  let overlay = null;
  let activePointer = null;
  const send = (type, data = {}) => parent.postMessage({ source: "wedding-editor", type, ...data }, "*");
  const ignored = new Set(["SCRIPT", "STYLE", "META", "LINK", "HTML", "BODY"]);
  const getRect = (node) => {
    const r = node.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  };
  const refreshOverlay = () => {
    if (!picked || !overlay) return;
    const r = getRect(picked);
    overlay.style.left = r.x + "px";
    overlay.style.top = r.y + "px";
    overlay.style.width = Math.max(12, r.width) + "px";
    overlay.style.height = Math.max(12, r.height) + "px";
  };
  const report = () => {
    if (!picked) return;
    const s = getComputedStyle(picked);
    const c = s.color.match(/\d+/g) || [255,255,255];
    const rect = getRect(picked);
    send("select", {
      tag: picked.tagName.toLowerCase(),
      text: picked.tagName === "IMG" ? "" : (picked.innerText || picked.textContent || ""),
      color: "#" + c.slice(0,3).map(v => Number(v).toString(16).padStart(2,"0")).join(""),
      fontSize: parseInt(s.fontSize) || 16,
      fontFamily: s.fontFamily.split(",")[0].replace(/"/g,""),
      align: s.textAlign,
      width: Math.round(rect.width / Math.max(1, document.documentElement.clientWidth) * 100),
      height: rect.height,
      x: rect.x,
      y: rect.y,
      rotation: parseFloat(picked.style.rotate) || 0,
      textEditable: picked.tagName !== "IMG" && picked.children.length === 0,
      image: picked.tagName === "IMG",
      src: picked.src || ""
    });
    refreshOverlay();
  };
  const ensureOverlay = () => {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "we-selection-overlay";
    overlay.innerHTML = '<button type="button" data-we-handle="resize" aria-label="Resize element"></button><button type="button" data-we-handle="rotate" aria-label="Rotate element"></button>';
    overlay.style.cssText = "position:fixed;z-index:2147483647;border:1px solid #e4bd70;box-sizing:border-box;pointer-events:none;display:none;touch-action:none";
    overlay.querySelectorAll("button").forEach((h) => {
      h.style.cssText = "position:absolute;pointer-events:auto;width:14px;height:14px;padding:0;border:2px solid #17120c;border-radius:50%;background:#e4bd70;touch-action:none";
    });
    const resize = overlay.querySelector('[data-we-handle="resize"]');
    resize.style.right = "-7px"; resize.style.bottom = "-7px"; resize.style.cursor = "nwse-resize";
    const rotate = overlay.querySelector('[data-we-handle="rotate"]');
    rotate.style.left = "calc(50% - 7px)"; rotate.style.top = "-25px"; rotate.style.cursor = "grab";
    document.body.appendChild(overlay);
    overlay.addEventListener("pointerdown", startTransform);
  };
  const select = (node) => {
    if (!node || ignored.has(node.tagName) || node === overlay || overlay?.contains(node)) return;
    picked = node;
    ensureOverlay();
    overlay.style.display = "block";
    report();
  };
  const startTransform = (event) => {
    const handle = event.target.closest("[data-we-handle]");
    if (!handle || !picked) return;
    event.preventDefault();
    event.stopPropagation();
    const mode = handle.dataset.weHandle;
    const startX = event.clientX, startY = event.clientY;
    const rect = picked.getBoundingClientRect();
    const startWidth = rect.width, startHeight = rect.height;
    const startRotation = parseFloat(picked.style.rotate) || 0;
    const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
    activePointer = event.pointerId;
    handle.setPointerCapture(event.pointerId);
    const move = (e) => {
      if (e.pointerId !== activePointer) return;
      if (mode === "resize") {
        const w = Math.max(24, startWidth + e.clientX - startX);
        const h = Math.max(16, startHeight + e.clientY - startY);
        picked.style.width = w + "px";
        picked.style.height = h + "px";
        picked.style.maxWidth = "none";
      } else {
        const a0 = Math.atan2(startY - centerY, startX - centerX);
        const a1 = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        picked.style.rotate = (startRotation + (a1 - a0) * 180 / Math.PI) + "deg";
      }
      refreshOverlay();
    };
    const stop = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
      report();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  };
  document.addEventListener("click", (event) => {
    let node = event.target.closest("body *");
    const textRange = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (textRange?.startContainer?.nodeType === Node.TEXT_NODE) node = textRange.startContainer.parentElement;
    if (!node || ignored.has(node.tagName) || node === overlay || overlay?.contains(node)) return;
    event.preventDefault();
    event.stopPropagation();
    select(node);
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (!picked || event.target === overlay || overlay?.contains(event.target)) return;
    if (event.target === picked || picked.contains(event.target)) {
      const startX = event.clientX, startY = event.clientY;
      const oldTranslate = picked.style.translate || "0px 0px";
      const parts = oldTranslate.split(/\s+/).map(v => parseFloat(v) || 0);
      const baseX = parts[0] || 0, baseY = parts[1] || 0;
      const move = (e) => {
        if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 2) {
          picked.style.translate = (baseX + e.clientX - startX) + "px " + (baseY + e.clientY - startY) + "px";
          refreshOverlay();
        }
      };
      const stop = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", stop);
        document.removeEventListener("pointercancel", stop);
        report();
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", stop, { once: true });
      document.addEventListener("pointercancel", stop, { once: true });
    }
  }, true);
  addEventListener("message", (event) => {
    const m = event.data;
    if (event.source !== parent || m?.source !== "wedding-editor-host") return;
    if (m.type === "add") {
      const node = document.createElement(m.kind === "image" ? "img" : "div");
      node.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:1000;box-sizing:border-box";
      if (m.kind === "image") {
        node.src = m.src; node.alt = "Added wedding decoration"; node.style.width = "45%";
      } else if (m.kind === "shape") {
        node.style.cssText += ";width:55%;height:3px;background:#c9aa6c";
      } else {
        node.textContent = "Your text";
        node.style.cssText += ";width:80%;color:#f5e9cf;font:24px Georgia;text-align:center";
      }
      document.body.appendChild(node);
      select(node);
    }
    if (m.type === "update" && picked) {
      if (m.text !== undefined && picked.tagName !== "IMG" && picked.children.length === 0) picked.textContent = m.text;
      if (m.color) picked.style.color = m.color;
      if (m.fontSize) picked.style.fontSize = m.fontSize + "px";
      if (m.fontFamily) picked.style.fontFamily = m.fontFamily;
      if (m.align) picked.style.textAlign = m.align;
      if (m.width) picked.style.width = m.width + "%";
      if (m.rotation !== undefined) picked.style.rotate = m.rotation + "deg";
      if (m.src && picked.tagName === "IMG") picked.src = m.src;
      report();
    }
    if (m.type === "delete" && picked) {
      picked.remove(); picked = null;
      if (overlay) overlay.style.display = "none";
      send("clear");
    }
    if (m.type === "save") {
      if (overlay) overlay.remove();
      const savedHtml = "<!doctype html>" + String.fromCharCode(10) + document.documentElement.outerHTML;
      const cleanedHtml = savedHtml.replace(/(<body(?:\s[^>]*)?>)(?:\s*\\n\s*)+/i, "$1");
      send("saved", { html: cleanedHtml });
    }
  });
  addEventListener("scroll", refreshOverlay, true);
  addEventListener("resize", refreshOverlay);
})();
</script>`;
function instrument(html) {
  if (!html) return BRIDGE;
  if (html.includes('id="wedding-editor-bridge"')) return html;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, BRIDGE + "</body>") : html + BRIDGE;
}

export function WeddingVideoEditor({ title, previewDocument, onSave }) {
  const frame = useRef(null);
  const [key, setKey] = useState(0);
  const [item, setItem] = useState(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const srcDoc = instrument(previewDocument);
  const send = useCallback((message) => {
    frame.current?.contentWindow?.postMessage({ source: "wedding-editor-host", ...message }, "*");
  }, []);

  useEffect(() => {
    const listener = (event) => {
      if (event.source !== frame.current?.contentWindow || event.data?.source !== "wedding-editor") return;
      if (event.data.type === "select") setItem(event.data);
      if (event.data.type === "clear") setItem(null);
      if (event.data.type === "saved") {
        onSave?.(event.data.html);
        setStatus("Design saved in this browser.");
        setItem(null);
      }
    };
    addEventListener("message", listener);
    return () => removeEventListener("message", listener);
  }, [onSave]);

  const update = (message) => {
    setItem((current) => current ? { ...current, ...message } : current);
    send({ type: "update", ...message });
  };
  const save = () => { setStatus("Saving design…"); send({ type: "save" }); };

  return (
    <section className="visual-editor" aria-label="Wedding visual editor">
      <header className="visual-editor-header">
        <div>
          <p className="visual-eyebrow">VISUAL DESIGN EDITOR</p>
          <h2>{title || "Wedding design"}</h2>
          <p>Select an element, then drag it to move. Use the corner handle to resize and the top handle to rotate.</p>
        </div>
        <div className="visual-header-actions">
          <button type="button" onClick={() => { setItem(null); setKey((value) => value + 1); }}>Refresh</button>
          <button type="button" className="visual-primary" onClick={save}>Save design</button>
        </div>
      </header>

      <div className="visual-editor-layout visual-editor-preview-layout">
        <aside className="visual-tool-panel">
          <h3>Add elements</h3>
          <button type="button" onClick={() => send({ type: "add", kind: "text" })}>＋ Add text</button>
          <button type="button" onClick={() => send({ type: "add", kind: "shape" })}>＋ Add shape / line</button>
          <div className="visual-image-add">
            <label htmlFor="we-image">Image URL</label>
            <input id="we-image" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
            <button type="button" disabled={!/^https:\/\//i.test(url.trim())} onClick={() => { send({ type: "add", kind: "image", src: url.trim() }); setUrl(""); }}>＋ Add image</button>
          </div>
          <p className="visual-tool-note">Select an element, drag it anywhere, resize from its bottom-right handle, or rotate from the top handle.</p>
        </aside>

        <section className="visual-canvas-panel">
          <div className="visual-canvas-top"><strong>Editable wedding canvas</strong><span>9:16 PORTRAIT</span></div>
          <div className="visual-canvas-stage">
            <div className="visual-live-phone">
              <iframe key={key} ref={frame} title="Editable wedding invitation" className="visual-live-iframe" sandbox="allow-scripts" srcDoc={srcDoc} />
            </div>
          </div>
          <div className="visual-canvas-footer">Drag to move · Corner handle to resize · Top handle to rotate</div>
        </section>

        <aside className="visual-properties-panel">
          <h3>Properties</h3>
          {item ? (
            <>
              <p className="visual-selected-label">{item.tag?.toUpperCase()} SELECTED</p>
              {item.image ? (
                <label>Image URL<input value={item.src || ""} onChange={(event) => update({ src: event.target.value })} /></label>
              ) : (
                <>
                  {item.textEditable && <label>Text<textarea rows={3} value={item.text || ""} onChange={(event) => update({ text: event.target.value })} /></label>}
                  <label>Font<select value={item.fontFamily || "Georgia"} onChange={(event) => update({ fontFamily: event.target.value })}><option>Georgia</option><option>Arial</option><option>Times New Roman</option><option>Verdana</option><option>cursive</option></select></label>
                  <label>Font size<input type="range" min="8" max="100" value={Math.max(8, Math.min(100, item.fontSize || 16))} onChange={(event) => update({ fontSize: Number(event.target.value) })} /><span>{item.fontSize}px</span></label>
                  <label>Alignment<select value={item.align || "left"} onChange={(event) => update({ align: event.target.value })}><option>left</option><option>center</option><option>right</option></select></label>
                  <label>Colour<input type="color" value={item.color || "#ffffff"} onChange={(event) => update({ color: event.target.value })} /></label>
                </>
              )}
              <label>Width<input type="range" min="5" max="100" value={Math.max(5, Math.min(100, item.width || 80))} onChange={(event) => update({ width: Number(event.target.value) })} /><span>{item.width || 80}%</span></label>
              <label>Rotation<input type="range" min="-180" max="180" value={Math.max(-180, Math.min(180, item.rotation || 0))} onChange={(event) => update({ rotation: Number(event.target.value) })} /><span>{item.rotation || 0}°</span></label>
              <button type="button" className="visual-delete" onClick={() => { send({ type: "delete" }); setItem(null); }}>Delete selected element</button>
            </>
          ) : <p className="visual-empty-selection">Click an item on the invitation to select and edit it.</p>}
          <div className="visual-connection-note">Edits apply directly to this invitation. Save design to keep them in your local draft.</div>
        </aside>
      </div>
      <VideoRenderPanel html={previewDocument} title={title} />
      <footer className="visual-editor-footer"><span role="status">{status || "Ready to edit."}</span><span>Local browser draft · MP4 export not connected</span></footer>
    </section>
  );
}
