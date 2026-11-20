import { useEffect, useState } from "react";

import { CreditCard, Eye, Layers, TrendingUp } from "lucide-react";

import StatCard from "../components/StatCard";
import AuthenticatedImage from "../components/AuthenticatedImage";
import {
  getDashboardSummary,
  type DashboardSummary
} from "../services/dashboardService";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import {
  getPortfolioHistory,
  type PortfolioSnapshot
} from "../services/portfolioService";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>(
    []
  );

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getDashboardSummary();
        setSummary(data);
        const history = await getPortfolioHistory();
        setPortfolioHistory(history);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        setError("Unable to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatCurrency = (value: string | null, currency: string) => {
    if (value === null) return "Unavailable";

    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-red-400">
          {error || "Dashboard data is unavailable."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">
            Welcome back, Trainer!
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Here's what's happening with your collection.
          </p>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Collection Value"
          value={formatCurrency(summary.collection_value_myr, "MYR")}
          change="Estimated market value"
          icon={CreditCard}
        />

        <StatCard
          title="Total Items"
          value={summary.total_cards.toLocaleString()}
          change="Items in your collection"
          icon={Layers}
        />

        <StatCard
          title="Watchlist"
          value={summary.watchlist_count.toLocaleString()}
          change="Items being monitored"
          icon={Eye}
        />

        <StatCard
          title="Tracked Sets"
          value={summary.tracked_sets.toLocaleString()}
          change="Sets you're collecting"
          icon={TrendingUp}
        />
      </section>

      {/* Portfolio chart */}

      {/* Portfolio chart */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-text-primary">
            Portfolio Overview
          </h3>

          <p className="mt-1 text-sm text-text-secondary">
            Your collection value over time
          </p>
        </div>

        {portfolioHistory.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-center">
            <p className="text-sm text-text-secondary">
              No portfolio history available yet.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={portfolioHistory.map((snapshot) => ({
                  date: snapshot.snapshot_date,
                  value: Number(snapshot.collection_value_myr ?? 0)
                }))}
              >
                <defs>
                  <linearGradient
                    id="portfolioGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#29283d" strokeDasharray="3 3" />

                <XAxis
                  dataKey="date"
                  stroke="#a1a1aa"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  width={80}
                  stroke="#a1a1aa"
                  tickLine={false}
                  axisLine={false}
                  tickCount={5}
                  domain={[0, "auto"]}
                  tickFormatter={(value) =>
                    `RM${Number(value).toLocaleString("en-MY")}`
                  }
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#131321",
                    border: "1px solid #29283d",
                    borderRadius: "12px",
                    color: "#f5f3ff"
                  }}
                  formatter={(value) => [
                    `RM ${Number(value).toFixed(2)}`,
                    "Collection Value"
                  ]}
                />

                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#a855f7"
                  strokeWidth={3}
                  fill="url(#portfolioGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Most valuable items */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-text-primary">
            Most Valuable Items
          </h3>

          <p className="mt-1 text-sm text-text-secondary">
            Your four most valuable items based on current market prices
          </p>
        </div>

        {summary.top_cards.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-text-secondary">
              No cards with available market prices found in your collection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {summary.top_cards.map((card) => (
              <div
                key={card.id}
                className="rounded-xl border border-border bg-background p-3 transition hover:border-primary/50"
              >
                <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-light">
                  <AuthenticatedImage
                    imageUrl={card.image_url}
                    alt={card.name}
                    className="h-full w-full object-contain"
                  />
                </div>

                <h4 className="mt-3 font-semibold text-text-primary">
                  {card.name}
                </h4>

                <p className="text-xs text-text-secondary">
                  {card.set_name} · {card.card_number}
                </p>

                <p className="mt-2 font-semibold text-primary">
                  {formatCurrency(card.market_value, "USD")}
                </p>

                <p className="mt-1 text-xs text-text-secondary">
                  Quantity: {card.quantity}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
