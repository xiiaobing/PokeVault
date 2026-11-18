
import {
  CreditCard,
  Eye,
  Layers,
  TrendingUp,
} from 'lucide-react'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import StatCard from '../components/StatCard'

const portfolioData = [
  { month: 'Jan', value: 650 },
  { month: 'Feb', value: 720 },
  { month: 'Mar', value: 680 },
  { month: 'Apr', value: 850 },
  { month: 'May', value: 920 },
  { month: 'Jun', value: 1050 },
  { month: 'Jul', value: 1280 },
]

const popularCards = [
  {
    name: 'Charizard',
    set: 'Base Set',
    number: '4/102',
    price: '$350.00',
    image: 'https://images.pokemontcg.io/base1/4.png',
  },
  {
    name: 'Blastoise',
    set: 'Base Set',
    number: '2/102',
    price: '$125.50',
    image: 'https://images.pokemontcg.io/base1/2.png',
  },
  {
    name: 'Venusaur',
    set: 'Base Set',
    number: '15/102',
    price: '$95.00',
    image: 'https://images.pokemontcg.io/base1/15.png',
  },
  {
    name: 'Pikachu',
    set: 'Base Set',
    number: '58/102',
    price: '$42.80',
    image: 'https://images.pokemontcg.io/base1/58.png',
  },
]

export default function Dashboard() {
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

        <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover">
          + Add New Card
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Collection Value"
          value="$1,280.00"
          change="+12.8% from last month"
          icon={CreditCard}
        />

        <StatCard
          title="Total Cards"
          value="48"
          change="Cards in your collection"
          icon={Layers}
        />

        <StatCard
          title="Watchlist"
          value="8"
          change="Cards being monitored"
          icon={Eye}
        />

        <StatCard
          title="Tracked Sets"
          value="12"
          change="Sets you're collecting"
          icon={TrendingUp}
        />
      </section>

      {/* Portfolio chart */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-text-primary">
              Portfolio Overview
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Your collection value over time
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-green-400">
            <TrendingUp size={16} />
            +12.8%
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={portfolioData}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#29283d" strokeDasharray="3 3" />

              <XAxis
                dataKey="month"
                stroke="#a1a1aa"
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                stroke="#a1a1aa"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#131321',
                  border: '1px solid #29283d',
                  borderRadius: '12px',
                  color: '#f5f3ff',
                }}
                formatter={(value) => [`$${value}`, 'Collection Value']}
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
      </section>

      {/* Popular cards */}
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">
              Popular Cards
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Featured cards in your collection
            </p>
          </div>

          <button className="text-sm font-medium text-primary hover:text-primary-hover">
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {popularCards.map((card) => (
            <div
              key={card.name}
              className="rounded-xl border border-border bg-background p-3 transition hover:border-primary/50"
            >
              <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg bg-surface-light">
                <img
                  src={card.image}
                  alt={card.name}
                  className="h-full w-full object-contain"
                />
              </div>

              <h4 className="mt-3 font-semibold text-text-primary">
                {card.name}
              </h4>

              <p className="text-xs text-text-secondary">
                {card.set} · {card.number}
              </p>

              <p className="mt-2 font-semibold text-primary">
                {card.price}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
