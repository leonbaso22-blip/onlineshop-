# ImmoAssist – Deployment

ImmoAssist besteht aus einem **Node-Backend** (`server/`) und der **Web-App**
(`makler-app/`). Das Backend liefert die App aus und stellt KI, Konten,
Datenspeicherung und Bezahlung bereit. Es genügt also, das Backend zu
deployen – die App ist dann unter derselben Adresse erreichbar.

## Voraussetzungen (Umgebungsvariablen)

| Variable | Pflicht | Zweck |
|---|---|---|
| `ANTHROPIC_API_KEY` | für echte KI | Claude-API-Schlüssel |
| `AUTH_SECRET` | ja (Prod) | signiert Login-Token – langer Zufallswert |
| `STRIPE_SECRET_KEY` | für Bezahlung | Stripe-Geheimschlüssel |
| `APP_URL` | für Stripe | öffentliche URL, z. B. `https://immoassist.de` |
| `DATA_FILE` | optional | Pfad der Datendatei (Standard `server/data.json`) |
| `PORT` | optional | Standard `8787` |

Vorlage: `server/.env.example`.

## Variante A: Docker (empfohlen)

```bash
# im Projektverzeichnis
export ANTHROPIC_API_KEY=sk-ant-...
export AUTH_SECRET="$(openssl rand -hex 32)"
# optional: export STRIPE_SECRET_KEY=sk_live_...  APP_URL=https://deine-domain

docker compose up -d --build
# App läuft auf http://localhost:8787
```

Die Nutzerdaten landen dank Volume in `./data/` und überleben Neustarts.

## Variante B: direkt mit Node

```bash
cd server
npm install
AUTH_SECRET="$(openssl rand -hex 32)" ANTHROPIC_API_KEY=sk-ant-... npm start
# App läuft auf http://localhost:8787
```

## HTTPS / Produktion

- Stelle einen **Reverse Proxy** (z. B. Caddy, Nginx oder die Plattform deines
  Hosters) mit **HTTPS** vor das Backend. Logins und Kundendaten dürfen nur
  verschlüsselt übertragen werden.
- Setze `AUTH_SECRET` auf einen langen Zufallswert und halte ihn geheim.
- Setze `APP_URL` auf deine echte Domain, damit Stripe korrekt zurückleitet.
- Für mehr Last die Datei-Speicherung (`store.js`) durch eine echte Datenbank
  (z. B. PostgreSQL) ersetzen – die Endpunkte bleiben gleich.

## Schnell online (Beispiel-Hoster)

Jeder Hoster, der ein Dockerfile oder Node ausführt, funktioniert
(z. B. Railway, Render, Fly.io, Hetzner mit Docker). Repository verbinden,
die Umgebungsvariablen oben eintragen, deployen – fertig.

## Verifizieren

```bash
curl https://DEINE-DOMAIN/api/health
# -> {"ok":true,"model":"claude-opus-4-8","stripe":true/false,"users":N}
```
