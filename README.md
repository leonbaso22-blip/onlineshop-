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
    ├── site-config.js    # 👉 HIER Business-Daten & Foto-Links eintragen
    ├── illustrations.js  # SVG-Illustrationen (Flaschen, Pods, Sets, Zubehör)
    ├── products.js       # Produktkatalog (Datenquelle)
    └── main.js           # Warenkorb-, Filter- & UI-Logik
```

## ⭐ Dein Business eintragen

Öffne `js/site-config.js` und trage oben deine Daten ein:

```js
business: {
  name: "Dein Studio",                        // dein Business-/Künstlername
  tagline: "Moderne Websites & Online-Shops", // kurzer Slogan
  email: "hallo@deinstudio.de",               // Kontakt-E-Mail
  phone: "",                                  // optional
  website: "#",                               // optional, z. B. "https://deinstudio.de"
}
```

Diese Angaben erscheinen **dezent** oben in der Leiste („Website erstellt von …")
und im Footer als kleiner Werbeblock mit Kontakt.

## 📸 Echte Fotos (Bilder tauschen)

Die Stimmungs-Fotos (Hero, Lifestyle, Wasser …) liegen ebenfalls in
`js/site-config.js` unter `photos`. Jedes Foto liegt über einem Farbverlauf –
lädt ein Bild nicht, bleibt der Verlauf sichtbar (sieht trotzdem gut aus).
Zum Tauschen einfach eine andere Bild-URL einsetzen (z. B. von
[unsplash.com](https://unsplash.com) – kostenlos & frei nutzbar).

> Hinweis: Die Produktbilder selbst sind weiterhin scharfe SVG-Illustrationen
> und funktionieren immer (auch offline).

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
```
