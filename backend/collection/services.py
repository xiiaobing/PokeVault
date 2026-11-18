
import logging
import requests

from decimal import Decimal
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import CollectionItem, ExchangeRate, PortfolioSnapshot


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

def create_daily_portfolio_snapshot(user):
    today = timezone.localdate()

    # Check whether today's snapshot already exists
    existing_snapshot = PortfolioSnapshot.objects.filter(
        user=user,
        snapshot_date=today
    ).first()

    if existing_snapshot:
        return existing_snapshot

    # Retrieve the user's collection
    collection_items = CollectionItem.objects.filter(
        user=user
    ).select_related("card").prefetch_related(
        "card__price_history"
    )

    collection_value_usd = Decimal("0.00")

    for item in collection_items:
        # Get the latest TCGplayer market price
        latest_price = (
            item.card.price_history
            .filter(provider="tcgplayer")
            .order_by("-fetched_at")
            .first()
        )

        if latest_price and latest_price.market_price is not None:
            collection_value_usd += (
                latest_price.market_price * item.quantity
            )

    # Retrieve the latest USD/MYR exchange rate
    exchange_rate = ExchangeRate.objects.filter(
        base_currency="USD",
        target_currency="MYR"
    ).order_by("-rate_date").first()

    collection_value_myr = None

    if exchange_rate:
        collection_value_myr = (
            collection_value_usd * exchange_rate.rate
        )

    # Save today's snapshot
    snapshot, created = PortfolioSnapshot.objects.get_or_create(
        user=user,
        snapshot_date=today,
        defaults={
            "collection_value_usd": collection_value_usd,
            "collection_value_myr": collection_value_myr,
        }
    )

    return snapshot
