import pytest

from src.config import RiskConfig
from src.risk_manager import RiskManager


def make_manager(**overrides) -> RiskManager:
    defaults = dict(
        risk_per_trade_pct=1.0,
        stop_loss_pct=2.0,
        take_profit_pct=4.0,
        max_open_positions=1,
        max_daily_loss_pct=5.0,
    )
    defaults.update(overrides)
    return RiskManager(RiskConfig(**defaults))


class TestPositionSizing:
    def test_calc_position_size_quote(self):
        manager = make_manager(risk_per_trade_pct=1.0, stop_loss_pct=2.0)
        # risk_amount = 1000 * 1% = 10; position_size = 10 / 2% = 500
        assert manager.calc_position_size_quote(equity=1000.0) == pytest.approx(500.0)

    def test_position_size_capped_at_equity(self):
        manager = make_manager(risk_per_trade_pct=50.0, stop_loss_pct=1.0)
        assert manager.calc_position_size_quote(equity=1000.0) == pytest.approx(1000.0)


class TestOpenAndCloseFlow:
    def test_open_position_sets_stop_and_take_profit(self):
        manager = make_manager(stop_loss_pct=2.0, take_profit_pct=4.0)
        position = manager.open_position(entry_price=100.0, base_amount=1.0)
        assert position.stop_loss_price == pytest.approx(98.0)
        assert position.take_profit_price == pytest.approx(104.0)

    def test_positions_to_close_detects_stop_loss(self):
        manager = make_manager(stop_loss_pct=2.0, take_profit_pct=4.0)
        manager.open_position(entry_price=100.0, base_amount=1.0)
        assert manager.positions_to_close(current_price=97.0) != []
        assert manager.positions_to_close(current_price=100.0) == []

    def test_positions_to_close_detects_take_profit(self):
        manager = make_manager(stop_loss_pct=2.0, take_profit_pct=4.0)
        manager.open_position(entry_price=100.0, base_amount=1.0)
        assert manager.positions_to_close(current_price=105.0) != []

    def test_close_position_computes_pnl_and_removes_it(self):
        manager = make_manager()
        position = manager.open_position(entry_price=100.0, base_amount=2.0)
        pnl = manager.close_position(position, exit_price=110.0)
        assert pnl == pytest.approx(20.0)
        assert position not in manager.open_positions


class TestMaxOpenPositions:
    def test_can_open_position_respects_limit(self):
        manager = make_manager(max_open_positions=1)
        assert manager.can_open_position(equity=1000.0) is True
        manager.open_position(entry_price=100.0, base_amount=1.0)
        assert manager.can_open_position(equity=1000.0) is False


class TestDailyLossBreaker:
    def test_breaker_triggers_after_large_loss(self):
        manager = make_manager(max_daily_loss_pct=5.0, max_open_positions=5)
        equity = 1000.0
        assert manager.daily_loss_breaker_triggered(equity) is False

        position = manager.open_position(entry_price=100.0, base_amount=10.0)
        manager.close_position(position, exit_price=95.0)  # -50 realized pnl = -5% of 1000

        assert manager.daily_loss_breaker_triggered(equity) is True
        assert manager.can_open_position(equity) is False
