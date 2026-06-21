/* ===========================================================================
   ai.js – KI-Assistenz für den Makler
   Erzeugt Antwortentwürfe, Objekt-Zusammenfassungen und Termin-Vorschläge.

   Demo-Hinweis: Damit die App ohne Backend und ohne API-Schlüssel sofort
   läuft, arbeitet der Assistent hier mit einer regelbasierten, kontext-
   sensitiven Logik (Intent-Erkennung + Objektdaten). Die Funktion
   generateReplyDraft() ist die zentrale Schnittstelle: Für echte KI-Antworten
   würde man hier statt der lokalen Logik einen serverseitigen Aufruf der
   Claude API einsetzen (siehe Kommentar in generateReplyDraft).
   =========================================================================== */

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

function priceLabel(obj) {
  if (obj.type === 'Gewerbe' && obj.rent) return `${EUR.format(obj.rent)} / Monat (zzgl. NK)`;
  return EUR.format(obj.price);
}

/* Intent aus der letzten Kundennachricht ableiten (ergänzt das Lead-Feld) */
function detectIntent(text = '') {
  const t = text.toLowerCase();
  if (/(besichtig|termin|ansehen|vorbeikommen|wochenende)/.test(t)) return 'besichtigung';
  if (/(preis|verhandel|kaufpreis|teurer|günstiger|nebenkosten)/.test(t)) return 'preis';
  if (/(finanzier|kredit|darlehen|bank|rate)/.test(t)) return 'finanzierung';
  if (/(verfügbar|frei ab|einzug|ab wann|bezugsfrei)/.test(t)) return 'verfügbarkeit';
  if (/(rendite|kapitalanlage|vermietet|miete)/.test(t)) return 'kapitalanlage';
  return 'allgemein';
}

/* Nächsten freien Werktags-Slot für einen Terminvorschlag finden */
function suggestSlot(appointments) {
  const busy = new Set(appointments.map((a) => `${a.date} ${a.time}`));
  const slots = ['10:00', '14:00', '16:30'];
  for (let i = 1; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue; // Wochenende überspringen
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
         method: 'POST',
         body: JSON.stringify({ lead, object })   // Server ruft Claude API auf
       });
       return (await res.json()).draft;

     Der API-Schlüssel gehört aus Sicherheits-/DSGVO-Gründen ausschließlich
     auf den Server, niemals ins Frontend. Bis dahin nutzen wir die lokale,
     kontextsensitive Logik unten. ------------------------------------------ */

  const lastCustomer = [...lead.messages].reverse().find((m) => m.from === 'kunde');
  const intent = detectIntent(lastCustomer ? lastCustomer.text : '') || lead.intent;
  const anrede = `Sehr geehrte/r ${lead.contact}`;
  const objTitle = object ? object.title : 'die angefragte Immobilie';
  const slot = suggestSlot(appointments);

  let body = '';

  switch (intent) {
    case 'besichtigung':
      body =
        `vielen Dank für Ihr Interesse an „${objTitle}" (${object.address}, ${object.city}). ` +
        `Sehr gerne zeige ich Ihnen das Objekt persönlich. ` +
        (slot
          ? `Ich könnte Ihnen einen Termin am ${slot.human} anbieten – passt Ihnen das? `
          : `Nennen Sie mir gern zwei, drei Zeitfenster, die Ihnen passen. `) +
        `Falls gewünscht, sende ich Ihnen vorab das vollständige Exposé zu.`;
      break;

    case 'preis':
      body =
        `vielen Dank für Ihre Nachricht zu „${objTitle}". ` +
        `Der aktuelle Angebotspreis liegt bei ${priceLabel(object)}. ` +
        `Die Höhe der Nebenkosten bespreche ich gerne im Detail mit Ihnen – ` +
        `gerade beim Altbau hängt einiges von Ausstattung und Verbrauch ab. ` +
        (slot ? `Wie wäre es mit einem kurzen Telefonat am ${slot.human}? ` : ``) +
        `So kann ich auf Ihre Fragen individuell eingehen.`;
      break;

    case 'finanzierung':
      body =
        `vielen Dank für Ihr Interesse an „${objTitle}". ` +
        `Bei der Finanzierung unterstütze ich Sie gerne und stelle bei Bedarf den Kontakt ` +
        `zu unserem unabhängigen Finanzierungspartner her. ` +
        `Für ein passendes Angebot sind Eigenkapital, gewünschte Laufzeit und Monatsrate relevant. ` +
        (slot ? `Sollen wir das am ${slot.human} gemeinsam durchgehen?` : `Wann würde Ihnen ein Gespräch passen?`);
      break;

    case 'verfügbarkeit':
      body =
        `vielen Dank für Ihre Anfrage zu „${objTitle}" (${object.address}). ` +
        (object.status === 'verfügbar'
          ? `Die Einheit ist aktuell verfügbar und kann kurzfristig bezogen werden. `
          : `Die Einheit ist derzeit als „${object.status}" markiert – ich prüfe den genauen Stand gern für Sie. `) +
        `Bei ${object.area} m² lässt sich Ihr Flächenbedarf gut abbilden. ` +
        (slot ? `Gerne zeige ich Ihnen die Räume am ${slot.human}.` : `Gerne vereinbaren wir eine Besichtigung.`);
      break;

    case 'kapitalanlage':
      body =
        `vielen Dank für Ihr Interesse an „${objTitle}" als Kapitalanlage. ` +
        `Die Wohnung ist solide vermietet und eignet sich gut für eine langfristige Anlage. ` +
        `Die konkreten Zahlen zu Mietertrag und Rendite stelle ich Ihnen gerne transparent zusammen. ` +
        (slot ? `Für eine Besichtigung schlage ich ${slot.human} vor.` : `Nennen Sie mir gern einen Wunschtermin.`);
      break;

    default:
      body =
        `vielen Dank für Ihre Nachricht zu „${objTitle}". ` +
        `Gerne beantworte ich Ihre Fragen und sende Ihnen weitere Unterlagen zu. ` +
        (slot ? `Für ein persönliches Gespräch schlage ich ${slot.human} vor.` : `Lassen Sie mich wissen, wie ich Sie am besten unterstützen kann.`);
  }

  const draft =
    `${anrede},\n\n${body}\n\n` +
    `Bei Fragen erreichen Sie mich jederzeit.\n\n` +
    `Mit freundlichen Grüßen\nIhr Maklerteam`;

  return { draft, intent, suggestedSlot: slot };
}

/* Kurze, KI-artige Objekt-Zusammenfassung fürs Exposé ----------------------- */
function summarizeObject(obj) {
  const highlights = obj.features.slice(0, 3).join(', ');
  const price = priceLabel(obj);
  return (
    `${obj.type} · ${obj.rooms} Zi. · ${obj.area} m² · ${price}. ` +
    `${obj.description} Besondere Merkmale: ${highlights}.`
  );
}

window.MaklerAI = { generateReplyDraft, summarizeObject, detectIntent, suggestSlot, priceLabel };
