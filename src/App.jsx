import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useSOLPrice } from './hooks/useSOLPrice'
import { useBalance } from './hooks/useBalance'
import { useTipTransaction } from './hooks/useTipTransaction'
import { useRecipientValidation } from './hooks/useRecipientValidation'
import './App.css'

const USD_PRESETS = [1, 5, 10, 20, 50]

const TIP_QUOTES = [
  "A little goes a long way ☕",
  "You're making someone's day 🌟",
  "Generosity looks good on you 💜",
  "Small tip, big energy ⚡",
  "Cheers to good vibes 🥂",
  "Spreading crypto love 💫",
  "Thanks for being awesome 🙌",
  "One tip closer to a better world 🌍",
  "Good karma incoming ✨",
  "You rock, tipper 🎸",
]

export default function App() {
  const { publicKey, wallet, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const { solPrice, priceLoading, priceError } = useSOLPrice()
  const { balance, balanceLoading, refreshBalance } = useBalance()
  const { recipient, setRecipient, recipientValid } = useRecipientValidation()
  const [usdAmount, setUsdAmount] = useState('')
  const [quote] = useState(() => TIP_QUOTES[Math.floor(Math.random() * TIP_QUOTES.length)])

  const { status, send, clearStatus } = useTipTransaction({
    onSuccess: refreshBalance,
  })

  const solAmount = usdAmount && solPrice ? (parseFloat(usdAmount) / solPrice) : 0

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setRecipient(text.trim())
    } catch {
      // clipboard permission denied — mobile browsers often block this
    }
  }, [setRecipient])

  const handleSend = useCallback(async () => {
    await send({ recipient, solAmount, usdAmount })
  }, [send, recipient, solAmount, usdAmount])

  const handleSwitch = useCallback(() => setVisible(true), [setVisible])
  const handleDisconnect = useCallback(() => disconnect(), [disconnect])

  const canSend = publicKey && recipientValid && usdAmount && solPrice && status?.type !== 'loading'

  return (
    <div className="app">
      <header>
        <h1>⚡ SOL Tip</h1>
        <div className="header-right">
          {solPrice && <span className="price-tag">SOL ${solPrice.toFixed(2)}</span>}
          {priceError && !solPrice && <span className="price-tag price-error">Price unavailable</span>}
          {publicKey ? (
            <>
              <span className="wallet-addr">
                {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
              </span>
              <button className="switch-btn" onClick={handleSwitch}>Switch</button>
              <button className="disconnect-btn" onClick={handleDisconnect}>✕</button>
            </>
          ) : wallet ? (
            <>
              <button className="connect-btn" onClick={() => wallet.adapter.connect()}>
                Connect {wallet.adapter.name}
              </button>
              <button className="switch-btn" onClick={handleSwitch}>Switch</button>
            </>
          ) : (
            <button className="connect-btn" onClick={() => setVisible(true)}>
              Select Wallet
            </button>
          )}
        </div>
      </header>

      {publicKey && (
        <div className="balance-bar">
          {balanceLoading ? (
            <span>Loading balance...</span>
          ) : balance !== null ? (
            <span>
              Balance: <strong>{balance.toFixed(4)} SOL</strong>
              {solPrice && <span className="balance-usd"> (${(balance * solPrice).toFixed(2)})</span>}
            </span>
          ) : (
            <span>Balance unavailable</span>
          )}
        </div>
      )}

      <main>
        <div className="field">
          <label>Recipient</label>
          <div className="input-row">
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Wallet address..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                spellCheck={false}
                className={recipient ? (recipientValid ? 'valid' : 'invalid') : ''}
              />
              {recipient && (
                <span className={`validation-icon ${recipientValid ? 'valid' : 'invalid'}`}>
                  {recipientValid ? '✓' : '✗'}
                </span>
              )}
            </div>
            <button className="paste-btn" onClick={handlePaste} aria-label="Paste address">
              📋
            </button>
          </div>
          {recipient && recipientValid === false && (
            <span className="field-error">Invalid Solana address</span>
          )}
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
              = {solAmount.toFixed(4)} SOL
            </div>
          )}
          {priceLoading && <div className="conversion">Loading price...</div>}
          {balance !== null && solAmount > balance && (
            <div className="field-error" style={{ textAlign: 'center' }}>
              Exceeds your balance ({balance.toFixed(4)} SOL)
            </div>
          )}
        </div>

        <div className="tip-quote">{quote}</div>

        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!canSend}
        >
          {status?.type === 'loading'
            ? status.msg
            : `Send ${solAmount > 0 ? solAmount.toFixed(4) : '0'} SOL ⚡`}
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
            <button className="status-dismiss" onClick={clearStatus}>Dismiss</button>
          </div>
        )}
      </main>
    </div>
  )
}
