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
export function buildVideoDesignCss(value) {
  const design = validateVideoDesign(value);
  if (!design) return "";
  const d = { surface: "none", font: "classic", nameFont: design.font || "classic",
    alignment: "center", nameWeight: 650, nameSize: 8.5, bodySize: 3.6,
    nameItalic: true, namesFirst: false, titleTracking: .09, gap: .7,
    panelOpacity: .25, blur: 8, radius: 2.2, borderColor: "#e8c889",
    borderOpacity: .45, borderWidth: .18, ...design };
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
