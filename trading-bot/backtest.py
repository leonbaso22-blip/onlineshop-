"""Backtest: Strategie ueber historische Kerzen laufen lassen.

Aufruf:
    python backtest.py            # letzte 90 Tage laut config.json
    python backtest.py --days 30  # anderer Zeitraum
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import exchange
import strategy
from broker import PaperBroker

HERE = os.path.dirname(os.path.abspath(__file__))


def load_config():
    with open(os.path.join(HERE, "config.json"), encoding="utf-8") as f:
        return json.load(f)


def fmt_time(ms):
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


def run_backtest(config, days, verbose=False):
    params = config["strategy"]
    print(f"Lade {days} Tage {config['symbol']} ({config['timeframe']}-Kerzen) ...")
    candles = exchange.get_klines_days(config["symbol"], config["timeframe"], days)
    if len(candles) < strategy.min_candles(params) + 1:
        raise SystemExit(
            f"Zu wenig Daten ({len(candles)} Kerzen) fuer einen aussagekraeftigen Backtest."
        )
    # Letzte Kerze ist noch nicht abgeschlossen -> weglassen
    candles = candles[:-1]
    print(
        f"{len(candles)} Kerzen von {fmt_time(candles[0]['open_time'])} "
        f"bis {fmt_time(candles[-1]['open_time'])} UTC\n"
    )

    broker = PaperBroker(config)  # ohne state_dir = rein im Speicher
    warmup = strategy.min_candles(params)
    peak = broker.equity(candles[0]["close"])
    max_drawdown = 0.0

    for i in range(warmup, len(candles)):
        candle = candles[i]
        timestamp = fmt_time(candle["open_time"])

        # Stop-Loss / Take-Profit innerhalb der Kerze pruefen
        exit_trade = broker.check_protective_exit(candle["low"], candle["high"], timestamp)
        if exit_trade and verbose:
            print(f"{timestamp}  SELL {exit_trade['price']:>12,.2f}  {exit_trade['reason']}")

        closes = [c["close"] for c in candles[: i + 1]]
        signal, reason = strategy.generate_signal(closes, params, broker.has_position())
        if signal == strategy.BUY:
            trade = broker.buy(candle["close"], timestamp, reason)
            if trade and verbose:
                print(f"{timestamp}  BUY  {trade['price']:>12,.2f}  {reason}")
        elif signal == strategy.SELL:
            trade = broker.sell(candle["close"], timestamp, reason)
            if trade and verbose:
                print(f"{timestamp}  SELL {trade['price']:>12,.2f}  {reason}")

        equity = broker.equity(candle["close"])
        peak = max(peak, equity)
        max_drawdown = max(max_drawdown, (peak - equity) / peak)

    # Offene Position am Ende zum letzten Kurs schliessen (fuer sauberen Vergleich)
    last = candles[-1]
    if broker.has_position():
        broker.sell(last["close"], fmt_time(last["open_time"]), "Backtest-Ende")

    start_balance = config["start_balance_usdt"]
    final = broker.equity(last["close"])
    strategy_return = (final / start_balance - 1) * 100
    first_close = candles[warmup]["close"]
    buy_hold_return = (last["close"] / first_close - 1) * 100

    print("================ Backtest-Ergebnis ================")
    print(f"Zeitraum:            {days} Tage, {config['symbol']}, {config['timeframe']}")
    print(f"Startguthaben:       {start_balance:>12,.2f} USDT")
    print(f"Endguthaben:         {final:>12,.2f} USDT")
    print(f"Rendite Strategie:   {strategy_return:>+11.2f} %")
    print(f"Rendite Buy & Hold:  {buy_hold_return:>+11.2f} %")
    print(f"Max. Drawdown:       {max_drawdown * 100:>11.2f} %")
    print(f"Abgeschl. Trades:    {broker.trade_count:>12}")
    if broker.trade_count:
        print(f"Trefferquote:        {broker.wins / broker.trade_count * 100:>11.2f} %")
    print("===================================================")
    print("Hinweis: Ein Backtest zeigt die Vergangenheit -- er ist keine")
    print("Garantie fuer zukuenftige Ergebnisse.")


def main():
    parser = argparse.ArgumentParser(description="Backtest der Trading-Strategie")
    parser.add_argument("--days", type=int, default=90, help="Zeitraum in Tagen (Standard: 90)")
    parser.add_argument("--verbose", action="store_true", help="Jeden Trade ausgeben")
    args = parser.parse_args()

    config = load_config()
    try:
        run_backtest(config, args.days, verbose=args.verbose)
    except exchange.ExchangeError as exc:
        print(f"Fehler: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
