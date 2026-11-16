
import os
import requests
from decimal import Decimal
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Card, CardPriceHistory


BASE_URL = "https://api.pokewallet.io"


def search_cards(query):
    """
    Search Pokémon cards using the PokéWallet API.
    """

    api_key = os.getenv("POKEWALLET_API_KEY")

    if not api_key:
        raise ValueError("PokéWallet API key is missing.")

    headers = {
        "X-API-Key": api_key
    }

    params = {
        "q": query,
        "limit": 20
    }

    response = requests.get(
        f"{BASE_URL}/search",
        headers=headers,
        params=params,
        timeout=15
    )

    if response.status_code == 429:
        raise Exception("PokéWallet API rate limit exceeded.")

    response.raise_for_status()

    return response.json()

def to_decimal(value):
    """Convert a price into Decimal safely."""
    if value is None:
        return None

    return Decimal(str(value))


def parse_source_datetime(value):
    """Convert the API timestamp into a timezone-aware datetime."""
    if not value:
        return None

    dt = parse_datetime(value)

    if dt and timezone.is_naive(dt):
        dt = timezone.make_aware(dt)

    return dt


def save_card_results(data):
    saved_cards = []

    for result in data.get("results", []):
        card_info = result.get("card_info", {})

        # Save or update the card
        card, created = Card.objects.update_or_create(
            pokewallet_id=result["id"],
            defaults={
                "name": card_info.get("name", ""),
                "set_name": card_info.get("set_name", ""),
                "set_id": card_info.get("set_id", ""),
                "set_code": card_info.get("set_code", ""),
                "card_number": card_info.get("card_number", ""),
                "rarity": card_info.get("rarity", ""),
            }
        )

        # Save TCGplayer price history
        tcgplayer = result.get("tcgplayer", {})

        for price in tcgplayer.get("prices", []):
            source_updated_at = parse_source_datetime(
                price.get("updated_at")
            )

            CardPriceHistory.objects.update_or_create(
                card=card,
                provider="tcgplayer",
                variant=price.get("sub_type_name", ""),
                source_updated_at=source_updated_at,
                defaults={
                    "currency": "USD",
                    "low_price": to_decimal(price.get("low_price")),
                    "mid_price": to_decimal(price.get("mid_price")),
                    "high_price": to_decimal(price.get("high_price")),
                    "market_price": to_decimal(price.get("market_price")),
                    "direct_low_price": to_decimal(
                        price.get("direct_low_price")
                    ),
                },
            )

        # Save Cardmarket price history
        cardmarket = result.get("cardmarket", {})

        for price in cardmarket.get("prices", []):
            source_updated_at = parse_source_datetime(
                price.get("updated_at")
            )

            CardPriceHistory.objects.update_or_create(
                card=card,
                provider="cardmarket",
                variant=price.get("variant_type", ""),
                source_updated_at=source_updated_at,
                defaults={
                    "currency": "EUR",
                    "low_price": to_decimal(price.get("low")),
                    "average_price": to_decimal(price.get("avg")),
                    "avg_1": to_decimal(price.get("avg1")),
                    "avg_7": to_decimal(price.get("avg7")),
                    "avg_30": to_decimal(price.get("avg30")),
                    "trend_price": to_decimal(price.get("trend")),
                },
            )


        saved_cards.append(card)

    return saved_cards
