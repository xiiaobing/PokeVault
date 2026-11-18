
import logging
import requests

from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import ExchangeRate

logger = logging.getLogger(__name__)


def get_usd_to_myr_rate():
    today = timezone.localdate()

    # 1. Check whether today's rate already exists.
    cached_rate = ExchangeRate.objects.filter(
        base_currency="USD",
        target_currency="MYR",
        rate_date=today
    ).first()

    if cached_rate:
        return cached_rate

    # 2. Fetch today's rate from Frankfurter.
    try:
        response = requests.get(
            "https://api.frankfurter.dev/v2/rate/USD/MYR",
            timeout=10
        )
        response.raise_for_status()

        data = response.json()

        # 3. Save the exchange rate in the database.
        try:
            with transaction.atomic():
                exchange_rate, created = ExchangeRate.objects.get_or_create(
                    base_currency="USD",
                    target_currency="MYR",
                    rate_date=today,
                    defaults={
                        "rate": data["rate"],
                    }
                )

            return exchange_rate

        except IntegrityError:
            # Another process may have saved today's rate concurrently.
            return ExchangeRate.objects.get(
                base_currency="USD",
                target_currency="MYR",
                rate_date=today
            )

    except (requests.RequestException, KeyError, ValueError):
        logger.exception("Unable to retrieve USD to MYR exchange rate")

        # 4. If the API fails, fall back to the latest saved rate.
        previous_rate = ExchangeRate.objects.filter(
            base_currency="USD",
            target_currency="MYR"
        ).order_by("-rate_date").first()

        if previous_rate:
            return previous_rate

        raise
