# air up Store 💧

Ein professioneller Demo-Online-Shop für **air up** im minimalistischen Apple-Look.
Reines HTML, CSS und JavaScript – **ohne Build-Schritt, ohne Abhängigkeiten, komplett offline lauffähig**.

> Demo-/Testprojekt: Dieser Shop ist fiktiv, steht in keiner Verbindung zur air up group GmbH und wickelt keine echten Zahlungen ab.

## Features

- 🍏 **Apple-inspiriertes Design** – große Typografie, viel Weißraum, blur-Navigation, sanfte Animationen
- 🖼️ **Echte „Produktbilder“** – handgebaute, gestochen scharfe **SVG-Illustrationen** von Flaschen, Pods, Sets & Zubehör (keine externen Bilder nötig)
- 🛒 **Funktionierender Warenkorb** – Hinzufügen, Menge ändern, entfernen; bleibt per `localStorage` erhalten
- 🗂️ **Kategorie-Filter** – Starter-Sets, Flaschen, Pods, Zubehör per Tab
- 🧪 **Vollständige Shop-Sektionen** – Hero, „So funktioniert's", Nachhaltigkeit, Reviews, FAQ-Accordion, Newsletter
- 📱 **Voll responsiv** – Desktop, Tablet und Mobil inkl. Burger-Menü
- ✨ **Scroll-Animationen**, Toast-Benachrichtigungen, Warenkorb-Animation
- ♿ **Barrierearm** – ARIA-Labels, Tastatur (ESC schließt den Warenkorb), `prefers-reduced-motion`

## Projektstruktur

```
.
├── index.html            # Seitenstruktur (alle Sektionen)
├── css/
│   └── style.css         # gesamtes Styling (air-up-Theme)
└── js/
    ├── illustrations.js  # SVG-Illustrationen (Flaschen, Pods, Sets, Zubehör)
    ├── products.js       # Produktkatalog (Datenquelle)
    └── main.js           # Warenkorb-, Filter- & UI-Logik
```

## Starten

Einfach `index.html` im Browser öffnen.

Oder mit einem lokalen Server (empfohlen):

```bash
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

## Produkte anpassen

Alle Produkte liegen in `js/products.js`. Neues Produkt = neuer Eintrag im Array:

```js
{
  id: "pods-limette",          // eindeutig
  name: "Pods – Limette",
  desc: "3er-Pack. Spritzig-frische Limette.",
  price: 995,                  // Preis in Cent (9,95 €)
  oldPrice: 1190,              // optionaler Streichpreis
  category: "pods",            // sets | bottles | pods | accessories
  tag: "Neu",                  // optionales Label
  badge: "🍈",                 // optionales Emoji (z. B. Frucht)
  art: { type: "pods", color: "#b5e655" }  // Illustration
}
```

### Illustrationen (`art`)

Die „Bilder" werden aus `art` generiert (siehe `js/illustrations.js`):

| `type`     | Parameter                              | Ergebnis                  |
|------------|----------------------------------------|---------------------------|
| `bottle`   | `body`, `cap`, `pod`, `metallic`       | Flasche                   |
| `set`      | `body`, `cap`, `pod`, `metallic`       | Flasche + Pods            |
| `pods`     | `color`                                | 3er-Pack Geschmacks-Pods  |
| `strap`    | `color`                                | Trageband                 |
| `brush`    | –                                      | Reinigungsbürste          |
| `lid`      | `cap`, `pod`                           | Ersatzdeckel              |

---

## 🎮 Bonus: „Straßenheld" – das Fahrzeug-Ausweichspiel

Ein kleines Arcade-Spiel im gleichen flachen Vektor-Look wie der Shop
(Crossy-Road- / Frogger-Prinzip): Hüpf die air-up-Flasche Reihe für Reihe
über die Straße und weiche dem Verkehr aus.

- 🚗 **Verschiedene Fahrzeuge** – Auto, LKW, Bus und Zug (mit blinkender Bahnschranke)
- 🌳 Bäume blockieren einzelne Felder, Gras-Reihen sind sicher
- ⚡ **Steigende Schwierigkeit** – je weiter du kommst, desto schneller wird der Verkehr
- 🏆 **Bestwert** bleibt per `localStorage` erhalten
- 🎨 Alles Vektor auf `<canvas>`, kein Build, komplett offline
- 🕹️ **Steuerung:** Pfeiltasten oder `WASD`; am Handy wischen, tippen oder Steuerkreuz

Starten: `game.html` im Browser öffnen (oder über den lokalen Server unter `/game.html`).

Dateien: `game.html`, `css/game.css`, `js/game.js`.
