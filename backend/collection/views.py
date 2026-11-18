
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes


import requests
from .models import CollectionItem, ExchangeRate, WatchlistItem
from .serializers import CollectionItemSerializer, RegisterSerializer, WatchlistItemSerializer
from django.contrib.auth import authenticate
from django.core.cache import cache

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
