"""Paper-Trading-Bot: handelt mit virtuellem Geld auf echten Live-Kursen.

Aufruf:
    python bot.py           # ein Durchlauf (Signal pruefen, ggf. Paper-Trade)
    python bot.py --loop    # Dauerbetrieb, prueft einmal pro Minute
    python bot.py --reset   # virtuelles Depot auf Startguthaben zuruecksetzen

Der Zustand (Guthaben, Position, Trades) liegt in trading-bot/data/.
Es wird KEIN echtes Geld bewegt, solange mode = "paper" ist.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import exchange
import strategy
from broker import PaperBroker

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "data")
LOOP_INTERVAL_SECONDS = 60


def load_config():
    with open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
        return json.load(f)


def now_utc():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def run_once(config, broker):
    params = config["strategy"]
    limit = strategy.min_candles(params) + 50
    candles = exchange.get_klines(config["symbol"], config["timeframe"], limit=limit)
    if len(candles) < 2:
        raise exchange.ExchangeError("Zu wenig Kerzendaten erhalten.")
    completed = candles[:-1]  # letzte Kerze laeuft noch
    price = exchange.get_price(config["symbol"])
    timestamp = now_utc()

    print(f"[{timestamp}] {config['symbol']}: {price:,.2f} USDT")

    # 1) Offene Position gegen Stop-Loss / Take-Profit pruefen (aktueller Preis)
    exit_trade = broker.check_protective_exit(price, price, timestamp)
    if exit_trade:
        print(f"  VERKAUF: {exit_trade['reason']} | P&L {exit_trade['pnl_usdt']:+.2f} USDT")

    # 2) Strategie-Signal auf der letzten abgeschlossenen Kerze
    closes = [c["close"] for c in completed]
    signal, reason = strategy.generate_signal(closes, params, broker.has_position())
    print(f"  Signal: {signal} -- {reason}")

    if signal == strategy.BUY:
        trade = broker.buy(price, timestamp, reason)
        if trade:
            print(f"  KAUF: {trade['amount']:.6f} zu {trade['price']:,.2f} USDT")
    elif signal == strategy.SELL:
        trade = broker.sell(price, timestamp, reason)
        if trade:
            print(f"  VERKAUF: P&L {trade['pnl_usdt']:+.2f} USDT")

    print("  " + broker.summary(price).replace("\n", "\n  "))


def main():
    parser = argparse.ArgumentParser(description="Paper-Trading-Bot")
    parser.add_argument("--loop", action="store_true", help="Dauerbetrieb (1x pro Minute)")
    parser.add_argument("--reset", action="store_true", help="Virtuelles Depot zuruecksetzen")
    args = parser.parse_args()

    config = load_config()

    if config.get("mode") != "paper":
        print(
            "Live-Trading ist in dieser Version bewusst deaktiviert.\n"
            "Der Bot handelt nur mit virtuellem Geld (mode: \"paper\").\n"
            "Echtes Trading erfordert Binance-API-Keys, eine eigene Freischaltung\n"
            "und sollte erst nach ausgiebigem Paper-Trading ueberhaupt erwogen werden.",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.reset:
        for name in ("state.json", "trades.csv"):
            path = os.path.join(DATA_DIR, name)
            if os.path.exists(path):
                os.remove(path)
        print("Virtuelles Depot zurueckgesetzt.")

    broker = PaperBroker(config, state_dir=DATA_DIR)

    while True:
        try:
            run_once(config, broker)
        except exchange.ExchangeError as exc:
            print(f"Fehler: {exc}", file=sys.stderr)
            if not args.loop:
                sys.exit(1)
        if not args.loop:
            break
        time.sleep(LOOP_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
