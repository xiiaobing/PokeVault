import api from './api'

export interface WatchlistItem {
    id: number
    card: number
    card_name: string
    card_set: string
    card_number: string
    card_image_url: string
    latest_market_price: number | null
    created_at: string
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
    const response = await api.get('/collection/watchlist/')

    return Array.isArray(response.data)
        ? response.data
        : response.data.results
}

export async function addToWatchlist(cardId: number) {
    const response = await api.post('/collection/watchlist/', {
        card: cardId
    })

    return response.data
}

export async function removeFromWatchlist(id: number) {
    await api.delete(`/collection/watchlist/${id}/`)
}