import { useEffect, useMemo, useState } from "react";
import "./AdminPanel.css";

const STORAGE_KEY = "event-template-admin-v2";

const CATEGORIES = [
  "Wedding",
  "Birthday",
  "Anniversary",
  "Engagement",
  "Baby Shower",
  "Festival",
  "Corporate",
  "Other",
];

const DEFAULT_FIELDS = {
  Wedding: ["Bride name", "Groom name", "Event date", "Venue"],
  Birthday: ["Celebrant name", "Age", "Event date", "Venue"],
  Anniversary: ["Couple names", "Years together", "Event date", "Message"],
  Engagement: ["Partner names", "Event date", "Venue"],
  "Baby Shower": ["Parent name", "Baby name", "Event date", "Venue"],
  Festival: ["Family name", "Greeting message"],
  Corporate: ["Company name", "Event title", "Event date", "Venue"],
  Other: ["Main title", "Event date", "Venue"],
};

function readTemplates() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) =>
      item && typeof item.id === "string" && typeof item.title === "string"
    ) : [];
  } catch {
    return [];
  }
}

function Icon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-10Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4m-4 4 4-4 4 4" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  };
  return <svg className="adm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function AdminPanel() {
  const [templates, setTemplates] = useState(readTemplates);
  const [activeSection, setActiveSection] = useState("library");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Wedding");
  const [sourceFile, setSourceFile] = useState(null);
  const [fields, setFields] = useState(DEFAULT_FIELDS.Wedding);
  const [newField, setNewField] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
      // The admin remains usable for this session if browser storage is unavailable.
    }
  }, [templates]);

  const visibleTemplates = useMemo(() => templates.filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    const matchesSearch = item.title.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  }), [templates, activeCategory, statusFilter, search]);

  const publishedCount = templates.filter((item) => item.status === "Published").length;
  const draftCount = templates.filter((item) => item.status === "Draft").length;

  const openUpload = () => {
    setTitle("");
    setCategory("Wedding");
    setSourceFile(null);
    setFields(DEFAULT_FIELDS.Wedding);
    setNewField("");
    setFormError("");
    setShowModal(true);
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    setFields(DEFAULT_FIELDS[value] || DEFAULT_FIELDS.Other);
  };

  const addField = () => {
    const value = newField.trim();
    if (!value || fields.some((field) => field.toLowerCase() === value.toLowerCase())) return;
    setFields((current) => [...current, value]);
    setNewField("");
  };

  const saveTemplate = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setFormError("Please enter a template name.");
      return;
    }
    if (!sourceFile) {
      setFormError("Please select a template source file.");
      return;
    }

    const allowed = /\.(mp4|webm|mov|zip|html?)$/i;
    if (!allowed.test(sourceFile.name)) {
      setFormError("Use an MP4, WebM, MOV, ZIP or HTML file.");
      return;
    }

    const item = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title: title.trim(),
      category,
      fileName: sourceFile.name,
      fields,
      status: "Draft",
      createdAt: new Date().toISOString(),
    };
    setTemplates((current) => [item, ...current]);
    setShowModal(false);
    setActiveSection("library");
    setActiveCategory("All");
    setStatusFilter("All");
    setSearch("");
  };

  const toggleStatus = (id) => {
    setTemplates((current) => current.map((item) =>
      item.id === id ? { ...item, status: item.status === "Published" ? "Draft" : "Published" } : item
    ));
  };

  const deleteTemplate = (id) => {
    if (!window.confirm("Delete this template record from this browser?")) return;
    setTemplates((current) => current.filter((item) => item.id !== id));
  };

  return (
    <main className="adm-shell">
      <aside className="adm-sidebar">
        <a className="adm-brand" href="/" aria-label="Back to Event Video Maker">
          <span className="adm-brand-symbol">W</span>
          <span><strong>WEDDING</strong><small>CREATOR CONSOLE</small></span>
        </a>

        <div className="adm-side-caption">WORKSPACE</div>
        <button className={activeSection === "overview" ? "adm-nav-item active" : "adm-nav-item"} onClick={() => setActiveSection("overview")} type="button">
          <Icon name="grid" /> Overview
        </button>
        <button className={activeSection === "library" ? "adm-nav-item active" : "adm-nav-item"} onClick={() => setActiveSection("library")} type="button">
          <Icon name="layers" /> Template library <span className="adm-nav-count">{templates.length}</span>
        </button>
        <button className={activeSection === "categories" ? "adm-nav-item active" : "adm-nav-item"} onClick={() => setActiveSection("categories")} type="button">
          <Icon name="folder" /> Categories
        </button>
        <div className="adm-sidebar-bottom">
          <span className="adm-avatar">A</span>
          <span><strong>Administrator</strong><small>Workspace owner</small></span>
          <span className="adm-online-dot" />
        </div>
      </aside>

      <section className="adm-main">
        <header className="adm-topbar">
          <div className="adm-mobile-brand"><span className="adm-brand-symbol">W</span><strong>WEDDING</strong></div>
          <div className="adm-breadcrumb">WORKSPACE <span>/</span> {activeSection.toUpperCase()}</div>
          <a className="adm-site-link" href="/">View website <span>↗</span></a>
        </header>

        {activeSection === "overview" ? (
          <div className="adm-content">
            <div className="adm-heading-row">
              <div><p className="adm-eyebrow">YOUR CREATIVE CONTROL CENTER</p><h1>Good to see you.</h1><p className="adm-subtitle">Manage invitation templates across every celebration.</p></div>
              <button className="adm-primary-btn" onClick={openUpload} type="button"><Icon name="plus" /> Add template</button>
            </div>
            <div className="adm-stats-grid">
              <article className="adm-stat-card"><span className="adm-stat-icon"><Icon name="layers" /></span><span className="adm-stat-label">Total templates</span><strong>{templates.length}</strong><small>Across all categories</small></article>
              <article className="adm-stat-card"><span className="adm-stat-icon green"><span>✓</span></span><span className="adm-stat-label">Published</span><strong>{publishedCount}</strong><small>Marked live in this browser</small></article>
              <article className="adm-stat-card"><span className="adm-stat-icon amber"><span>◷</span></span><span className="adm-stat-label">Drafts</span><strong>{draftCount}</strong><small>Not yet marked published</small></article>
            </div>
            <div className="adm-section-heading"><div><p className="adm-eyebrow">EXPLORE</p><h2>All occasions, one place.</h2></div><button className="adm-text-btn" onClick={() => setActiveSection("categories")} type="button">View categories <Icon name="arrow" /></button></div>
            <div className="adm-category-grid">
              {CATEGORIES.map((name, index) => <button className="adm-category-card" key={name} onClick={() => { setActiveCategory(name); setActiveSection("library"); }} type="button"><span className="adm-category-number">0{index + 1}</span><strong>{name}</strong><small>{templates.filter((item) => item.category === name).length} templates</small><span className="adm-category-arrow">↗</span></button>)}
            </div>
          </div>
        ) : activeSection === "categories" ? (
          <div className="adm-content">
            <div className="adm-heading-row"><div><p className="adm-eyebrow">ORGANIZE YOUR LIBRARY</p><h1>Categories</h1><p className="adm-subtitle">One admin workspace for every type of invitation.</p></div><button className="adm-primary-btn" onClick={openUpload} type="button"><Icon name="plus" /> Add template</button></div>
            <div className="adm-category-grid adm-category-grid-large">
              {CATEGORIES.map((name, index) => <button className="adm-category-card" key={name} onClick={() => { setActiveCategory(name); setActiveSection("library"); }} type="button"><span className="adm-category-number">0{index + 1}</span><strong>{name}</strong><small>{templates.filter((item) => item.category === name).length} templates</small><span className="adm-category-arrow">↗</span></button>)}
            </div>
          </div>
        ) : (
          <div className="adm-content">
            <div className="adm-heading-row">
              <div><p className="adm-eyebrow">YOUR CONTENT, BEAUTIFULLY ORGANIZED</p><h1>Template library</h1><p className="adm-subtitle">Upload and organize templates for weddings, birthdays, anniversaries and more.</p></div>
              <button className="adm-primary-btn" onClick={openUpload} type="button"><Icon name="plus" /> Add template</button>
            </div>

            <div className="adm-library-toolbar">
              <label className="adm-search"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." /></label>
              <label className="adm-select-wrap"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option><option>Published</option><option>Draft</option></select></label>
            </div>

            <div className="adm-category-pills">
              {["All", ...CATEGORIES].map((name) => <button type="button" key={name} className={activeCategory === name ? "active" : ""} onClick={() => setActiveCategory(name)}>{name}</button>)}
            </div>

            {visibleTemplates.length ? (
              <div className="adm-template-grid">
                {visibleTemplates.map((item) => <article className="adm-template-card" key={item.id}>
                  <div className="adm-template-art"><span className="adm-art-orbit" /><span className="adm-art-monogram">✦</span><span className="adm-art-label">{item.category.toUpperCase()} COLLECTION</span><span className="adm-art-file"><Icon name="video" /> {item.fileName}</span></div>
                  <div className="adm-template-info"><div className="adm-template-title-row"><div><h3>{item.title}</h3><span>{item.category}</span></div><span className={item.status === "Published" ? "adm-status published" : "adm-status"}>{item.status}</span></div><p>{item.fields.length} customer input fields</p><div className="adm-template-actions"><button type="button" onClick={() => toggleStatus(item.id)}>{item.status === "Published" ? "Unpublish" : "Publish"}</button><button className="adm-delete-btn" type="button" onClick={() => deleteTemplate(item.id)} aria-label={"Delete " + item.title}>Delete</button></div></div>
                </article>)}
              </div>
            ) : (
              <div className="adm-empty-state"><span className="adm-empty-icon"><Icon name="layers" /></span><h2>{search || activeCategory !== "All" || statusFilter !== "All" ? "No matching templates" : "Your template library starts here."}</h2><p>{search || activeCategory !== "All" || statusFilter !== "All" ? "Try changing your search or filters." : "Add your first design and configure the details customers can personalize."}</p>{!templates.length && <button className="adm-primary-btn" onClick={openUpload} type="button"><Icon name="upload" /> Upload first template</button>}</div>
            )}
            <p className="adm-storage-note"><span>i</span> Admin prototype: template records are saved in this browser only. Uploads, publishing to the customer website and video personalization are not connected yet.</p>
          </div>
        )}
      </section>

      {showModal && <div className="adm-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowModal(false); }}>
        <section className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="adm-modal-title">
          <div className="adm-modal-header"><div><p className="adm-eyebrow">TEMPLATE SETUP</p><h2 id="adm-modal-title">Add a new template</h2><p>Choose its occasion and define what customers can personalize.</p></div><button className="adm-icon-btn" type="button" onClick={() => setShowModal(false)} aria-label="Close"><Icon name="close" /></button></div>
          <form onSubmit={saveTemplate}>
            <label className="adm-form-field"><span>Template name</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Golden Garden Invitation" maxLength={80} /></label>
            <label className="adm-form-field"><span>Category</span><select value={category} onChange={(event) => handleCategoryChange(event.target.value)}>{CATEGORIES.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="adm-upload-zone"><input type="file" accept=".mp4,.webm,.mov,.zip,.html,.htm" onChange={(event) => setSourceFile(event.target.files?.[0] || null)} /><span className="adm-upload-symbol"><Icon name="upload" /></span><strong>{sourceFile ? sourceFile.name : "Choose your template file"}</strong><small>MP4, WebM, MOV, ZIP or HTML · Select one file</small></label>
            <div className="adm-fields-heading"><div><strong>Customer input fields</strong><small>Only these details will be editable by customers.</small></div><span>{fields.length} fields</span></div>
            <div className="adm-field-chips">{fields.map((field) => <span key={field}>{field}<button type="button" onClick={() => setFields((current) => current.filter((value) => value !== field))} aria-label={"Remove " + field}>×</button></span>)}</div>
            <div className="adm-add-field"><input value={newField} onChange={(event) => setNewField(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addField(); } }} placeholder="Add a custom field..." /><button type="button" onClick={addField}>Add field</button></div>
            {formError && <p className="adm-form-error" role="alert">{formError}</p>}
            <div className="adm-modal-footer"><button className="adm-cancel-btn" type="button" onClick={() => setShowModal(false)}>Cancel</button><button className="adm-primary-btn" type="submit">Save as draft <Icon name="arrow" /></button></div>
            <p className="adm-modal-note">This currently saves template details locally. The selected file is not uploaded to cloud storage yet.</p>
          </form>
        </section>
      </div>}
    </main>
  );
}
