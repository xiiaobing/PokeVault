import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import {
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  Bookmark,
  Camera
} from "lucide-react";
import axios from "axios";
import AuthenticatedImage from "../components/AuthenticatedImage";

import { searchCards, scanCard } from "../services/cardService";
import { addCollectionItem } from "../services/collectionService";
import type { Card, CardPriceHistory } from "../types/card";
import { getExchangeRate } from "../services/exchangeRateService";
import { addToWatchlist, getWatchlist } from "../services/watchlistService";

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

function CardResult({
  card,
  usdToMyr,
  isWatchlisted,
  onWatchlistAdded
}: {
  card: Card;
  usdToMyr: number | null;
  isWatchlisted: boolean;
  onWatchlistAdded: (cardId: number) => void;
}) {
  const latestPrices = getLatestPrices(card.price_history).filter((price) => {
    const displayPrice = getDisplayPrice(price);
    return displayPrice.value !== null && Number(displayPrice.value) > 0;
  });

  const [showForm, setShowForm] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState<"NM" | "LP" | "MP" | "HP" | "DMG">(
    "NM"
  );
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savingWatchlist, setSavingWatchlist] = useState(false);
  const [watchlistMessage, setWatchlistMessage] = useState("");

  const handleAddToCollection = async () => {
    setSaving(true);
    setMessage("");

    try {
      await addCollectionItem({
        card: card.id,
        quantity,
        condition,
        purchase_price: purchasePrice || null,
        purchase_date: purchaseDate || null,
        notes
      });

      setMessage("Card added to your collection!");
      setShowForm(false);
      setQuantity(1);
      setCondition("NM");
      setPurchasePrice("");
      setPurchaseDate("");
      setNotes("");
    } catch (error) {
      console.error("Failed to add card:", error);
      setMessage("Unable to add card. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddToWatchlist = async () => {
    setSavingWatchlist(true);
    setWatchlistMessage("");

    try {
      await addToWatchlist(card.id);
      onWatchlistAdded(card.id);
      setWatchlistMessage("Card added to your watchlist!");
    } catch (error) {
      console.error("Failed to add card to watchlist:", error);
      setWatchlistMessage("Unable to add card. Please try again.");
    } finally {
      setSavingWatchlist(false);
    }
  };

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

      <div className="mt-3 space-y-2">
        <button
          onClick={() => {
            setShowForm(!showForm);
            setMessage("");
          }}
          className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ Add to Collection"}
        </button>

        <button
          onClick={handleAddToWatchlist}
          disabled={savingWatchlist || isWatchlisted}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text-primary transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bookmark size={16} />
          {savingWatchlist
            ? "Adding..."
            : isWatchlisted
              ? "Already in Watchlist"
              : "Add to Watchlist"}
        </button>

        {watchlistMessage && (
          <p className="text-xs text-text-secondary">{watchlistMessage}</p>
        )}
      </div>

      {message && <p className="mt-2 text-xs text-text-secondary">{message}</p>}

      {showForm && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleAddToCollection();
          }}
          className="mt-3 space-y-3 rounded-lg border border-border bg-background p-3"
        >
          <h4 className="text-sm font-semibold text-text-primary">
            Add Card Details
          </h4>

          <div>
            <label className="text-xs text-text-secondary">Quantity</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value)))
              }
              required
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary">Condition</label>
            <select
              value={condition}
              onChange={(event) =>
                setCondition(event.target.value as typeof condition)
              }
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            >
              <option value="NM">Near Mint</option>
              <option value="LP">Lightly Played</option>
              <option value="MP">Moderately Played</option>
              <option value="HP">Heavily Played</option>
              <option value="DMG">Damaged</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-secondary">
              Purchase Price (RM)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-text-secondary">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Save to Collection"}
          </button>
        </form>
      )}

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

                  {price.currency.toUpperCase() === "USD" &&
                    displayPrice.value !== null &&
                    usdToMyr !== null && (
                      <p className="mt-1 text-sm font-semibold text-green-600 dark:text-green-400">
                        ≈ RM{" "}
                        {(Number(displayPrice.value) * usdToMyr).toFixed(2)}
                      </p>
                    )}
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
  const [usdToMyr, setUsdToMyr] = useState<number | null>(null);
  const [exchangeRateDate, setExchangeRateDate] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [watchlistedCardIds, setWatchlistedCardIds] = useState<Set<number>>(
    new Set()
  );
  const [showScanOptions, setShowScanOptions] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const data = await getExchangeRate();

        setUsdToMyr(Number(data.rate));
        setExchangeRateDate(data.date);
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
      }
    };
    const fetchWatchlist = async () => {
      try {
        const data = await getWatchlist();

        setWatchlistedCardIds(new Set(data.map((item) => item.card)));
      } catch (error) {
        console.error("Failed to fetch watchlist:", error);
      }
    };
    fetchExchangeRate();
    fetchWatchlist();
  }, []);

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
      setScanning(false);
    }
  }

  async function handleScan(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must not exceed 10 MB.");
      return;
    }

    try {
      setLoading(true);
      setScanning(true);
      setError("");
      setCards([]);
      setTotalCount(0);

      const result = await scanCard(file);

      if (!result.matched || !result.card) {
        setError(result.message || "Unable to identify this Pokémon card.");
        return;
      }

      // Display the recognized card using the existing CardResult.
      setCards([result.card]);
      setTotalCount(1);
      setQuery(result.recognition?.name || result.card.name);
    } catch (err) {
      console.error("Card scanning failed:", err);

      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || err.response?.data?.detail;

        setError(message || "Unable to scan the card. Please try again.");
      } else {
        setError("An unexpected error occurred while scanning.");
      }
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  const handleWatchlistAdded = (cardId: number) => {
    setWatchlistedCardIds((previous) => {
      const updated = new Set(previous);
      updated.add(cardId);
      return updated;
    });
  };

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
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowScanOptions(!showScanOptions)}
                title="Scan a Pokémon card"
                className="flex h-full items-center justify-center rounded-xl border border-border px-4 text-text-primary transition hover:border-primary hover:text-primary"
              >
                <Camera size={20} />
              </button>

              {showScanOptions && (
                <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-border bg-surface p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScanOptions(false);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary transition hover:bg-background"
                  >
                    <Camera size={16} className="mr-2 inline" />
                    Take a photo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowScanOptions(false);
                      uploadInputRef.current?.click();
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-primary transition hover:bg-background"
                  >
                    <Search size={16} className="mr-2 inline" />
                    Upload a photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleScan(file);
            }

            event.target.value = "";
          }}
        />

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleScan(file);
            }

            event.target.value = "";
          }}
        />
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
            {scanning
              ? "Recognizing your Pokémon card..."
              : "Searching for Pokémon cards..."}
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
              <CardResult
                key={card.id}
                card={card}
                usdToMyr={usdToMyr}
                isWatchlisted={watchlistedCardIds.has(card.id)}
                onWatchlistAdded={handleWatchlistAdded}
              />
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
