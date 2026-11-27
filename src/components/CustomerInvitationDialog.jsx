import { useEffect, useRef, useState } from "react";
import { eventKeys, fieldLimit, PHOTO_LIMIT, photoKey, prepareCustomerInvitation, requiredField } from "../customer-invitation.js";

const labels = { partner1: "First partner’s name", partner2: "Second partner’s name" };
const title = key => Object.hasOwn(labels, key) ? labels[key] : key[0].toUpperCase() + key.slice(1);
const musicTypes = ["audio/mpeg","audio/mp3","audio/mp4","audio/x-m4a","audio/wav","audio/x-wav","audio/ogg","audio/aac","audio/webm"];
function readMedia(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("Could not read " + file.name));
    reader.readAsDataURL(file);
  });
}
function Detail({ name, value, change, event }) {
  const props = { value, maxLength: event ? 300 : fieldLimit(name), onChange: e => change(e.target.value),
    required: requiredField(name) || (event && ["name","time"].includes(name)) };
  return <label className="published-photo-field"><span>{title(name)}</span>
    {name === "message" || name === "address" || name === "note"
      ? <textarea {...props} rows={2} /> : <input {...props} type={name === "date" ? "date" : "text"} />}
  </label>;
}

function DownloadAction({ url }) {
  const [done, setDone] = useState(false);
  return <div className="published-download-control">
    <a className={"published-download-action" + (done ? " is-done" : "")}
      href={url} download="personalized-invitation.mp4"
      aria-label={done ? "Done — download MP4 again" : "Download MP4"}
      onClick={() => setDone(true)}>
      <span className="published-download-window" aria-hidden="true">
        <span className="published-download-roll">
          <span className="published-download-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" />
            </svg>
            Download MP4
          </span>
          <span className="published-download-row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
            </svg>
            Done
          </span>
        </span>
      </span>
    </a>
    <span className="published-download-feedback" role="status">{done ? "Check your browser downloads." : ""}</span>
  </div>;
}

export function CustomerInvitationDialog({ template, analysis, apiRoot, close }) {
  const [details, setDetails] = useState(() => Object.fromEntries(analysis.fields.filter(key => key !== "photos")
    .map(key => [key, key === "events" ? analysis.config.events.map(event =>
      Object.fromEntries(eventKeys(event).map(k => [k,event[k]]))) : analysis.config[key]])));
  const [photos, setPhotos] = useState({});
  const [music, setMusic] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [download, setDownload] = useState("");
  const dialog = useRef(null), active = useRef(null), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const node = dialog.current;
    node.showModal();
    return () => { mounted.current = false; active.current?.abort(); node.close(); };
  }, []);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download); }, [download]);

  function editField(key, value, eventIndex) {
    // Generated single-event boards mirror these three values in two CONFIG locations.
    const mirror = analysis.config.events?.length === 1 && template.html.includes('data-video-auto-layout="v1"') &&
      ["venue","date","time"].includes(key) && Object.hasOwn(details,key) && Object.hasOwn(details.events[0],key);
    setDetails(prev => {
      const next = { ...prev };
      if (eventIndex === undefined || mirror) next[key] = value;
      if (eventIndex !== undefined || mirror) next.events = prev.events.map((event,i) =>
        i === (eventIndex ?? 0) ? { ...event, [key]: value } : event);
      return next;
    });
  }

  async function prepare(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const selected = {};
      for (const [id,file] of Object.entries(photos)) {
        if (!file) continue;
        const data = await readMedia(file);
        selected[id] = data;
      }
      const html = prepareCustomerInvitation(template.html, details, selected, analysis, Boolean(music));
      for (const data of Object.values(selected)) {
        const image = new Image();
        image.src = data;
        try { await image.decode(); } catch { throw Error("Could not decode the selected photo."); }
      }
      const audio = music && await readMedia(music);
      if (mounted.current) setPreview({ html, selected, audio });
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  }

  async function render() {
    if (active.current || !preview) return;
    if (!window.isSecureContext) {
      setError("Open this invitation over HTTPS to generate a private MP4.");
      return;
    }
    let jobId;
    try {
      jobId = window.crypto.randomUUID();
    } catch {
      setError("Your browser couldn’t create a secure export ID. Try again or use an up-to-date browser.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    const headers = { "Content-Type": "application/json", "X-Render-Job": jobId };
    setBusy(true); setError(""); setProgress("Preparing your MP4…");
    let polling = false;
    const timer = setInterval(async () => {
      if (polling || controller.signal.aborted) return;
      polling = true;
      try {
        const response = await fetch(apiRoot + "/api/customer/render/progress", { headers, signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const p = await response.json();
          if (!controller.signal.aborted) setProgress(p.phase === "rendering"
            ? "Rendering " + Math.floor(100*p.frame/p.totalFrames) + "%" : title(p.phase) + "…");
        }
      } catch { /* The POST owns the export result. */ }
      finally { polling = false; }
    }, 1200);
    const timeout = setTimeout(() => controller.abort(), 22 * 60 * 1000);
    try {
      const response = await fetch(apiRoot + "/api/customer/render", { method: "POST", headers, signal: controller.signal,
        body: JSON.stringify({ templateId: template.id, revision: template.revision, details, photos: preview.selected,
          ...(preview.audio ? { audioBase64: preview.audio.split(",")[1], audioMimeType: music.type } : {}) }) });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw Error(typeof body?.error === "string" && body.error.trim()
          ? body.error : "The video service could not complete your export. Please try again.");
      }
      const blob = await response.blob();
      if (blob.type !== "video/mp4" || await blob.slice(4,8).text() !== "ftyp") throw Error("Incomplete MP4. Try again.");
      if (mounted.current) setDownload(URL.createObjectURL(blob));
    } catch (err) { if (mounted.current) setError(controller.signal.aborted ? "Export timed out. Try again." : err.message); }
    finally {
      clearInterval(timer); clearTimeout(timeout); controller.abort(); active.current = null;
      if (mounted.current) { setBusy(false); setProgress(""); }
    }
  }

  function selectFile(input, slot) {
    const file = input.files?.[0];
    const valid = slot ? ["image/png","image/jpeg","image/webp"] : musicTypes;
    const limit = slot ? PHOTO_LIMIT : 8 * 1024 * 1024;
    if (file && (!valid.includes(file.type) || !file.size || file.size > limit)) {
      input.value = "";
      setError(slot ? "Choose a JPG, PNG or WebP up to 3 MiB." : "Choose a supported audio file up to 8 MiB.");
      if (slot) setPhotos(prev => ({ ...prev, [photoKey(slot)]: null })); else setMusic(null);
      return;
    }
    setError("");
    if (slot) setPhotos(prev => ({ ...prev, [photoKey(slot)]: file })); else setMusic(file);
  }

  return <dialog ref={dialog} className={"customer-dialog " + (preview ? "published-preview-dialog" : "published-photo-dialog")}
    aria-labelledby="customer-title" onCancel={e => { e.preventDefault(); close(); }}>
    <div className="published-preview-heading"><h3 id="customer-title">{template.title}</h3>
      <button type="button" onClick={close}>Close ×</button></div>
    <form hidden={Boolean(preview)} onSubmit={prepare}>
      <fieldset disabled={busy}><legend>Personalize your invitation</legend>
        <div className="published-photo-fields">
          {Object.entries(details).filter(([key]) => key !== "events").map(([key,value]) =>
            <Detail key={key} name={key} value={value} change={v => editField(key,v)} />)}
          {details.events?.map((event,i) => <fieldset key={i}><legend>Event {i+1}</legend>
            {Object.entries(event).map(([key,value]) => <Detail key={key} event name={key} value={value}
              change={v => editField(key,v,i)} />)}</fieldset>)}
          {analysis.photoSlots.map(slot => <label key={photoKey(slot)} className="published-photo-field">{slot.label} (optional)
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => selectFile(e.target, slot)} /></label>)}
          <label className="published-photo-field">Soundtrack (optional, up to 8 MiB)
            <input type="file" accept={musicTypes.join(",")} onChange={e => selectFile(e.target)} /></label>
        </div><div className="published-photo-actions"><button type="submit">{busy ? "Preparing…" : "Preview invitation"}</button></div>
      </fieldset>
    </form>
    {preview && <><iframe title={"Invitation " + template.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={preview.html} />
      {preview.audio && <audio controls autoPlay loop src={preview.audio} aria-label="Selected soundtrack" />}
      <p>Check that every name and event fits before generating your MP4.</p>
      <div className={"published-photo-actions" + (download ? " published-download-actions" : "")}>
        <button type="button" disabled={busy} onClick={() => { setPreview(null); setDownload(""); setError(""); }}>Edit details</button>
        {download ? <DownloadAction key={download} url={download} /> :
          <button type="button" disabled={busy} onClick={render}>{busy ? "Generating MP4…" : "Generate MP4"}</button>}
      </div></>}
    {progress && <p role="status">{progress}</p>}{error && <p role="alert" className="published-error">{error}</p>}
  </dialog>;
}
