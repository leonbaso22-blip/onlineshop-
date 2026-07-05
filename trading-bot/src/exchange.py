from __future__ import annotations

import logging
from dataclasses import dataclass

import ccxt
import pandas as pd

from src.config import ExchangeConfig, ModeConfig


class LiveTradingNotConfirmedError(RuntimeError):
    """Raised when dry_run=false but the CONFIRM_LIVE_TRADING safety gate isn't set."""


@dataclass
class PaperAccount:
    quote_balance: float
    base_balance: float = 0.0

    def buy(self, price: float, quote_amount: float) -> float:
        quote_amount = min(quote_amount, self.quote_balance)
        base_filled = quote_amount / price
        self.quote_balance -= quote_amount
        self.base_balance += base_filled
        return base_filled

    def sell(self, price: float, base_amount: float) -> float:
        base_amount = min(base_amount, self.base_balance)
        quote_filled = base_amount * price
        self.base_balance -= base_amount
        self.quote_balance += quote_filled
        return quote_filled

    @property
    def equity(self) -> float:
        return self.quote_balance


class ExchangeClient:
    def __init__(self, exchange_cfg: ExchangeConfig, mode_cfg: ModeConfig, logger: logging.Logger):
        self.symbol = exchange_cfg.symbol
        self.timeframe = exchange_cfg.timeframe
        self.dry_run = mode_cfg.dry_run
        self.logger = logger

        if not self.dry_run and not mode_cfg.confirmed_live:
            raise LiveTradingNotConfirmedError(
                "Live-Trading ist in config.yaml aktiviert (dry_run: false), aber die "
                "Sicherheitssperre wurde nicht bestätigt. Setze CONFIRM_LIVE_TRADING=YES "
                "in der .env-Datei, um echte Orders mit echtem Geld zu erlauben."
            )

        exchange_class = getattr(ccxt, exchange_cfg.name)
        self.client = exchange_class(
            {
                "apiKey": exchange_cfg.api_key,
                "secret": exchange_cfg.api_secret,
                "enableRateLimit": True,
            }
        )

        self.paper_account: PaperAccount | None = None
        if self.dry_run:
            self.paper_account = PaperAccount(quote_balance=mode_cfg.paper_starting_balance_quote)
            self.logger.info(
                "Paper-Trading aktiv. Startkapital: %.2f", mode_cfg.paper_starting_balance_quote
            )
        else:
            self.logger.warning(
                "LIVE-TRADING AKTIV — es werden echte Orders mit echtem Geld auf %s gesendet!",
                exchange_cfg.name,
            )

    def fetch_ohlcv_df(self, limit: int = 200) -> pd.DataFrame:
        raw = self.client.fetch_ohlcv(self.symbol, timeframe=self.timeframe, limit=limit)
        df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
        return df

    def fetch_last_price(self) -> float:
        ticker = self.client.fetch_ticker(self.symbol)
        return float(ticker["last"])

    def get_balances(self) -> tuple[float, float]:
        if self.dry_run:
            return self.paper_account.quote_balance, self.paper_account.base_balance

        balance = self.client.fetch_balance()
        base_ccy, quote_ccy = self.symbol.split("/")
        quote_balance = float(balance.get(quote_ccy, {}).get("free", 0.0) or 0.0)
        base_balance = float(balance.get(base_ccy, {}).get("free", 0.0) or 0.0)
        return quote_balance, base_balance

    def create_market_buy(self, quote_amount: float) -> dict:
        price = self.fetch_last_price()
        if self.dry_run:
            base_filled = self.paper_account.buy(price, quote_amount)
            order = {"side": "buy", "price": price, "amount": base_filled, "cost": quote_amount, "dry_run": True}
        else:
            base_amount = quote_amount / price
            order = self.client.create_market_buy_order(self.symbol, base_amount)
        self.logger.info("BUY ausgeführt: %s", order)
        return order

    def create_market_sell(self, base_amount: float) -> dict:
        price = self.fetch_last_price()
        if self.dry_run:
            quote_filled = self.paper_account.sell(price, base_amount)
            order = {"side": "sell", "price": price, "amount": base_amount, "cost": quote_filled, "dry_run": True}
        else:
            order = self.client.create_market_sell_order(self.symbol, base_amount)
        self.logger.info("SELL ausgeführt: %s", order)
        return order
