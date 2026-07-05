# Krypto-Trading-Bot

Ein konfigurierbarer Trading-Bot für Kryptowährungen, gebaut auf [ccxt](https://github.com/ccxt/ccxt)
(unterstützt dadurch über 100 Börsen wie Binance, Kraken, Coinbase, OKX, Bitget, ...).
Enthält Signal-Strategien, Risikomanagement, einen Backtester sowie einen Paper-Trading-
und einen Live-Trading-Modus.

## ⚠️ Risikohinweis

**Trading mit echtem Geld kann zum Totalverlust des eingesetzten Kapitals führen.**
Dieser Bot ist Software ohne jede Garantie. Teste jede Strategie ausgiebig per Backtest
und im Paper-Trading-Modus, bevor du echtes Geld einsetzt. Beginne live nur mit einem
Betrag, dessen Verlust du verkraften kannst. Es besteht keine Gewinngarantie.

## Architektur

```
trading-bot/
  config.yaml          # zentrale Konfiguration (Börse, Strategie, Risiko, ...)
  .env / .env.example   # API-Keys & Sicherheitssperre (niemals committen!)
  src/
    config.py           # lädt config.yaml + .env
    exchange.py          # ccxt-Wrapper, Paper-Trading-Simulation, Live-Order-Ausführung
    strategies/           # SMA-Crossover, RSI-Mean-Reversion, Combined
    risk_manager.py       # Positionsgröße, Stop-Loss/Take-Profit, Daily-Loss-Breaker
    bot.py                 # Hauptloop: Daten holen -> Signal -> Risiko-Check -> Order
    backtester.py           # Simuliert eine Strategie auf historischen Daten
    main.py                  # CLI-Einstiegspunkt für Paper-/Live-Trading
  tests/                     # pytest-Tests für Strategien & Risikomanagement
```

## Setup

```bash
cd trading-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

API-Keys der Börse in `.env` eintragen (nur nötig für Live-Trading; Backtesting und
Paper-Trading funktionieren ohne Keys, da nur öffentliche Marktdaten abgerufen werden):

```
EXCHANGE_API_KEY=dein_api_key
EXCHANGE_API_SECRET=dein_api_secret
```

## Konfiguration (`config.yaml`)

- `exchange.name`: beliebige ccxt-Börsen-ID (`binance`, `kraken`, `coinbase`, ...)
- `exchange.symbol`: Handelspaar, z.B. `BTC/USDT`
- `mode.dry_run`: `true` = Paper-Trading (Standard, empfohlen), `false` = Live-Trading
- `strategy.name`: `sma_crossover` | `rsi_mean_reversion` | `combined`
- `risk.*`: Positionsgröße pro Trade, Stop-Loss/Take-Profit-Prozentsätze, maximale
  gleichzeitige Positionen, maximaler Tagesverlust (Circuit Breaker)

## Backtest ausführen

Lädt historische OHLCV-Daten öffentlich (kein API-Key nötig) und simuliert die in
`config.yaml` konfigurierte Strategie:

```bash
python -m src.backtester --limit 500
python -m src.backtester --exchange binance --symbol ETH/USDT --timeframe 4h --limit 1000
```

Ausgabe: Anzahl Trades, Gewinnrate, Gesamtrendite, Max Drawdown, Endkapital.

## Paper-Trading (Standard, sicher)

Mit `mode.dry_run: true` in `config.yaml` (Standardeinstellung) simuliert der Bot Orders
gegen ein virtuelles Konto (Startkapital konfigurierbar über
`mode.paper_starting_balance_quote`), nutzt aber echte Live-Marktdaten der Börse:

```bash
python -m src.main
```

Ein einzelner Durchlauf (z.B. zum Testen) statt der Endlosschleife:

```bash
python -m src.main --once
```

## Live-Trading mit echtem Geld

Erfordert **zwei** explizite Bestätigungen, um versehentliches Live-Trading zu verhindern:

1. In `config.yaml`: `mode.dry_run: false`
2. In `.env`: `CONFIRM_LIVE_TRADING=YES`

Fehlt eine der beiden, verweigert der Bot den Start mit einer klaren Fehlermeldung.
Zusätzlich benötigt der API-Key auf der Börse Handelsrechte (aber **keine**
Auszahlungsrechte — dies aus Sicherheitsgründen niemals aktivieren).

```bash
python -m src.main
```

## Tests

```bash
python -m pytest tests/ -v
```

## Strategien

- **SMA Crossover**: Golden Cross (schneller SMA kreuzt langsamen von unten) = BUY,
  Death Cross = SELL.
- **RSI Mean-Reversion**: BUY wenn RSI aus dem überverkauften Bereich zurückkreuzt,
  SELL wenn er aus dem überkauften Bereich zurückkreuzt.
- **Combined**: Handelt nur, wenn beide obigen Strategien übereinstimmen — reduziert
  Fehlsignale gegenüber einer einzelnen Strategie.

## Risikomanagement

- Positionsgröße wird so berechnet, dass bei Erreichen des Stop-Loss genau
  `risk_per_trade_pct` % des aktuellen Eigenkapitals verloren geht.
- Stop-Loss und Take-Profit werden pro Position in Prozent vom Einstiegspreis gesetzt.
- `max_open_positions` begrenzt gleichzeitige Positionen.
- Der Daily-Loss-Breaker stoppt neue Trades für den Rest des Tages, sobald der
  realisierte Tagesverlust `max_daily_loss_pct` % des Startkapitals des Tages erreicht.

## Weitere Börsen / Erweiterungen

Da der Bot auf ccxt basiert, reicht es, `exchange.name` in `config.yaml` auf eine andere
[ccxt-unterstützte Börse](https://github.com/ccxt/ccxt/wiki/Exchange-Markets) zu ändern.
Neue Strategien lassen sich hinzufügen, indem man `src/strategies/base.py`'s `Strategy`
implementiert und in `src/strategies/__init__.py`'s `build_strategy()` registriert.
