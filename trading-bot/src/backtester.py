from __future__ import annotations

import argparse
from dataclasses import dataclass

import ccxt
import pandas as pd

from src.config import RiskConfig, load_config
from src.risk_manager import RiskManager
from src.strategies import Signal, Strategy, build_strategy


@dataclass
class Trade:
    entry_price: float
    exit_price: float
    pnl: float
    exit_reason: str


@dataclass
class BacktestResult:
    trades: list[Trade]
    equity_curve: list[float]
    starting_equity: float
    ending_equity: float

    @property
    def total_return_pct(self) -> float:
        return (self.ending_equity - self.starting_equity) / self.starting_equity * 100

    @property
    def num_trades(self) -> int:
        return len(self.trades)

    @property
    def win_rate_pct(self) -> float:
        if not self.trades:
            return 0.0
        wins = sum(1 for t in self.trades if t.pnl > 0)
        return wins / len(self.trades) * 100

    @property
    def max_drawdown_pct(self) -> float:
        peak = self.equity_curve[0]
        max_dd = 0.0
        for equity in self.equity_curve:
            peak = max(peak, equity)
            drawdown = (peak - equity) / peak * 100 if peak > 0 else 0.0
            max_dd = max(max_dd, drawdown)
        return max_dd

    def summary(self) -> str:
        return (
            f"Trades: {self.num_trades} | Gewinnrate: {self.win_rate_pct:.1f}% | "
            f"Gesamtrendite: {self.total_return_pct:.2f}% | Max Drawdown: {self.max_drawdown_pct:.2f}% | "
            f"Endkapital: {self.ending_equity:.2f}"
        )


def run_backtest(
    df: pd.DataFrame, strategy: Strategy, risk_cfg: RiskConfig, starting_equity: float = 1000.0
) -> BacktestResult:
    risk_manager = RiskManager(risk_cfg)
    quote_balance = starting_equity
    base_balance = 0.0
    trades: list[Trade] = []
    equity_curve: list[float] = []

    for i in range(strategy.min_candles, len(df)):
        window = df.iloc[: i + 1]
        row = df.iloc[i]
        low, high, close = float(row["low"]), float(row["high"]), float(row["close"])
        equity = quote_balance + base_balance * close

        for position in list(risk_manager.open_positions):
            if low <= position.stop_loss_price:
                exit_price, reason = position.stop_loss_price, "stop_loss"
            elif high >= position.take_profit_price:
                exit_price, reason = position.take_profit_price, "take_profit"
            else:
                continue
            quote_balance += position.base_amount * exit_price
            base_balance -= position.base_amount
            pnl = risk_manager.close_position(position, exit_price)
            trades.append(Trade(position.entry_price, exit_price, pnl, reason))

        if not risk_manager.daily_loss_breaker_triggered(equity):
            signal = strategy.generate_signal(window)

            if signal == Signal.BUY and risk_manager.can_open_position(equity):
                quote_amount = risk_manager.calc_position_size_quote(equity)
                if 0 < quote_amount <= quote_balance:
                    base_filled = quote_amount / close
                    quote_balance -= quote_amount
                    base_balance += base_filled
                    risk_manager.open_position(close, base_filled)

            elif signal == Signal.SELL:
                for position in list(risk_manager.open_positions):
                    quote_balance += position.base_amount * close
                    base_balance -= position.base_amount
                    pnl = risk_manager.close_position(position, close)
                    trades.append(Trade(position.entry_price, close, pnl, "signal"))

        equity_curve.append(quote_balance + base_balance * close)

    final_price = float(df["close"].iloc[-1])
    ending_equity = quote_balance + base_balance * final_price
    return BacktestResult(
        trades=trades,
        equity_curve=equity_curve or [starting_equity],
        starting_equity=starting_equity,
        ending_equity=ending_equity,
    )


def fetch_historical_ohlcv(exchange_name: str, symbol: str, timeframe: str, limit: int) -> pd.DataFrame:
    exchange = getattr(ccxt, exchange_name)({"enableRateLimit": True})
    raw = exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
    df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest einer Trading-Strategie")
    parser.add_argument("--exchange", default=None, help="Überschreibt exchange.name aus config.yaml")
    parser.add_argument("--symbol", default=None, help="Überschreibt exchange.symbol aus config.yaml")
    parser.add_argument("--timeframe", default=None, help="Überschreibt exchange.timeframe aus config.yaml")
    parser.add_argument("--limit", type=int, default=500, help="Anzahl historischer Candles")
    parser.add_argument("--starting-equity", type=float, default=1000.0)
    args = parser.parse_args()

    config = load_config()
    exchange_name = args.exchange or config.exchange.name
    symbol = args.symbol or config.exchange.symbol
    timeframe = args.timeframe or config.exchange.timeframe

    print(f"Lade historische Daten: {exchange_name} {symbol} {timeframe} (limit={args.limit})...")
    df = fetch_historical_ohlcv(exchange_name, symbol, timeframe, args.limit)

    strategy = build_strategy(config.strategy)
    result = run_backtest(df, strategy, config.risk, args.starting_equity)

    print(f"Strategie: {config.strategy.name}")
    print(result.summary())


if __name__ == "__main__":
    main()
