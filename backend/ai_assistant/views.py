
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal
import logging

from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from cards.models import CardPriceHistory
from collection.models import CollectionItem, WatchlistItem

from .services.gemini_service import generate_ai_advice


logger = logging.getLogger(__name__)


class AIAssistantChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()

        if not message:
            return Response(
                {"error": "Message is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(message) > 2000:
            return Response(
                {"error": "Message must not exceed 2000 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        try:
            user_context = self.build_user_context(user)

            answer = generate_ai_advice(
                message,
                user_context
            )

            return Response({
                "answer": answer,
                "historical_data_available": any(
                    card["history_sufficient"]
                    for card in user_context["cards"]
                ),
            })

        except Exception as e:
            logger.exception("AI Assistant request failed.")

            return Response(
                {
                    "error": "Gemini is temporarily unavailable.",
                    "details": str(e),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    def build_user_context(self, user):
        collection_items = list(
            CollectionItem.objects
            .filter(user=user)
            .select_related("card")
        )

        watchlist_items = list(
            WatchlistItem.objects
            .filter(user=user)
            .select_related("card")
        )

        # Combine collection and watchlist cards without duplicates.
        cards = {}

        for item in collection_items:
            cards[item.card_id] = item.card

        for item in watchlist_items:
            cards[item.card_id] = item.card

        card_ids = list(cards.keys())

        # Use TCGplayer market_price records, consistent with
        # the existing dashboard's pricing source.
        price_records = (
            CardPriceHistory.objects
            .filter(
                card_id__in=card_ids,
                provider="tcgplayer",
                market_price__isnull=False,
            )
            .order_by("-fetched_at")
        )

        history_by_card = defaultdict(list)

        for record in price_records:
            history_by_card[record.card_id].append(record)

        collection_by_card = defaultdict(list)

        for item in collection_items:
            collection_by_card[item.card_id].append(item)

        watchlist_card_ids = {
            item.card_id for item in watchlist_items
        }

        card_context = []

        for card_id, card in cards.items():
            history = history_by_card[card_id]

            latest_price = history[0] if history else None

            # Only use the latest 10 records for context.
            recent_history = history[:10]

            history_sufficient = False
            price_change_percentage = None

            if len(recent_history) >= 2:
                newest = recent_history[0]
                oldest = recent_history[-1]

                time_difference = (
                    newest.fetched_at - oldest.fetched_at
                )

                if (
                    time_difference >= timedelta(days=7)
                    and oldest.market_price != 0
                ):
                    history_sufficient = True

                    price_change = (
                        newest.market_price - oldest.market_price
                    )

                    price_change_percentage = (
                        price_change / oldest.market_price
                    ) * Decimal("100")

            owned_items = []

            for item in collection_by_card[card_id]:
                owned_items.append({
                    "quantity": item.quantity,
                    "condition": item.condition,
                    "purchase_price": (
                        str(item.purchase_price)
                        if item.purchase_price is not None
                        else None
                    ),
                    "purchase_date": (
                        item.purchase_date.isoformat()
                        if item.purchase_date
                        else None
                    ),
                })

            card_context.append({
                "card_id": card.id,
                "name": card.name,
                "set_name": card.set_name,
                "card_number": card.card_number,
                "rarity": card.rarity,
                "owned": bool(owned_items),
                "collection_items": owned_items,
                "in_watchlist": card_id in watchlist_card_ids,
                "current_market_price": (
                    str(latest_price.market_price)
                    if latest_price
                    else None
                ),
                "currency": (
                    latest_price.currency
                    if latest_price
                    else None
                ),
                "price_updated_at": (
                    latest_price.fetched_at.isoformat()
                    if latest_price
                    else None
                ),
                "history_sufficient": history_sufficient,
                "price_change_percentage": (
                    str(
                        price_change_percentage.quantize(
                            Decimal("0.01")
                        )
                    )
                    if price_change_percentage is not None
                    else None
                ),
                "historical_prices": [
                    {
                        "market_price": str(record.market_price),
                        "currency": record.currency,
                        "fetched_at": record.fetched_at.isoformat(),
                    }
                    for record in recent_history
                ],
            })

        return {
            "username": user.username,
            "collection_card_count": len(collection_items),
            "watchlist_card_count": len(watchlist_items),
            "cards": card_context,
        }
