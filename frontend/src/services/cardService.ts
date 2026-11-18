import api from './api'

import type { Card, PaginatedResponse } from '../types/card'

export async function searchCards(
  query: string
): Promise<PaginatedResponse<Card>> {
  const response = await api.get<PaginatedResponse<Card>>(
    '/cards/search/',
    {
      params: {
        q: query,
      },
    }
  )

  return response.data
}
