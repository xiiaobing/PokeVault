
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone

from cards.models import Card
from cards.services import refresh_card_price
from collection.models import PortfolioSnapshot
from collection.services import create_daily_portfolio_snapshot


class Command(BaseCommand):
    help = "Refresh card prices and create daily portfolio snapshots"

    def handle(self, *args, **options):
        today = timezone.localdate()
        users = list(User.objects.all())

        if not users:
            self.stdout.write("No users found. Skipping.")
            return

        existing_snapshot_user_ids = set(
            PortfolioSnapshot.objects.filter(
                snapshot_date=today
            ).values_list("user_id", flat=True)
        )

        users_to_snapshot = [
            user for user in users
            if user.id not in existing_snapshot_user_ids
        ]

        if not users_to_snapshot:
            self.stdout.write(
                self.style.SUCCESS(
                    "Today's snapshots already exist. Skipping price refresh."
                )
            )
            return

        self.stdout.write("Refreshing prices for collection and watchlist cards...")

        cards = Card.objects.filter(
            Q(collection_items__isnull=False) |
            Q(watchlist_items__isnull=False)
        ).distinct()

        refreshed_count = 0
        failed_count = 0

        for card in cards.iterator():
            if refresh_card_price(card):
                refreshed_count += 1
                self.stdout.write(f"Updated: {card.name}")
            else:
                failed_count += 1
                self.stdout.write(
                    self.style.WARNING(f"Failed: {card.name}")
                )

        self.stdout.write(
            f"Price refresh complete: {refreshed_count} successful, "
            f"{failed_count} failed."
        )

        self.stdout.write("Creating daily portfolio snapshots...")

        for user in users_to_snapshot:
            snapshot = create_daily_portfolio_snapshot(user)

            self.stdout.write(
                self.style.SUCCESS(
                    f"{user.username}: USD {snapshot.collection_value_usd} "
                    f"(Date: {snapshot.snapshot_date})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS("Daily portfolio snapshots updated successfully.")
        )
