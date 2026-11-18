import api from './api'

export interface DashboardCard {
    id: number
    name: string
    set_name: string
    card_number: string
    image_url: string
    market_price: string
    quantity: number
    market_value: string
}

export interface DashboardSummary {
    collection_value_usd: string
    collection_value_myr: string | null
    total_cards: number
    watchlist_count: number
    tracked_sets: number
    top_cards: DashboardCard[]
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get('/collection/dashboard/')
    return response.data
}