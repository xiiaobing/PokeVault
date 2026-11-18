
from rest_framework import serializers
from .models import Card, CardPriceHistory


class CardPriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CardPriceHistory
        fields = [
            "provider",
            "variant",
            "currency",
            "low_price",
            "mid_price",
            "high_price",
            "market_price",
            "average_price",
            "avg_1",
            "avg_7",
            "avg_30",
            "trend_price",
            "source_updated_at",
            "fetched_at",
        ]


class CardSerializer(serializers.ModelSerializer):
    price_history = CardPriceHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Card
        fields = [
            "id",
            "pokewallet_id",
            "name",
            "set_name",
            "set_id",
            "set_code",
            "card_number",
            "rarity",
            "image_url",
            "price_history",
        ]
