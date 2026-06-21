# ImmoAssist Backend (Claude API)

Kleiner Node-Server, der die KI-Funktionen der App über die **Claude API**
bereitstellt. Der API-Schlüssel bleibt ausschließlich serverseitig.

## Einrichten

```bash
cd server
npm install
cp .env.example .env      # ANTHROPIC_API_KEY eintragen
npm start                 # läuft auf http://localhost:8787
```

Den Schlüssel bekommst du in der [Anthropic Console](https://console.anthropic.com).
Statt einer `.env`-Datei kannst du die Variable auch direkt setzen:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Der Server liefert zusätzlich die App aus `../makler-app` aus. Öffne danach
einfach **http://localhost:8787** – Frontend und KI laufen unter einer Adresse,
und die App nutzt automatisch die echte Claude-KI.

## Endpunkte

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/ai/draft` | KI-Antwortentwurf für eine Anfrage (`{ lead, object }`) |
| POST | `/api/ai/expose` | Exposé-Text für ein Objekt (`{ object }`) |
| GET | `/api/health` | Status |

## Modell

Standardmäßig `claude-opus-4-8`. Über die Umgebungsvariable `MODEL`
änderbar.

## Fallback-Verhalten

Ist der Server nicht erreichbar (z. B. App direkt als Datei geöffnet), nutzt das
Frontend automatisch die lokale, regelbasierte Logik aus `makler-app/js/ai.js` –
die App funktioniert also immer, mit dem Server nur deutlich besser.
