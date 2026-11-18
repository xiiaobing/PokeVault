
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token

from .models import CollectionItem
from .serializers import CollectionItemSerializer, RegisterSerializer
from django.contrib.auth import authenticate

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
