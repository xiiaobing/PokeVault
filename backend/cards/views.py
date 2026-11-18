import logging
import requests
import mimetypes
import os

from django.http import FileResponse, HttpResponse
from django.db import DatabaseError
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile

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
    save_search_cache,
)
from .serializers import CardSerializer, CardPriceHistorySerializer


logger = logging.getLogger(__name__)


class CardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


@api_view(["GET"])
def search_cards_api(request):
    query = request.GET.get("q", "").strip()

    if not query:
        return Response(
            {"error": "Search query is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        cached_search = get_cached_cards(query)

        if cached_search is not None:
            cards = cached_search.cards.all()
        else:
            result = search_cards(query)
            cards = save_card_results(result)

            # Save the exact search result against its normalized query.
            save_search_cache(query, cards)

        paginator = CardPagination()
        page = paginator.paginate_queryset(cards, request)

        serializer = CardSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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

    # 1. Check local storage first
    if card.image:
        content_type, _ = mimetypes.guess_type(card.image.name)

        return FileResponse(
            card.image.open("rb"),
            content_type=content_type or "image/jpeg"
        )

    # 2. No local image: retrieve it from PokéWallet
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

        # 3. Save the downloaded image locally
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

        # 4. Return the downloaded image
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
