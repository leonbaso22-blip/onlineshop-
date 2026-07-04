"""Paper-Broker: simuliert Kauf/Verkauf mit virtuellem Guthaben.

Es wird kein echtes Geld bewegt. Guthaben, offene Position und alle
Trades werden optional in einem Datenverzeichnis gespeichert, damit der
Bot zwischen Aufrufen weiterlaeuft (state.json + trades.csv).
"""

import csv
import json
import os


class PaperBroker:
    def __init__(self, config, state_dir=None):
        self.config = config
        self.state_dir = state_dir
        self.balance = float(config["start_balance_usdt"])
        self.position = None  # {amount, entry_price, entry_time, stop_loss, take_profit}
        self.trade_count = 0
        self.wins = 0
        if state_dir:
            os.makedirs(state_dir, exist_ok=True)
            self._load_state()

    # ------------------------------------------------------------------ Orders

    def buy(self, price, timestamp, reason):
        """Position eroeffnen: fester Prozentsatz des Guthabens, abzgl. Gebuehr."""
        if self.position is not None:
            return None
        stake = self.balance * self.config["position_size_pct"] / 100.0
        if stake <= 0:
            return None
        fee = stake * self.config["fee_pct"] / 100.0
        amount = (stake - fee) / price
        self.balance -= stake
        self.position = {
            "amount": amount,
            "entry_price": price,
            "entry_time": timestamp,
            "stop_loss": price * (1 - self.config["stop_loss_pct"] / 100.0),
            "take_profit": price * (1 + self.config["take_profit_pct"] / 100.0),
        }
        trade = self._record(timestamp, "BUY", price, amount, fee, reason, pnl=None)
        self._save_state()
        return trade

    def sell(self, price, timestamp, reason):
        """Position komplett schliessen, abzgl. Gebuehr; realisierten P&L verbuchen."""
        if self.position is None:
            return None
        amount = self.position["amount"]
        proceeds = amount * price
        fee = proceeds * self.config["fee_pct"] / 100.0
        cost = amount * self.position["entry_price"]
        pnl = proceeds - fee - cost
        self.balance += proceeds - fee
        self.position = None
        self.trade_count += 1
        if pnl > 0:
            self.wins += 1
        trade = self._record(timestamp, "SELL", price, amount, fee, reason, pnl=pnl)
        self._save_state()
        return trade

    def check_protective_exit(self, low, high, timestamp):
        """Stop-Loss / Take-Profit gegen die Preisspanne pruefen und ggf. verkaufen."""
        if self.position is None:
            return None
        if low <= self.position["stop_loss"]:
            price = self.position["stop_loss"]
            return self.sell(price, timestamp, f"Stop-Loss bei {price:.2f} ausgeloest")
        if high >= self.position["take_profit"]:
            price = self.position["take_profit"]
            return self.sell(price, timestamp, f"Take-Profit bei {price:.2f} erreicht")
        return None

    # ------------------------------------------------------------------ Status

    def equity(self, price):
        """Gesamtwert des Depots (Guthaben + offene Position zum aktuellen Kurs)."""
        value = self.balance
        if self.position is not None:
            value += self.position["amount"] * price
        return value

    def has_position(self):
        return self.position is not None

    def summary(self, price):
        lines = [f"Guthaben: {self.balance:,.2f} USDT"]
        if self.position:
            pos = self.position
            unrealized = pos["amount"] * (price - pos["entry_price"])
            lines.append(
                f"Offene Position: {pos['amount']:.6f} zu {pos['entry_price']:,.2f} "
                f"(Stop {pos['stop_loss']:,.2f} / Ziel {pos['take_profit']:,.2f}), "
                f"unrealisiert {unrealized:+,.2f} USDT"
            )
        else:
            lines.append("Offene Position: keine")
        lines.append(f"Depotwert: {self.equity(price):,.2f} USDT")
        if self.trade_count:
            lines.append(
                f"Abgeschlossene Trades: {self.trade_count}, davon Gewinner: {self.wins}"
            )
        return "\n".join(lines)

    # ------------------------------------------------------------- Persistenz

    def _record(self, timestamp, side, price, amount, fee, reason, pnl):
        trade = {
            "timestamp": timestamp,
            "side": side,
            "price": round(price, 8),
            "amount": round(amount, 8),
            "fee_usdt": round(fee, 4),
            "balance_usdt": round(self.balance, 2),
            "pnl_usdt": round(pnl, 2) if pnl is not None else "",
            "reason": reason,
        }
        if self.state_dir:
            path = os.path.join(self.state_dir, "trades.csv")
            new_file = not os.path.exists(path)
            with open(path, "a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(trade.keys()))
                if new_file:
                    writer.writeheader()
                writer.writerow(trade)
        return trade

    def _state_path(self):
        return os.path.join(self.state_dir, "state.json")

    def _save_state(self):
        if not self.state_dir:
            return
        state = {
            "balance": self.balance,
            "position": self.position,
            "trade_count": self.trade_count,
            "wins": self.wins,
        }
        with open(self._state_path(), "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    def _load_state(self):
        path = self._state_path()
        if not os.path.exists(path):
            return
        with open(path, encoding="utf-8") as f:
            state = json.load(f)
        self.balance = state["balance"]
        self.position = state["position"]
        self.trade_count = state.get("trade_count", 0)
        self.wins = state.get("wins", 0)
