
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CollectionItemViewSet,
    RegisterView,
    LoginView,
    exchange_rate_api,
    WatchlistItemViewSet,
    DashboardSummaryView,
    PortfolioHistoryView,
)

router = DefaultRouter()
router.register(r'watchlist', WatchlistItemViewSet, basename='watchlist')
router.register(r'', CollectionItemViewSet, basename='collection')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path("exchange-rate/", exchange_rate_api, name="exchange-rate"),
    path("dashboard/", DashboardSummaryView.as_view(), name="dashboard"),
    path("portfolio-history/", PortfolioHistoryView.as_view(), name="portfolio-history"),
]

urlpatterns += router.urls
