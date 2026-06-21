/* ===========================================================================
   ImmoAssist Backend
   Stellt die KI-Funktionen über die Claude API bereit. Der API-Schlüssel wird
   ausschließlich serverseitig aus der Umgebungsvariable ANTHROPIC_API_KEY
   gelesen – niemals im Frontend.

   Endpunkte:
     POST /api/ai/draft   -> KI-Antwortentwurf für eine Anfrage
     POST /api/ai/expose  -> KI-generierter Exposé-Text für ein Objekt
     GET  /api/health     -> Status

   Start:  ANTHROPIC_API_KEY=... npm start   (Standard-Port 8787)
   =========================================================================== */

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const PORT = process.env.PORT || 8787;
const MODEL = process.env.MODEL || 'claude-opus-4-8';

// Liest den Schlüssel automatisch aus ANTHROPIC_API_KEY.
const client = new Anthropic();

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Statisches Ausliefern der App, damit Frontend + Backend unter einer Origin laufen.
app.use(express.static(require('path').join(__dirname, '..', 'makler-app')));

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function priceLabel(o) {
  if (!o) return '';
  if (o.type === 'Gewerbe' && o.rent) return `${EUR.format(o.rent)} / Monat (zzgl. NK)`;
  return EUR.format(o.price);
}

/* Hilfsfunktion: einen einzelnen Claude-Aufruf machen und den Text zurückgeben. */
async function complete(system, userPrompt, maxTokens = 1024) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  if (msg.stop_reason === 'refusal') {
    throw new Error('Die KI hat die Anfrage abgelehnt.');
  }
  const block = msg.content.find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

/* --- Antwortentwurf --------------------------------------------------------- */
app.post('/api/ai/draft', async (req, res) => {
  const { lead, object } = req.body || {};
  if (!lead || !Array.isArray(lead.messages)) {
    return res.status(400).json({ error: 'lead mit messages erforderlich' });
  }
  const lastCustomer = [...lead.messages].reverse().find((m) => m.from === 'kunde');
  const verlauf = lead.messages
    .map((m) => `${m.from === 'kunde' ? lead.contact || 'Interessent' : 'Makler'}: ${m.text}`)
    .join('\n');

  const objektInfo = object
    ? `Objekt: "${object.title}", ${object.type}, ${object.address}, ${object.city}, ` +
      `${object.rooms} Zimmer, ${object.area} m², Preis: ${priceLabel(object)}, Status: ${object.status}. ` +
      `Beschreibung: ${object.description}. Merkmale: ${(object.features || []).join(', ')}.`
    : 'Kein konkretes Objekt zugeordnet.';

  const system =
    'Du bist die schriftliche Assistenz eines deutschen Immobilienmaklers. ' +
    'Formuliere höfliche, professionelle Antwortentwürfe auf Kundenanfragen – ' +
    'auf Deutsch, in der Sie-Form, vertrauenswürdig und konkret. Gehe auf das ' +
    'erkennbare Anliegen ein (Besichtigung, Preis, Finanzierung, Verfügbarkeit ' +
    'oder Kapitalanlage), nutze die Objektdaten und schlage bei passender ' +
    'Gelegenheit einen Termin vor. Antworte ausschließlich mit dem fertigen ' +
    'E-Mail-Text inklusive Anrede und Grußformel, ohne Betreffzeile und ohne ' +
    'Meta-Kommentare. Erfinde keine Fakten, die nicht in den Daten stehen.';

  const prompt =
    `${objektInfo}\n\nBisheriger Nachrichtenverlauf:\n${verlauf}\n\n` +
    `Die zuletzt eingegangene Kundennachricht lautet: "${lastCustomer ? lastCustomer.text : ''}"\n\n` +
    `Schreibe einen passenden Antwortentwurf an ${lead.contact || lead.name}.`;

  try {
    const draft = await complete(system, prompt, 1024);
    res.json({ draft, model: MODEL });
  } catch (err) {
    console.error('draft error:', err.message);
    res.status(502).json({ error: 'KI nicht verfügbar', detail: err.message });
  }
});

/* --- Exposé ----------------------------------------------------------------- */
app.post('/api/ai/expose', async (req, res) => {
  const { object } = req.body || {};
  if (!object) return res.status(400).json({ error: 'object erforderlich' });

  const system =
    'Du bist Texter für Immobilien-Exposés. Schreibe einen ansprechenden, ' +
    'seriösen deutschen Exposé-Text in der Sie-Form: einladender Einstieg, ' +
    'Beschreibung von Lage und Ausstattung, Highlights und ein Aufruf zur ' +
    'Besichtigung. Drei bis fünf Absätze, kein Marketing-Übermaß, keine ' +
    'erfundenen Fakten. Gib nur den Exposé-Text aus.';

  const prompt =
    `Objekt: "${object.title}" (${object.type}) in ${object.city}, ${object.address}.\n` +
    `${object.rooms} Zimmer, ${object.area} m², Preis: ${priceLabel(object)}.\n` +
    `Beschreibung: ${object.description}\nMerkmale: ${(object.features || []).join(', ')}.`;

  try {
    const expose = await complete(system, prompt, 1024);
    res.json({ expose, model: MODEL });
  } catch (err) {
    console.error('expose error:', err.message);
    res.status(502).json({ error: 'KI nicht verfügbar', detail: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, model: MODEL }));

app.listen(PORT, () => {
  console.log(`ImmoAssist-Backend läuft auf http://localhost:${PORT} (Modell: ${MODEL})`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY ist nicht gesetzt – KI-Aufrufe werden fehlschlagen.');
  }
});
