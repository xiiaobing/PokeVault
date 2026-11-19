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

        print("Image received:", image is not None)
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

            print(f"CardCorpus result: {card_name} {card_number} {set_name}")

            # Step 1: Search the existing database.
            print("\n========== CARD SOURCE CHECK ==========")
            print(f"Recognized card: {card_name}")
            print(f"Card number: {card_number}")
            print(f"Set: {set_name}")
            print("Checking local database...")

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
                print("SOURCE: DATABASE")
                print(f"Retrieved card: {existing_card.name}")
                print(f"Database ID: {existing_card.id}")
                print("=======================================\n")

                serializer = CardSerializer(existing_card)

                return Response({
                    "matched": True,
                    "source": "database",
                    "recognition": recognition,
                    "card": serializer.data,
                })

            print("DATABASE: No matching card found.")
            print("Proceeding to PokéWallet search...")

            # Step 2: Build the PokéWallet search query.
            if card_number and "/" not in card_number:
                query = " ".join(
                    value for value in [
                        card_number,
                    ]
                    if value
                )
            else:
                query = " ".join(
                    value for value in [
                        card_number,
                        set_name,
                    ]
                    if value
                )

            print(f"PokéWallet query: {query}")

            # Step 3: Check the search cache first.
            print("\nChecking local search cache...")

            cached_search = get_cached_cards(query)

            if cached_search is not None:
                cards = list(cached_search.cards.all())

                if cards:
                    print("SOURCE: CACHE")
                    print(f"Retrieved {len(cards)} card(s) from cache.")

                    for card in cards:
                        print(f"  - {card.name} ({card.card_number})")
                else:
                    print("CACHE: No cards found in cached search.")

            else:
                print("CACHE: No cached search found.")
                print("SOURCE: POKÉWALLET API")
                print(f"Sending query: {query}")

                search_result = search_cards(query)

                print(
                    "PokéWallet returned:",
                    len(search_result.get("results", [])),
                    "result(s)"
                )

                matching_results = []

                for item in search_result.get("results", []):
                    card_info = item.get("card_info") or {}

                    result_name = card_info.get("name") or ""
                    result_number = card_info.get("card_number") or ""
                    result_set_name = card_info.get("set_name") or ""

                    if (
                        card_name.casefold() in result_name.casefold()
                        and result_number.casefold() == card_number.casefold()
                        and set_name.casefold() in result_set_name.casefold()
                    ):
                        matching_results.append(item)

                if not matching_results:
                    print("SOURCE: NOT FOUND")
                    print("No matching card found in PokéWallet.")
                    print("=======================================\n")

                    return Response({
                        "matched": False,
                        "source": "pokewallet",
                        "recognition": recognition,
                        "message": (
                            "Card recognized, but no matching "
                            "PokéWallet card was found."
                        ),
                    })

                print(
                    f"POKÉWALLET: Found {len(matching_results)} matching card(s)."
                )

                cards = save_card_results({
                    "results": matching_results
                })

                print(f"Saved {len(cards)} card(s) to database.")

                save_search_cache(query, cards)

                print("Search cache updated.")

            # Step 4: Return the matched card.
            if not cards:
                print("SOURCE: NOT FOUND")
                print("No matching card available.")
                print("=======================================\n")

                return Response({
                    "matched": False,
                    "source": "pokewallet",
                    "recognition": recognition,
                    "message": "No matching card was found."
                })

            matched_card = cards[0]

            print(f"FINAL CARD: {matched_card.name}")
            print("=======================================\n")

            serializer = CardSerializer(matched_card)

            return Response({
                "matched": True,
                "source": "cache" if cached_search is not None else "pokewallet",
                "recognition": recognition,
                "card": serializer.data,
            })

        except Exception as error:
            return Response(
                {"error": f"Card scanning failed: {str(error)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
