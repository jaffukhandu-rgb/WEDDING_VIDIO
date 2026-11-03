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

export const TEMPLATE_STYLES = [
  {
    id: "royal",
    name: "Royal Maharaja",
    category: "Royal",
    color: "Burgundy & Gold",
    colorId: "gold",
    colors: { background: "#351321", middle: "#742a3b", accent: "#d9b36c", ink: "#fff0cf", soft: "#f3dba9" },
    motif: "♛",
    description: "Palace-inspired frames and antique gold detailing.",
    featuredRank: 1,
  },
  {
    id: "glass",
    name: "Glassmorphism",
    category: "Glassmorphism",
    color: "Ice Blue",
    colorId: "blue",
    colors: { background: "#102938", middle: "#25616d", accent: "#a5e3e8", ink: "#f0fcff", soft: "#c4f1f1" },
    motif: "✧",
    description: "Frosted-glass layers, light and modern depth.",
    featuredRank: 3,
  },
  {
    id: "three-d",
    name: "3D Opulence",
    category: "3D",
    color: "Amber & Bronze",
    colorId: "amber",
    colors: { background: "#321b12", middle: "#88502a", accent: "#e5a956", ink: "#fff0d5", soft: "#f5c67d" },
    motif: "❖",
    description: "Dimensional ornament and sculptural highlights.",
    featuredRank: 2,
  },
  {
    id: "cinematic",
    name: "Cinematic",
    category: "Cinematic",
    color: "Midnight Blue",
    colorId: "blue",
    colors: { background: "#101824", middle: "#263d57", accent: "#b9cce0", ink: "#f2f6fb", soft: "#d9c38d" },
    motif: "✦",
    description: "Dramatic light, shadow and film-title composition.",
    featuredRank: 4,
  },
  {
    id: "editorial",
    name: "Luxury Editorial",
    category: "Luxury",
    color: "Ivory & Charcoal",
    colorId: "ivory",
    colors: { background: "#24221e", middle: "#6d6253", accent: "#d7c7a8", ink: "#fff8e9", soft: "#e6dbc6" },
    motif: "◆",
    description: "Quiet luxury with refined editorial typography.",
    featuredRank: 5,
  },
  {
    id: "heritage",
    name: "Traditional Heritage",
    category: "Traditional",
    color: "Terracotta",
    colorId: "terracotta",
    colors: { background: "#321914", middle: "#88432d", accent: "#d99a65", ink: "#fff0d9", soft: "#f0c895" },
    motif: "❀",
    description: "Heritage-inspired borders, arches and ornament.",
    featuredRank: 6,
  },
  {
    id: "floral",
    name: "Modern Floral",
    category: "Floral",
    color: "Blush & Rose",
    colorId: "rose",
    colors: { background: "#38232b", middle: "#85515e", accent: "#e6a9b3", ink: "#fff2f1", soft: "#f6d6d7" },
    motif: "❀",
    description: "Botanical details with a soft contemporary finish.",
    featuredRank: 7,
  },
];

const OCCASION_COPY = {
  wedding: {
    imageUrl: "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Wedding couple in traditional attire beneath warm celebration lights",
    names: ["Maharaja Palace", "Crystal Vows", "Golden Heirloom", "The Wedding Film", "Ivory Editorial", "Heritage Mandap", "Garden Romance"],
    title: "The Wedding",
    subtitle: "A story made for two",
    motif: "♡",
  },
  festival: {
    imageUrl: "https://images.unsplash.com/photo-1700196799342-b38cf43c490d?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Colourful Diwali lights hanging above a festive street",
    names: ["Royal Utsav", "Celestial Lights", "Festival 3D", "Festival Cinema", "Modern Celebration", "Heritage Festival", "Floral Festive"],
    title: "Festival of Joy",
    subtitle: "Celebrate every moment",
    motif: "✺",
  },
  birthday: {
    imageUrl: "https://images.unsplash.com/photo-1774290686879-d8e08c9432f8?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Birthday cake with lit candles and softly blurred celebration lights",
    names: ["Birthday Royale", "Neon Glass Party", "3D Birthday Blast", "Birthday Premiere", "The Birthday Edit", "Classic Celebration", "Confetti Garden"],
    title: "Happy Birthday",
    subtitle: "A day full of happiness",
    motif: "✺",
  },
  engagement: {
    imageUrl: "https://images.unsplash.com/photo-1722952934708-749c22eb2e58?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Couple celebrating a formal commitment",
    names: ["Royal Promise", "Crystal Engagement", "Golden Ring 3D", "Our First Chapter", "The Engagement Edit", "Traditional Promise", "Petals & Promises"],
    title: "The Engagement",
    subtitle: "The beginning of forever",
    motif: "◇",
  },
  anniversary: {
    imageUrl: "https://images.unsplash.com/photo-1769812343775-85a27e6a076c?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Elegant floral reception table with white flowers and warm light",
    names: ["Royal Years", "Moments in Glass", "Golden Milestones", "Our Story in Frames", "Timeless Together", "Heritage of Love", "Everlasting Blooms"],
    title: "Our Story",
    subtitle: "Celebrating every chapter",
    motif: "∞",
  },
  "baby-shower": {
    imageUrl: "https://images.unsplash.com/photo-1768776182359-75ecacc8735d?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Soft pink and white baby shower balloon display",
    names: ["Little Prince & Princess", "Dreamy Glass", "3D Baby Celebration", "A New Little Story", "The Baby Edit", "Traditional Welcome", "Blooming Baby"],
    title: "A Little Wonder",
    subtitle: "A beautiful new chapter",
    motif: "♡",
  },
  corporate: {
    imageUrl: "https://images.unsplash.com/photo-1773828755374-0ee802d9f44b?auto=format&fit=crop&w=1400&q=85",
    imageAlt: "Professional conference speaker presenting to a large auditorium",
    names: ["Executive Prestige", "Glass Office", "3D Brand Moment", "Corporate Premiere", "Modern Annual Report", "Heritage Awards", "People & Progress"],
    title: "Our Event",
    subtitle: "A professional impression",
    motif: "▣",
  },
};

const CULTURE_COPY = {
  general: {
    wedding: { title: "The Wedding", subtitle: "A story made for two", motif: "♡", details: "Modern ornament · elegant frame · warm light" },
    festival: { title: "Festival of Joy", subtitle: "Celebrate every moment", motif: "✺", details: "Festive lights · decorative pattern · colour" },
  },
  islamic: {
    wedding: { title: "Nikah Mubarak", subtitle: "A blessed beginning", motif: "☾", details: "Geometric ornament · crescent · elegant arch" },
    festival: { title: "Eid Mubarak", subtitle: "A season of blessings", motif: "☾", details: "Lantern · crescent · geometric stars" },
  },
  hindu: {
    wedding: { title: "Shubh Vivah", subtitle: "A sacred union", motif: "ॐ", details: "Mandap · marigold · temple-inspired border" },
    festival: { title: "Shubh Utsav", subtitle: "Celebrate with devotion", motif: "दीप", details: "Diya · rangoli · marigold" },
  },
  christian: {
    wedding: { title: "Sacred Vows", subtitle: "Two lives, one promise", motif: "✝", details: "Church arch · lilies · soft ivory" },
    festival: { title: "Season of Joy", subtitle: "Peace, hope and togetherness", motif: "✧", details: "Star · candlelight · evergreen" },
  },
  sikh: {
    wedding: { title: "Anand Karaj", subtitle: "A union in divine love", motif: "ੴ", details: "Ik Onkar · floral arch · warm gold" },
    festival: { title: "Gurpurab", subtitle: "Celebrate the light of wisdom", motif: "ੴ", details: "Gurdwara-inspired arch · light · floral border" },
  },
  jain: {
    wedding: { title: "A Sacred Union", subtitle: "Together in harmony", motif: "अहिंसा", details: "Lotus · temple carving · peaceful ivory" },
    festival: { title: "Maitri Bhav", subtitle: "A time for peace and reflection", motif: "❖", details: "Ahimsa motif · lotus · serene ornament" },
  },
  bohra: {
    wedding: { title: "Nikah Mubarak", subtitle: "A blessed new chapter", motif: "۞", details: "Bohra-inspired geometry · arch · pearl gold" },
    festival: { title: "Eid Mubarak", subtitle: "Together in gratitude", motif: "۞", details: "Lantern · floral geometry · gold" },
  },
  other: {
    wedding: { title: "A Celebration", subtitle: "Made around your traditions", motif: "❖", details: "Custom motifs · decorative border · rich detail" },
    festival: { title: "A Special Celebration", subtitle: "Made around your culture", motif: "❖", details: "Custom symbols · decorative border · colour" },
  },
};

export function getTemplatesForOccasion(occasionId, cultureId) {
  const occasion = OCCASION_COPY[occasionId];
  if (!occasion) return [];

  const isCulturalOccasion = CULTURE_OCCASIONS.includes(occasionId);
  const selectedCulture = cultureId || "general";
  const culturalCopy = isCulturalOccasion
    ? (CULTURE_COPY[selectedCulture] || CULTURE_COPY.general)[occasionId]
    : null;

  return TEMPLATE_STYLES.map((style, index) => {
    const name = occasion.names[index] || style.name;
    const baseTitle = culturalCopy ? culturalCopy.title : occasion.title;
    const baseSubtitle = culturalCopy ? culturalCopy.subtitle : occasion.subtitle;
    const baseMotif = culturalCopy ? culturalCopy.motif : occasion.motif;
    const details = culturalCopy
      ? culturalCopy.details
      : style.description;

    return {
      id: occasionId + "-" + selectedCulture + "-" + style.id,
      occasionId,
      cultureId: isCulturalOccasion ? selectedCulture : null,
      name,
      description: style.description,
      imageUrl: occasion.imageUrl,
      imageAlt: occasion.imageAlt,
      styleId: style.id,
      styleName: style.name,
      category: style.category,
      color: style.color,
      colorId: style.colorId,
      colors: style.colors,
      motif: baseMotif,
      styleMotif: style.motif,
      previewTitle: baseTitle,
      previewSubtitle: baseSubtitle,
      detailLine: details,
      featuredRank: style.featuredRank,
      releaseOrder: index + 1,
    };
  });
}

export const STYLE_FILTER_OPTIONS = [
  { value: "all", label: "All styles" },
  ...TEMPLATE_STYLES.map((style) => ({ value: style.id, label: style.category })),
];

export const COLOR_FILTER_OPTIONS = [
  { value: "all", label: "All colours" },
  ...Array.from(
    new Map(TEMPLATE_STYLES.map((style) => [style.colorId, style.color])).entries(),
    ([value, label]) => ({ value, label }),
  ),
];
