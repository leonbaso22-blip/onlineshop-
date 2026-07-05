from __future__ import annotations

import pandas as pd

from src.strategies.base import Signal, Strategy


class SmaCrossoverStrategy(Strategy):
    """Golden-Cross/Death-Cross: BUY wenn schneller SMA von unten über langsamen SMA kreuzt,
    SELL wenn er von oben darunter kreuzt."""

    def __init__(self, fast_period: int, slow_period: int):
        if fast_period >= slow_period:
            raise ValueError("fast_period muss kleiner als slow_period sein")
        self.fast_period = fast_period
        self.slow_period = slow_period

    @property
    def min_candles(self) -> int:
        return self.slow_period + 1

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        if len(df) < self.min_candles:
            return Signal.HOLD

        fast = df["close"].rolling(self.fast_period).mean()
        slow = df["close"].rolling(self.slow_period).mean()

        prev_fast, prev_slow = fast.iloc[-2], slow.iloc[-2]
        curr_fast, curr_slow = fast.iloc[-1], slow.iloc[-1]

        crossed_up = prev_fast <= prev_slow and curr_fast > curr_slow
        crossed_down = prev_fast >= prev_slow and curr_fast < curr_slow

        if crossed_up:
            return Signal.BUY
        if crossed_down:
            return Signal.SELL
        return Signal.HOLD
