import { useState, useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'

export function useRecipientValidation() {
  const [recipient, setRecipient] = useState('')

  const recipientValid = useMemo(() => {
    if (!recipient.trim()) return null // no input yet
    try {
      new PublicKey(recipient.trim())
      return true
    } catch {
      return false
    }
  }, [recipient])

  return { recipient, setRecipient, recipientValid }
}
