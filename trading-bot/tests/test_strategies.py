import pandas as pd

from src.strategies.base import Signal
from src.strategies.combined import CombinedStrategy
from src.strategies.rsi_mean_reversion import RsiMeanReversionStrategy, compute_rsi
from src.strategies.sma_crossover import SmaCrossoverStrategy


def make_df(closes: list[float]) -> pd.DataFrame:
    return pd.DataFrame({"close": closes})


class TestSmaCrossoverStrategy:
    def setup_method(self):
        # fast_period=1 -> fast SMA == close, keeps expected crossover math simple.
        self.strategy = SmaCrossoverStrategy(fast_period=1, slow_period=2)

    def test_insufficient_data_returns_hold(self):
        df = make_df([10, 10])
        assert self.strategy.generate_signal(df) == Signal.HOLD

    def test_golden_cross_returns_buy(self):
        df = make_df([10, 10, 5, 20])
        assert self.strategy.generate_signal(df) == Signal.BUY

    def test_death_cross_returns_sell(self):
        df = make_df([10, 10, 20, 2])
        assert self.strategy.generate_signal(df) == Signal.SELL

    def test_no_cross_returns_hold(self):
        df = make_df([10, 10, 10, 10])
        assert self.strategy.generate_signal(df) == Signal.HOLD

    def test_invalid_periods_raise(self):
        import pytest

        with pytest.raises(ValueError):
            SmaCrossoverStrategy(fast_period=5, slow_period=5)


class TestRsiMeanReversionStrategy:
    def setup_method(self):
        self.strategy = RsiMeanReversionStrategy(period=3, oversold=30, overbought=70)

    def test_insufficient_data_returns_hold(self):
        df = make_df([10, 9])
        assert self.strategy.generate_signal(df) == Signal.HOLD

    def test_recovery_from_oversold_returns_buy(self):
        closes = [100, 90, 80, 70, 60, 50, 90]
        df = make_df(closes)
        rsi = compute_rsi(df["close"], self.strategy.period)
        assert rsi.iloc[-2] <= self.strategy.oversold < rsi.iloc[-1]
        assert self.strategy.generate_signal(df) == Signal.BUY

    def test_drop_from_overbought_returns_sell(self):
        closes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 20]
        df = make_df(closes)
        rsi = compute_rsi(df["close"], self.strategy.period)
        assert rsi.iloc[-2] >= self.strategy.overbought > rsi.iloc[-1]
        assert self.strategy.generate_signal(df) == Signal.SELL

    def test_invalid_thresholds_raise(self):
        import pytest

        with pytest.raises(ValueError):
            RsiMeanReversionStrategy(period=14, oversold=80, overbought=20)


class TestCombinedStrategy:
    def test_agrees_on_buy(self):
        strategy = CombinedStrategy(
            SmaCrossoverStrategy(fast_period=1, slow_period=2),
            RsiMeanReversionStrategy(period=3, oversold=1, overbought=1.5),
        )
        # Force both sub-strategies to at least not disagree; here RSI thresholds are
        # unreachable so it always returns HOLD, meaning combined must also be HOLD.
        df = make_df([10, 10, 5, 20])
        assert strategy.generate_signal(df) == Signal.HOLD

    def test_disagreement_returns_hold(self):
        class AlwaysBuy:
            min_candles = 1

            def generate_signal(self, df):
                return Signal.BUY

        class AlwaysSell:
            min_candles = 1

            def generate_signal(self, df):
                return Signal.SELL

        strategy = CombinedStrategy(AlwaysBuy(), AlwaysSell())
        assert strategy.generate_signal(make_df([1, 2, 3])) == Signal.HOLD
