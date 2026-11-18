
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CollectionItemViewSet, RegisterView, LoginView, exchange_rate_api

router = DefaultRouter()
router.register(r'', CollectionItemViewSet, basename='collection')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path("exchange-rate/", exchange_rate_api, name="exchange-rate"),
]

urlpatterns += router.urls
