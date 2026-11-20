// Customer template catalogue cleared intentionally.
// Old template definitions remain recoverable from Git history.
// Keep these exports stable for existing components and future code-based templates.

export const CULTURE_OCCASIONS = ["wedding", "festival"];

export const CULTURE_OPTIONS = [
  { id: "general", name: "General / Modern" },
  { id: "islamic", name: "Islamic" },
  { id: "hindu", name: "Hindu" },
  { id: "christian", name: "Christian" },
  { id: "sikh", name: "Sikh" },
  { id: "jain", name: "Jain" },
  { id: "bohra", name: "Bohra" },
  { id: "other", name: "Other / Custom" },
];

export const OCCASIONS = [
  { id: "wedding", name: "Wedding", icon: "✦", description: "A beautiful celebration of two lives." },
  { id: "festival", name: "Festival", icon: "✺", description: "Celebrate traditions, faith and togetherness." },
  { id: "birthday", name: "Birthday", icon: "🎂", description: "Make their special day unforgettable." },
  { id: "engagement", name: "Engagement", icon: "◇", description: "Celebrate the beginning of forever." },
  { id: "anniversary", name: "Anniversary", icon: "∞", description: "Turn memories into a beautiful story." },
  { id: "baby-shower", name: "Baby Shower", icon: "♡", description: "Welcome a beautiful new chapter." },
  { id: "corporate", name: "Corporate", icon: "▣", description: "Create a polished event video." },
];

// No templates are published for customers at this stage.
export const TEMPLATE_STYLES = [];
export const WEDDING_TEMPLATE_STYLES = [];

export function getTemplatesForOccasion() {
  return [];
}

export const STYLE_FILTER_OPTIONS = [
  { value: "all", label: "All styles" },
];

export const COLOR_FILTER_OPTIONS = [
  { value: "all", label: "All colours" },
];
