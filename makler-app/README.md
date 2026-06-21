# ImmoAssist – KI-Assistent für Makler 🏠

Eine Web-App, die Immobilienmakler im Alltag unterstützt: **Kundenkommunikation
mit KI-Antwortentwürfen, Terminverwaltung, Kalender und Analysen** – alles in
einer Oberfläche.

Reines **HTML, CSS und JavaScript – ohne Build-Schritt, ohne Abhängigkeiten,
komplett offline lauffähig**. Alle Änderungen (neue Antworten, Termine,
Statuswechsel) werden im Browser per `localStorage` gespeichert.

> Demo-/Testprojekt: Die Objekte, Anfragen und Personen sind frei erfunden.

## Funktionen

- 🧠 **KI-Kundenkommunikation** – Auf Knopfdruck einen passenden Antwortentwurf
  je nach Anliegen (Besichtigung, Preis, Finanzierung, Verfügbarkeit,
  Kapitalanlage). Die Antwort wird **live „getippt"**, als würde ein echter
  Assistent schreiben. Der Makler prüft, passt an und sendet – immer in Kontrolle.
- 📋 **KI-Tagesbriefing** – Beim Start fasst die KI den Tag zusammen: offene
  Anfragen, heiße Leads, Termine und der Lead mit der höchsten Priorität.
- 🔥 **Lead-Scoring (Hot/Warm/Cold)** – Jede Anfrage wird automatisch nach
  Phase, Stimmung, Anliegen und Aktualität bewertet und priorisiert.
- 📝 **Exposé-Generator** – Pro Objekt erzeugt die KI auf Knopfdruck einen
  fertigen Exposé-Text zum Kopieren.
- 🗓️ **Termine & Kalender** – Besichtigungen, Beratungen und Telefonate anlegen;
  Monatskalender mit allen Terminen. Die KI schlägt den nächsten freien
  Werktags-Slot vor.
- 🏢 **Objektverwaltung** – Portfolio als Datenbasis, auf die sich die KI bezieht.
- 📊 **Analysen** – Animierter Verkaufstrichter, Status-Verteilung, Anfragen je
  Objekt und je Wochentag.
- ✨ **Premium-Erlebnis** – Intro-Splash, Aurora-Hintergrund, hochzählende
  Kennzahlen, sich aufbauende Diagramme, Seitenübergänge, Konfetti beim
  Abschluss, **Dark Mode** und **Command-Palette** (Strg/Cmd + K).
- 📱 **Voll responsiv** inkl. Sidebar-Menü auf Mobilgeräten.
- ♿ **Barrierearm** – SVG-Icons (keine Emojis als Icons), Fokus-Zustände,
  Tastaturbedienung, `prefers-reduced-motion`, WCAG-AA-Kontraste.

## Projektstruktur

```
makler-app/
├── index.html        # Einstieg (lädt die Skripte)
├── css/
│   └── style.css     # gesamtes Design (Light/Dark) + Animationen
└── js/
    ├── data.js       # Demo-Daten (Objekte, Anfragen, Termine) + localStorage
    ├── ai.js         # KI: Antwortentwürfe, Lead-Scoring, Briefing, Exposé
    ├── ui.js         # Animationen: Count-up, Tippeffekt, Konfetti, Palette
    └── app.js        # UI-Logik & alle Ansichten
```

## Starten

`index.html` direkt im Browser öffnen, oder mit lokalem Server:

```bash
cd makler-app
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

Über **„Demo zurücksetzen"** in der Seitenleiste lassen sich die Ausgangsdaten
jederzeit wiederherstellen.

## Echte KI anbinden (nächster Schritt)

Aktuell erzeugt der Assistent die Antworten regelbasiert und kontextsensitiv,
damit die App ohne Backend sofort funktioniert. Für produktive KI-Antworten wird
in `js/ai.js` (Funktion `generateReplyDraft`) statt der lokalen Logik ein
**serverseitiger Aufruf der Claude API** eingehängt. Der API-Schlüssel gehört
aus Sicherheits- und DSGVO-Gründen ausschließlich auf den Server, niemals ins
Frontend.
