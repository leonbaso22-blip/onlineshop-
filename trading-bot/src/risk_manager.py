from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from src.config import RiskConfig


@dataclass
class Position:
    entry_price: float
    base_amount: float
    stop_loss_price: float
    take_profit_price: float


@dataclass
class RiskManager:
    cfg: RiskConfig
    open_positions: list[Position] = field(default_factory=list)
    _daily_date: date | None = field(default=None, init=False)
    _daily_start_equity: float = field(default=0.0, init=False)
    _daily_realized_pnl: float = field(default=0.0, init=False)

    def _roll_day_if_needed(self, equity: float) -> None:
        today = date.today()
        if self._daily_date != today:
            self._daily_date = today
            self._daily_start_equity = equity
            self._daily_realized_pnl = 0.0

    def daily_loss_breaker_triggered(self, equity: float) -> bool:
        self._roll_day_if_needed(equity)
        if self._daily_start_equity <= 0:
            return False
        loss_pct = -self._daily_realized_pnl / self._daily_start_equity * 100
        return loss_pct >= self.cfg.max_daily_loss_pct

    def can_open_position(self, equity: float) -> bool:
        self._roll_day_if_needed(equity)
        if self.daily_loss_breaker_triggered(equity):
            return False
        return len(self.open_positions) < self.cfg.max_open_positions

    def calc_position_size_quote(self, equity: float) -> float:
        """Positionsgröße (in Quote-Währung) so gewählt, dass bei Erreichen des
        Stop-Loss genau risk_per_trade_pct % des Eigenkapitals verloren geht."""
        risk_amount = equity * (self.cfg.risk_per_trade_pct / 100)
        stop_loss_fraction = self.cfg.stop_loss_pct / 100
        if stop_loss_fraction <= 0:
            return 0.0
        position_size = risk_amount / stop_loss_fraction
        return min(position_size, equity)

    def open_position(self, entry_price: float, base_amount: float) -> Position:
        position = Position(
            entry_price=entry_price,
            base_amount=base_amount,
            stop_loss_price=entry_price * (1 - self.cfg.stop_loss_pct / 100),
            take_profit_price=entry_price * (1 + self.cfg.take_profit_pct / 100),
        )
        self.open_positions.append(position)
        return position

    def positions_to_close(self, current_price: float) -> list[Position]:
        return [
            p
            for p in self.open_positions
            if current_price <= p.stop_loss_price or current_price >= p.take_profit_price
        ]

    def close_position(self, position: Position, exit_price: float) -> float:
        pnl = (exit_price - position.entry_price) * position.base_amount
        self._daily_realized_pnl += pnl
        self.open_positions.remove(position)
        return pnl
