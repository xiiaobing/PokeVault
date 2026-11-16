
from decimal import Decimal
from unittest.mock import patch

import requests

from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Card, CardPriceHistory


class CardDetailAPITest(APITestCase):

    def setUp(self):
        # Create a test card
        self.card = Card.objects.create(
            pokewallet_id="test_pokewallet_001",
            name="Charizard ex",
            set_name="Scarlet & Violet 151",
            set_id="23237",
            set_code="MEW",
            card_number="199/165",
            rarity="Special Illustration Rare",
        )

        # Create a test price record
        CardPriceHistory.objects.create(
            card=self.card,
            provider="tcgplayer",
            variant="Normal",
            currency="USD",
            market_price=Decimal("150.00"),
        )

    def test_get_existing_card(self):
        url = reverse(
            "card-detail",
            kwargs={"card_id": self.card.id}
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Charizard ex")
        self.assertEqual(response.data["card_number"], "199/165")

    def test_card_detail_includes_price_history(self):
        url = reverse(
            "card-detail",
            kwargs={"card_id": self.card.id}
        )

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["price_history"]), 1)
        self.assertEqual(
            response.data["price_history"][0]["provider"],
            "tcgplayer"
        )

    def test_get_nonexistent_card(self):
        url = reverse(
            "card-detail",
            kwargs={"card_id": 999999}
        )

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND
        )


class CardSearchAPITest(APITestCase):

    def test_search_without_query(self):
        url = reverse("card-search")

        response = self.client.get(url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST
        )

    @patch("cards.views.save_card_results")
    @patch("cards.views.search_cards")
    def test_successful_card_search(
        self,
        mock_search_cards,
        mock_save_card_results
    ):
        card = Card.objects.create(
            pokewallet_id="test_pokewallet_002",
            name="Pikachu",
            set_name="Test Set",
            card_number="001/100",
        )

        mock_search_cards.return_value = {
            "results": [{"id": "test_pokewallet_002"}]
        }
        mock_save_card_results.return_value = [card]

        url = reverse("card-search")
        response = self.client.get(url, {"q": "001/100"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Pikachu")

        mock_search_cards.assert_called_once_with("001/100")
        mock_save_card_results.assert_called_once()

    @patch("cards.views.logger.exception")
    @patch("cards.views.search_cards")
    def test_pokewallet_connection_failure(
        self,
        mock_search_cards,
        mock_logger
    ):
        mock_search_cards.side_effect = requests.Timeout

        url = reverse("card-search")
        response = self.client.get(url, {"q": "001/100"})

        self.assertEqual(
            response.status_code,
            status.HTTP_502_BAD_GATEWAY
        )

        mock_logger.assert_called_once()


class CardListAPITest(APITestCase):

    def setUp(self):
        self.charizard = Card.objects.create(
            pokewallet_id="test_charizard_001",
            name="Charizard ex",
            set_name="Scarlet & Violet 151",
            card_number="199/165",
            rarity="Special Illustration Rare",
        )

        self.pikachu = Card.objects.create(
            pokewallet_id="test_pikachu_001",
            name="Pikachu",
            set_name="Ascended Heroes",
            card_number="001/217",
            rarity="Uncommon",
        )

        self.mew = Card.objects.create(
            pokewallet_id="test_mew_001",
            name="Mew ex",
            set_name="Scarlet & Violet 151",
            card_number="205/165",
            rarity="Special Illustration Rare",
        )

    def test_list_all_cards(self):
        url = reverse("card-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)

    def test_filter_by_card_name(self):
        url = reverse("card-list")
        response = self.client.get(url, {"name": "charizard"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["name"],
            "Charizard ex"
        )

    def test_filter_by_set_name(self):
        url = reverse("card-list")
        response = self.client.get(
            url,
            {"set_name": "Scarlet & Violet 151"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_rarity(self):
        url = reverse("card-list")
        response = self.client.get(
            url,
            {"rarity": "Uncommon"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_sort_by_name_descending(self):
        url = reverse("card-list")
        response = self.client.get(url, {"ordering": "-name"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        names = [
            card["name"]
            for card in response.data["results"]
        ]

        self.assertEqual(
            names,
            ["Pikachu", "Mew ex", "Charizard ex"]
        )
