import { useEffect, useState } from 'react'
import { getCollection } from '../services/collectionService'
import type { CollectionItem } from '../services/collectionService'

export default function Collection() {
  const [items, setItems] = useState<CollectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const data = await getCollection()
        setItems(data)
      } catch (err) {
        console.error(err)
        setError('Unable to load your collection.')
      } finally {
        setLoading(false)
      }
    }

    fetchCollection()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Collection</h2>
        <p className="mt-2 text-text-secondary">
          Manage your Pokémon card collection.
        </p>
      </div>

      {loading ? (
        <p>Loading your collection...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-text-secondary">Your collection is empty.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-surface p-4">
              <h3 className="font-semibold">{item.card_name}</h3>
              <p className="text-sm text-text-secondary">{item.card_set}</p>
              <p className="mt-3 text-sm">Card Number: {item.card_number}</p>
              <p className="text-sm">Quantity: {item.quantity}</p>
              <p className="text-sm">Condition: {item.condition}</p>
              <p className="text-sm">
                Purchase Price: {item.purchase_price
                  ? `RM ${item.purchase_price}`
                  : 'Not provided'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}