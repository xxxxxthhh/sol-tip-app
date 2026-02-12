import { useState, useEffect } from 'react'

export function useSOLPrice(intervalMs = 30000) {
  const [solPrice, setSolPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(true)
  const [priceError, setPriceError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) {
          setSolPrice(data.solana.usd)
          setPriceError(false)
        }
      } catch {
        if (!cancelled) setPriceError(true)
      } finally {
        if (!cancelled) setPriceLoading(false)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, intervalMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intervalMs])

  return { solPrice, priceLoading, priceError }
}
