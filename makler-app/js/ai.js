/* ===========================================================================
   ai.js – KI-Assistenz für den Makler
   Antwortentwürfe, Lead-Scoring, Tagesbriefing, Exposé & Terminvorschläge.

   Demo-Hinweis: Damit die App ohne Backend und ohne API-Schlüssel sofort
   läuft, arbeitet der Assistent regelbasiert und kontextsensitiv
   (Intent-Erkennung + Objekt-/Lead-Daten). generateReplyDraft() ist die
   zentrale Schnittstelle: Für echte KI würde man hier einen serverseitigen
   Aufruf der Claude API einsetzen (siehe Kommentar in generateReplyDraft).
   =========================================================================== */

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function priceLabel(obj) {
  if (!obj) return '';
  if (obj.type === 'Gewerbe' && obj.rent) return `${EUR.format(obj.rent)} / Monat (zzgl. NK)`;
  return EUR.format(obj.price);
}

/* Intent aus der letzten Kundennachricht ableiten -------------------------- */
function detectIntent(text = '') {
  const t = text.toLowerCase();
  if (/(besichtig|termin|ansehen|vorbeikommen|wochenende)/.test(t)) return 'besichtigung';
  if (/(preis|verhandel|kaufpreis|teurer|günstiger|nebenkosten)/.test(t)) return 'preis';
  if (/(finanzier|kredit|darlehen|bank|rate)/.test(t)) return 'finanzierung';
  if (/(verfügbar|frei ab|einzug|ab wann|bezugsfrei)/.test(t)) return 'verfügbarkeit';
  if (/(rendite|kapitalanlage|vermietet|miete)/.test(t)) return 'kapitalanlage';
  return 'allgemein';
}

/* Stimmung der letzten Kundennachricht (grob) ------------------------------ */
function detectSentiment(text = '') {
  const t = text.toLowerCase();
  if (/(begeistert|sofort|unbedingt|lieben|perfekt|kein problem|budget ist|schnell)/.test(t)) return 'positiv';
  if (/(leider|zu teuer|über.*budget|kein interesse|absage|nicht)/.test(t)) return 'kritisch';
  return 'neutral';
}

/* Lead-Scoring: Hot / Warm / Cold ------------------------------------------ */
function scoreLead(lead) {
  let score = 30;
  const stageBonus = { 'neu': 0, 'in Kontakt': 12, 'Besichtigung geplant': 28, 'Angebot': 42, 'abgeschlossen': 60, 'verloren': -40 };
  score += stageBonus[lead.status] ?? 0;

  const last = [...lead.messages].reverse().find((m) => m.from === 'kunde');
  const sentiment = detectSentiment(last ? last.text : '');
  if (sentiment === 'positiv') score += 22;
  if (sentiment === 'kritisch') score -= 25;

  if (lead.intent === 'finanzierung' || lead.intent === 'besichtigung') score += 12;

  const ageH = (Date.now() - new Date(lead.createdAt)) / 36e5;
  if (ageH < 24) score += 10; else if (ageH > 24 * 7) score -= 8;

  score += Math.min(lead.messages.length * 3, 12);
  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier = 'cold';
  if (score >= 70) tier = 'hot';
  else if (score >= 45) tier = 'warm';
  return { score, tier, sentiment };
}

/* Nächsten freien Werktags-Slot finden ------------------------------------- */
function suggestSlot(appointments) {
  const busy = new Set(appointments.map((a) => `${a.date} ${a.time}`));
  const slots = ['10:00', '14:00', '16:30'];
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const dateStr = d.toISOString().slice(0, 10);
    for (const time of slots) {
      if (!busy.has(`${dateStr} ${time}`)) {
        const human = d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
        return { date: dateStr, time, human: `${human} um ${time} Uhr` };
      }
    }
  }
  return null;
}

/* Kern: Antwortentwurf für eine Anfrage erzeugen --------------------------- */
function generateReplyDraft(lead, object, appointments) {
  /* --- Integrationspunkt für echte KI -----------------------------------
     Für produktive KI-Antworten hier einen Backend-Aufruf einsetzen, z. B.:

       const res = await fetch('/api/ai/draft', {
         method: 'POST', body: JSON.stringify({ lead, object })   // ruft Claude API
       });
       return (await res.json()).draft;

     Der API-Schlüssel gehört aus Sicherheits-/DSGVO-Gründen ausschließlich auf
     den Server, niemals ins Frontend. Bis dahin: lokale Logik unten. -------- */

  const lastCustomer = [...lead.messages].reverse().find((m) => m.from === 'kunde');
  const intent = detectIntent(lastCustomer ? lastCustomer.text : '') || lead.intent;
  const anrede = `Sehr geehrte/r ${lead.contact}`;
  const objTitle = object ? object.title : 'die angefragte Immobilie';
  const slot = suggestSlot(appointments);

  let body = '';
  switch (intent) {
    case 'besichtigung':
      body = `vielen Dank für Ihr Interesse an „${objTitle}" (${object.address}, ${object.city}). ` +
        `Sehr gerne zeige ich Ihnen das Objekt persönlich. ` +
        (slot ? `Ich könnte Ihnen einen Termin am ${slot.human} anbieten – passt Ihnen das? ` : `Nennen Sie mir gern zwei, drei Zeitfenster, die Ihnen passen. `) +
        `Falls gewünscht, sende ich Ihnen vorab das vollständige Exposé zu.`;
      break;
    case 'preis':
      body = `vielen Dank für Ihre Nachricht zu „${objTitle}". Der aktuelle Angebotspreis liegt bei ${priceLabel(object)}. ` +
        `Die Höhe der Nebenkosten bespreche ich gerne im Detail mit Ihnen. ` +
        (slot ? `Wie wäre es mit einem kurzen Telefonat am ${slot.human}? ` : ``) +
        `So kann ich auf Ihre Fragen individuell eingehen.`;
      break;
    case 'finanzierung':
      body = `vielen Dank für Ihr Interesse an „${objTitle}". Bei der Finanzierung unterstütze ich Sie gerne und ` +
        `stelle bei Bedarf den Kontakt zu unserem unabhängigen Finanzierungspartner her. ` +
        `Für ein passendes Angebot sind Eigenkapital, Laufzeit und gewünschte Monatsrate relevant. ` +
        (slot ? `Sollen wir das am ${slot.human} gemeinsam durchgehen?` : `Wann würde Ihnen ein Gespräch passen?`);
      break;
    case 'verfügbarkeit':
      body = `vielen Dank für Ihre Anfrage zu „${objTitle}" (${object.address}). ` +
        (object.status === 'verfügbar' ? `Die Einheit ist aktuell verfügbar und kann kurzfristig bezogen werden. ` : `Die Einheit ist derzeit als „${object.status}" markiert – ich prüfe den genauen Stand gern für Sie. `) +
        `Bei ${object.area} m² lässt sich Ihr Flächenbedarf gut abbilden. ` +
        (slot ? `Gerne zeige ich Ihnen die Räume am ${slot.human}.` : `Gerne vereinbaren wir eine Besichtigung.`);
      break;
    case 'kapitalanlage':
      body = `vielen Dank für Ihr Interesse an „${objTitle}" als Kapitalanlage. Die Wohnung ist solide vermietet ` +
        `und eignet sich gut für eine langfristige Anlage. Die konkreten Zahlen zu Mietertrag und Rendite stelle ich Ihnen transparent zusammen. ` +
        (slot ? `Für eine Besichtigung schlage ich ${slot.human} vor.` : `Nennen Sie mir gern einen Wunschtermin.`);
      break;
    default:
      body = `vielen Dank für Ihre Nachricht zu „${objTitle}". Gerne beantworte ich Ihre Fragen und sende Ihnen weitere Unterlagen zu. ` +
        (slot ? `Für ein persönliches Gespräch schlage ich ${slot.human} vor.` : `Lassen Sie mich wissen, wie ich Sie am besten unterstützen kann.`);
  }

  const draft = `${anrede},\n\n${body}\n\nBei Fragen erreichen Sie mich jederzeit.\n\nMit freundlichen Grüßen\nIhr Maklerteam`;
  return { draft, intent, suggestedSlot: slot };
}

/* Tagesbriefing: KI-Zusammenfassung des Tages ------------------------------ */
function dailyBriefing(state) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const open = state.leads.filter((l) => !['abgeschlossen', 'verloren'].includes(l.status));
  const newToday = state.leads.filter((l) => l.createdAt.slice(0, 10) === todayStr);
  const scored = open.map((l) => ({ lead: l, ...scoreLead(l) })).sort((a, b) => b.score - a.score);
  const hot = scored.filter((s) => s.tier === 'hot');
  const todaysApts = state.appointments.filter((a) => a.date === todayStr);
  const top = scored[0];

  const parts = [];
  parts.push(`Sie haben **${open.length} offene Anfragen**` + (newToday.length ? `, davon **${newToday.length} neu heute**.` : '.'));
  if (hot.length) parts.push(`**${hot.length}** davon ${hot.length === 1 ? 'ist' : 'sind'} besonders heiß 🔥.`);
  parts.push(todaysApts.length ? `Heute stehen **${todaysApts.length} Termine** an.` : `Für heute sind keine Termine geplant.`);
  if (top) parts.push(`Höchste Priorität: **${top.lead.name}** (Score ${top.score}).`);

  return { text: parts.join(' '), top: top ? top.lead : null, hotCount: hot.length, openCount: open.length, newCount: newToday.length };
}

/* Exposé-Text generieren ---------------------------------------------------- */
function generateExpose(obj) {
  const highlights = obj.features.slice(0, 4).join(', ');
  const lagen = obj.city.replace(/^\d+\s*/, '');
  const intro = {
    Wohnung: 'Willkommen in Ihrem neuen Zuhause',
    Haus: 'Ihr Traum vom Eigenheim wird wahr',
    Gewerbe: 'Die perfekte Adresse für Ihr Unternehmen',
  }[obj.type] || 'Eine besondere Immobilie';

  return (
    `${intro}: „${obj.title}" in ${lagen}.\n\n` +
    `Auf ${obj.area} m² verteilt auf ${obj.rooms} Zimmer erwartet Sie ${obj.description.charAt(0).toLowerCase() + obj.description.slice(1)}\n\n` +
    `Die Highlights auf einen Blick: ${highlights}. ` +
    (obj.type === 'Gewerbe' && obj.rent ? `Die Fläche ist für ${priceLabel(obj)} verfügbar.` : `Der Kaufpreis beträgt ${priceLabel(obj)}.`) +
    `\n\nVereinbaren Sie jetzt Ihren persönlichen Besichtigungstermin – wir freuen uns auf Sie.`
  );
}

function summarizeObject(obj) {
  const highlights = obj.features.slice(0, 3).join(', ');
  return `${obj.type} · ${obj.rooms} Zi. · ${obj.area} m² · ${priceLabel(obj)}. ${obj.description} Besondere Merkmale: ${highlights}.`;
}

window.MaklerAI = {
  generateReplyDraft, summarizeObject, generateExpose, dailyBriefing,
  scoreLead, detectIntent, detectSentiment, suggestSlot, priceLabel,
};
