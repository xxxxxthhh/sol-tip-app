import { useState, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import './App.css'

const PRESETS = [0.01, 0.05, 0.1, 0.5, 1]

export default function App() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState(null) // { type: 'loading'|'success'|'error', msg, sig? }

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setRecipient(text.trim())
    } catch {
      // clipboard permission denied
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!publicKey) return
    const sol = parseFloat(amount)
    if (!sol || sol <= 0) {
      setStatus({ type: 'error', msg: 'Enter a valid amount' })
      return
    }

    let recipientKey
    try {
      recipientKey = new PublicKey(recipient.trim())
    } catch {
      setStatus({ type: 'error', msg: 'Invalid recipient address' })
      return
    }

    try {
      setStatus({ type: 'loading', msg: 'Sending transaction...' })
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientKey,
          lamports: Math.round(sol * LAMPORTS_PER_SOL),
        })
      )
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setStatus({ type: 'success', msg: `Sent ${sol} SOL`, sig })
      setAmount('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Transaction failed' })
    }
  }, [publicKey, recipient, amount, connection, sendTransaction])

  return (
    <div className="app">
      <header>
        <h1>⚡ SOL Tip</h1>
        <WalletMultiButton />
      </header>

      <main>
        <div className="field">
          <label>Recipient</label>
          <div className="input-row">
            <input
              type="text"
              placeholder="Wallet address..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              spellCheck={false}
            />
            <button className="paste-btn" onClick={handlePaste} aria-label="Paste address">
              📋
            </button>
          </div>
        </div>

        <div className="field">
          <label>Amount (SOL)</label>
          <div className="presets">
            {PRESETS.map(p => (
              <button
                key={p}
                className={`preset ${parseFloat(amount) === p ? 'active' : ''}`}
                onClick={() => setAmount(String(p))}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Custom amount..."
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="0.001"
          />
        </div>

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!publicKey || !recipient || !amount || status?.type === 'loading'}
        >
          {status?.type === 'loading' ? 'Sending...' : 'Send SOL ⚡'}
        </button>

        {status && status.type !== 'loading' && (
          <div className={`status ${status.type}`}>
            <p>{status.msg}</p>
            {status.sig && (
              <a
                href={`https://solscan.io/tx/${status.sig}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Solscan →
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
