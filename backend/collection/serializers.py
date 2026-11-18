
from rest_framework import serializers
from .models import CollectionItem
from django.contrib.auth.models import User


class CollectionItemSerializer(serializers.ModelSerializer):
    card_name = serializers.CharField(
        source="card.name",
        read_only=True
    )
    card_set = serializers.CharField(
        source="card.set_name",
        read_only=True
    )
    card_number = serializers.CharField(
        source="card.card_number",
        read_only=True
    )

    card_image_url = serializers.SerializerMethodField()
    latest_market_price = serializers.SerializerMethodField()

    class Meta:
        model = CollectionItem
        fields = [
            "id",
            "card",
            "card_name",
            "card_set",
            "card_number",
            "card_image_url",
            "latest_market_price",
            "quantity",
            "condition",
            "purchase_price",
            "purchase_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]

    def get_card_image_url(self, obj):
        return f"/cards/{obj.card_id}/image/"

    def get_latest_market_price(self, obj):
        latest_price = (
            obj.card.price_history
            .filter(provider="tcgplayer")
            .order_by("-fetched_at")
            .first()
        )

        if latest_price:
            return latest_price.market_price

        return None

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user
