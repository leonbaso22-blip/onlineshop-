from src.strategies.base import Signal, Strategy
from src.strategies.combined import CombinedStrategy
from src.strategies.rsi_mean_reversion import RsiMeanReversionStrategy
from src.strategies.sma_crossover import SmaCrossoverStrategy


def build_strategy(strategy_cfg) -> Strategy:
    if strategy_cfg.name == "sma_crossover":
        return SmaCrossoverStrategy(strategy_cfg.sma.fast_period, strategy_cfg.sma.slow_period)
    if strategy_cfg.name == "rsi_mean_reversion":
        return RsiMeanReversionStrategy(
            strategy_cfg.rsi.period, strategy_cfg.rsi.oversold, strategy_cfg.rsi.overbought
        )
    if strategy_cfg.name == "combined":
        return CombinedStrategy(
            SmaCrossoverStrategy(strategy_cfg.sma.fast_period, strategy_cfg.sma.slow_period),
            RsiMeanReversionStrategy(
                strategy_cfg.rsi.period, strategy_cfg.rsi.oversold, strategy_cfg.rsi.overbought
            ),
        )
    raise ValueError(f"Unbekannte Strategie: {strategy_cfg.name}")


__all__ = ["Signal", "Strategy", "build_strategy"]
