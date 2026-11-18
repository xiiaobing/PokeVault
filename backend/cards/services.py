
import os
import requests
from decimal import Decimal
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.db.models import Max, Q
from django.core.files.base import ContentFile
from urllib.parse import urlparse


from .models import Card, CardPriceHistory, CardSearchCache


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


def download_card_image(card):
    """
    Download a card image from PokéWallet and save it locally.
    """

    if card.image:
        return

    api_key = os.getenv("POKEWALLET_API_KEY")

    if not api_key:
        return

    image_url = (
        f"{BASE_URL}/images/{card.pokewallet_id}?size=low"
    )

    try:
        response = requests.get(
            image_url,
            headers={"X-API-Key": api_key},
            timeout=15
        )

        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")

        if not content_type.startswith("image/"):
            return

        extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }.get(content_type.split(";")[0].lower(), ".jpg")

        filename = f"{card.pokewallet_id}{extension}"

        card.image.save(
            filename,
            ContentFile(response.content),
            save=True
        )

    except requests.RequestException:
        # Image download failure should not prevent card creation.
        import logging
        logging.getLogger(__name__).warning(
            "Unable to download image for card %s",
            card.name,
            exc_info=True
        )


def normalize_search_query(query):
    words = query.lower().split()
    return " ".join(sorted(words))


def get_cached_cards(query):
    normalized_query = normalize_search_query(query)

    today = timezone.localdate()

    return CardSearchCache.objects.filter(
        query=normalized_query,
        fetched_at__date=today
    ).first()


def save_search_cache(query, cards):
    normalized_query = normalize_search_query(query)

    cache, created = CardSearchCache.objects.update_or_create(
        query=normalized_query,
        defaults={}
    )

    cache.cards.set(cards)
    return cache


def save_card_results(data):
    saved_cards = []

    for result in data.get("results", []):
        card_info = result.get("card_info", {})

        pokewallet_id = result["id"]

        image_url = (
            f"{BASE_URL}/images/{pokewallet_id}?size=low"
        )

        # Save or update the card
        card, created = Card.objects.update_or_create(
            pokewallet_id=pokewallet_id,
            defaults={
                "name": card_info.get("name") or "",
                "set_name": card_info.get("set_name") or "",
                "set_id": card_info.get("set_id") or "",
                "set_code": card_info.get("set_code") or "",
                "card_number": card_info.get("card_number") or "",
                "rarity": card_info.get("rarity") or "",
                "image_url": image_url,
            }
        )

        # Download image only when no local image exists
        if not card.image:
            download_card_image(card)

        # Save TCGplayer price history
        tcgplayer = result.get("tcgplayer") or {}

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
                    "market_price": to_decimal(
                        price.get("market_price")
                    ),
                    "direct_low_price": to_decimal(
                        price.get("direct_low_price")
                    ),
                },
            )

        saved_cards.append(card)

    return saved_cards
