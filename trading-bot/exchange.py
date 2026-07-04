"""Zugriff auf die oeffentliche Binance-API (keine API-Keys noetig).

Liefert Kerzen (Klines) und aktuelle Preise. Nur lesender Zugriff --
es werden hierueber niemals Orders platziert.
"""

import time

import requests

BASE_URL = "https://api.binance.com/api/v3"

# Millisekunden pro Kerze je Timeframe
TIMEFRAME_MS = {
    "1m": 60_000,
    "5m": 5 * 60_000,
    "15m": 15 * 60_000,
    "30m": 30 * 60_000,
    "1h": 60 * 60_000,
    "4h": 4 * 60 * 60_000,
    "1d": 24 * 60 * 60_000,
}


class ExchangeError(Exception):
    """Fehler beim Abruf von Boersendaten (Netzwerk, ungueltiges Paar, ...)."""


def _get(path, params):
    try:
        response = requests.get(f"{BASE_URL}/{path}", params=params, timeout=15)
    except requests.RequestException as exc:
        raise ExchangeError(f"Keine Verbindung zur Binance-API: {exc}") from exc
    if response.status_code != 200:
        try:
            detail = response.json().get("msg", response.text)
        except ValueError:
            detail = response.text
        raise ExchangeError(
            f"Binance-API-Fehler (HTTP {response.status_code}): {detail}"
        )
    return response.json()


def get_price(symbol):
    """Aktueller Preis eines Handelspaars, z.B. get_price('BTCUSDT')."""
    data = _get("ticker/price", {"symbol": symbol})
    return float(data["price"])


def get_klines(symbol, interval, limit=500, start_time=None, end_time=None):
    """Kerzen abrufen (max. 1000 pro Anfrage).

    Rueckgabe: Liste von Dicts mit open_time (ms), open, high, low, close, volume.
    Die letzte Kerze ist in der Regel noch nicht abgeschlossen.
    """
    params = {"symbol": symbol, "interval": interval, "limit": min(limit, 1000)}
    if start_time is not None:
        params["startTime"] = int(start_time)
    if end_time is not None:
        params["endTime"] = int(end_time)
    raw = _get("klines", params)
    return [
        {
            "open_time": int(k[0]),
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        }
        for k in raw
    ]


def get_klines_days(symbol, interval, days):
    """Kerzen fuer die letzten `days` Tage, automatisch in 1000er-Bloecken geholt."""
    if interval not in TIMEFRAME_MS:
        raise ExchangeError(
            f"Unbekannter Timeframe '{interval}'. Erlaubt: {', '.join(TIMEFRAME_MS)}"
        )
    now_ms = int(time.time() * 1000)
    start = now_ms - days * 24 * 60 * 60_000
    candles = []
    while start < now_ms:
        batch = get_klines(symbol, interval, limit=1000, start_time=start)
        if not batch:
            break
        candles.extend(batch)
        last_open = batch[-1]["open_time"]
        next_start = last_open + TIMEFRAME_MS[interval]
        if next_start <= start:
            break
        start = next_start
        if len(batch) < 1000:
            break
    return candles
