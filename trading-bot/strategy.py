"""Handelsstrategie: EMA-Crossover (12/26) mit RSI-Filter.

Kaufsignal:  schneller EMA kreuzt den langsamen EMA von unten nach oben
             UND der RSI ist nicht ueberkauft (< rsi_overbought).
Verkauf:     schneller EMA kreuzt den langsamen EMA von oben nach unten.
Zusaetzlich sichern Stop-Loss und Take-Profit im Broker jede Position ab.
"""

from indicators import ema, rsi

BUY = "BUY"
SELL = "SELL"
HOLD = "HOLD"


def min_candles(params):
    """Wie viele Kerzen die Strategie mindestens braucht."""
    return max(params["ema_slow"], params["rsi_period"]) + 2


def generate_signal(closes, params, has_position):
    """Signal fuer die letzte (abgeschlossene) Kerze berechnen.

    closes: Schlusskurse abgeschlossener Kerzen, aelteste zuerst.
    Rueckgabe: (signal, begruendung)
    """
    if len(closes) < min_candles(params):
        return HOLD, f"Zu wenig Daten ({len(closes)} Kerzen, brauche {min_candles(params)})"

    fast = ema(closes, params["ema_fast"])
    slow = ema(closes, params["ema_slow"])
    strength = rsi(closes, params["rsi_period"])

    if slow[-2] is None or strength[-1] is None:
        return HOLD, "Indikatoren noch in der Aufwaermphase"

    crossed_up = fast[-2] <= slow[-2] and fast[-1] > slow[-1]
    crossed_down = fast[-2] >= slow[-2] and fast[-1] < slow[-1]

    if not has_position and crossed_up:
        if strength[-1] >= params["rsi_overbought"]:
            return HOLD, (
                f"EMA-Kaufsignal, aber RSI {strength[-1]:.1f} ist ueberkauft "
                f"(>= {params['rsi_overbought']})"
            )
        return BUY, (
            f"EMA {params['ema_fast']} kreuzt EMA {params['ema_slow']} nach oben, "
            f"RSI {strength[-1]:.1f}"
        )

    if has_position and crossed_down:
        return SELL, (
            f"EMA {params['ema_fast']} kreuzt EMA {params['ema_slow']} nach unten"
        )

    trend = "aufwaerts" if fast[-1] > slow[-1] else "abwaerts"
    return HOLD, f"Kein Kreuzsignal (Trend {trend}, RSI {strength[-1]:.1f})"
