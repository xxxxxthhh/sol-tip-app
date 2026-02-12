import { Buffer } from 'buffer'
window.Buffer = Buffer

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import App from './App.jsx'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const endpoint = import.meta.env.VITE_HELIUS_RPC
  || 'https://mainnet.helius-rpc.com/?api-key=a5316a72-3a4b-44e5-9a41-febc695134e7'

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </ErrorBoundary>
  </StrictMode>,
)
