'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DeleteButton({ playerId }: { playerId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Spieler entfernen?')) return
    setLoading(true)
    await fetch(`/api/players/${playerId}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-[10px] text-gray-700 hover:text-rose-500 transition-colors px-1"
      title="Spieler entfernen"
    >
      ✕
    </button>
  )
}
