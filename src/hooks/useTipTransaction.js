import { useState, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'

export function useTipTransaction({ onSuccess } = {}) {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [status, setStatus] = useState(null)

  const send = useCallback(async ({ recipient, solAmount, usdAmount }) => {
    if (!publicKey || !solAmount || solAmount <= 0) return

    let recipientKey
    try {
      recipientKey = new PublicKey(recipient.trim())
    } catch {
      setStatus({ type: 'error', msg: 'Invalid recipient address' })
      return
    }

    // Pre-check balance
    try {
      const balance = await connection.getBalance(publicKey, 'confirmed')
      const lamportsNeeded = Math.round(solAmount * LAMPORTS_PER_SOL)
      // rough fee estimate: 5000 lamports
      if (balance < lamportsNeeded + 5000) {
        setStatus({ type: 'error', msg: `Insufficient balance. You have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL` })
        return
      }
    } catch {
      // if balance check fails, proceed anyway
    }

    try {
      setStatus({ type: 'loading', msg: 'Sending transaction...' })

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientKey,
          lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
        })
      )

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.feePayer = publicKey
      tx.recentBlockhash = blockhash

      const sig = await sendTransaction(tx, connection, {
        skipPreflight: true,
        maxRetries: 3,
      })

      setStatus({ type: 'loading', msg: 'Confirming...' })

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        'confirmed'
      )

      setStatus({
        type: 'success',
        msg: `Sent $${usdAmount} (${solAmount.toFixed(4)} SOL)`,
        sig,
      })

      onSuccess?.()
    } catch (err) {
      const msg = err.message || 'Transaction failed'
      if (msg.includes('block height exceeded')) {
        setStatus({ type: 'error', msg: 'Transaction expired. Please try again.' })
      } else {
        setStatus({ type: 'error', msg })
      }
    }
  }, [publicKey, connection, sendTransaction, onSuccess])

  const clearStatus = useCallback(() => setStatus(null), [])

  return { status, send, clearStatus }
}
