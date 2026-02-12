import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

export function useBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState(null)
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    let cancelled = false
    const fetch = async () => {
      setBalanceLoading(true)
      try {
        const lamports = await connection.getBalance(publicKey, 'confirmed')
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL)
      } catch {
        if (!cancelled) setBalance(null)
      } finally {
        if (!cancelled) setBalanceLoading(false)
      }
    }

    fetch()
    // refresh balance every 15s while connected
    const interval = setInterval(fetch, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [publicKey, connection])

  const refreshBalance = async () => {
    if (!publicKey) return
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      setBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      // silent
    }
  }

  return { balance, balanceLoading, refreshBalance }
}
