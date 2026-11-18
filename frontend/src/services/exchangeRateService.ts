import api from './api'

export interface ExchangeRate {
  base: string
  quote: string
  rate: string
  date: string
  fetched_at: string
}

export async function getExchangeRate(): Promise<ExchangeRate> {
  const response = await api.get('/collection/exchange-rate/')
  return response.data
}
