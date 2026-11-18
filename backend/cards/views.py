import logging
import requests
import mimetypes
import os
import tempfile

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
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser


from cards.scanner import scan_card_image

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


class CardScanView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        image = request.FILES.get("image")

        if not image:
            return Response(
                {"error": "Please upload an image."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image.size > 10 * 1024 * 1024:
            return Response(
                {"error": "Image size must not exceed 10 MB."},
                status=status.HTTP_400_BAD_REQUEST
            )

        suffix = os.path.splitext(image.name)[1] or ".jpg"

        try:
            with tempfile.NamedTemporaryFile(
                suffix=suffix,
                delete=False
            ) as temp_file:
                for chunk in image.chunks():
                    temp_file.write(chunk)

                temp_path = temp_file.name

            try:
                result = scan_card_image(temp_path)
            finally:
                os.remove(temp_path)

            # Collect all candidates from CardCorpus.
            candidates = []

            for detected_card in result.get("cards", []):
                candidates.extend(
                    detected_card.get("candidates", [])
                )

            if not candidates:
                return Response({
                    "matched": False,
                    "message": "No Pokémon card could be recognized."
                })

            # Select the candidate with the highest similarity.
            best_candidate = max(
                candidates,
                key=lambda candidate: candidate.get("sim", 0)
            )

            card_name = best_candidate.get("name") or ""
            card_number = best_candidate.get("number") or ""
            set_name = best_candidate.get("set_name") or ""

            recognition = {
                "name": card_name,
                "set_name": set_name,
                "number": card_number,
                "language": best_candidate.get("language"),
                "print": best_candidate.get("print"),
                "similarity": best_candidate.get("sim"),
                "picture": best_candidate.get("picture"),
            }

            # Step 1: Search the existing database.
            if card_number and "/" not in card_number:
                existing_card = Card.objects.filter(
                    card_number__icontains=card_number,
                ).first()
            else:
                existing_card = Card.objects.filter(
                    name__icontains=card_name,
                    card_number__icontains=card_number,
                    set_name__icontains=set_name,
                ).first()

            if existing_card:
                serializer = CardSerializer(existing_card)

                return Response({
                    "matched": True,
                    "source": "database",
                    "recognition": recognition,
                    "card": serializer.data,
                })

            # Step 2: Build the PokéWallet search query.
            query = " ".join(
                value for value in [
                    card_number,
                    set_name,
                ]
                if value
            )

            # Step 3: Check the search cache first.
            cached_search = get_cached_cards(query)

            if cached_search is not None:
                cards = list(cached_search.cards.all())
            else:
                # Step 4: Search PokéWallet.
                search_result = search_cards(query)

                matching_results = []

                for item in search_result.get("results", []):
                    card_info = item.get("card_info") or {}

                    result_name = card_info.get("name") or ""
                    result_number = card_info.get("card_number") or ""
                    result_set_name = card_info.get("set_name") or ""

                    # Match the recognized card.
                    if (
                        result_name.casefold() == card_name.casefold()
                        and result_number.casefold() == card_number.casefold()
                        and result_set_name.casefold() == set_name.casefold()
                    ):
                        matching_results.append(item)

                if not matching_results:
                    return Response({
                        "matched": False,
                        "source": "pokewallet",
                        "recognition": recognition,
                        "message": (
                            "Card recognized, but no matching "
                            "PokéWallet card was found."
                        ),
                    })

                # Step 5: Save only the matching result.
                cards = save_card_results({
                    "results": matching_results
                })

                # Cache the matching card.
                save_search_cache(query, cards)

            # Step 6: Return the matched card.
            if not cards:
                return Response({
                    "matched": False,
                    "source": "pokewallet",
                    "recognition": recognition,
                    "message": "No matching card was found."
                })

            matched_card = cards[0]
            serializer = CardSerializer(matched_card)

            return Response({
                "matched": True,
                "source": "pokewallet",
                "recognition": recognition,
                "card": serializer.data,
            })

        except Exception as error:
            return Response(
                {"error": f"Card scanning failed: {str(error)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
