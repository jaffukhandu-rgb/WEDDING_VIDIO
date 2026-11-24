// Gemini chooses bounded design settings. Markup, bindings, timing and CSS
// generation remain under application control; no model code is executed.
export const MAX_DESIGN_PROMPT_LENGTH = 1200;
export function normalizeDesignPrompt(value) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > MAX_DESIGN_PROMPT_LENGTH) {
    throw new Error("Invalid invitation design prompt.");
  }
  return value.trim();
}
const FONTS = {
  classic: "Georgia,'Times New Roman',serif",
  editorial: "'Palatino Linotype',Palatino,Georgia,serif",
  formal: "'Times New Roman',Georgia,serif",
  modern: "system-ui,Arial,sans-serif",
  geometric: "'Trebuchet MS',Arial,sans-serif",
  elegant: "Garamond,Georgia,serif"
};
const enumField = (...values) => ({ type: "string", enum: values });
const numberField = (minimum, maximum) => ({ type: "number", minimum, maximum });
const colorField = { type: "string" };
const RULES = {
  surface: enumField("none", "glass", "solid", "outline"),
  font: enumField(...Object.keys(FONTS)),
  nameFont: enumField(...Object.keys(FONTS)),
  alignment: enumField("center", "left", "right"),
  nameWeight: numberField(400, 800),
  nameSize: numberField(6.5, 11),
  bodySize: numberField(3, 4.6),
  nameItalic: { type: "boolean" },
  namesFirst: { type: "boolean" },
  titleTracking: numberField(0, .22),
  gap: numberField(.4, 1.4),
  panelColor: colorField,
  panelOpacity: numberField(0, .85),
  blur: numberField(0, 16),
  radius: numberField(0, 6),
  borderColor: colorField,
  borderOpacity: numberField(0, .8),
  borderWidth: numberField(0, .45),
  lightAccent: colorField,
  darkAccent: colorField
};
export const VIDEO_DESIGN_SCHEMA = { type: "object", properties: RULES };

export function validateVideoDesign(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (!Object.hasOwn(RULES, key)) return null;
    const rule = RULES[key];
    if (rule.enum ? !rule.enum.includes(item)
      : rule.type === "number" ? typeof item !== "number" || !Number.isFinite(item)
        || item < rule.minimum || item > rule.maximum
      : rule.type === "boolean" ? typeof item !== "boolean"
      : typeof item !== "string" || !/^#[0-9a-f]{6}$/i.test(item)) return null;
    result[key] = item;
  }
  return Object.keys(result).length ? result : null;
}
function luminance(hex) {
  const rgb = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}
function rgba(hex, alpha) {
  return "rgba(" + [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)).join(",")
    + "," + alpha + ")";
}
// Resolve the same defaults used by the CSS generator, so a partial change
// never resets a previously implicit font, spacing or panel setting.
export function resolveVideoDesign(value) {
  const design = validateVideoDesign(value);
  if (!design) return null;
  return { surface: "none", font: "classic", nameFont: design.font || "classic",
    alignment: "center", nameWeight: 650, nameSize: 8.5, bodySize: 3.6,
    nameItalic: true, namesFirst: false, titleTracking: .09, gap: .7,
    panelOpacity: .25, blur: 8, radius: 2.2, borderColor: "#e8c889",
    borderOpacity: .45, borderWidth: .18, ...design };
}

export function mergeVideoDesign(previous, changes) {
  const base = resolveVideoDesign(previous);
  const patch = validateVideoDesign(changes);
  if (!base || !patch) return null;
  return validateVideoDesign({ ...base, ...patch });
}

// Only fully recognized, explicit instructions are handled locally.
// Never partially apply a mixed creative request or silently clamp its values.
export function applyExplicitDesignEdit(previous, instruction) {
  const base = resolveVideoDesign(previous);
  if (!base) return null;
  const prompt = normalizeDesignPrompt(instruction).toLowerCase()
    .replace(/[.!?]+$/, "").trim();
  const clauses = prompt.split(/\s*(?:;|,(?!\d)|\band\b|\.\s+)\s*/);
  const patch = {};
  const fieldNames = { namesize: "nameSize", bodysize: "bodySize", borderwidth: "borderWidth" };
  for (const raw of clauses) {
    const clause = raw.trim().replace(/^please\s+/, "");
    if (/^(?:keep|preserve) (?:all other|the other|remaining) (?:settings|properties)(?: unchanged)?$/.test(clause)) continue;
    let field, value;
    if (/^(?:remove (?:the )?border|no border)$/.test(clause)) {
      field = "borderWidth"; value = 0;
    } else {
      const match = clause.match(/^(?:set|change|increase|decrease) (?:the )?(name\s*size|body\s*size|border\s*width) to (-?(?:\d+(?:\.\d+)?|\.\d+))$/);
      if (!match) return null;
      field = fieldNames[match[1].replace(/\s/g, "")];
      value = Number(match[2]);
    }
    if (Object.hasOwn(patch, field)) return null;
    patch[field] = value;
  }
  if (!Object.keys(patch).length) return null;
  const updated = mergeVideoDesign(base, patch);
  if (!updated) throw Error("Requested design value is outside the allowed range (name size 6.5–11, body size 3–4.6, border width 0–0.45).");
  return updated;
}

export function buildVideoDesignCss(value) {
  const d = resolveVideoDesign(value);
  if (!d) return "";
  const selector = ".copy[data-scene-timeline]";
  const alignment = { center: "center", left: "flex-start", right: "flex-end" }[d.alignment];
  const panel = ink => {
    if (d.surface === "none") return "background:none;border:0;backdrop-filter:none";
    const dark = ink === "light";
    const color = d.panelColor && (dark ? luminance(d.panelColor) <= .25 : luminance(d.panelColor) >= .55)
      ? d.panelColor : dark ? "#21170f" : "#fff5df";
    const alpha = d.surface === "solid" ? Math.max(.55, d.panelOpacity)
      : d.surface === "glass" ? Math.min(.45, d.panelOpacity) : 0;
    return "background:" + rgba(color, alpha) + ";border:" + d.borderWidth + "cqw solid "
      + rgba(d.borderColor, d.borderOpacity) + ";border-radius:" + d.radius
      + "cqw;backdrop-filter:" + (d.surface === "glass" ? "blur(" + d.blur + "px)" : "none");
  };
  const light = d.lightAccent && luminance(d.lightAccent) >= .48 ? d.lightAccent : "inherit";
  const dark = d.darkAccent && luminance(d.darkAccent) <= .16 ? d.darkAccent : "inherit";
  return [
    selector + "{font-family:" + FONTS[d.font] + ";text-align:" + d.alignment + "}",
    selector + " .copy-inner{align-items:" + alignment + ";gap:" + d.gap + "em}",
    selector + " .names{font-family:" + FONTS[d.nameFont] + ";font-size:" + d.nameSize
      + "em;font-weight:" + d.nameWeight + ";font-style:" + (d.nameItalic ? "italic" : "normal")
      + (d.namesFirst ? ";order:-1" : "") + "}",
    selector + " .ceremony{font-family:" + FONTS[d.font] + ";letter-spacing:" + d.titleTracking + "em}",
    selector + " .message," + selector + " .address," + selector + " .blessing{font-size:" + d.bodySize + "em}",
    selector + '[data-design-ink="light"]{' + panel("light") + "}",
    selector + '[data-design-ink="dark"]{' + panel("dark") + "}",
    selector + '[data-design-ink="light"] .names{color:' + light + "}",
    selector + '[data-design-ink="dark"] .names{color:' + dark + "}"
  ].join("\n");
}

// Metadata is deliberately limited to validated style settings, not prompts,
// scripts, HTML or customer data. It travels with a generated source/draft.
const DESIGN_BLOCK = /\/\* wedding-ai-design:v1 ([^\r\n]*?) \*\/\n([\s\S]*?)\n\/\* wedding-ai-design:end \*\//g;
export function buildVideoDesignBlock(value) {
  const design = resolveVideoDesign(value);
  return "/* wedding-ai-design:v1 " + JSON.stringify(design) + " */\n" +
    buildVideoDesignCss(design) + "\n/* wedding-ai-design:end */";
}

export function readVideoDesignBlock(html) {
  if (typeof html !== "string" || html.length > 1024 * 1024) return null;
  const matches = [...html.matchAll(DESIGN_BLOCK)];
  if (matches.length !== 1) return null;
  const [block, json, css] = matches[0];
  const headEnd = html.indexOf("</head>");
  const styleStart = html.lastIndexOf("<style>", matches[0].index);
  const styleEnd = html.indexOf("</style>", matches[0].index);
  if (headEnd < 0 || styleStart < 0 || styleEnd < 0 ||
      styleEnd > headEnd || matches[0].index + block.length > styleEnd ||
      html.slice(styleStart + 7, matches[0].index).includes("</style>")) return null;
  try {
    const parsed = JSON.parse(json);
    const design = parsed === null ? null : resolveVideoDesign(parsed);
    if ((parsed !== null && !design) || css !== buildVideoDesignCss(design)) return null;
    return { design, block };
  } catch { return null; }
}

export function replaceVideoDesignBlock(html, value) {
  const current = readVideoDesignBlock(html);
  const design = resolveVideoDesign(value);
  if (!current || !design) throw new Error("Cannot safely refine this invitation style.");
  // The entire non-design source remains byte-for-byte identical.
  return html.replace(current.block, () => buildVideoDesignBlock(design));
}
