import { useEffect, useMemo, useRef, useState } from "react";
import "./AdminPanel.css";
import { buildRoyalPalaceInvitationHtml } from "../templates/royalPalaceInvitation.js";

const TEMPLATE_STORAGE_KEY = "wedding-template-manager-v1";
const ASSET_DB_NAME = "wedding-template-assets";
const ASSET_STORE = "files";
const CATEGORIES = ["Wedding", "Birthday", "Anniversary", "Engagement", "Baby Shower", "Festival", "Corporate", "Other"];

const FIELD_PRESETS = {
  Wedding: [
    ["Bride name", "brideName"], ["Groom name", "groomName"], ["Event date", "eventDate"],
    ["Event time", "eventTime"], ["Venue name", "venueName"], ["Venue address", "venueAddress"],
    ["Invitation message", "invitationMessage"], ["Host line", "hostLine"], ["Photos", "photos"]
  ],
  Birthday: [
    ["Celebrant name", "celebrantName"], ["Age", "age"], ["Event date", "eventDate"],
    ["Event time", "eventTime"], ["Venue name", "venueName"], ["Venue address", "venueAddress"],
    ["Invitation message", "invitationMessage"], ["Photos", "photos"]
  ],
  Anniversary: [
    ["Couple names", "coupleNames"], ["Years together", "yearsTogether"], ["Event date", "eventDate"],
    ["Event time", "eventTime"], ["Venue name", "venueName"], ["Invitation message", "invitationMessage"], ["Photos", "photos"]
  ],
  Engagement: [
    ["Partner names", "partnerNames"], ["Event date", "eventDate"], ["Event time", "eventTime"],
    ["Venue name", "venueName"], ["Venue address", "venueAddress"], ["Invitation message", "invitationMessage"], ["Photos", "photos"]
  ],
  "Baby Shower": [
    ["Parent name", "parentName"], ["Baby name", "babyName"], ["Event date", "eventDate"],
    ["Event time", "eventTime"], ["Venue name", "venueName"], ["Invitation message", "invitationMessage"], ["Photos", "photos"]
  ],
  Festival: [["Family name", "familyName"], ["Greeting message", "greetingMessage"], ["Photos", "photos"]],
  Corporate: [
    ["Company name", "companyName"], ["Event title", "eventTitle"], ["Event date", "eventDate"],
    ["Event time", "eventTime"], ["Venue name", "venueName"], ["Venue address", "venueAddress"], ["Message", "message"]
  ],
  Other: [["Main title", "mainTitle"], ["Event date", "eventDate"], ["Event time", "eventTime"], ["Venue", "venue"], ["Message", "message"], ["Photos", "photos"]]
};

function getDefaultFields(category) {
  return (FIELD_PRESETS[category] || FIELD_PRESETS.Other).map(([label, key]) => ({
    label, key, enabled: ["brideName", "groomName", "eventDate", "venueName"].includes(key) || (category !== "Wedding" && ["celebrantName", "eventDate", "venueName", "mainTitle"].includes(key)),
    required: ["brideName", "groomName", "celebrantName", "eventDate", "venueName", "mainTitle"].includes(key),
    type: key === "eventDate" ? "date" : key === "eventTime" ? "time" : key === "photos" ? "photos" : ["invitationMessage", "venueAddress", "message", "greetingMessage"].includes(key) ? "textarea" : "text",
    maxLength: key === "invitationMessage" || key === "message" || key === "greetingMessage" ? 300 : 100
  }));
}

const INITIAL_WEDDING = {
  id: "canva-royal-palace-wedding",
  title: "Royal Palace Wedding Invitation · 30s",
  category: "Wedding",
  description: "A 30-second animated royal palace invitation with editable couple names, date, time, venue, message and a photo.",
  canvaUrl: "",
  thumbnailKey: null,
  thumbnailUrl: null,
  designKey: null,
  musicKey: null,
  builtInTemplateKey: "royal-palace",
  designName: "Built-in animated template · 30 seconds",
  fields: getDefaultFields("Wedding"),
  allowCustomerMusic: true,
  status: "Published",
  sourceLabel: "Built-in animated invitation. Customer details update in the live preview and final MP4.",
  createdAt: "2026-11-17T00:00:00.000Z"
};

function readTemplates() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) || "null");
    if (!Array.isArray(saved)) return [INITIAL_WEDDING];
    const hasSeed = saved.some(item => item?.id === INITIAL_WEDDING.id);
    if (!hasSeed) return [INITIAL_WEDDING, ...saved];
    return saved.map(item => item.id === INITIAL_WEDDING.id
      ? { ...INITIAL_WEDDING, ...item, builtInTemplateKey: INITIAL_WEDDING.builtInTemplateKey,
          designName: INITIAL_WEDDING.designName, sourceLabel: INITIAL_WEDDING.sourceLabel,
          status: item.builtInTemplateKey ? item.status : "Published" }
      : item);
  } catch {
    return [INITIAL_WEDDING];
  }
}

function openAssetDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local file storage."));
      return;
    }
    const request = window.indexedDB.open(ASSET_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local file storage."));
  });
}

async function storeAsset(key, file) {
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readwrite");
    transaction.objectStore(ASSET_STORE).put(file, key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

async function loadAsset(key) {
  if (!key) return null;
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readonly");
    const request = transaction.objectStore(ASSET_STORE).get(key);
    request.onsuccess = () => {
      db.close();
      resolve(request.result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function deleteAsset(key) {
  if (!key) return;
  const db = await openAssetDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_STORE, "readwrite");
    transaction.objectStore(ASSET_STORE).delete(key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>
  };
  return <svg className="adm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.layers}</svg>;
}

export function AdminPanel() {
  const [templates, setTemplates] = useState(readTemplates);
  const builtInRoyalPreviewHtml = useMemo(() => buildRoyalPalaceInvitationHtml({
    brideName: "Aarav",
    groomName: "Kiara",
    date: "24 April 2027",
    time: "6:30 PM",
    venue: "The Royal Garden",
    address: "Pune, Maharashtra",
    message: "With joyful hearts, we invite you to celebrate our wedding day.",
    host: "Together with our families"
  }), []);
  const [activeSection, setActiveSection] = useState("library");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Wedding");
  const [description, setDescription] = useState("");
  const [canvaUrl, setCanvaUrl] = useState("");
  const [designFile, setDesignFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [musicFile, setMusicFile] = useState(null);
  const [existingDesignKey, setExistingDesignKey] = useState(null);
  const [existingBuiltInTemplateKey, setExistingBuiltInTemplateKey] = useState("");
  const [existingThumbnailKey, setExistingThumbnailKey] = useState(null);
  const [existingMusicKey, setExistingMusicKey] = useState(null);
  const [existingDesignName, setExistingDesignName] = useState("");
  const [existingThumbnailName, setExistingThumbnailName] = useState("");
  const [existingMusicName, setExistingMusicName] = useState("");
  const [fields, setFields] = useState(getDefaultFields("Wedding"));
  const [allowCustomerMusic, setAllowCustomerMusic] = useState(true);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetUrls, setAssetUrls] = useState({});
  const urlsRef = useRef([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // Metadata stays available in memory for this browser session.
    }
  }, [templates]);

  useEffect(() => {
    let cancelled = false;
    const keys = templates.flatMap(t => [t.designKey, t.thumbnailKey, t.musicKey]).filter(Boolean);
    Promise.all(keys.map(async key => {
      try {
        const file = await loadAsset(key);
        return file ? [key, URL.createObjectURL(file)] : null;
      } catch {
        return null;
      }
    })).then(results => {
      if (cancelled) {
        results.filter(Boolean).forEach(([, url]) => URL.revokeObjectURL(url));
        return;
      }
      const next = Object.fromEntries(results.filter(Boolean));
      urlsRef.current.forEach(URL.revokeObjectURL);
      urlsRef.current = Object.values(next);
      setAssetUrls(next);
    });
    return () => { cancelled = true; };
  }, [templates]);

  useEffect(() => () => urlsRef.current.forEach(URL.revokeObjectURL), []);

  const filteredTemplates = useMemo(() => templates.filter(template =>
    (categoryFilter === "All" || template.category === categoryFilter) &&
    (statusFilter === "All" || template.status === statusFilter) &&
    template.title.toLowerCase().includes(search.trim().toLowerCase())
  ), [templates, categoryFilter, statusFilter, search]);

  const filePreviewUrls = useMemo(() => ({
    design: designFile ? URL.createObjectURL(designFile) : "",
    thumbnail: thumbnailFile ? URL.createObjectURL(thumbnailFile) : "",
    music: musicFile ? URL.createObjectURL(musicFile) : ""
  }), [designFile, thumbnailFile, musicFile]);

  useEffect(() => () => Object.values(filePreviewUrls).filter(Boolean).forEach(url => URL.revokeObjectURL(url)), [filePreviewUrls]);

  const publishedCount = templates.filter(t => t.status === "Published").length;
  const draftCount = templates.filter(t => t.status !== "Published").length;

  const openEditor = async (template = null) => {
    setEditingId(template?.id || null);
    setTitle(template?.title || "");
    setCategory(template?.category || "Wedding");
    setDescription(template?.description || "");
    setCanvaUrl(template?.canvaUrl || "");
    setDesignFile(null);
    setThumbnailFile(null);
    setMusicFile(null);
    setExistingDesignKey(template?.designKey || null);
    setExistingBuiltInTemplateKey(template?.builtInTemplateKey || "");
    setExistingThumbnailKey(template?.thumbnailKey || null);
    setExistingMusicKey(template?.musicKey || null);
    setExistingDesignName(template?.designName || template?.sourceLabel || "");
    setExistingThumbnailName(template?.thumbnailName || "");
    setExistingMusicName(template?.musicName || "");
    setFields(template?.fields?.length ? template.fields.map(f => ({ ...f })) : getDefaultFields(template?.category || "Wedding"));
    setAllowCustomerMusic(template?.allowCustomerMusic ?? true);
    setFormError("");
    setEditorOpen(true);
  };

  const changeCategory = value => {
    setCategory(value);
    setFields(getDefaultFields(value));
  };

  const updateField = (key, patch) => {
    setFields(current => current.map(field => field.key === key ? { ...field, ...patch } : field));
  };

  const saveTemplate = async publish => {
    setFormError("");
    if (!title.trim()) { setFormError("Enter a template name."); return; }
    if (!description.trim()) { setFormError("Add a short description."); return; }
    if (!thumbnailFile && !existingThumbnailKey && !existingBuiltInTemplateKey) { setFormError("Add a thumbnail image for the customer gallery."); return; }
    if (!designFile && !existingDesignKey && !existingBuiltInTemplateKey) { setFormError("Upload the Canva-exported video or image file."); return; }
    if (!fields.some(field => field.enabled)) { setFormError("Select at least one customer detail."); return; }

    const id = editingId || "template_" + Date.now();
    const designKey = designFile ? id + "_design" : existingDesignKey;
    const thumbnailKey = thumbnailFile ? id + "_thumbnail" : existingThumbnailKey;
    const musicKey = musicFile ? id + "_music" : existingMusicKey;
    setSaving(true);
    try {
      if (designFile) await storeAsset(designKey, designFile);
      if (thumbnailFile) await storeAsset(thumbnailKey, thumbnailFile);
      if (musicFile) await storeAsset(musicKey, musicFile);
      const record = {
        id, title: title.trim(), category, description: description.trim(), canvaUrl: canvaUrl.trim(),
        designKey, thumbnailKey, musicKey,
        builtInTemplateKey: designFile ? "" : existingBuiltInTemplateKey,
        designName: designFile?.name || existingDesignName || "",
        thumbnailName: thumbnailFile?.name || existingThumbnailName || "",
        musicName: musicFile?.name || existingMusicName || "",
        fields, allowCustomerMusic, status: publish ? "Published" : "Draft",
        updatedAt: new Date().toISOString()
      };
      setTemplates(current => editingId ? current.map(t => t.id === id ? record : t) : [record, ...current]);
      setEditorOpen(false);
      setActiveSection("library");
      setCategoryFilter("All");
      setStatusFilter("All");
      setSearch("");
    } catch (error) {
      setFormError(error?.message || "Could not save the uploaded files in this browser.");
    } finally {
      setSaving(false);
    }
  };

  const removeTemplate = async template => {
    if (!window.confirm("Delete this template and its locally stored files?")) return;
    try {
      await Promise.all([deleteAsset(template.designKey), deleteAsset(template.thumbnailKey), deleteAsset(template.musicKey)]);
    } catch {
      // Continue removing the metadata record even if a local asset is already missing.
    }
    setTemplates(current => current.filter(t => t.id !== template.id));
  };

  const setTemplateStatus = (id, status) => setTemplates(current => current.map(t => t.id === id ? { ...t, status } : t));

  if (editorOpen) {
    return <main className="adm-shell adm-simple-editor">
      <header className="adm-editor-top">
        <button className="adm-quiet-btn" type="button" onClick={() => setEditorOpen(false)}>← Back to templates</button>
        <div><strong>{editingId ? "Edit template" : "Add a template"}</strong><span> · {title || "New invitation"}</span></div>
        <span className="adm-local-tag">Simple template setup</span>
      </header>
      <div className="adm-simple-content">
        <div className="adm-simple-heading">
          <div><p className="adm-eyebrow">CANVA → WEBSITE</p><h1>{editingId ? "Update your template." : "Add your Canva design."}</h1><p>Upload the finished design. Choose what customers can personalize and which music options they get.</p></div>
          <div className="adm-steps-note"><span>01</span> Upload <i>→</i> <span>02</span> Choose details <i>→</i> <span>03</span> Publish</div>
        </div>

        <section className="adm-simple-card">
          <div className="adm-card-title"><span>01</span><div><h2>Template information</h2><p>Tell customers what this invitation is for.</p></div></div>
          <div className="adm-form-grid">
            <label className="adm-form-field">Template name<input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Royal Palace Wedding"/></label>
            <label className="adm-form-field">Category<select value={category} onChange={e => changeCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label className="adm-form-field adm-span-two">Short description<textarea value={description} onChange={e => setDescription(e.target.value)} rows="2" maxLength={220} placeholder="Describe the style of this invitation."/></label>
            <label className="adm-form-field adm-span-two" style={{ display: existingBuiltInTemplateKey ? "none" : "flex" }}>Canva design link <small>Keep the editable Canva source linked to this template (optional).</small><input type="url" value={canvaUrl} onChange={e => setCanvaUrl(e.target.value)} placeholder="https://www.canva.com/design/..."/></label>
          </div>
        </section>

        <section className="adm-simple-card">
          <div className="adm-card-title"><span>02</span><div><h2>{existingBuiltInTemplateKey ? "Built-in animated design" : "Upload finished design"}</h2><p>{existingBuiltInTemplateKey ? "This Royal Palace template is already installed and ready to preview." : "Export your design from Canva, then upload the video file here."}</p></div></div>
          {existingBuiltInTemplateKey && <p className="adm-simple-note"><b>Built-in template:</b> The Royal Palace animation is already installed. Customer names and event details remain editable in the wedding preview; you do not need to upload another video for this template.</p>}
          <div className="adm-upload-grid" style={{ display: existingBuiltInTemplateKey ? "none" : "grid" }}>
            <label className="adm-upload-box"><input type="file" accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp" onChange={e => setDesignFile(e.target.files?.[0] || null)}/><Icon name="upload"/><strong>{designFile?.name || existingDesignName || "Choose invitation video"}</strong><small>MP4, WebM, MOV or image background</small>{(designFile || existingDesignKey) && <span className="adm-file-selected">Design file selected</span>}</label>
            <label className="adm-upload-box"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setThumbnailFile(e.target.files?.[0] || null)}/><Icon name="upload"/><strong>{thumbnailFile?.name || existingThumbnailName || "Choose gallery thumbnail"}</strong><small>PNG, JPG or WebP</small>{(thumbnailFile || existingThumbnailKey) && <span className="adm-file-selected">Thumbnail selected</span>}</label>
          </div>
          {!existingBuiltInTemplateKey && canvaUrl && <p className="adm-canva-source">Canva source: <a href={canvaUrl} target="_blank" rel="noreferrer">Open editable design ↗</a></p>}
          {!existingBuiltInTemplateKey && <p className="adm-simple-note"><b>Important:</b> A Canva-exported MP4 is a finished flat video. Customer names, dates and photos can be collected separately, but replacing text inside the video needs a personalization/rendering step. Uploading alone does not edit the MP4.</p>}
          {existingBuiltInTemplateKey && <p className="adm-simple-note">The Royal Palace composition is already connected to the wedding details form, live preview and 30-second MP4 export.</p>}
          {existingBuiltInTemplateKey === "royal-palace" && <div className="adm-built-in-preview">
            <div className="adm-built-in-preview__copy"><strong>Animated template preview</strong><small>30 seconds · vertical 9:16 · editable customer details</small></div>
            <div className="adm-built-in-preview__frame"><iframe title="Royal Palace animated invitation preview" srcDoc={builtInRoyalPreviewHtml} sandbox="allow-scripts" /></div>
          </div>}
          {(designFile?.type.startsWith("video/") || assetUrls[existingDesignKey]) && <video className="adm-upload-preview" controls muted src={filePreviewUrls.design || assetUrls[existingDesignKey]}/>}
          {(thumbnailFile || assetUrls[existingThumbnailKey] || templates.find(t => t.id === editingId)?.thumbnailUrl) && <img className="adm-thumbnail-preview" src={filePreviewUrls.thumbnail || assetUrls[existingThumbnailKey] || templates.find(t => t.id === editingId)?.thumbnailUrl} alt="Template thumbnail preview"/>}
        </section>

        <section className="adm-simple-card">
          <div className="adm-card-title"><span>03</span><div><h2>What can customers change?</h2><p>Tick only the details that belong to this invitation.</p></div></div>
          <div className="adm-customer-fields">
            {fields.map(field => <label className="adm-customer-field" key={field.key}>
              <input type="checkbox" checked={field.enabled} onChange={e => updateField(field.key, { enabled: e.target.checked })}/>
              <span><strong>{field.label}</strong><small>{field.type === "photos" ? "Customer can add photos" : field.required ? "Required detail" : "Optional detail"}</small></span>
              <select value={field.required ? "required" : "optional"} disabled={!field.enabled || field.type === "photos"} onChange={e => updateField(field.key, { required: e.target.value === "required" })}><option value="required">Required</option><option value="optional">Optional</option></select>
            </label>)}
          </div>
          <p className="adm-simple-note">These choices define the customer form. The video renderer must still be connected to place those values into the final invitation.</p>
        </section>

        <section className="adm-simple-card">
          <div className="adm-card-title"><span>04</span><div><h2>Music options</h2><p>Choose the music you provide and whether customers may use their own.</p></div></div>
          <label className="adm-form-field">Your default music track <input type="file" accept="audio/*" onChange={e => setMusicFile(e.target.files?.[0] || null)}/><small>{musicFile?.name || existingMusicName || "No default music selected yet"}</small></label>
          {(musicFile || assetUrls[existingMusicKey]) && <audio className="adm-audio-preview" controls src={filePreviewUrls.music || assetUrls[existingMusicKey]}/>}
          <label className="adm-switch-row"><input type="checkbox" checked={allowCustomerMusic} onChange={e => setAllowCustomerMusic(e.target.checked)}/><span><b>Allow customers to upload their own music</b><small>Customers can keep your default track or choose their own.</small></span><i/></label>
        </section>

        {formError && <p className="adm-form-error" role="alert">{formError}</p>}
        <footer className="adm-simple-footer"><button className="adm-quiet-btn" type="button" onClick={() => setEditorOpen(false)}>Cancel</button><div><button className="adm-secondary-btn" type="button" disabled={saving} onClick={() => saveTemplate(false)}>{saving ? "Saving…" : "Save draft"}</button><button className="adm-primary-btn" type="button" disabled={saving} onClick={() => saveTemplate(true)}>{saving ? "Saving…" : "Publish template"}</button></div></footer>
        <p className="adm-storage-note">Prototype storage: template details are saved in localStorage; uploaded design, thumbnail and music files are saved in this browser's IndexedDB only.</p>
      </div>
    </main>;
  }

  return <main className="adm-shell">
    <aside className="adm-sidebar">
      <a className="adm-brand" href="/"><span className="adm-brand-symbol">W</span><span><strong>EVENT STUDIO</strong><small>TEMPLATE MANAGER</small></span></a>
      <div className="adm-side-caption">WORKSPACE</div>
      <button className={"adm-nav-item " + (activeSection === "overview" ? "active" : "")} onClick={() => setActiveSection("overview")} type="button"><Icon name="grid"/> Overview</button>
      <button className={"adm-nav-item " + (activeSection === "library" ? "active" : "")} onClick={() => setActiveSection("library")} type="button"><Icon name="layers"/> Templates <span className="adm-nav-count">{templates.length}</span></button>
      <div className="adm-sidebar-bottom"><span className="adm-avatar">A</span><span><strong>Administrator</strong><small>Local workspace</small></span><span className="adm-online-dot"/></div>
    </aside>

    <section className="adm-main">
      <header className="adm-topbar"><div className="adm-mobile-brand"><span className="adm-brand-symbol">W</span><strong>EVENT STUDIO</strong></div><div className="adm-breadcrumb">WORKSPACE <span>/</span> {activeSection.toUpperCase()}</div><a className="adm-site-link" href="/">View website ↗</a></header>
      <nav className="adm-mobile-nav"><button className={activeSection === "overview" ? "active" : ""} onClick={() => setActiveSection("overview")} type="button">Overview</button><button className={activeSection === "library" ? "active" : ""} onClick={() => setActiveSection("library")} type="button">Templates</button></nav>
      {activeSection === "overview" ? <div className="adm-content">
        <div className="adm-heading-row"><div><p className="adm-eyebrow">CANVA → CUSTOMER WEBSITE</p><h1>Your invitation studio.</h1><p className="adm-subtitle">Upload finished designs. Customers add their own details and music.</p></div><button className="adm-primary-btn" type="button" onClick={() => openEditor()}><Icon name="plus"/> Add template</button></div>
        <div className="adm-stats-grid"><article className="adm-stat-card"><span>Total templates</span><strong>{templates.length}</strong><small>Saved in this browser</small></article><article className="adm-stat-card"><span>Published</span><strong>{publishedCount}</strong><small>Local publish status</small></article><article className="adm-stat-card"><span>Drafts</span><strong>{draftCount}</strong><small>Ready to finish</small></article></div>
        <div className="adm-section-heading"><div><p className="adm-eyebrow">CATEGORIES</p><h2>Every celebration, one place.</h2></div></div>
        <div className="adm-category-grid">{CATEGORIES.map(c => <button className="adm-category-card" key={c} type="button" onClick={() => { setCategoryFilter(c); setActiveSection("library"); }}><strong>{c}</strong><small>{templates.filter(t => t.category === c).length} templates</small><span className="adm-category-arrow">↗</span></button>)}</div>
      </div> : <div className="adm-content">
        <div className="adm-heading-row"><div><p className="adm-eyebrow">YOUR CANVA DESIGNS</p><h1>Template library</h1><p className="adm-subtitle">Add a finished Canva export once. Manage it here whenever you need.</p></div><button className="adm-primary-btn" type="button" onClick={() => openEditor()}><Icon name="plus"/> Add template</button></div>
        <div className="adm-library-toolbar"><label className="adm-search"><Icon name="search"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"/></label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option><option>Draft</option><option>Published</option></select></div>
        <div className="adm-category-pills">{["All", ...CATEGORIES].map(c => <button key={c} className={categoryFilter === c ? "active" : ""} onClick={() => setCategoryFilter(c)} type="button">{c}</button>)}</div>
        {filteredTemplates.length ? <div className="adm-template-grid">{filteredTemplates.map(template => <article className="adm-template-card" key={template.id}>
          <div className="adm-template-art">{template.builtInTemplateKey ? <div className="adm-built-in-card-art"><span>ROYAL PALACE</span><strong>30s ANIMATED INVITATION</strong><small>EDITABLE CUSTOMER DETAILS</small></div> : (assetUrls[template.thumbnailKey] || template.thumbnailUrl ? <img src={assetUrls[template.thumbnailKey] || template.thumbnailUrl} alt=""/> : <><span className="adm-art-orbit"/><span className="adm-art-monogram">✦</span><span className="adm-art-label">{template.category.toUpperCase()}</span></>)}<span className="adm-card-status">{template.status}</span></div>
          <div className="adm-template-info"><div className="adm-template-title-row"><div><h3>{template.title}</h3><span>{template.category}</span></div></div><p>{template.description || "No description added"} </p><div className="adm-template-meta"><span>{template.fields?.filter(f => f.enabled).length || 0} customer details</span><span>{template.musicKey ? "Music included" : "No default music"}</span></div>
            {template.sourceLabel && <small className="adm-canva-draft-note">{template.sourceLabel}</small>}
            {template.canvaUrl && <a className="adm-canva-open" href={template.canvaUrl} target="_blank" rel="noreferrer">Open in Canva ↗</a>}
            <div className="adm-template-actions"><button type="button" onClick={() => openEditor(template)}>Edit</button>{template.status === "Published" ? <button type="button" onClick={() => setTemplateStatus(template.id, "Draft")}>Unpublish</button> : <button type="button" disabled={!template.builtInTemplateKey && (!template.designKey || !template.thumbnailKey)} onClick={() => setTemplateStatus(template.id, "Published")}>Publish</button>}{!template.builtInTemplateKey && <button className="adm-delete-btn" type="button" onClick={() => removeTemplate(template)}>Delete</button>}</div>
          </div>
        </article>)}</div> : <div className="adm-empty-state"><span className="adm-empty-icon"><Icon name="layers"/></span><h2>No templates found.</h2><p>Upload your first Canva export and prepare it for customers.</p><button className="adm-primary-btn" type="button" onClick={() => openEditor()}><Icon name="upload"/> Add first template</button></div>}
        <p className="adm-storage-note">Local prototype only: records live in this browser's localStorage; design, thumbnail and music files live in this browser's IndexedDB. They are not yet shared with other devices or customers.</p>
      </div>}
    </section>
  </main>;
}
