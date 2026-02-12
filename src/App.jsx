import { useState, useCallback, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import './App.css'

const USD_PRESETS = [1, 5, 10, 20, 50]

export default function App() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction, wallet, disconnect, select } = useWallet()
  const { setVisible } = useWalletModal()
  const [recipient, setRecipient] = useState('')
  const [usdAmount, setUsdAmount] = useState('')
  const [solPrice, setSolPrice] = useState(null)
  const [priceLoading, setPriceLoading] = useState(true)
  const [status, setStatus] = useState(null)

  // Fetch SOL price on mount and every 30s
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        const data = await res.json()
        setSolPrice(data.solana.usd)
      } catch {
        // fallback: retry next interval
      } finally {
        setPriceLoading(false)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 30000)
    return () => clearInterval(interval)
  }, [])

  const solAmount = usdAmount && solPrice ? (parseFloat(usdAmount) / solPrice) : 0

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setRecipient(text.trim())
    } catch {
      // clipboard permission denied
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!publicKey || !solAmount || solAmount <= 0) return

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
          lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
        })
      )
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setStatus({
        type: 'success',
        msg: `Sent $${usdAmount} (${solAmount.toFixed(4)} SOL)`,
        sig,
      })
      setUsdAmount('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Transaction failed' })
    }
  }, [publicKey, recipient, usdAmount, solAmount, connection, sendTransaction])

  return (
    <div className="app">
      <header>
        <h1>⚡ SOL Tip</h1>
        <div className="header-right">
          {solPrice && <span className="price-tag">SOL ${solPrice.toFixed(2)}</span>}
          {publicKey ? (
            <>
              <span className="wallet-addr">{publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}</span>
              <button className="switch-btn" onClick={() => { disconnect(); select(null); setVisible(true); }}>Switch</button>
            </>
          ) : wallet ? (
            <>
              <button className="connect-btn" onClick={() => wallet.adapter.connect()}>
                Connect {wallet.adapter.name}
              </button>
              <button className="switch-btn" onClick={() => { select(null); setVisible(true); }}>Switch</button>
            </>
          ) : (
            <button className="connect-btn" onClick={() => setVisible(true)}>
              Select Wallet
            </button>
          )}
        </div>
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
          <label>Amount (USD)</label>
          <div className="presets">
            {USD_PRESETS.map(p => (
              <button
                key={p}
                className={`preset ${parseFloat(usdAmount) === p ? 'active' : ''}`}
                onClick={() => setUsdAmount(String(p))}
              >
                ${p}
              </button>
            ))}
          </div>
          <input
            type="number"
            placeholder="Custom USD amount..."
            value={usdAmount}
            onChange={e => setUsdAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          {usdAmount && solPrice && (
            <div className="conversion">
              ≈ {solAmount.toFixed(4)} SOL
            </div>
          )}
          {priceLoading && <div className="conversion">Loading price...</div>}
        </div>

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!publicKey || !recipient || !usdAmount || !solPrice || status?.type === 'loading'}
        >
          {status?.type === 'loading' ? 'Sending...' : `Send $${usdAmount || '0'} ⚡`}
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
