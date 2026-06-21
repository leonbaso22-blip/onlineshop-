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
  Kapitalanlage) erzeugen. Der Makler prüft, passt an und sendet – er bleibt
  immer in Kontrolle.
- 🗓️ **Termine & Kalender** – Besichtigungen, Beratungen und Telefonate anlegen;
  Monatskalender mit allen Terminen. Die KI schlägt automatisch den nächsten
  freien Werktags-Slot vor.
- 🏢 **Objektverwaltung** – Portfolio mit Eckdaten (Zimmer, Fläche, Preis,
  Ausstattung). Diese Daten sind die Grundlage, auf die sich die KI bezieht.
- 📊 **Analysen** – Verkaufstrichter (Anfrage → Besichtigung → Angebot →
  Abschluss), Status-Verteilung, Anfragen je Objekt und je Wochentag.
- 📱 **Voll responsiv** inkl. Sidebar-Menü auf Mobilgeräten.
- ♿ **Barrierearm** – SVG-Icons (keine Emojis als Icons), Fokus-Zustände,
  Tastaturbedienung, `prefers-reduced-motion`, WCAG-AA-Kontraste.

## Projektstruktur

```
makler-app/
├── index.html        # Einstieg (lädt die Skripte)
├── css/
│   └── style.css     # gesamtes Design (Trust-Teal + Profi-Blau)
└── js/
    ├── data.js       # Demo-Daten (Objekte, Anfragen, Termine) + localStorage
    ├── ai.js         # KI-Assistenz: Antwortentwürfe & Terminvorschläge
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
