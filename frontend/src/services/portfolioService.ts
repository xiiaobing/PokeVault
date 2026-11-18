import api from './api'

export interface PortfolioSnapshot {
    snapshot_date: string
    collection_value_usd: string
    collection_value_myr: string | null
}

export async function getPortfolioHistory(): Promise<PortfolioSnapshot[]> {
    const response = await api.get('/collection/portfolio-history/')
    return response.data
}
