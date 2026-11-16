from django.contrib import admin
from .models import Card, CardPriceHistory

admin.site.register(Card)
admin.site.register(CardPriceHistory)