import { useEffect, useRef, useState } from "react";
import "./WeddingVideoEditor.css";

const STORAGE_KEY = "wedding-visual-editor-v1";
const STARTER = [
  { id: "starter-kicker", type: "text", text: "TOGETHER WITH THEIR FAMILIES", x: 50, y: 25, width: 82, fontSize: 10, color: "#d7bd8b", fontFamily: "Arial", align: "center", weight: 600 },
  { id: "starter-title", type: "text", text: "Aarav  &  Kiara", x: 50, y: 43, width: 90, fontSize: 29, color: "#f5e9cf", fontFamily: "Georgia", align: "center", weight: 400 },
  { id: "starter-message", type: "text", text: "Invite you to celebrate the beginning of their forever.", x: 50, y: 57, width: 76, fontSize: 13, color: "#eadfc9", fontFamily: "Georgia", align: "center", weight: 400 },
  { id: "starter-date", type: "text", text: "24 · APRIL · 2026", x: 50, y: 70, width: 80, fontSize: 11, color: "#d7bd8b", fontFamily: "Arial", align: "center", weight: 600 },
];
const newId = () => "element-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);

function loadProject() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { elements: STARTER, background: "#21141f" };
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed.elements) ? parsed : { elements: STARTER, background: "#21141f" };
  } catch {
    return { elements: STARTER, background: "#21141f" };
  }
}

export function WeddingVideoEditor({ title, onSave }) {
  const [project, setProject] = useState(loadProject);
  const [selectedId, setSelectedId] = useState("starter-title");
  const [imageUrl, setImageUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const selected = project.elements.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    const move = (event) => {
      if (!dragRef.current || !canvasRef.current) return;
      const bounds = canvasRef.current.getBoundingClientRect();
      const dx = ((event.clientX - dragRef.current.startX) / bounds.width) * 100;
      const dy = ((event.clientY - dragRef.current.startY) / bounds.height) * 100;
      const drag = dragRef.current;
      setProject((current) => ({ ...current, elements: current.elements.map((item) => item.id === drag.id ? { ...item, x: Math.max(3, Math.min(97, drag.x + dx)), y: Math.max(3, Math.min(97, drag.y + dy)) } : item) }));
    };
    const stop = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
  }, []);

  const update = (id, changes) => setProject((current) => ({ ...current, elements: current.elements.map((item) => item.id === id ? { ...item, ...changes } : item) }));
  const add = (type) => {
    const id = newId();
    const item = type === "shape"
      ? { id, type, x: 50, y: 50, width: 40, height: 2, color: "#c9aa6c" }
      : { id, type: "text", text: "Your text", x: 50, y: 50, width: 76, fontSize: 24, color: "#f5e9cf", fontFamily: "Georgia", align: "center", weight: 400 };
    setProject((current) => ({ ...current, elements: [...current.elements, item] }));
    setSelectedId(id);
  };
  const addImage = () => {
    if (!imageUrl.trim()) return;
    const id = newId();
    setProject((current) => ({ ...current, elements: [...current.elements, { id, type: "image", src: imageUrl.trim(), x: 50, y: 50, width: 58, height: 120 }] }));
    setSelectedId(id);
    setImageUrl("");
  };
  const remove = () => {
    if (!selected) return;
    setProject((current) => ({ ...current, elements: current.elements.filter((item) => item.id !== selected.id) }));
    setSelectedId(null);
  };
  const layer = (direction) => {
    if (!selected) return;
    setProject((current) => {
      const index = current.elements.findIndex((item) => item.id === selected.id);
      const target = index + direction;
      if (target < 0 || target >= current.elements.length) return current;
      const elements = [...current.elements];
      [elements[index], elements[target]] = [elements[target], elements[index]];
      return { ...current, elements };
    });
  };
  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      onSave?.();
      setSaveMessage("Design saved on this browser.");
    } catch {
      setSaveMessage("Could not save. Browser storage may be full.");
    }
  };
  const reset = () => {
    if (!window.confirm("Reset the canvas? Your current editor changes will be lost.")) return;
    setProject({ elements: STARTER, background: "#21141f" });
    setSelectedId("starter-title");
    setSaveMessage("Starter design restored. Save to keep it.");
  };
  const beginDrag = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    dragRef.current = { id: item.id, startX: event.clientX, startY: event.clientY, x: item.x, y: item.y };
  };

  return <section className="visual-editor" aria-label="Wedding design editor">
    <header className="visual-editor-header">
      <div><p className="visual-eyebrow">CANVAS EDITOR</p><h2>{title || "Untitled wedding design"}</h2><p>Add elements and arrange your own design on the portrait canvas.</p></div>
      <div className="visual-header-actions"><button type="button" className="visual-secondary" onClick={reset}>Reset</button><button type="button" className="visual-primary" onClick={save}>Save design</button></div>
    </header>
    <div className="visual-editor-layout">
      <aside className="visual-tool-panel" aria-label="Add design elements">
        <h3>Add elements</h3>
        <button type="button" onClick={() => add("text")}>＋ Add text</button>
        <button type="button" onClick={() => add("shape")}>＋ Add line / shape</button>
        <div className="visual-image-add"><label htmlFor="visual-image-url">Add image by URL</label><input id="visual-image-url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." /><button type="button" disabled={!imageUrl.trim()} onClick={addImage}>＋ Add image</button></div>
        <p className="visual-tool-note">Drag items on the canvas to position them. Select an item to edit it.</p>
      </aside>
      <section className="visual-canvas-panel" aria-label="Design canvas">
        <div className="visual-canvas-top"><strong>Design canvas</strong><span>9:16 PORTRAIT</span></div>
        <div className="visual-canvas-stage"><div ref={canvasRef} className="visual-canvas" style={{ background: project.background }} onPointerDown={() => setSelectedId(null)}>
          <div className="visual-canvas-border" />
          {project.elements.map((item, index) => <div key={item.id} className={"visual-canvas-item " + (selectedId === item.id ? "is-selected" : "")} style={{ left: item.x + "%", top: item.y + "%", width: item.width + "%", zIndex: index + 1, transform: "translate(-50%, -50%)" }} onPointerDown={(event) => beginDrag(event, item)} onClick={(event) => { event.stopPropagation(); setSelectedId(item.id); }}>
            {item.type === "text" && <span style={{ color: item.color, fontSize: "clamp(8px, " + (item.fontSize / 3.8) + "vw, " + item.fontSize + "px)", fontFamily: item.fontFamily, fontWeight: item.weight, textAlign: item.align }}>{item.text}</span>}
            {item.type === "shape" && <span className="visual-shape" style={{ height: item.height + "px", background: item.color }} />}
            {item.type === "image" && <img src={item.src} alt="Design element" style={{ width: "100%", height: item.height + "px", objectFit: "cover" }} />}
          </div>)}
        </div></div>
        <div className="visual-canvas-footer"><span>540 × 960 canvas</span><span>Select and drag elements to arrange</span></div>
      </section>
      <aside className="visual-properties-panel">
        <h3>Properties</h3>
        {selected ? <>
          <p className="visual-selected-label">{selected.type.toUpperCase()} SELECTED</p>
          {selected.type === "text" && <>
            <label>Text<textarea rows={3} value={selected.text} onChange={(event) => update(selected.id, { text: event.target.value })} /></label>
            <label>Font<select value={selected.fontFamily} onChange={(event) => update(selected.id, { fontFamily: event.target.value })}><option>Georgia</option><option>Arial</option><option>Times New Roman</option><option>Verdana</option></select></label>
            <label>Font size<input type="range" min="10" max="56" value={selected.fontSize} onChange={(event) => update(selected.id, { fontSize: Number(event.target.value) })} /><span>{selected.fontSize}px</span></label>
            <label>Alignment<select value={selected.align} onChange={(event) => update(selected.id, { align: event.target.value })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label>Weight<select value={selected.weight} onChange={(event) => update(selected.id, { weight: Number(event.target.value) })}><option value="400">Regular</option><option value="600">Semi-bold</option><option value="700">Bold</option></select></label>
          </>}
          <label>Colour<input type="color" value={selected.color || "#c9aa6c"} onChange={(event) => update(selected.id, { color: event.target.value })} /></label>
          <label>Width<input type="range" min="10" max="100" value={selected.width} onChange={(event) => update(selected.id, { width: Number(event.target.value) })} /><span>{selected.width}%</span></label>
          {selected.type === "image" && <label>Image URL<input value={selected.src} onChange={(event) => update(selected.id, { src: event.target.value })} /></label>}
          <div className="visual-layer-actions"><button type="button" onClick={() => layer(1)}>Bring forward</button><button type="button" onClick={() => layer(-1)}>Send backward</button></div>
          <button type="button" className="visual-delete" onClick={remove}>Delete element</button>
        </> : <p className="visual-empty-selection">Select an element on the canvas to edit its properties.</p>}
        <div className="visual-layers"><h3>Layers</h3>{[...project.elements].reverse().map((item) => <button type="button" key={item.id} className={selectedId === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>{item.type === "text" ? (item.text || "Text").slice(0, 22) : item.type === "image" ? "Image" : "Shape"}</button>)}</div>
      </aside>
    </div>
    <footer className="visual-editor-footer"><span role="status" aria-live="polite">{saveMessage || "Changes are local until you save."}</span><span>Editor foundation · Video export not connected yet</span></footer>
  </section>;
}
