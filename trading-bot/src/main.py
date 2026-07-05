from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.bot import TradingBot
from src.config import load_config
from src.exchange import LiveTradingNotConfirmedError
from src.logger_setup import setup_logging


def main() -> None:
    parser = argparse.ArgumentParser(description="Krypto-Trading-Bot")
    parser.add_argument("--config", default=None, help="Pfad zur config.yaml")
    parser.add_argument("--once", action="store_true", help="Nur einen Loop-Durchlauf ausführen")
    args = parser.parse_args()

    config = load_config(args.config) if args.config else load_config()
    logger = setup_logging(config.logging)

    try:
        bot = TradingBot(config, logger)
    except LiveTradingNotConfirmedError as exc:
        logger.error(str(exc))
        sys.exit(1)

    if args.once:
        bot.step()
    else:
        bot.run_forever()


if __name__ == "__main__":
    main()
