# Change Together 🔥💧

Ein **Zwei-Spieler-Koop-Spiel** im Stil von *„Change Together"* / *Fireboy & Watergirl* –
reines HTML5 Canvas + JavaScript, **kein Build-Schritt, komplett offline lauffähig**.

Zwei Figuren teilen sich eine Tastatur und müssen **gemeinsam** vier Biome durchqueren.
Nur im Team erreichen beide gleichzeitig ihre Tür und schaffen das Level.

## Starten

`game/index.html` einfach im Browser öffnen – oder per lokalem Server:

```bash
python3 -m http.server 8000
# danach http://localhost:8000/game/ öffnen
```

## Steuerung

| Figur            | Bewegen        | Springen |
|------------------|----------------|----------|
| 🔥 **Lumen** (Feuer) | `A` / `D`      | `W`      |
| 💧 **Aqua** (Wasser) | `◀` / `▶`      | `▲`      |

`R` = Level neu starten · `Enter` = Menü/Weiter

## Spielprinzip

- **Elemente haben Schwächen:**
  - 🌊 **Wasser** tötet Lumen – ist aber sicher für Aqua
  - 🔥 **Feuer** tötet Aqua – ist aber sicher für Lumen
  - 🟢 **Säure** tötet **beide** → gemeinsam ausweichen
- **Druckplatten & Tore:** Eine Platte öffnet das farblich passende Tor.
  In den späteren Leveln öffnet jede Figur das Tor für die *andere* –
  echtes Zusammenspiel ist nötig.
- **Edelsteine** in eurer Farbe sind optionaler Bonus.
- **Ziel:** Beide Figuren stehen **gleichzeitig** in ihrer Tür.

## Die vier Biome

1. **🌲 Lichtung** – Einstieg: Bewegung, Springen, Edelsteine.
2. **🏜️ Dünenpfad** – Feuer- & Wasserbecken: jede Figur nimmt ihren Weg.
3. **❄️ Frostkluft** – Druckplatten & Tore: ihr schaltet euch gegenseitig frei.
4. **🌋 Schlund des Vulkans** – Finale: alles kombiniert, plus Säure-Sprünge.

## Technik

| Datei        | Inhalt                                                       |
|--------------|--------------------------------------------------------------|
| `index.html` | Seitengerüst, HUD, Steuerungsleiste                          |
| `style.css`  | Dunkles UI-Theme, Overlays, responsives Layout               |
| `game.js`    | Komplette Engine: Tile-Physik, Kollision, Gefahren, Platten/Tore, Rendering, Levels |

Die Level sind als ASCII-Karten in `game.js` (Array `LEVELS`) definiert und lassen
sich leicht erweitern – Legende steht als Kommentar oben im File.
