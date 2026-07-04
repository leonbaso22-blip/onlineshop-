# Krypto Trading-Bot (Paper Trading)

Ein einfacher, verständlicher Trading-Bot für Bitcoin & Co. Er nutzt echte
Live-Kurse von Binance, handelt aber **ausschließlich mit virtuellem Geld**
(Paper Trading). So kannst du risikofrei testen, ob die Strategie für dich
funktioniert, bevor überhaupt an echtes Geld zu denken ist.

## ⚠️ Wichtiger Risikohinweis

- **Keine Gewinngarantie.** Einfache Indikator-Strategien schlagen den Markt
  meist nicht zuverlässig. Auch dieser Bot kann (virtuell) Verluste machen.
- **Ein Backtest zeigt die Vergangenheit**, nicht die Zukunft. Gute
  historische Ergebnisse bedeuten nichts für morgen.
- Falls du später echtes Geld einsetzt: **nur Geld, dessen Totalverlust du
  verkraften kannst.** Kryptomärkte sind extrem volatil.

## Installation

```bash
cd trading-bot
pip install -r requirements.txt
```

Mehr braucht es nicht — für Kursdaten ist **kein Binance-Konto und kein
API-Key** nötig.

## 1. Backtest: Strategie auf der Vergangenheit testen

```bash
python backtest.py             # letzte 90 Tage
python backtest.py --days 30   # anderer Zeitraum
python backtest.py --verbose   # jeden einzelnen Trade anzeigen
```

Der Report zeigt Rendite, Anzahl Trades, Trefferquote, maximalen Drawdown
und den Vergleich mit „einfach kaufen und halten" (Buy & Hold).

## 2. Paper Trading: mit virtuellem Geld live handeln

```bash
python bot.py           # ein Durchlauf: Kurs holen, Signal prüfen, ggf. handeln
python bot.py --loop    # Dauerbetrieb, prüft einmal pro Minute
python bot.py --reset   # virtuelles Depot auf Startguthaben zurücksetzen
```

Der Bot startet mit 10.000 virtuellen USDT. Guthaben, offene Position und
alle Trades werden in `data/state.json` und `data/trades.csv` gespeichert —
er läuft also zwischen Aufrufen nahtlos weiter.

## Die Strategie (EMA-Crossover mit RSI-Filter)

- **Kauf**, wenn der schnelle Durchschnitt (EMA 12) den langsamen (EMA 26)
  von unten nach oben kreuzt — ein klassisches Trendwende-Signal — und der
  RSI unter 70 liegt (der Markt also nicht schon „überkauft" ist).
- **Verkauf**, wenn der schnelle EMA wieder unter den langsamen fällt.
- **Absicherung**: Jede Position hat automatisch einen Stop-Loss (−3 %)
  und ein Take-Profit-Ziel (+6 %).
- Pro Trade werden 25 % des Guthabens eingesetzt, Gebühren (0,1 % wie bei
  Binance) sind eingerechnet.

Alle Parameter kannst du in `config.json` anpassen (Handelspaar, Timeframe,
EMA/RSI-Perioden, Stop-Loss, Positionsgröße, …). Teste Änderungen immer
zuerst mit `backtest.py`.

## Und echtes Geld?

Bewusst noch nicht. `config.json` steht auf `"mode": "paper"`, und der Bot
verweigert jeden anderen Modus. Der empfohlene Weg:

1. Mehrere Wochen Paper Trading laufen lassen und die Ergebnisse ansehen.
2. Verschiedene Parameter im Backtest vergleichen.
3. Erst wenn du die Strategie und ihre Verlustphasen verstanden hast,
   über einen Live-Modus mit kleinen Beträgen nachdenken (erfordert
   Binance-Konto + API-Keys und eine Erweiterung des Bots).

## Dateien

| Datei           | Zweck                                            |
| --------------- | ------------------------------------------------ |
| `config.json`   | Alle Einstellungen (Paar, Strategie, Risiko)     |
| `exchange.py`   | Kursdaten von der öffentlichen Binance-API       |
| `indicators.py` | EMA- und RSI-Berechnung                          |
| `strategy.py`   | Kauf-/Verkaufslogik                              |
| `broker.py`     | Virtuelles Depot, Orders, Gebühren, Trade-Log    |
| `backtest.py`   | Strategie auf historischen Daten testen          |
| `bot.py`        | Paper-Trading auf Live-Kursen                    |
| `data/`         | Zustand des virtuellen Depots (nicht im Git)     |
