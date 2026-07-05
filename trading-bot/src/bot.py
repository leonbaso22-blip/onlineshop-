from __future__ import annotations

import logging
import time

from src.config import AppConfig
from src.exchange import ExchangeClient
from src.risk_manager import RiskManager
from src.strategies import Signal, build_strategy


class TradingBot:
    def __init__(self, config: AppConfig, logger: logging.Logger):
        self.config = config
        self.logger = logger
        self.exchange = ExchangeClient(config.exchange, config.mode, logger)
        self.strategy = build_strategy(config.strategy)
        self.risk_manager = RiskManager(config.risk)

    def step(self) -> None:
        df = self.exchange.fetch_ohlcv_df(limit=self.config.loop.ohlcv_lookback_candles)
        if len(df) < self.strategy.min_candles:
            self.logger.warning("Zu wenige Candles (%d) für die Strategie, überspringe.", len(df))
            return

        current_price = float(df["close"].iloc[-1])
        quote_balance, base_balance = self.exchange.get_balances()
        equity = quote_balance + base_balance * current_price

        for position in self.risk_manager.positions_to_close(current_price):
            order = self.exchange.create_market_sell(position.base_amount)
            pnl = self.risk_manager.close_position(position, order["price"])
            self.logger.info(
                "Position geschlossen (Stop-Loss/Take-Profit): PnL=%.2f, Preis=%.2f",
                pnl,
                order["price"],
            )

        if self.risk_manager.daily_loss_breaker_triggered(equity):
            self.logger.warning(
                "Daily-Loss-Breaker ausgelöst (max %.1f%%) — kein Trading bis morgen.",
                self.config.risk.max_daily_loss_pct,
            )
            return

        signal = self.strategy.generate_signal(df)
        self.logger.info("Signal: %s | Preis: %.2f | Equity: %.2f", signal.value, current_price, equity)

        if signal == Signal.BUY:
            if not self.risk_manager.can_open_position(equity):
                self.logger.info("Kein Kauf: max_open_positions erreicht oder Daily-Loss-Breaker aktiv.")
                return
            quote_amount = self.risk_manager.calc_position_size_quote(equity)
            if quote_amount <= 0 or quote_amount > quote_balance:
                self.logger.info("Kein Kauf: unzureichendes Guthaben (%.2f verfügbar).", quote_balance)
                return
            order = self.exchange.create_market_buy(quote_amount)
            self.risk_manager.open_position(order["price"], order["amount"])

        elif signal == Signal.SELL:
            for position in list(self.risk_manager.open_positions):
                order = self.exchange.create_market_sell(position.base_amount)
                pnl = self.risk_manager.close_position(position, order["price"])
                self.logger.info("Position geschlossen (Signal): PnL=%.2f", pnl)

    def run_forever(self) -> None:
        self.logger.info(
            "Bot gestartet | Symbol=%s | Timeframe=%s | dry_run=%s | Strategie=%s",
            self.config.exchange.symbol,
            self.config.exchange.timeframe,
            self.config.mode.dry_run,
            self.config.strategy.name,
        )
        while True:
            try:
                self.step()
            except Exception:
                self.logger.exception("Fehler im Bot-Loop, versuche es beim nächsten Intervall erneut.")
            time.sleep(self.config.loop.poll_interval_seconds)
