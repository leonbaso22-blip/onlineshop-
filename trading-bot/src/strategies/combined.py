from __future__ import annotations

import pandas as pd

from src.strategies.base import Signal, Strategy


class CombinedStrategy(Strategy):
    """Kombiniert zwei Strategien: es wird nur gehandelt, wenn beide zustimmen (keiner
    widerspricht). Das reduziert Fehlsignale gegenüber einer einzelnen Strategie."""

    def __init__(self, primary: Strategy, secondary: Strategy):
        self.primary = primary
        self.secondary = secondary

    @property
    def min_candles(self) -> int:
        return max(self.primary.min_candles, self.secondary.min_candles)

    def generate_signal(self, df: pd.DataFrame) -> Signal:
        signal_a = self.primary.generate_signal(df)
        signal_b = self.secondary.generate_signal(df)

        if signal_a == signal_b and signal_a != Signal.HOLD:
            return signal_a
        return Signal.HOLD
