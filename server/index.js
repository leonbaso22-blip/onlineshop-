/* ===========================================================================
   ImmoAssist Backend
   - KI (Claude API):    POST /api/ai/draft, POST /api/ai/expose
   - Konten:             POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
   - Datenspeicherung:   GET /api/state, PUT /api/state   (pro Nutzer, Token nötig)
   - Bezahlung:          POST /api/checkout               (Stripe, optional)
   - Status:             GET /api/health
   - Liefert außerdem die App aus ../makler-app aus.

   Der Anthropic-Schlüssel (ANTHROPIC_API_KEY) und der Stripe-Schlüssel
   (STRIPE_SECRET_KEY) werden ausschließlich serverseitig aus der Umgebung
   gelesen – niemals im Frontend.

   Start:  ANTHROPIC_API_KEY=... npm start   (Standard-Port 8787)
   =========================================================================== */

const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const { db, save } = require('./store');
const auth = require('./auth');

const PORT = process.env.PORT || 8787;
const MODEL = process.env.MODEL || 'claude-opus-4-8';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

const client = new Anthropic(); // liest ANTHROPIC_API_KEY

// Stripe nur laden, wenn ein Schlüssel gesetzt ist.
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try { stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); }
  catch (e) { console.warn('Stripe-Paket nicht installiert:', e.message); }
}

const PLANS = {
  solo: { name: 'ImmoAssist Solo', amount: 4900 },
  pro: { name: 'ImmoAssist Pro', amount: 9900 },
  team: { name: 'ImmoAssist Team', amount: 24900 },
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'makler-app')));

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
function priceLabel(o) {
  if (!o) return '';
  if (o.type === 'Gewerbe' && o.rent) return `${EUR.format(o.rent)} / Monat (zzgl. NK)`;
  return EUR.format(o.price);
}

async function complete(system, userPrompt, maxTokens = 1024) {
  const msg = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('Die KI hat die Anfrage abgelehnt.');
  const block = msg.content.find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

/* ============================ KI ==========================================*/
app.post('/api/ai/draft', async (req, res) => {
  const { lead, object } = req.body || {};
  if (!lead || !Array.isArray(lead.messages)) return res.status(400).json({ error: 'lead mit messages erforderlich' });
  const lastCustomer = [...lead.messages].reverse().find((m) => m.from === 'kunde');
  const verlauf = lead.messages.map((m) => `${m.from === 'kunde' ? lead.contact || 'Interessent' : 'Makler'}: ${m.text}`).join('\n');
  const objektInfo = object
    ? `Objekt: "${object.title}", ${object.type}, ${object.address}, ${object.city}, ${object.rooms} Zimmer, ${object.area} m², Preis: ${priceLabel(object)}, Status: ${object.status}. Beschreibung: ${object.description}. Merkmale: ${(object.features || []).join(', ')}.`
    : 'Kein konkretes Objekt zugeordnet.';
  const system =
    'Du bist die schriftliche Assistenz eines deutschen Immobilienmaklers. ' +
    'Formuliere höfliche, professionelle Antwortentwürfe auf Kundenanfragen – auf Deutsch, in der Sie-Form, vertrauenswürdig und konkret. ' +
    'Gehe auf das erkennbare Anliegen ein (Besichtigung, Preis, Finanzierung, Verfügbarkeit oder Kapitalanlage), nutze die Objektdaten und schlage bei passender Gelegenheit einen Termin vor. ' +
    'Antworte ausschließlich mit dem fertigen E-Mail-Text inklusive Anrede und Grußformel, ohne Betreffzeile und ohne Meta-Kommentare. Erfinde keine Fakten, die nicht in den Daten stehen.';
  const prompt = `${objektInfo}\n\nBisheriger Nachrichtenverlauf:\n${verlauf}\n\nDie zuletzt eingegangene Kundennachricht lautet: "${lastCustomer ? lastCustomer.text : ''}"\n\nSchreibe einen passenden Antwortentwurf an ${lead.contact || lead.name}.`;
  try {
    res.json({ draft: await complete(system, prompt, 1024), model: MODEL });
  } catch (err) {
    console.error('draft error:', err.message);
    res.status(502).json({ error: 'KI nicht verfügbar', detail: err.message });
  }
});

app.post('/api/ai/expose', async (req, res) => {
  const { object } = req.body || {};
  if (!object) return res.status(400).json({ error: 'object erforderlich' });
  const system =
    'Du bist Texter für Immobilien-Exposés. Schreibe einen ansprechenden, seriösen deutschen Exposé-Text in der Sie-Form: einladender Einstieg, Beschreibung von Lage und Ausstattung, Highlights und ein Aufruf zur Besichtigung. Drei bis fünf Absätze, kein Marketing-Übermaß, keine erfundenen Fakten. Gib nur den Exposé-Text aus.';
  const prompt = `Objekt: "${object.title}" (${object.type}) in ${object.city}, ${object.address}.\n${object.rooms} Zimmer, ${object.area} m², Preis: ${priceLabel(object)}.\nBeschreibung: ${object.description}\nMerkmale: ${(object.features || []).join(', ')}.`;
  try {
    res.json({ expose: await complete(system, prompt, 1024), model: MODEL });
  } catch (err) {
    console.error('expose error:', err.message);
    res.status(502).json({ error: 'KI nicht verfügbar', detail: err.message });
  }
});

/* ============================ Konten ======================================*/
app.post('/api/auth/register', (req, res) => {
  try { res.json(auth.register(req.body || {})); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.post('/api/auth/login', (req, res) => {
  try { res.json(auth.login(req.body || {})); }
  catch (err) { res.status(400).json({ error: err.message }); }
});
app.get('/api/auth/me', auth.requireAuth, (req, res) => {
  res.json({ user: auth.publicUser(req.userEmail) });
});

/* ============================ Zustand pro Nutzer ==========================*/
app.get('/api/state', auth.requireAuth, (req, res) => {
  res.json({ state: db.states[req.userEmail] || null });
});
app.put('/api/state', auth.requireAuth, (req, res) => {
  const { state } = req.body || {};
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'state erforderlich' });
  db.states[req.userEmail] = state;
  save();
  res.json({ ok: true });
});

/* ============================ Bezahlung (Stripe) ==========================*/
app.post('/api/checkout', async (req, res) => {
  const plan = PLANS[(req.body || {}).plan];
  if (!plan) return res.status(400).json({ error: 'Unbekannter Plan' });
  if (!stripe) {
    return res.json({ configured: false, message: 'Zahlung ist in dieser Demo noch nicht aktiviert. Setze STRIPE_SECRET_KEY, um echte Abos zu verkaufen.' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: plan.name },
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${APP_URL}/index.html?bezahlt=1`,
      cancel_url: `${APP_URL}/landing.html#preise`,
    });
    res.json({ configured: true, url: session.url });
  } catch (err) {
    console.error('checkout error:', err.message);
    res.status(502).json({ error: 'Checkout fehlgeschlagen', detail: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, model: MODEL, stripe: !!stripe, users: Object.keys(db.users).length }));

app.listen(PORT, () => {
  console.log(`ImmoAssist-Backend läuft auf http://localhost:${PORT} (Modell: ${MODEL})`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠  ANTHROPIC_API_KEY nicht gesetzt – KI-Aufrufe schlagen fehl.');
  if (!stripe) console.warn('ℹ  STRIPE_SECRET_KEY nicht gesetzt – Bezahlung läuft im Demo-Modus.');
});

module.exports = app;
