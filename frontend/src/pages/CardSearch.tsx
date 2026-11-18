import { useState } from "react";
import type { FormEvent } from "react";
import { Search, Loader2, AlertCircle, Sparkles } from "lucide-react";
import axios from "axios";
import AuthenticatedImage from "../components/AuthenticatedImage";

import { searchCards } from "../services/cardService";

import type { Card, CardPriceHistory } from "../types/card";

function getLatestPrices(priceHistory: CardPriceHistory[]): CardPriceHistory[] {
  const latestPrices = new Map<string, CardPriceHistory>();

  for (const price of priceHistory) {
    const key = `${price.provider}-${price.variant}`;
    const existing = latestPrices.get(key);

    if (
      !existing ||
      new Date(price.fetched_at).getTime() >
        new Date(existing.fetched_at).getTime()
    ) {
      latestPrices.set(key, price);
    }
  }

  return Array.from(latestPrices.values());
}

function getDisplayPrice(price: CardPriceHistory) {
  if (price.provider === "tcgplayer") {
    return {
      label: "Market Price",
      value: price.market_price ?? price.mid_price ?? price.low_price
    };
  }

  return {
    label: "Trend Price",
    value: price.trend_price ?? price.average_price ?? price.low_price
  };
}

function formatPrice(value: string | null, currency: string) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(Number(value));
}

function CardResult({ card }: { card: Card }) {
  const latestPrices = getLatestPrices(card.price_history).filter((price) => {
    const displayPrice = getDisplayPrice(price);
    return displayPrice.value !== null && Number(displayPrice.value) > 0;
  });

  return (
    <article className="rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50">
      <div className="flex gap-3">
        <AuthenticatedImage
          imageUrl={`/cards/${card.id}/image/`}
          alt={card.name}
          className="h-32 w-24 shrink-0 rounded-lg object-contain bg-background"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-text-primary">
              {card.name}
            </h3>

            <span className="rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
              {card.rarity}
            </span>
          </div>

          <p className="mt-2 text-xs text-text-secondary">{card.set_name}</p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-text-secondary">
            <span className="rounded-lg bg-background px-2 py-1">
              No. {card.card_number}
            </span>

            <span className="rounded-lg bg-background px-2 py-1">
              {card.set_code}
            </span>
          </div>

          <p className="mt-2 text-xs text-text-secondary">
            {latestPrices.length} price records
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <h4 className="mb-2 text-sm font-semibold text-text-primary">
          Latest Market Prices
        </h4>

        {latestPrices.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {latestPrices.map((price) => {
              const displayPrice = getDisplayPrice(price);

              return (
                <div
                  key={`${price.provider}-${price.variant}`}
                  className="min-w-0 rounded-lg border border-border bg-background p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium capitalize text-text-primary">
                      {price.provider}
                    </span>

                    <span className="text-xs text-text-secondary">
                      {price.variant}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-text-secondary">
                    {displayPrice.label}
                  </p>

                  <p className="text-base font-bold text-primary">
                    {formatPrice(displayPrice.value, price.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-secondary">
            No price information available.
          </p>
        )}
      </div>
    </article>
  );
}

export default function CardSearch() {
  const [query, setQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) {
      setError("Please enter a card name or card identifier.");
      setCards([]);
      setTotalCount(0);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setCards([]);
      setTotalCount(0);

      const data = await searchCards(searchQuery);

      setCards(data.results);
      setTotalCount(data.count);
    } catch (err) {
      console.error("Card search failed:", err);

      if (axios.isAxiosError(err)) {
        if (err.response) {
          setError(`Search failed (${err.response.status}). Please try again.`);
        } else if (err.code === "ECONNABORTED") {
          setError("The request timed out. Please try again.");
        } else {
          setError(
            "Unable to connect to the server. Please check that Django is running."
          );
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Page heading */}
      <section>
        <div className="flex items-center gap-2">
          <Sparkles size={22} className="text-primary" />

          <h2 className="text-2xl font-bold text-text-primary">
            Pokémon Card Search
          </h2>
        </div>

        <p className="mt-2 text-sm text-text-secondary">
          Search for Pokémon cards and compare prices across different
          marketplaces.
        </p>
      </section>

      {/* Search form */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <form onSubmit={handleSearch}>
          <label
            htmlFor="card-search"
            className="mb-3 block text-sm font-medium text-text-primary"
          >
            Search by card name, set number or card number
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
              />

              <input
                id="card-search"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Charizard or 24541 199"
                className="w-full rounded-xl border border-border bg-background py-3.5 pl-12 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-secondary focus:border-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Search Cards
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-text-secondary">
            Searching for Pokémon cards...
          </p>
        </div>
      )}

      {/* Search results */}
      {!loading && cards.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-primary">
              Search Results
            </h3>

            <span className="text-sm text-text-secondary">
              {totalCount} card{totalCount !== 1 ? "s" : ""} found
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((card) => (
              <CardResult key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && cards.length === 0 && query.trim() === "" && (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Search size={36} className="mx-auto text-text-secondary" />

          <h3 className="mt-4 font-semibold text-text-primary">
            Find your favourite Pokémon cards
          </h3>

          <p className="mt-2 text-sm text-text-secondary">
            Enter a card name or identifier to get started.
          </p>
        </div>
      )}

      {!loading && !error && query.trim() !== "" && cards.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="font-semibold text-text-primary">No cards found</p>

          <p className="mt-2 text-sm text-text-secondary">
            Try searching with a different name or card identifier.
          </p>
        </div>
      )}
    </div>
  );
}
