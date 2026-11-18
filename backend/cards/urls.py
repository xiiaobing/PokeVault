from django.urls import path

from .views import (
    search_cards_api,
    card_price_history_api,
    card_detail_api,
    card_image_api,
    CardListAPIView,
)

urlpatterns = [
    path("", CardListAPIView.as_view(), name="card-list"),
    path("search/", search_cards_api, name="card-search"),
    path("<int:card_id>/", card_detail_api, name="card-detail"),
    path(
        "<int:card_id>/prices/",
        card_price_history_api,
        name="card-price-history",
    ),
    path(
        "<int:card_id>/image/",
        card_image_api,
        name="card-image",
    ),
]
