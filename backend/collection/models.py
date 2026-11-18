
from django.db import models
from django.contrib.auth.models import User
from cards.models import Card


class CollectionItem(models.Model):
    CONDITION_CHOICES = [
        ("NM", "Near Mint"),
        ("LP", "Lightly Played"),
        ("MP", "Moderately Played"),
        ("HP", "Heavily Played"),
        ("DMG", "Damaged"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="collection_items"
    )

    card = models.ForeignKey(
        Card,
        on_delete=models.CASCADE,
        related_name="collection_items"
    )

    quantity = models.PositiveIntegerField(default=1)

    condition = models.CharField(
        max_length=3,
        choices=CONDITION_CHOICES,
        default="NM"
    )

    purchase_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    purchase_date = models.DateField(
        null=True,
        blank=True
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "card", "condition")

    def __str__(self):
        return f"{self.user.username} - {self.card.name} x{self.quantity}"

class ExchangeRate(models.Model):
    base_currency = models.CharField(max_length=3)
    target_currency = models.CharField(max_length=3)

    rate = models.DecimalField(
        max_digits=12,
        decimal_places=6
    )

    rate_date = models.DateField()
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("base_currency", "target_currency", "rate_date")
        ordering = ["-rate_date"]

    def __str__(self):
        return (
            f"1 {self.base_currency} = {self.rate} "
            f"{self.target_currency} ({self.rate_date})"
        )