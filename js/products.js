/* ============================================================
   air up Store — Produktkatalog (zentrale Datenquelle)
   ------------------------------------------------------------
   Jedes Produkt:
     id        eindeutige ID
     name      Anzeigename
     desc      Kurzbeschreibung
     price     Preis in Cent (z. B. 3495 = 34,95 €)
     oldPrice  optionaler Streichpreis in Cent
     category  "sets" | "bottles" | "pods" | "accessories"
     tag       optionales Label ("Bestseller", "Neu", "")
     badge     optionales Emoji (z. B. Frucht bei Pods)
     art       Illustrations-Definition (siehe illustrations.js)
   ============================================================ */

const PRODUCTS = [
  /* ===== Starter-Sets ===== */
  {
    id: "set-aqua",
    name: "Starter-Set Generation 3",
    desc: "Flasche „Aqua Marine“ + 3 Pods deiner Wahl. Der perfekte Einstieg.",
    price: 3495,
    oldPrice: 3990,
    category: "sets",
    tag: "Bestseller",
    badge: "🫧",
    art: { type: "set", body: "#5ec8c8", cap: "#243b3f", pod: "#ff7a59" },
  },
  {
    id: "set-steel",
    name: "Steel Starter-Set",
    desc: "Isolierte Edelstahl-Flasche + 3 Pods. Hält Wasser 12 Std. eiskalt.",
    price: 6495,
    category: "sets",
    tag: "Premium",
    badge: "❄️",
    art: { type: "set", metallic: true, cap: "#1b1d20", pod: "#7b2d5e" },
  },
  {
    id: "set-family",
    name: "Family-Set",
    desc: "2 Flaschen + 6 Pods. Geschmack für die ganze Familie – clever gespart.",
    price: 7990,
    oldPrice: 8990,
    category: "sets",
    tag: "Spar-Set",
    badge: "👨‍👩‍👧",
    art: { type: "set", body: "#b9a7e6", cap: "#3a2f5c", pod: "#ffc233" },
  },

  /* ===== Flaschen ===== */
  {
    id: "bottle-aqua",
    name: "Flasche – Aqua Marine",
    desc: "650 ml, Tritan Renew™, BPA-frei und federleicht.",
    price: 2495,
    category: "bottles",
    tag: "",
    badge: "",
    art: { type: "bottle", body: "#5ec8c8", cap: "#243b3f", pod: "#ff7a59" },
  },
  {
    id: "bottle-pearl",
    name: "Flasche – Pearl White",
    desc: "650 ml, zeitloses Weiß mit mattem Finish.",
    price: 2495,
    category: "bottles",
    tag: "",
    badge: "",
    art: { type: "bottle", body: "#eef1f4", cap: "#cdd4db", pod: "#5ec8c8" },
  },
  {
    id: "bottle-charcoal",
    name: "Flasche – Charcoal Grey",
    desc: "650 ml, elegantes Anthrazit. Dein cleaner Begleiter.",
    price: 2495,
    category: "bottles",
    tag: "",
    badge: "",
    art: { type: "bottle", body: "#3a4048", cap: "#23272e", pod: "#b5e655" },
  },
  {
    id: "bottle-lavender",
    name: "Flasche – Lavender",
    desc: "650 ml, sanftes Lavendel. Limitierte Sommer-Edition.",
    price: 2695,
    category: "bottles",
    tag: "Neu",
    badge: "",
    art: { type: "bottle", body: "#b9a7e6", cap: "#4a3f6b", pod: "#ff5e7e" },
  },
  {
    id: "bottle-steel",
    name: "Steel-Flasche – Brushed",
    desc: "Isolierter Edelstahl, 650 ml. Hält kalt bis zu 12 Stunden.",
    price: 4995,
    category: "bottles",
    tag: "Premium",
    badge: "❄️",
    art: { type: "bottle", metallic: true, cap: "#1b1d20", pod: "#00b8a9" },
  },

  /* ===== Pods (Geschmack) ===== */
  {
    id: "pods-cola",
    name: "Pods – Cola",
    desc: "3er-Pack. Spritziger Cola-Geschmack, ganz ohne Zucker.",
    price: 995,
    category: "pods",
    tag: "Bestseller",
    badge: "🥤",
    art: { type: "pods", color: "#7a4a2b" },
  },
  {
    id: "pods-orange",
    name: "Pods – Orange-Passionsfrucht",
    desc: "3er-Pack. Fruchtig-frischer Klassiker für jeden Tag.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🍊",
    art: { type: "pods", color: "#ff9f1c" },
  },
  {
    id: "pods-apple",
    name: "Pods – Apfel",
    desc: "3er-Pack. Knackig, klar und natürlich erfrischend.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🍏",
    art: { type: "pods", color: "#8bc34a" },
  },
  {
    id: "pods-cherry",
    name: "Pods – Kirsche",
    desc: "3er-Pack. Vollmundig süße Kirsche ohne Kalorien.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🍒",
    art: { type: "pods", color: "#d7263d" },
  },
  {
    id: "pods-peach",
    name: "Pods – Pfirsich-Maracuja",
    desc: "3er-Pack. Sommerlich, exotisch, einfach lecker.",
    price: 995,
    category: "pods",
    tag: "Neu",
    badge: "🍑",
    art: { type: "pods", color: "#ffb085" },
  },
  {
    id: "pods-berry",
    name: "Pods – Waldbeere",
    desc: "3er-Pack. Tiefe Beerennote für echte Fruchtfans.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🫐",
    art: { type: "pods", color: "#7b2d5e" },
  },
  {
    id: "pods-mango",
    name: "Pods – Mango-Maracuja",
    desc: "3er-Pack. Tropisch-cremiger Geschmack pur.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🥭",
    art: { type: "pods", color: "#ffc233" },
  },
  {
    id: "pods-icetea",
    name: "Pods – Eistee Pfirsich",
    desc: "3er-Pack. Dein Lieblings-Eistee – ganz ohne Zucker.",
    price: 995,
    category: "pods",
    tag: "",
    badge: "🍑",
    art: { type: "pods", color: "#e3a06a" },
  },
  {
    id: "pods-multi",
    name: "Pods – Probierset (8 Sorten)",
    desc: "Großpack mit 8 Pods: entdecke deine Lieblingssorte.",
    price: 2495,
    oldPrice: 2960,
    category: "pods",
    tag: "Spar-Set",
    badge: "🌈",
    art: { type: "pods", color: "#ff5e7e" },
  },

  /* ===== Zubehör ===== */
  {
    id: "acc-strap",
    name: "Trageband",
    desc: "Robustes Band mit Clip – deine Flasche immer griffbereit.",
    price: 1495,
    category: "accessories",
    tag: "",
    badge: "",
    art: { type: "strap", color: "#00b8a9" },
  },
  {
    id: "acc-brush",
    name: "Reinigungsbürste",
    desc: "Perfekt geformt für Flasche und Strohhalm. Spülmaschinenfest.",
    price: 995,
    category: "accessories",
    tag: "",
    badge: "",
    art: { type: "brush" },
  },
  {
    id: "acc-lid",
    name: "Ersatzdeckel",
    desc: "Auslaufsicherer Deckel mit Trinktülle als Ersatz.",
    price: 1295,
    category: "accessories",
    tag: "",
    badge: "",
    art: { type: "lid", cap: "#3a4048", pod: "#00b8a9" },
  },
];

/* Kategorie-Reihenfolge & Labels für die Filter-Tabs */
const CATEGORIES = [
  { id: "all", label: "Alle" },
  { id: "sets", label: "Starter-Sets" },
  { id: "bottles", label: "Flaschen" },
  { id: "pods", label: "Pods" },
  { id: "accessories", label: "Zubehör" },
];
