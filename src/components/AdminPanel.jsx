import { useEffect, useMemo, useRef, useState } from "react";
import "./AdminPanel.css";
import { WeddingVideoEditor } from "./WeddingVideoEditor.jsx";

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

const ALWAYS_EDITABLE_FIELDS = [
  { label: "Bride name", key: "brideName", type: "text", required: true, maxLength: 100 },
  { label: "Groom name", key: "groomName", type: "text", required: true, maxLength: 100 },
  { label: "Event date", key: "eventDate", type: "date", required: true, maxLength: 40 },
  { label: "Event time", key: "eventTime", type: "time", required: false, maxLength: 40 },
  { label: "Venue name", key: "venueName", type: "text", required: true, maxLength: 120 },
  { label: "Venue address", key: "venueAddress", type: "textarea", required: false, maxLength: 240 },
  { label: "Invitation message", key: "invitationMessage", type: "textarea", required: false, maxLength: 500 }
];
const ALWAYS_EDITABLE_KEYS = new Set(ALWAYS_EDITABLE_FIELDS.map(field => field.key));
const MUSIC_RIGHTS_NOTICE = "Only upload music you created, own, or have permission to use.";
const ACCEPTED_BACKGROUND_TYPES = ["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm"];

const SAMPLE_CUSTOMER_VALUES = {
  brideName: "Aarav",
  groomName: "Kiara",
  eventDate: "2027-04-24",
  eventTime: "18:30",
  venueName: "The Royal Garden",
  venueAddress: "Pune, Maharashtra",
  invitationMessage: "With joyful hearts, we invite you to celebrate our special day."
};

const LAYOUT_PRESETS = [
  {
    id: "names-photo-details",
    name: "Names + photo + details",
    description: "Couple names at the top, one large photo in the middle, date and venue below.",
    elements: [
      { key: "brideName", label: "Bride name", x: 8, y: 8, w: 84, h: 7, fontSize: 5.2, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 1, end: 29 },
      { key: "groomName", label: "Groom name", x: 8, y: 16, w: 84, h: 7, fontSize: 5.2, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 1.5, end: 29 },
      { key: "photo1", label: "Main photo", type: "photo", x: 17, y: 29, w: 66, h: 32, start: 4, end: 27 },
      { key: "eventDate", label: "Date", x: 10, y: 65, w: 80, h: 4, fontSize: 3.5, font: "Arial", color: "#f2d39b", align: "center", weight: 700, start: 7, end: 29 },
      { key: "eventTime", label: "Time", x: 10, y: 70, w: 80, h: 3, fontSize: 2.7, font: "Arial", color: "#f4e5d0", align: "center", weight: 500, start: 8, end: 29 },
      { key: "venueName", label: "Venue", x: 8, y: 74, w: 84, h: 5, fontSize: 3.8, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 9, end: 29 },
      { key: "venueAddress", label: "Address", x: 8, y: 80, w: 84, h: 4, fontSize: 2.3, font: "Arial", color: "#f4e5d0", align: "center", weight: 400, start: 10, end: 29 },
      { key: "invitationMessage", label: "Message", x: 9, y: 85, w: 82, h: 9, fontSize: 2.2, font: "Georgia", color: "#f4e5d0", align: "center", weight: 400, start: 12, end: 29 }
    ]
  },
  {
    id: "names-only",
    name: "Names only",
    description: "A clean typographic treatment with names, date and venue. No photo slots.",
    elements: [
      { key: "brideName", label: "Bride name", x: 8, y: 27, w: 84, h: 9, fontSize: 6, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 1, end: 29 },
      { key: "groomName", label: "Groom name", x: 8, y: 38, w: 84, h: 9, fontSize: 6, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 2, end: 29 },
      { key: "eventDate", label: "Date", x: 10, y: 54, w: 80, h: 5, fontSize: 3.6, font: "Arial", color: "#e6c58d", align: "center", weight: 700, start: 5, end: 29 },
      { key: "eventTime", label: "Time", x: 10, y: 60, w: 80, h: 4, fontSize: 2.7, font: "Arial", color: "#f4e5d0", align: "center", weight: 500, start: 6, end: 29 },
      { key: "venueName", label: "Venue", x: 8, y: 66, w: 84, h: 5, fontSize: 4, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 7, end: 29 },
      { key: "venueAddress", label: "Address", x: 8, y: 72, w: 84, h: 4, fontSize: 2.3, font: "Arial", color: "#f4e5d0", align: "center", weight: 400, start: 8, end: 29 },
      { key: "invitationMessage", label: "Message", x: 12, y: 78, w: 76, h: 10, fontSize: 2.5, font: "Georgia", color: "#f4e5d0", align: "center", weight: 400, start: 9, end: 29 }
    ]
  },
  {
    id: "photo-heavy-three-slots",
    name: "Photo-heavy · 3 slots",
    description: "Three stacked photo moments with couple names and a compact event footer.",
    elements: [
      { key: "brideName", label: "Bride name", x: 8, y: 5, w: 84, h: 6, fontSize: 4.5, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 1, end: 29 },
      { key: "groomName", label: "Groom name", x: 8, y: 12, w: 84, h: 6, fontSize: 4.5, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 1.5, end: 29 },
      { key: "photo1", label: "Photo slot 1", type: "photo", x: 12, y: 21, w: 76, h: 15, start: 3, end: 29 },
      { key: "photo2", label: "Photo slot 2", type: "photo", x: 12, y: 38, w: 76, h: 15, start: 6, end: 29 },
      { key: "photo3", label: "Photo slot 3", type: "photo", x: 12, y: 55, w: 76, h: 15, start: 9, end: 29 },
      { key: "eventDate", label: "Date", x: 8, y: 73, w: 84, h: 4, fontSize: 2.9, font: "Arial", color: "#e6c58d", align: "center", weight: 700, start: 11, end: 29 },
      { key: "eventTime", label: "Time", x: 8, y: 78, w: 84, h: 4, fontSize: 2.5, font: "Arial", color: "#f4e5d0", align: "center", weight: 500, start: 12, end: 29 },
      { key: "venueName", label: "Venue", x: 8, y: 83, w: 84, h: 4, fontSize: 3, font: "Georgia", color: "#fff1dc", align: "center", weight: 600, start: 13, end: 29 },
      { key: "venueAddress", label: "Address", x: 8, y: 88, w: 84, h: 3, fontSize: 2, font: "Arial", color: "#f4e5d0", align: "center", weight: 400, start: 14, end: 29 },
      { key: "invitationMessage", label: "Message", x: 8, y: 92, w: 84, h: 5, fontSize: 1.9, font: "Georgia", color: "#f4e5d0", align: "center", weight: 400, start: 15, end: 29 }
    ]
  },
  {
    id: "centred-minimal",
    name: "Centred minimal",
    description: "One calm central composition with the names, message, date and venue.",
    elements: [
      { key: "brideName", label: "Bride name", x: 10, y: 26, w: 80, h: 8, fontSize: 5.4, font: "Georgia", color: "#fff4e4", align: "center", weight: 500, start: 1, end: 29 },
      { key: "groomName", label: "Groom name", x: 10, y: 36, w: 80, h: 8, fontSize: 5.4, font: "Georgia", color: "#fff4e4", align: "center", weight: 500, start: 2, end: 29 },
      { key: "invitationMessage", label: "Message", x: 14, y: 46, w: 72, h: 9, fontSize: 2.5, font: "Georgia", color: "#f0dfc7", align: "center", weight: 400, start: 4, end: 29 },
      { key: "photo1", label: "Photo", type: "photo", x: 32, y: 57, w: 36, h: 14, start: 7, end: 27 },
      { key: "eventDate", label: "Date", x: 10, y: 73, w: 80, h: 4, fontSize: 3.1, font: "Arial", color: "#e6c58d", align: "center", weight: 700, start: 10, end: 29 },
      { key: "eventTime", label: "Time", x: 10, y: 78, w: 80, h: 4, fontSize: 2.5, font: "Arial", color: "#f0dfc7", align: "center", weight: 500, start: 11, end: 29 },
      { key: "venueName", label: "Venue", x: 10, y: 83, w: 80, h: 4, fontSize: 3.1, font: "Georgia", color: "#fff4e4", align: "center", weight: 500, start: 12, end: 29 },
      { key: "venueAddress", label: "Address", x: 10, y: 88, w: 80, h: 4, fontSize: 2.1, font: "Arial", color: "#f0dfc7", align: "center", weight: 400, start: 13, end: 29 }
    ]
  }
];

function getDefaultFields(category) {
  const defaults = ALWAYS_EDITABLE_FIELDS.map(field => ({
    ...field, enabled: true, custom: false
  }));
  const extra = (FIELD_PRESETS[category] || FIELD_PRESETS.Other)
    .filter(([, key]) => !ALWAYS_EDITABLE_KEYS.has(key))
    .map(([label, key]) => ({
      label, key, enabled: true, required: false, custom: false,
      type: key === "eventDate" ? "date" : key === "eventTime" ? "time" : key === "photos" ? "photos" : ["invitationMessage", "venueAddress", "message", "greetingMessage"].includes(key) ? "textarea" : "text",
      maxLength: key === "invitationMessage" || key === "message" || key === "greetingMessage" ? 300 : 100
    }));
  const seen = new Set();
  return [...defaults, ...extra].filter(field => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

function formatSampleValue(key, value) {
  if (key === "eventDate" && /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }
  if (key === "eventTime" && /^\d{2}:\d{2}$/.test(String(value || ""))) {
    return new Date("2000-01-01T" + value + ":00").toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return value || "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function buildLayoutPreviewDocument(backgroundUrl, backgroundType, preset, sampleValues) {
  const background = backgroundUrl
    ? (backgroundType.startsWith("video/")
      ? '<video class="background" src="' + escapeHtml(backgroundUrl) + '" autoplay muted loop playsinline></video>'
      : '<img class="background" src="' + escapeHtml(backgroundUrl) + '" alt="">')
    : '<div class="background-empty">Your Canva background will appear here</div>';

  const elements = (preset?.elements || []).map(element => {
    const isPhoto = element.type === "photo";
    const content = isPhoto
      ? '<span>PHOTO SLOT</span><small>' + escapeHtml(element.label) + '</small>'
      : escapeHtml(formatSampleValue(element.key, sampleValues[element.key]) || element.label);
    const delay = Number(element.start || 0);
    const hideDelay = Math.max(delay, Number(element.end || 30) - 0.35);
    return '<div class="layout-item ' + (isPhoto ? "photo-slot" : "text-slot") + '" data-field="' + escapeHtml(element.key) + '" data-start="' + delay + '" data-end="' + Number(element.end || 30) + '" style="left:' + element.x + '%;top:' + element.y + '%;width:' + element.w + '%;height:' + element.h + '%;font-size:' + element.fontSize + 'cqw;font-family:' + escapeHtml(element.font || "Georgia") + ';font-weight:' + Number(element.weight || 400) + ';color:' + escapeHtml(element.color || "#fff") + ';text-align:' + escapeHtml(element.align || "center") + ';--enter-delay:' + delay + 's;--exit-delay:' + hideDelay + 's">' + content + '</div>';
  }).join("");

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    '*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#151015;font-family:Georgia,serif}' +
    '#stage{position:relative;width:100%;height:100%;aspect-ratio:9/16;container-type:inline-size;overflow:hidden;background:linear-gradient(150deg,#4d2533,#151015)}' +
    '.background{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.background-empty{position:absolute;inset:0;display:grid;place-items:center;padding:12%;color:#efdfbd;text-align:center;background:linear-gradient(150deg,#4d2533,#151015);font:4cqw Arial,sans-serif}' +
    '.safe-margin{position:absolute;inset:8%;border:1px dashed rgba(255,255,255,.24);pointer-events:none}' +
    '.layout-item{position:absolute;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;padding:1.2%;line-height:1.2;overflow-wrap:anywhere;opacity:0;animation:reveal .55s ease var(--enter-delay) both,hide .35s ease var(--exit-delay) both}' +
    '.photo-slot{border:2px dashed rgba(255,244,220,.9);border-radius:3cqw;background:rgba(26,13,18,.48);color:#fff4df;text-shadow:0 1px 6px #000;font:3cqw Arial,sans-serif;letter-spacing:.12em}' +
    '.photo-slot small{margin-top:1.5%;font-size:2.1cqw;opacity:.82}.text-slot{text-shadow:0 2px 9px rgba(0,0,0,.52)}' +
    '@keyframes reveal{from{opacity:0;transform:translateY(1.6cqw)}to{opacity:1;transform:translateY(0)}}@keyframes hide{to{opacity:0}}' +
    '</style></head><body><main id="stage">' + background + '<div class="safe-margin"></div>' + elements + '</main></body></html>';
}


function mergeCustomerFields(category, savedFields = []) {
  const savedByKey = new Map(savedFields.map(field => [field.key, field]));
  const defaults = getDefaultFields(category).map(field => {
    const saved = savedByKey.get(field.key);
    savedByKey.delete(field.key);
    return {
      ...field,
      ...(saved || {}),
      enabled: ALWAYS_EDITABLE_KEYS.has(field.key) ? true : (saved?.enabled ?? field.enabled),
      required: ALWAYS_EDITABLE_KEYS.has(field.key) ? field.required : (saved?.required ?? field.required)
    };
  });
  return defaults.concat([...savedByKey.values()].map(field => ({ ...field, custom: true })));
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
  allowCustomerRemoveMusic: false,
  musicRightsNotice: MUSIC_RIGHTS_NOTICE,
  status: "Published",
  sourceLabel: "Built-in animated invitation. Customer details update in the live preview and final MP4.",
  createdAt: "2026-11-17T00:00:00.000Z"
};

function readTemplates() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) || "null");
    if (!Array.isArray(saved)) {
      return [{ ...INITIAL_WEDDING, fields: mergeCustomerFields("Wedding", INITIAL_WEDDING.fields) }];
    }

    const hasSeed = saved.some(item => item?.id === INITIAL_WEDDING.id);
    const normalized = saved
      .filter(item => item && typeof item === "object")
      .map(item => {
        const template = item.id === INITIAL_WEDDING.id
          ? {
              ...INITIAL_WEDDING,
              ...item,
              title: INITIAL_WEDDING.title,
              description: INITIAL_WEDDING.description,
              canvaUrl: "",
              thumbnailUrl: null,
              builtInTemplateKey: INITIAL_WEDDING.builtInTemplateKey,
              designName: INITIAL_WEDDING.designName,
              sourceLabel: INITIAL_WEDDING.sourceLabel,
              status: item.builtInTemplateKey ? item.status : "Published"
            }
          : item;

        return {
          ...template,
          fields: mergeCustomerFields(template.category || "Other", template.fields || [])
        };
      });

    return hasSeed
      ? normalized
      : [{ ...INITIAL_WEDDING, fields: mergeCustomerFields("Wedding", INITIAL_WEDDING.fields) }, ...normalized];
  } catch {
    return [{ ...INITIAL_WEDDING, fields: mergeCustomerFields("Wedding", INITIAL_WEDDING.fields) }];
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
  const [activeSection, setActiveSection] = useState("library");
  const [editorTab, setEditorTab] = useState("design");
  const [layoutPresetId, setLayoutPresetId] = useState("names-photo-details");
  const [layoutMode, setLayoutMode] = useState("preset");
  const [manualLayoutHtml, setManualLayoutHtml] = useState("");
  const [sampleValues, setSampleValues] = useState({ ...SAMPLE_CUSTOMER_VALUES });
  const [customFieldLabel, setCustomFieldLabel] = useState("");
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
  const [allowCustomerRemoveMusic, setAllowCustomerRemoveMusic] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetUrls, setAssetUrls] = useState({});
  const [assetFiles, setAssetFiles] = useState({});
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
        return file ? [key, file] : null;
      } catch {
        return null;
      }
    })).then(results => {
      if (cancelled) return;
      const loaded = Object.fromEntries(results.filter(Boolean));
      const next = Object.fromEntries(Object.entries(loaded).map(([key, file]) => [key, URL.createObjectURL(file)]));
      urlsRef.current.forEach(URL.revokeObjectURL);
      urlsRef.current = Object.values(next);
      setAssetFiles(loaded);
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
  const backgroundPreviewUrl = designFile ? filePreviewUrls.design : assetUrls[existingDesignKey] || "";
  const backgroundPreviewType = designFile?.type || assetFiles[existingDesignKey]?.type || "";
  const selectedLayoutPreset = LAYOUT_PRESETS.find(preset => preset.id === layoutPresetId) || LAYOUT_PRESETS[0];
  const layoutPreviewDocument = useMemo(() => {
    if (layoutMode === "fine-tune" && manualLayoutHtml) {
      let previewHtml = manualLayoutHtml.split("__TEMPLATE_BACKGROUND__").join(backgroundPreviewUrl);
      Object.entries(sampleValues).forEach(([key, value]) => {
        previewHtml = previewHtml.split("{{customer:" + key + "}}").join(escapeHtml(formatSampleValue(key, value)));
      });
      return previewHtml;
    }
    return buildLayoutPreviewDocument(backgroundPreviewUrl, backgroundPreviewType, selectedLayoutPreset, sampleValues);
  }, [layoutMode, manualLayoutHtml, backgroundPreviewUrl, backgroundPreviewType, selectedLayoutPreset, sampleValues]);

  const saveManualLayout = html => {
    let savedHtml = backgroundPreviewUrl
      ? html.split(backgroundPreviewUrl).join("__TEMPLATE_BACKGROUND__")
      : html;
    Object.entries(sampleValues).forEach(([key, value]) => {
      const renderedValue = escapeHtml(formatSampleValue(key, value));
      if (renderedValue) {
        savedHtml = savedHtml.split(renderedValue).join("{{customer:" + key + "}}");
      }
    });
    setManualLayoutHtml(savedHtml);
    setLayoutMode("fine-tune");
    setFormError("");
  };

  const resetSampleValues = () => setSampleValues({ ...SAMPLE_CUSTOMER_VALUES });

  const handleBackgroundFileChange = event => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!ACCEPTED_BACKGROUND_TYPES.includes(file.type)) {
      setFormError("Use a PNG, JPG, WebP, MP4 or WebM background file.");
      event.target.value = "";
      return;
    }
    setDesignFile(file);
    setExistingDesignName(file.name);
    setManualLayoutHtml("");
    setLayoutMode("preset");
    setFormError("");
    event.target.value = "";
  };

  const handleThumbnailFileChange = event => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFormError("Thumbnail must be a PNG, JPG or WebP image.");
      event.target.value = "";
      return;
    }
    setThumbnailFile(file);
    setExistingThumbnailName(file.name);
    setFormError("");
    event.target.value = "";
  };




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
    setAllowCustomerMusic(template?.allowCustomerMusic ?? true);
    setAllowCustomerRemoveMusic(template?.allowCustomerRemoveMusic ?? false);
    setEditorTab("design");
    setLayoutPresetId(template?.layoutPresetId || "names-photo-details");
    setLayoutMode(template?.layoutMode === "fine-tune" && template?.manualLayoutHtml ? "fine-tune" : "preset");
    setManualLayoutHtml(template?.manualLayoutHtml || "");
    setSampleValues({ ...SAMPLE_CUSTOMER_VALUES, ...(template?.sampleValues || {}) });
    setCustomFieldLabel("");
    setFields(mergeCustomerFields(template?.category || "Wedding", template?.fields || []));
    setFormError("");
    setEditorOpen(true);
  };

  const changeCategory = value => {
    setCategory(value);
    setFields(current => [
      ...getDefaultFields(value),
      ...current.filter(field => field.custom)
    ]);
  };

  const updateField = (key, patch) => {
    setFields(current => current.map(field => field.key === key
      ? { ...field, ...patch, ...(ALWAYS_EDITABLE_KEYS.has(key) ? { enabled: true, required: field.required } : {}) }
      : field));
  };

  const addCustomField = () => {
    const label = customFieldLabel.trim();
    if (!label) return;
    const baseKey = "custom_" + label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const key = fields.some(field => field.key === baseKey) ? baseKey + "_" + Date.now().toString(36) : baseKey;
    setFields(current => [...current, {
      label, key, enabled: true, required: false, type: "text", maxLength: 120, custom: true
    }]);
    setSampleValues(current => ({ ...current, [key]: "" }));
    setCustomFieldLabel("");
  };

  const saveTemplate = async publish => {
    setFormError("");
    if (!title.trim()) { setFormError("Enter a template name."); return; }
    if (!description.trim()) { setFormError("Add a short description."); return; }
    if (!thumbnailFile && !existingThumbnailKey && !(existingBuiltInTemplateKey && !designFile)) { setFormError("Add a thumbnail image for the customer gallery."); return; }
    if (!designFile && !existingDesignKey && !existingBuiltInTemplateKey) { setFormError("Upload the Canva-exported video or image file."); return; }
    if (!fields.some(field => field.enabled)) { setFormError("Select at least one customer detail."); return; }
    if (designFile && !ACCEPTED_BACKGROUND_TYPES.includes(designFile.type)) {
      setFormError("Use a PNG, JPG, WebP, MP4 or WebM background file.");
      return;
    }

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
        fields: mergeCustomerFields(category, fields), allowCustomerMusic, allowCustomerRemoveMusic,
        musicRightsNotice: MUSIC_RIGHTS_NOTICE,
        layoutPresetId, layoutMode, manualLayoutHtml, sampleValues,
        status: publish ? "Published" : "Draft",
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
    const alwaysSampleFields = ALWAYS_EDITABLE_FIELDS;
    const customSampleFields = fields.filter(field => !ALWAYS_EDITABLE_KEYS.has(field.key) && field.enabled);

    return <main className="adm-shell adm-simple-editor">
      <header className="adm-editor-top">
        <button className="adm-quiet-btn" type="button" onClick={() => setEditorOpen(false)}>← Back to templates</button>
        <div><strong>{editingId ? "Edit template" : "Add a template"}</strong><span> · {title || "New invitation"}</span></div>
        <span className="adm-local-tag">Admin template setup</span>
      </header>

      <div className="adm-simple-content">
        <div className="adm-simple-heading">
          <div>
            <p className="adm-eyebrow">CANVA → INVITATION TEMPLATE</p>
            <h1>{editingId ? "Update your template." : "Add your Canva background."}</h1>
            <p>Upload a clean background, choose how the details are placed, then save the template.</p>
          </div>
          <div className="adm-steps-note"><span>01</span> Design <i>→</i> <span>02</span> Layout <i>→</i> <span>03</span> Details <i>→</i> <span>04</span> Music</div>
        </div>

        <nav className="adm-editor-tabs" role="tablist" aria-label="Template setup">
          {[
            ["design", "Design"],
            ["layout", "Layout"],
            ["details", "Details"],
            ["music", "Music"]
          ].map(([id, label], index) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={editorTab === id}
              className={editorTab === id ? "active" : ""}
              onClick={() => setEditorTab(id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{label}
            </button>
          ))}
        </nav>

        {editorTab === "design" && <>
          <section className="adm-simple-card">
            <div className="adm-card-title"><span>01</span><div><h2>Template information</h2><p>Give this invitation a clear name and category.</p></div></div>
            <div className="adm-form-grid">
              <label className="adm-form-field">Template name
                <input value={title} onChange={event => setTitle(event.target.value)} maxLength={80} placeholder="e.g. Royal Palace Wedding"/>
              </label>
              <label className="adm-form-field">Category
                <select value={category} onChange={event => changeCategory(event.target.value)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select>
              </label>
              <label className="adm-form-field adm-span-two">Short description
                <textarea value={description} onChange={event => setDescription(event.target.value)} rows="2" maxLength={220} placeholder="Describe the visual style of this invitation."/>
              </label>
              <label className="adm-form-field adm-span-two" style={{ display: existingBuiltInTemplateKey ? "none" : "flex" }}>Canva source link (optional)
                <input type="url" value={canvaUrl} onChange={event => setCanvaUrl(event.target.value)} placeholder="https://www.canva.com/design/..."/>
              </label>
            </div>
          </section>

          <section className="adm-simple-card">
            <div className="adm-card-title"><span>02</span><div><h2>Canva background</h2><p>Upload the finished background only. All invitation wording stays outside this file.</p></div></div>
            <div className="adm-upload-grid">
              <label className="adm-upload-box">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
                  onChange={handleBackgroundFileChange}
                />
                <Icon name="upload"/>
                <strong>{designFile?.name || existingDesignName || "Choose background image or video"}</strong>
                <small>PNG, JPG, WebP, MP4 or WebM</small>
                {(designFile || existingDesignKey) && <span className="adm-file-selected">Background saved in this template</span>}
              </label>
              <label className="adm-upload-box">
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbnailFileChange}/>
                <Icon name="upload"/>
                <strong>{thumbnailFile?.name || existingThumbnailName || "Choose gallery thumbnail"}</strong>
                <small>PNG, JPG or WebP</small>
                {(thumbnailFile || existingThumbnailKey) && <span className="adm-file-selected">Thumbnail saved in this template</span>}
              </label>
            </div>
            {canvaUrl && <p className="adm-canva-source">Canva source: <a href={canvaUrl} target="_blank" rel="noreferrer">Open editable design ↗</a></p>}
            {backgroundPreviewUrl && (
              <div className="adm-background-preview">
                <strong>Current background preview</strong>
                {backgroundPreviewType.startsWith("video/") ? (
                  <video className="adm-upload-preview" controls muted playsInline loop src={backgroundPreviewUrl}/>
                ) : (
                  <img className="adm-upload-preview" src={backgroundPreviewUrl} alt="Uploaded Canva background preview"/>
                )}
              </div>
            )}
            {(thumbnailFile || assetUrls[existingThumbnailKey]) && (
              <div className="adm-thumbnail-preview-wrap">
                <strong>Gallery thumbnail</strong>
                <img className="adm-thumbnail-preview" src={filePreviewUrls.thumbnail || assetUrls[existingThumbnailKey]} alt="Template gallery thumbnail"/>
              </div>
            )}
            <p className="adm-simple-note">Background, thumbnail and default music files are stored in this browser's IndexedDB. They are restored when this Admin page is reopened on the same browser.</p>
          </section>

          <section className="adm-simple-card adm-canva-guide">
            <div className="adm-card-title"><span>03</span><div><h2>Canva design guide</h2><p>Use these rules before exporting your background.</p></div></div>
            <div className="adm-guide-facts">
              <div><small>CANVAS SIZE</small><strong>1080 × 1920 px</strong><span>Portrait · 9:16</span></div>
              <div><small>SAFE MARGIN</small><strong>8% on every edge</strong><span>Keep important decoration inside this boundary.</span></div>
            </div>
            <ul className="adm-guide-list">
              <li>Keep the bride/groom name area empty.</li>
              <li>Keep date, time, venue and address areas empty.</li>
              <li>Leave photo areas clear for customer uploads.</li>
              <li>Do not bake text, names, dates, captions, logos or watermarks into the background.</li>
              <li>Accepted background formats: PNG, JPG, WebP, MP4 and WebM. Thumbnail: PNG, JPG or WebP.</li>
            </ul>
          </section>
        </>}

        {editorTab === "layout" && <>
          <section className="adm-simple-card">
            <div className="adm-card-title"><span>01</span><div><h2>Preset layouts</h2><p>Choose a ready-made arrangement. Text and photo slots are positioned automatically.</p></div></div>
            <div className="adm-preset-grid">
              {LAYOUT_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={layoutPresetId === preset.id ? "active" : ""}
                  aria-pressed={layoutPresetId === preset.id}
                  onClick={() => { setLayoutPresetId(preset.id); setLayoutMode("preset"); setManualLayoutHtml(""); }}
                >
                  <span className="adm-preset-mini" aria-hidden="true">
                    {preset.elements.slice(0, 5).map((element, index) => (
                      <i key={element.key + index} className={element.type === "photo" ? "photo" : "text"} style={{ left: element.x + "%", top: element.y + "%", width: element.w + "%", height: element.h + "%" }}/>
                    ))}
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                  <em>{preset.elements.length} positioned elements · timed reveal</em>
                </button>
              ))}
            </div>
            <div className="adm-layout-mode-row">
              <div><strong>Editing mode</strong><small>Start with a preset; use Fine-tune only when you need custom positioning.</small></div>
              <div>
                <button type="button" className={layoutMode === "preset" ? "active" : ""} onClick={() => setLayoutMode("preset")}>Preset</button>
                <button type="button" className={layoutMode === "fine-tune" ? "active" : ""} onClick={() => setLayoutMode("fine-tune")}>Fine-tune</button>
              </div>
            </div>
          </section>

          {layoutMode === "preset" ? (
            <section className="adm-simple-card">
              <div className="adm-card-title"><span>02</span><div><h2>Automatic placement preview</h2><p>{selectedLayoutPreset.description} The text and photo slots use the selected preset's font, size, colour and timing.</p></div></div>
              <div className="adm-layout-preview-frame">
                <iframe title="Preset invitation layout preview" srcDoc={layoutPreviewDocument} sandbox="allow-scripts"/>
              </div>
              {!backgroundPreviewUrl && <p className="adm-simple-note">Upload a Canva background in the Design tab to preview the real artwork behind these sample placements.</p>}
            </section>
          ) : (
            <section className="adm-simple-card">
              <div className="adm-card-title"><span>02</span><div><h2>Fine-tune layout</h2><p>Drag elements to move, resize with the corner handle, rotate, and adjust text properties.</p></div></div>
              {backgroundPreviewUrl ? (
                <WeddingVideoEditor
                  title={title || "Invitation layout"}
                  previewDocument={layoutPreviewDocument}
                  onSave={saveManualLayout}
                />
              ) : (
                <p className="adm-simple-note">Upload a background in the Design tab before opening Fine-tune mode.</p>
              )}
            </section>
          )}
        </>}

        {editorTab === "details" && <>
          <section className="adm-simple-card">
            <div className="adm-card-title"><span>01</span><div><h2>Always included customer details</h2><p>These seven fields stay editable for every template. They cannot be disabled here.</p></div></div>
            <div className="adm-always-field-grid">
              {ALWAYS_EDITABLE_FIELDS.map(field => (
                <div key={field.key} className="adm-always-field">
                  <span><strong>{field.label}</strong><small>{field.required ? "Required by default" : "Optional by default"}</small></span>
                  <em>Always included</em>
                </div>
              ))}
            </div>
          </section>

          <section className="adm-simple-card">
            <div className="adm-card-title"><span>02</span><div><h2>Template custom fields</h2><p>Keep category-specific fields or add your own. Optional fields can be hidden from this template.</p></div></div>
            <div className="adm-customer-fields">
              {fields.filter(field => !ALWAYS_EDITABLE_KEYS.has(field.key)).map(field => (
                <div className="adm-customer-field" key={field.key}>
                  <input type="checkbox" checked={field.enabled} onChange={event => updateField(field.key, { enabled: event.target.checked })}/>
                  <span>
                    {field.custom ? (
                      <input className="adm-custom-field-label" aria-label="Custom field label" value={field.label} onChange={event => updateField(field.key, { label: event.target.value })}/>
                    ) : <strong>{field.label}</strong>}
                    <small>{field.custom ? "Custom customer field" : field.type === "photos" ? "Customer photo slot" : "Category field"}</small>
                  </span>
                  <select aria-label={"Requirement for " + field.label} value={field.required ? "required" : "optional"} disabled={!field.enabled} onChange={event => updateField(field.key, { required: event.target.value === "required" })}>
                    <option value="required">Required</option><option value="optional">Optional</option>
                  </select>
                  {field.custom && <button type="button" onClick={() => setFields(current => current.filter(item => item.key !== field.key))}>Remove</button>}
                </div>
              ))}
            </div>
            <div className="adm-add-field">
              <input value={customFieldLabel} onChange={event => setCustomFieldLabel(event.target.value)} maxLength={70} placeholder="Add a custom field (e.g. RSVP phone)"/>
              <button type="button" disabled={!customFieldLabel.trim()} onClick={addCustomField}>Add field</button>
            </div>
          </section>

          <section className="adm-simple-card">
            <div className="adm-card-title"><span>03</span><div><h2>Sample customer details form</h2><p>This Admin-only form lets you test the values that will populate the layout. It does not change the live customer website.</p></div></div>
            <form className="adm-sample-form" onSubmit={event => event.preventDefault()}>
              {alwaysSampleFields.map(field => (
                <label key={field.key}>
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea rows="3" maxLength={field.maxLength} value={sampleValues[field.key] || ""} onChange={event => setSampleValues(current => ({ ...current, [field.key]: event.target.value }))}/>
                  ) : (
                    <input type={field.type === "date" ? "date" : field.type === "time" ? "time" : "text"} maxLength={field.type === "date" || field.type === "time" ? undefined : field.maxLength} value={sampleValues[field.key] || ""} onChange={event => setSampleValues(current => ({ ...current, [field.key]: event.target.value }))}/>
                  )}
                </label>
              ))}
              {customSampleFields.map(field => (
                <label key={field.key}>
                  {field.label}
                  {field.type === "photos" ? (
                    <input type="file" accept="image/png,image/jpeg,image/webp" multiple/>
                  ) : (
                    <input value={sampleValues[field.key] || ""} maxLength={field.maxLength || 120} onChange={event => setSampleValues(current => ({ ...current, [field.key]: event.target.value }))}/>
                  )}
                </label>
              ))}
              <div className="adm-sample-actions">
                <button className="adm-secondary-btn" type="button" onClick={resetSampleValues}>Reset to sample</button>
                <span>Sample values are saved with this Admin template.</span>
              </div>
            </form>
          </section>
        </>}

        {editorTab === "music" && <>
          <section className="adm-simple-card">
            <div className="adm-card-title"><span>01</span><div><h2>Default music</h2><p>Upload the track that should be selected when this template is used.</p></div></div>
            <label className="adm-upload-box adm-audio-upload">
              <input type="file" accept="audio/*" onChange={event => { setMusicFile(event.target.files?.[0] || null); setExistingMusicName(event.target.files?.[0]?.name || ""); }}/>
              <Icon name="upload"/>
              <strong>{musicFile?.name || existingMusicName || "Choose default music track"}</strong>
              <small>Audio file · stored in this browser's IndexedDB</small>
            </label>
            {(musicFile || assetUrls[existingMusicKey]) && (
              <audio className="adm-audio-preview" controls src={filePreviewUrls.music || assetUrls[existingMusicKey]}/>
            )}
          </section>

          <section className="adm-simple-card">
            <div className="adm-card-title"><span>02</span><div><h2>Customer music permissions</h2><p>These options are saved with the template for the customer form integration.</p></div></div>
            <label className="adm-switch-row">
              <input type="checkbox" checked={allowCustomerMusic} onChange={event => setAllowCustomerMusic(event.target.checked)}/>
              <span><b>Customers can upload their own music</b><small>Allow customers to replace the default track with their own upload.</small></span><i/>
            </label>
            <label className="adm-switch-row">
              <input type="checkbox" checked={allowCustomerRemoveMusic} onChange={event => setAllowCustomerRemoveMusic(event.target.checked)}/>
              <span><b>Customers can remove music</b><small>Allow a silent invitation even when a default track exists.</small></span><i/>
            </label>
            <p className="adm-music-rights-notice"><strong>Music upload rights notice</strong><span>{MUSIC_RIGHTS_NOTICE}</span><small>Stored with this template for display beside the customer upload control when the customer form is connected. This pass does not edit the live customer site.</small></p>
          </section>
        </>}

        {formError && <p className="adm-form-error" role="alert">{formError}</p>}
        <footer className="adm-simple-footer">
          <button className="adm-quiet-btn" type="button" onClick={() => setEditorOpen(false)}>Cancel</button>
          <div>
            <button className="adm-secondary-btn" type="button" disabled={saving} onClick={() => saveTemplate(false)}>{saving ? "Saving…" : "Save draft"}</button>
            <button className="adm-primary-btn" type="button" disabled={saving} onClick={() => saveTemplate(true)}>{saving ? "Saving…" : "Publish template"}</button>
          </div>
        </footer>
        <p className="adm-storage-note">Admin-only prototype: template settings are saved in localStorage; the background, thumbnail and default music files are stored in this browser's IndexedDB. Nothing is sent to the customer site or a database.</p>
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
        <div className="adm-heading-row"><div><p className="adm-eyebrow">CANVA → CUSTOMER WEBSITE</p><h1>Your invitation studio.</h1><p className="adm-subtitle">Upload clean Canva backgrounds, choose automatic layouts and configure editable invitation details.</p></div><button className="adm-primary-btn" type="button" onClick={() => openEditor()}><Icon name="plus"/> Add template</button></div>
        <div className="adm-stats-grid"><article className="adm-stat-card"><span>Total templates</span><strong>{templates.length}</strong><small>Saved in this browser</small></article><article className="adm-stat-card"><span>Published</span><strong>{publishedCount}</strong><small>Local publish status</small></article><article className="adm-stat-card"><span>Drafts</span><strong>{draftCount}</strong><small>Ready to finish</small></article></div>
        <div className="adm-section-heading"><div><p className="adm-eyebrow">CATEGORIES</p><h2>Every celebration, one place.</h2></div></div>
        <div className="adm-category-grid">{CATEGORIES.map(c => <button className="adm-category-card" key={c} type="button" onClick={() => { setCategoryFilter(c); setActiveSection("library"); }}><strong>{c}</strong><small>{templates.filter(t => t.category === c).length} templates</small><span className="adm-category-arrow">↗</span></button>)}</div>
      </div> : <div className="adm-content">
        <div className="adm-heading-row"><div><p className="adm-eyebrow">YOUR CANVA DESIGNS</p><h1>Template library</h1><p className="adm-subtitle">Manage background files, layout presets, customer fields and music settings.</p></div><button className="adm-primary-btn" type="button" onClick={() => openEditor()}><Icon name="plus"/> Add template</button></div>
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
