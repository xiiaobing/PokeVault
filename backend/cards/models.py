from django.db import models


class Card(models.Model):
    pokewallet_id = models.CharField(
        max_length=150,
        unique=True
    )

    name = models.CharField(max_length=255)
    set_name = models.CharField(max_length=255)
    set_id = models.CharField(max_length=50, blank=True)
    set_code = models.CharField(max_length=50, blank=True)
    card_number = models.CharField(max_length=50)
    rarity = models.CharField(max_length=100, blank=True)
    # Original image URL from PokéWallet
    image_url = models.URLField(max_length=500, blank=True)
    # Locally stored card image
    image = models.ImageField(
        upload_to="cards/",
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.set_name} ({self.card_number})"


class CardPriceHistory(models.Model):
    PROVIDER_CHOICES = [
        ("tcgplayer", "TCGplayer"),
        ("cardmarket", "Cardmarket"),
    ]

    card = models.ForeignKey(
        Card,
        on_delete=models.CASCADE,
        related_name="price_history"
    )

    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES
    )
    variant = models.CharField(max_length=50, blank=True)
    currency = models.CharField(max_length=3)

    # General price fields
    low_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    mid_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    high_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    market_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    direct_low_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    # Cardmarket-specific price fields
    average_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    avg_1 = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    avg_7 = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    avg_30 = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )
    trend_price = models.DecimalField(
        max_digits=12, decimal_places=4, null=True, blank=True
    )

    source_updated_at = models.DateTimeField(null=True, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fetched_at"]
        indexes = [
            models.Index(
                fields=["card", "provider", "variant"]
            )
        ]

    def __str__(self):
        return f"{self.card.name} - {self.provider} - {self.variant}"


class CardSearchCache(models.Model):
    query = models.CharField(
        max_length=100,
        unique=True
    )

    cards = models.ManyToManyField(
        Card,
        related_name="search_caches",
        blank=True
    )

    fetched_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.query
