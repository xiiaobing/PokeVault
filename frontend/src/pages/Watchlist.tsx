import { useEffect, useState } from "react";
import { Bookmark, Trash2, Loader2, RefreshCw } from "lucide-react";

import AuthenticatedImage from "../components/AuthenticatedImage";
import {
  getWatchlist,
  removeFromWatchlist
} from "../services/watchlistService";
import type { WatchlistItem } from "../services/watchlistService";
import { getExchangeRate } from "../services/exchangeRateService";

export default function Watchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [usdToMyr, setUsdToMyr] = useState<number | null>(null);
  const [exchangeRateDate, setExchangeRateDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getWatchlist();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
      setError("Unable to load your watchlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();

    const fetchRate = async () => {
      try {
        const data = await getExchangeRate();
        setUsdToMyr(Number(data.rate));
        setExchangeRateDate(data.date);
      } catch (err) {
        console.error("Failed to fetch exchange rate:", err);
      }
    };

    fetchRate();
  }, []);

  const handleRemove = async (id: number) => {
    try {
      setRemovingId(id);

      await removeFromWatchlist(id);

      setItems((previous) => previous.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to remove watchlist item:", err);
      setError("Unable to remove card. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const totalValueUSD = items.reduce(
    (total, item) => total + Number(item.latest_market_price ?? 0),
    0
  );

  const totalValueMYR = usdToMyr !== null ? totalValueUSD * usdToMyr : null;

  const formatUSD = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(value);

  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return a.card_name.localeCompare(b.card_name);

      case "name_desc":
        return b.card_name.localeCompare(a.card_name);

      case "price_asc": {
        const priceA = a.latest_market_price;
        const priceB = b.latest_market_price;

        if (priceA === null) return 1;
        if (priceB === null) return -1;

        return Number(priceA) - Number(priceB);
      }

      case "price_desc": {
        const priceA = a.latest_market_price;
        const priceB = b.latest_market_price;

        if (priceA === null) return 1;
        if (priceB === null) return -1;

        return Number(priceB) - Number(priceA);
      }

      default:
        return 0;
    }
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <div className="flex items-center gap-2">
          <Bookmark size={24} className="text-primary" />

          <h2 className="text-2xl font-bold text-text-primary">Watchlist</h2>
        </div>

        <p className="mt-2 text-sm text-text-secondary">
          Monitor your favourite cards and track their market prices.
        </p>

        {usdToMyr !== null && (
          <p className="mt-2 text-xs text-text-secondary">
            Today's USD/MYR rate:{" "}
            <span className="font-semibold text-text-primary">
              1 USD = RM {usdToMyr.toFixed(4)}
            </span>
            {exchangeRateDate && ` · ${exchangeRateDate}`}
          </p>
        )}
      </section>

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-[11px] leading-tight text-text-secondary sm:text-sm">
            Watched Cards
          </p>
          <p className="mt-1 truncate text-base font-bold text-text-primary sm:mt-2 sm:text-2xl">
            {items.length}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-[11px] leading-tight text-text-secondary sm:text-sm">
            <span className="sm:hidden">Value (USD)</span>
            <span className="hidden sm:inline">Total Market Value (USD)</span>
          </p>
          <p className="mt-1 truncate text-base font-bold text-text-primary sm:mt-2 sm:text-2xl">
            {formatUSD(totalValueUSD)}
          </p>
        </div>

        <div className="min-w-0 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <p className="text-[11px] leading-tight text-text-secondary sm:text-sm">
            <span className="sm:hidden">Value (MYR)</span>
            <span className="hidden sm:inline">Total Market Value (MYR)</span>
          </p>
          <p className="mt-1 truncate text-base font-bold text-primary sm:mt-2 sm:text-2xl">
            {totalValueMYR !== null
              ? `RM ${totalValueMYR.toFixed(2)}`
              : "Loading..."}
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-primary">
          Your Saved Cards
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
          >
            <option value="name_asc">Name: A–Z</option>
            <option value="name_desc">Name: Z–A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          <button
            onClick={fetchWatchlist}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-primary transition hover:border-primary disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-text-secondary">
            Loading your watchlist...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Bookmark size={36} className="mx-auto text-text-secondary" />

          <h3 className="mt-4 font-semibold text-text-primary">
            Your watchlist is empty
          </h3>

          <p className="mt-2 text-sm text-text-secondary">
            Search for Pokémon cards and add them to your watchlist.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((item) => {
            const price = Number(item.latest_market_price ?? 0);

            return (
              <article
                key={item.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex gap-3">
                  <AuthenticatedImage
                    imageUrl={`/cards/${item.card}/image/`}
                    alt={item.card_name}
                    className="h-32 w-24 shrink-0 rounded-lg bg-background object-contain"
                  />

                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-text-primary">
                      {item.card_name}
                    </h4>

                    <p className="mt-2 text-xs text-text-secondary">
                      {item.card_set}
                    </p>

                    <p className="mt-1 text-xs text-text-secondary">
                      No. {item.card_number}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-background p-3">
                  <p className="text-xs text-text-secondary">
                    Latest Market Price (USD)
                  </p>

                  <p className="mt-1 text-lg font-bold text-text-primary">
                    {item.latest_market_price !== null
                      ? formatUSD(price)
                      : "N/A"}
                  </p>

                  {item.latest_market_price !== null && usdToMyr !== null && (
                    <p className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                      ≈ RM {(price * usdToMyr).toFixed(2)}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleRemove(item.id)}
                  disabled={removingId === item.id}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {removingId === item.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  Remove from Watchlist
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
