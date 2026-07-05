from __future__ import annotations

import pandas as pd

from src.strategies.base import Signal, Strategy


def compute_rsi(close: pd.Series, period: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, float("nan"))
    rsi = 100 - (100 / (1 + rs))
    rsi = rsi.mask(avg_loss == 0, 100)
    rsi = rsi.mask((avg_loss == 0) & (avg_gain == 0), 50)
    return rsi.fillna(50)


class RsiMeanReversionStrategy(Strategy):
    """BUY wenn RSI aus dem überverkauften Bereich zurückkreuzt, SELL wenn er aus dem
    überkauften Bereich zurückkreuzt."""

    def __init__(self, period: int, oversold: float, overbought: float):
        if not (0 < oversold < overbought < 100):
            raise ValueError("Es muss gelten: 0 < oversold < overbought < 100")
        self.period = period
        self.oversold = oversold
        self.overbought = overbought

    @property
    def min_candles(self) -> int:
        return self.period + 2

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        if len(df) < self.min_candles:
            return Signal.HOLD

        rsi = compute_rsi(df["close"], self.period)
        prev_rsi, curr_rsi = rsi.iloc[-2], rsi.iloc[-1]

        if prev_rsi <= self.oversold < curr_rsi:
            return Signal.BUY
        if prev_rsi >= self.overbought > curr_rsi:
            return Signal.SELL
        return Signal.HOLD
