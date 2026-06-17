# Lumen Store 🛍️

Ein moderner Online-Shop im minimalistischen Design – inspiriert vom Apple-Look.
Reines HTML, CSS und JavaScript, **ohne Build-Schritt oder Abhängigkeiten**.

## Features

- 🍏 **Apple-inspiriertes Design** – große Typografie, viel Weißraum, blur-Navigation, sanfte Animationen
- 🛒 **Funktionierender Warenkorb** – Hinzufügen, Menge ändern, entfernen; bleibt per `localStorage` erhalten
- 📱 **Voll responsiv** – Desktop, Tablet und Mobil inkl. Burger-Menü
- ✨ **Scroll-Animationen** & Toast-Benachrichtigungen
- ♿ **Barrierearm** – ARIA-Labels, Tastatur (ESC schließt den Warenkorb), `prefers-reduced-motion`

## Projektstruktur

```
.
├── index.html        # Seitenstruktur
├── css/
│   └── style.css     # gesamtes Styling
└── js/
    ├── products.js   # Produktkatalog (Datenquelle)
    └── main.js       # Warenkorb- & UI-Logik
```

## Starten

Einfach `index.html` im Browser öffnen.

Oder mit einem lokalen Server (empfohlen):

```bash
# Python
python3 -m http.server 8000
# danach http://localhost:8000 öffnen
```

## Produkte anpassen

Alle Produkte liegen in `js/products.js`. Neues Produkt = neuer Eintrag im Array:

```js
{
  id: "neue-id",          // eindeutig
  name: "Produktname",
  desc: "Kurzbeschreibung",
  price: 99900,           // Preis in Cent (999,00 €)
  emoji: "📦",            // Platzhalter-Visualisierung
  gradient: "linear-gradient(155deg, #5e5ce6, #ff375f)",
  tag: "Neu"              // optionales Label (oder "")
}
```

> Hinweis: Dies ist ein fiktiver Demo-Shop. Es findet keine echte Zahlung statt.
