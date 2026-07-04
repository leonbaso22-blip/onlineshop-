"""Technische Indikatoren in reinem Python (kein pandas/numpy noetig)."""


def ema(values, period):
    """Exponentieller gleitender Durchschnitt.

    Gibt eine Liste gleicher Laenge zurueck; die ersten (period - 1)
    Eintraege sind None (Aufwaermphase). Startwert ist der SMA der
    ersten `period` Werte.
    """
    if period <= 0:
        raise ValueError("period muss > 0 sein")
    if len(values) < period:
        return [None] * len(values)

    result = [None] * (period - 1)
    sma = sum(values[:period]) / period
    result.append(sma)
    multiplier = 2 / (period + 1)
    prev = sma
    for value in values[period:]:
        prev = (value - prev) * multiplier + prev
        result.append(prev)
    return result


def rsi(values, period=14):
    """Relative Strength Index nach Wilder.

    Gibt eine Liste gleicher Laenge zurueck; die ersten `period`
    Eintraege sind None (Aufwaermphase).
    """
    if period <= 0:
        raise ValueError("period muss > 0 sein")
    if len(values) <= period:
        return [None] * len(values)

    result = [None] * period
    gains = 0.0
    losses = 0.0
    for i in range(1, period + 1):
        change = values[i] - values[i - 1]
        if change >= 0:
            gains += change
        else:
            losses -= change
    avg_gain = gains / period
    avg_loss = losses / period
    result.append(_rsi_value(avg_gain, avg_loss))

    for i in range(period + 1, len(values)):
        change = values[i] - values[i - 1]
        gain = max(change, 0.0)
        loss = max(-change, 0.0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        result.append(_rsi_value(avg_gain, avg_loss))
    return result


def _rsi_value(avg_gain, avg_loss):
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - 100.0 / (1.0 + rs)
