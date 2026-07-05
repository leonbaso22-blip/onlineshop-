from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent


@dataclass
class ExchangeConfig:
    name: str
    symbol: str
    timeframe: str
    api_key: str
    api_secret: str


@dataclass
class ModeConfig:
    dry_run: bool
    paper_starting_balance_quote: float
    confirmed_live: bool


@dataclass
class SmaConfig:
    fast_period: int
    slow_period: int


@dataclass
class RsiConfig:
    period: int
    oversold: float
    overbought: float


@dataclass
class StrategyConfig:
    name: str
    sma: SmaConfig
    rsi: RsiConfig


@dataclass
class RiskConfig:
    risk_per_trade_pct: float
    stop_loss_pct: float
    take_profit_pct: float
    max_open_positions: int
    max_daily_loss_pct: float


@dataclass
class LoopConfig:
    poll_interval_seconds: int
    ohlcv_lookback_candles: int


@dataclass
class LoggingConfig:
    level: str
    file: str


@dataclass
class AppConfig:
    exchange: ExchangeConfig
    mode: ModeConfig
    strategy: StrategyConfig
    risk: RiskConfig
    loop: LoopConfig
    logging: LoggingConfig


def load_config(config_path: str | Path = REPO_ROOT / "config.yaml") -> AppConfig:
    load_dotenv(REPO_ROOT / ".env")

    with open(config_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    exchange = ExchangeConfig(
        name=raw["exchange"]["name"],
        symbol=raw["exchange"]["symbol"],
        timeframe=raw["exchange"]["timeframe"],
        api_key=os.getenv("EXCHANGE_API_KEY", ""),
        api_secret=os.getenv("EXCHANGE_API_SECRET", ""),
    )

    mode = ModeConfig(
        dry_run=bool(raw["mode"]["dry_run"]),
        paper_starting_balance_quote=float(raw["mode"]["paper_starting_balance_quote"]),
        confirmed_live=os.getenv("CONFIRM_LIVE_TRADING", "") == "YES",
    )

    strategy = StrategyConfig(
        name=raw["strategy"]["name"],
        sma=SmaConfig(**raw["strategy"]["sma"]),
        rsi=RsiConfig(**raw["strategy"]["rsi"]),
    )

    risk = RiskConfig(**raw["risk"])
    loop = LoopConfig(**raw["loop"])
    logging_cfg = LoggingConfig(**raw["logging"])

    return AppConfig(
        exchange=exchange,
        mode=mode,
        strategy=strategy,
        risk=risk,
        loop=loop,
        logging=logging_cfg,
    )
