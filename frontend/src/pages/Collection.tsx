import { useEffect, useState } from "react";
import { getCollection } from "../services/collectionService";
import { getExchangeRate } from "../services/exchangeRateService";
import type { CollectionItem } from "../services/collectionService";
import AuthenticatedImage from "../components/AuthenticatedImage";

function formatRM(value: number) {
  return `RM ${value.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatUSD(value: number) {
  return `US$ ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function Collection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usdToMyr, setUsdToMyr] = useState<number>(0);
  const [exchangeRateDate, setExchangeRateDate] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const data = await getCollection();
        setItems(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load your collection.");
      } finally {
        setLoading(false);
      }
    };

    const fetchExchangeRate = async () => {
      try {
        const data = await getExchangeRate();
        setUsdToMyr(Number(data.rate));
        setExchangeRateDate(data.date);
      } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
      }
    };

    fetchCollection();
    fetchExchangeRate();
  }, []);

  const totalCards = items.reduce((total, item) => total + item.quantity, 0);

  const totalMarketValueUSD = items.reduce(
    (total, item) =>
      total + (Number(item.latest_market_price) || 0) * item.quantity,
    0
  );

  const totalMarketValueRM =
    usdToMyr !== null ? totalMarketValueUSD * usdToMyr : null;

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
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h2 className="text-2xl font-bold">My Collection</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage and track the value of your Pokémon cards.
        </p>
      </div>
      {usdToMyr > 0 && (
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              1 USD = RM {usdToMyr.toFixed(4)}
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-text-secondary">Loading your collection...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          {/* Collection statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Market Value</p>

              <h3 className="mt-2 text-2xl font-bold text-emerald-500">
                {totalMarketValueRM !== null
                  ? formatRM(totalMarketValueRM)
                  : "Loading exchange rate..."}
              </h3>

              <p className="mt-1 text-xs text-text-secondary">
                {formatUSD(totalMarketValueUSD)} · Based on TCGplayer prices
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-sm text-text-secondary">Total Cards</p>

              <h3 className="mt-2 text-2xl font-bold">{totalCards}</h3>

              <p className="mt-1 text-xs text-text-secondary">
                {items.length} unique card{items.length !== 1 ? "s" : ""} in
                your collection
              </p>
            </div>
          </div>

          {/* Collection cards */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Your Cards</h3>
                <span className="text-sm text-text-secondary">
                  {items.length} items
                </span>
              </div>

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
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface p-8 text-center">
                <p className="text-text-secondary">Your collection is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {sortedItems.map((item) => {
                  const marketPrice = Number(item.latest_market_price) || 0;

                  const marketPriceRM =
                    usdToMyr !== null ? marketPrice * usdToMyr : null;

                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                    >
                      {/* Card image */}
                      <div className="bg-background p-2">
                        <AuthenticatedImage
                          imageUrl={item.card_image_url}
                          alt={item.card_name}
                          className="h-40 w-full rounded-lg object-contain sm:h-48"
                        />
                      </div>

                      {/* Card information */}
                      <div className="space-y-2 p-3">
                        <div>
                          <h4 className="line-clamp-2 text-sm font-semibold">
                            {item.card_name}
                          </h4>

                          <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                            {item.card_set}
                          </p>

                          <p className="text-xs text-text-secondary">
                            {item.card_number}
                          </p>
                        </div>

                        {/* Market price */}
                        <div className="border-t border-border pt-2">
                          <p className="text-[11px] text-text-secondary">
                            Market Price
                          </p>

                          {item.latest_market_price !== null ? (
                            <>
                              <p className="text-base font-bold text-emerald-500">
                                {marketPriceRM !== null
                                  ? formatRM(marketPriceRM)
                                  : "Exchange rate unavailable"}
                              </p>

                              <p className="text-[10px] text-text-secondary">
                                {formatUSD(marketPrice)}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-text-secondary">
                              Price unavailable
                            </p>
                          )}
                        </div>

                        {/* Quantity and condition */}
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="rounded-md bg-background px-2 py-1">
                            Qty: {item.quantity}
                          </span>

                          <span className="rounded-md bg-background px-2 py-1">
                            {item.condition}
                          </span>
                        </div>

                        {/* Purchase price */}
                        <div className="text-xs text-text-secondary">
                          Purchase:{" "}
                          {item.purchase_price
                            ? formatRM(Number(item.purchase_price))
                            : "Not provided"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
