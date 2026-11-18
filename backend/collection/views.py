
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes


import requests
from .models import CollectionItem, ExchangeRate, WatchlistItem, PortfolioSnapshot
from .serializers import CollectionItemSerializer, RegisterSerializer, WatchlistItemSerializer, PortfolioSnapshotSerializer
from django.contrib.auth import authenticate
from django.core.cache import cache
from decimal import Decimal
from django.db.models import Prefetch

from cards.models import CardPriceHistory

class CollectionItemViewSet(viewsets.ModelViewSet):
    serializer_class = CollectionItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return collection items belonging to the logged-in user
        return CollectionItem.objects.filter(
            user=self.request.user
        ).select_related("card")

    def perform_create(self, serializer):
        # Automatically assign the logged-in user
        serializer.save(user=self.request.user)

class WatchlistItemViewSet(viewsets.ModelViewSet):
    serializer_class = WatchlistItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            WatchlistItem.objects
            .filter(user=self.request.user)
            .select_related("card")
        )

    def create(self, request, *args, **kwargs):
        card_id = request.data.get("card")

        if not card_id:
            return Response(
                {"error": "Card ID is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        item, created = WatchlistItem.objects.get_or_create(
            user=request.user,
            card_id=card_id
        )

        serializer = self.get_serializer(item)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)

            return Response({
                "message": "Account created successfully.",
                "token": token.key,
                "username": user.username,
            }, status=status.HTTP_201_CREATED)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    
class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(
            username=username,
            password=password
        )

        if user is not None:
            token, created = Token.objects.get_or_create(user=user)

            return Response({
                "message": "Login successful.",
                "token": token.key,
                "username": user.username,
            }, status=status.HTTP_200_OK)

        return Response({
            "error": "Invalid username or password."
        }, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["GET"])
@permission_classes([AllowAny])
def exchange_rate_api(request):
    exchange_rate = (
        ExchangeRate.objects
        .filter(
            base_currency="USD",
            target_currency="MYR"
        )
        .order_by("-rate_date")
        .first()
    )

    if not exchange_rate:
        return Response(
            {"error": "Exchange rate is not available."},
            status=503
        )

    return Response({
        "base": exchange_rate.base_currency,
        "quote": exchange_rate.target_currency,
        "rate": str(exchange_rate.rate),
        "date": exchange_rate.rate_date,
        "fetched_at": exchange_rate.fetched_at,
    })

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Retrieve the user's collection and latest cached TCGplayer prices
        collection_items = (
            CollectionItem.objects
            .filter(user=user)
            .select_related("card")
            .prefetch_related(
                Prefetch(
                    "card__price_history",
                    queryset=CardPriceHistory.objects.filter(
                        provider="tcgplayer"
                    ).order_by("-fetched_at"),
                    to_attr="dashboard_price_history"
                )
            )
        )

        total_cards = 0
        collection_value_usd = Decimal("0.00")
        card_summary = {}

        for item in collection_items:
            card = item.card
            quantity = item.quantity

            total_cards += quantity

            # Get the latest cached market price
            prices = card.dashboard_price_history
            market_price = (
                prices[0].market_price
                if prices else None
            )

            if market_price is None:
                continue

            market_value = market_price * quantity
            collection_value_usd += market_value

            # Combine different conditions of the same card
            if card.id not in card_summary:
                card_summary[card.id] = {
                    "id": card.id,
                    "name": card.name,
                    "set_name": card.set_name,
                    "card_number": card.card_number,
                    "image_url": f"/cards/{card.id}/image/",
                    "market_price": str(market_price),
                    "quantity": 0,
                    "market_value": Decimal("0.00"),
                }

            card_summary[card.id]["quantity"] += quantity
            card_summary[card.id]["market_value"] += market_value

        # Get the four most valuable cards
        top_cards = sorted(
            card_summary.values(),
            key=lambda card: card["market_value"],
            reverse=True
        )[:4]

        # Convert Decimal values to strings for JSON
        for card in top_cards:
            card["market_value"] = str(card["market_value"])

        # Count distinct sets in the user's collection
        tracked_sets = (
            CollectionItem.objects
            .filter(user=user)
            .exclude(card__set_id__isnull=True)
            .exclude(card__set_id="")
            .values("card__set_id")
            .distinct()
            .count()
        )

        # Count watchlist items
        watchlist_count = WatchlistItem.objects.filter(
            user=user
        ).count()

        # Retrieve the latest USD to MYR exchange rate
        exchange_rate = (
            ExchangeRate.objects
            .filter(
                base_currency="USD",
                target_currency="MYR"
            )
            .order_by("-rate_date")
            .first()
        )

        collection_value_myr = None

        if exchange_rate:
            collection_value_myr = (
                collection_value_usd * exchange_rate.rate
            )

        return Response({
            "collection_value_usd": str(collection_value_usd),
            "collection_value_myr": (
                str(collection_value_myr)
                if collection_value_myr is not None
                else None
            ),
            "total_cards": total_cards,
            "watchlist_count": watchlist_count,
            "tracked_sets": tracked_sets,
            "top_cards": top_cards,
        })

class PortfolioHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        snapshots = PortfolioSnapshot.objects.filter(
            user=request.user
        ).order_by("snapshot_date")

        serializer = PortfolioSnapshotSerializer(
            snapshots,
            many=True
        )

        return Response(serializer.data)