from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum

import pandas as pd


class Signal(Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class Strategy(ABC):
    @property
    @abstractmethod
    def min_candles(self) -> int:
        """Minimum number of candles needed before this strategy can produce a signal."""

    @abstractmethod
    def generate_signal(self, df: pd.DataFrame) -> Signal:
        """df must have a 'close' column ordered oldest -> newest."""
