from django.core.management.base import BaseCommand
from collection.services import get_usd_to_myr_rate


class Command(BaseCommand):
    help = "Update the daily USD to MYR exchange rate"

    def handle(self, *args, **options):
        exchange_rate = get_usd_to_myr_rate()

        self.stdout.write(
            self.style.SUCCESS(
                f"USD to MYR: {exchange_rate.rate} "
                f"(Date: {exchange_rate.rate_date})"
            )
        )