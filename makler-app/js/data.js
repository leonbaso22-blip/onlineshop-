/* ===========================================================================
   data.js – Datenquelle & Persistenz für den Makler-KI-Assistenten
   Reine Demo-Daten. Alles wird in localStorage gespeichert, damit Änderungen
   (neue Anfragen, Termine, gesendete Antworten) erhalten bleiben.
   =========================================================================== */

const STORAGE_KEY = 'makler-ki-state-v1';

/* --- Hilfsfunktionen für Datumswerte (relativ zu heute) -------------------- */
function dayOffset(days, hour = 10, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}
function isoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* --- Stammdaten: Objekte (Immobilien) -------------------------------------- */
const SEED_OBJECTS = [
  {
    id: 'obj-1',
    title: 'Lichtdurchflutete 3-Zimmer-Altbauwohnung',
    type: 'Wohnung',
    address: 'Gärtnerstraße 14',
    city: '80992 München',
    price: 685000,
    rooms: 3,
    area: 92,
    status: 'verfügbar',
    description: 'Charmanter Altbau mit Stuck, Parkett und Südbalkon in ruhiger Lage nahe dem Westpark.',
    features: ['Balkon', 'Altbau', 'Parkett', 'EBK', 'Keller'],
  },
  {
    id: 'obj-2',
    title: 'Modernes Reihenmittelhaus mit Garten',
    type: 'Haus',
    address: 'Amselweg 7',
    city: '85540 Haar',
    price: 945000,
    rooms: 5,
    area: 148,
    status: 'verfügbar',
    description: 'Energieeffizientes Reihenhaus (KfW 55), Bj. 2019, mit Südwest-Garten, Garage und Fußbodenheizung.',
    features: ['Garten', 'Garage', 'Fußbodenheizung', 'KfW 55', 'Gäste-WC'],
  },
  {
    id: 'obj-3',
    title: 'Helles 2-Zimmer-Apartment als Kapitalanlage',
    type: 'Wohnung',
    address: 'Tegernseer Landstraße 102',
    city: '81539 München',
    price: 429000,
    rooms: 2,
    area: 58,
    status: 'reserviert',
    description: 'Vermietete Anlagewohnung mit solidem Mietertrag, Aufzug und Tiefgaragenstellplatz.',
    features: ['Aufzug', 'Tiefgarage', 'vermietet', 'Balkon'],
  },
  {
    id: 'obj-4',
    title: 'Stilvolle Bürofläche im Glockenbachviertel',
    type: 'Gewerbe',
    address: 'Müllerstraße 40',
    city: '80469 München',
    price: 0,
    rent: 4200,
    rooms: 6,
    area: 180,
    status: 'verfügbar',
    description: 'Repräsentative Büroeinheit, teilbar, klimatisiert, mit Meetingräumen und Teeküche. Provisionsfrei für Mieter.',
    features: ['Klimaanlage', 'Meetingräume', 'teilbar', 'Glasfaser'],
  },
];

/* --- Anfragen / Leads inkl. Konversationsverlauf --------------------------- */
const SEED_LEADS = [
  {
    id: 'lead-1',
    name: 'Familie Becker',
    contact: 'Sabine Becker',
    email: 's.becker@example.de',
    phone: '+49 151 2345678',
    objectId: 'obj-2',
    status: 'neu',
    intent: 'besichtigung',
    createdAt: dayOffset(0, 8, 15),
    messages: [
      {
        from: 'kunde',
        time: dayOffset(0, 8, 15),
        text: 'Guten Tag, wir interessieren uns sehr für das Reihenhaus in Haar. Wäre eine Besichtigung am kommenden Wochenende möglich? Wir haben zwei Kinder und suchen etwas mit Garten.',
      },
    ],
  },
  {
    id: 'lead-2',
    name: 'Herr Demir',
    contact: 'Kenan Demir',
    email: 'k.demir@example.de',
    phone: '+49 160 9988776',
    objectId: 'obj-1',
    status: 'in Kontakt',
    intent: 'preis',
    createdAt: dayOffset(-1, 14, 30),
    messages: [
      {
        from: 'kunde',
        time: dayOffset(-1, 14, 30),
        text: 'Hallo, ist der Preis für die Altbauwohnung noch verhandelbar? Und wie hoch sind die monatlichen Nebenkosten ungefähr?',
      },
      {
        from: 'makler',
        time: dayOffset(-1, 16, 5),
        text: 'Sehr geehrter Herr Demir, vielen Dank für Ihr Interesse. Gerne bespreche ich die Details mit Ihnen persönlich. Hätten Sie diese Woche Zeit für ein kurzes Telefonat?',
      },
    ],
  },
  {
    id: 'lead-3',
    name: 'Frau Hoffmann',
    contact: 'Julia Hoffmann',
    email: 'j.hoffmann@example.de',
    phone: '+49 170 5566778',
    objectId: 'obj-3',
    status: 'Besichtigung geplant',
    intent: 'kapitalanlage',
    createdAt: dayOffset(-3, 11, 0),
    messages: [
      {
        from: 'kunde',
        time: dayOffset(-3, 11, 0),
        text: 'Guten Tag, mich interessiert die Anlagewohnung an der Tegernseer Landstraße. Wie hoch ist die aktuelle Mietrendite?',
      },
      {
        from: 'makler',
        time: dayOffset(-3, 13, 20),
        text: 'Sehr geehrte Frau Hoffmann, die Wohnung erzielt eine Bruttorendite von ca. 3,1 %. Ich schlage einen Besichtigungstermin vor – passt Ihnen Donnerstag, 15 Uhr?',
      },
      {
        from: 'kunde',
        time: dayOffset(-2, 9, 10),
        text: 'Donnerstag 15 Uhr passt mir gut, ich freue mich darauf.',
      },
    ],
  },
  {
    id: 'lead-4',
    name: 'Herr & Frau Wagner',
    contact: 'Thomas Wagner',
    email: 't.wagner@example.de',
    phone: '+49 152 1122334',
    objectId: 'obj-2',
    status: 'Angebot',
    intent: 'finanzierung',
    createdAt: dayOffset(-6, 10, 45),
    messages: [
      {
        from: 'kunde',
        time: dayOffset(-6, 10, 45),
        text: 'Hallo, nach der Besichtigung des Reihenhauses möchten wir ein Angebot abgeben. Können Sie uns mit einer Finanzierungsempfehlung weiterhelfen?',
      },
      {
        from: 'makler',
        time: dayOffset(-6, 12, 0),
        text: 'Sehr gerne! Ich stelle Ihnen den Kontakt zu unserem Finanzierungspartner her und sende Ihnen das Exposé mit allen Unterlagen zu.',
      },
    ],
  },
  {
    id: 'lead-5',
    name: 'Startup Lumio GmbH',
    contact: 'Mara Vogel',
    email: 'm.vogel@lumio.example',
    phone: '+49 89 12345600',
    objectId: 'obj-4',
    status: 'neu',
    intent: 'verfügbarkeit',
    createdAt: dayOffset(0, 9, 50),
    messages: [
      {
        from: 'kunde',
        time: dayOffset(0, 9, 50),
        text: 'Guten Tag, ist die Bürofläche im Glockenbachviertel ab dem 1. des nächsten Monats verfügbar? Wir bräuchten ca. 120 m² für 10 Mitarbeitende.',
      },
    ],
  },
];

/* --- Termine (Besichtigungen, Beratungen) ---------------------------------- */
const SEED_APPOINTMENTS = [
  {
    id: 'apt-1',
    leadId: 'lead-3',
    objectId: 'obj-3',
    type: 'Besichtigung',
    date: isoDate(2),
    time: '15:00',
    notes: 'Erstbesichtigung mit Frau Hoffmann.',
  },
  {
    id: 'apt-2',
    leadId: 'lead-4',
    objectId: 'obj-2',
    type: 'Beratung',
    date: isoDate(1),
    time: '11:30',
    notes: 'Finanzierungsgespräch, Partner hinzuziehen.',
  },
  {
    id: 'apt-3',
    leadId: 'lead-2',
    objectId: 'obj-1',
    type: 'Telefonat',
    date: isoDate(0),
    time: '17:00',
    notes: 'Preis & Nebenkosten besprechen.',
  },
];

/* --- State laden / speichern ----------------------------------------------- */
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* fällt auf Seed zurück */
    }
  }
  const seed = {
    objects: SEED_OBJECTS,
    leads: SEED_LEADS,
    appointments: SEED_APPOINTMENTS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return loadState();
}

const STATUS_FLOW = ['neu', 'in Kontakt', 'Besichtigung geplant', 'Angebot', 'abgeschlossen', 'verloren'];

window.MaklerData = { loadState, saveState, resetState, STATUS_FLOW };
