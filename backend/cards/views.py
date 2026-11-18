import logging
import requests

import os
from django.http import HttpResponse
from django.db import DatabaseError
from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView

from .models import Card
from .services import (
    search_cards,
    save_card_results,
    get_cached_cards,
)
from .serializers import CardSerializer, CardPriceHistorySerializer


logger = logging.getLogger(__name__)


class CardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


@api_view(["GET"])
def search_cards_api(request):
    query = request.query_params.get("q", "").strip()

    if not query:
        return Response(
            {"error": "A search query is required. Use ?q=card_number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(query) > 100:
        return Response(
            {"error": "Search query must be 100 characters or fewer."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Check today's cached results first
        cached_cards = get_cached_cards(query)

        if cached_cards.exists():
            cards = cached_cards
            logger.info("Returning cached card results for: %s", query)

        else:
            # No cached results, fetch from PokéWallet
            logger.info("Fetching card results from PokéWallet: %s", query)

            result = search_cards(query)
            cards = save_card_results(result)

        paginator = CardPagination()
        page = paginator.paginate_queryset(cards, request)

        serializer = CardSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    except requests.RequestException:
        logger.exception("PokéWallet API request failed")
        return Response(
            {"error": "Unable to retrieve card data from PokéWallet."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    except DatabaseError:
        logger.exception("Database error while saving card search results")
        return Response(
            {"error": "Unable to save the card search results."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    except Exception:
        logger.exception("Unexpected error during card search")
        return Response(
            {"error": "An unexpected error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
def card_price_history_api(request, card_id):
    card = get_object_or_404(Card, pk=card_id)

    price_history = card.price_history.all().order_by("-fetched_at")

    paginator = CardPagination()
    page = paginator.paginate_queryset(price_history, request)

    serializer = CardPriceHistorySerializer(page, many=True)

    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
def card_detail_api(request, card_id):
    card = get_object_or_404(
        Card.objects.prefetch_related("price_history"),
        pk=card_id
    )

    serializer = CardSerializer(card)

    return Response(serializer.data)


class CardListAPIView(ListAPIView):
    serializer_class = CardSerializer
    pagination_class = CardPagination

    filter_backends = [OrderingFilter]

    ordering_fields = [
        "name",
        "set_name",
        "rarity",
        "created_at",
        "updated_at",
    ]

    ordering = ["name"]

    def get_queryset(self):
        queryset = Card.objects.all()

        # Search by card name
        name = self.request.query_params.get("name")
        if name:
            queryset = queryset.filter(name__icontains=name.strip())

        # Filter by set name
        set_name = self.request.query_params.get("set_name")
        if set_name:
            queryset = queryset.filter(
                set_name__icontains=set_name.strip()
            )

        # Filter by rarity
        rarity = self.request.query_params.get("rarity")
        if rarity:
            queryset = queryset.filter(
                rarity__iexact=rarity.strip()
            )

        return queryset

@api_view(["GET"])
def card_image_api(request, card_id):
    card = get_object_or_404(Card, pk=card_id)

    api_key = os.getenv("POKEWALLET_API_KEY")

    if not api_key:
        return Response(
            {"error": "PokéWallet API key is missing."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        response = requests.get(
            f"https://api.pokewallet.io/images/{card.pokewallet_id}",
            headers={"X-API-Key": api_key},
            params={"size": "low"},
            timeout=15,
        )

        response.raise_for_status()

        content_type = response.headers.get(
            "Content-Type", "image/jpeg"
        )

        if not content_type.startswith("image/"):
            return Response(
                {"error": "Invalid image response from PokéWallet."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return HttpResponse(
            response.content,
            content_type=content_type,
        )

    except requests.RequestException:
        logger.exception("Unable to retrieve card image")
        return Response(
            {"error": "Unable to retrieve card image."},
            status=status.HTTP_502_BAD_GATEWAY,
        )