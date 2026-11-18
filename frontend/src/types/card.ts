
export interface CardPriceHistory {
  provider: string
  variant: string
  currency: string

  low_price: string | null
  mid_price: string | null
  high_price: string | null
  market_price: string | null

  average_price: string | null
  avg_1: string | null
  avg_7: string | null
  avg_30: string | null
  trend_price: string | null

  source_updated_at: string
  fetched_at: string
}

export interface Card {
  id: number
  pokewallet_id: string
  name: string
  set_name: string
  set_id: string
  set_code: string
  card_number: string
  rarity: string
  image_url: string
  price_history: CardPriceHistory[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}
