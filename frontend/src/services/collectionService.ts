import api from './api'

export interface CollectionItem {
  id: number
  card: number
  card_name: string
  card_set: string
  card_number: string
  card_image_url: string
  latest_market_price: number | null
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  purchase_price: string | null
  purchase_date: string | null
  notes: string
  created_at: string
  updated_at: string
}

export async function getCollection(): Promise<CollectionItem[]> {
  const response = await api.get('/collection/')

  return Array.isArray(response.data)
    ? response.data
    : response.data.results
}

export interface AddCollectionItemData {
  card: number
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  purchase_price?: string | null
  purchase_date?: string | null
  notes?: string
}

export async function addCollectionItem(data: AddCollectionItemData) {
  const response = await api.post('/collection/', data)
  return response.data
}