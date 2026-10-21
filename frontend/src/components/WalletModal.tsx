import React, { useState } from 'react';
import { 
  Wallet, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  AlertTriangle, 
  X, 
  LogOut, 
  RefreshCw, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useWeb3Wallet, STUDIO_NET_CONFIG } from '../context/WalletContext';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const {
    address,
    isConnected,
    isConnecting,
    balanceGen,
    chainId,
    isCorrectNetwork,
    walletName,
    hasInjectedWallet,
    connectInjected,
    connectSimulated,
    disconnect,
    switchToStudioNet,
    error,
  } = useWeb3Wallet();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatedAccounts = [
    { label: 'Alice (Underwriter)', role: 'Underwriter / Insurer', address: '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5' },
    { label: 'Bob (Maize Producer)', role: 'Beneficiary Farmer', address: '0x81b637d8fcd2c6dac59e696113a1170de795e4a1' },
    { label: 'Charlie (Arbitrator)', role: 'Consensus Auditor', address: '0x3252f04b1923b6fe4e53396f1fc80a0db1cb3c17' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-dialog glass-panel" 
        style={{ maxWidth: '480px' }} 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="wallet-header-icon">
              <Wallet size={20} className="text-emerald" />
            </div>
            <div>
              <h3>{isConnected ? 'Wallet Account' : 'Connect Web3 Wallet'}</h3>
              <span className="modal-subheading">
                {isConnected ? walletName : 'Connect to GenLayer StudioNet (Chain 61999)'}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Wrong Network Warning */}
          {isConnected && !isCorrectNetwork && (
            <div className="warning-card glass-panel" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '14px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} className="text-red" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f87171' }}>Wrong Network Detected</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    Your wallet is on chain {chainId}. GenVest requires GenLayer StudioNet (61999).
                  </div>
                </div>
              </div>
              <button 
                className="btn btn-primary btn-sm btn-block" 
                style={{ marginTop: '10px', background: '#ef4444' }}
                onClick={switchToStudioNet}
              >
                Switch to GenLayer StudioNet
              </button>
            </div>
          )}

          {/* Connected State Details */}
          {isConnected ? (
            <div className="connected-details-card glass-panel" style={{ padding: '18px', borderRadius: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Connected Account
                </span>
                <div className="network-pill-wrap" style={{ margin: 0, padding: '3px 8px', fontSize: '0.72rem' }}>
                  <span className="network-dot online"></span>
                  <span>{STUDIO_NET_CONFIG.chainName}</span>
                </div>
              </div>

              {/* Address Display */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#38bdf8' }}>
                  {address.slice(0, 10)}...{address.slice(-8)}
                </code>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleCopy} 
                    className="copy-btn" 
                    title="Copy Address"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                  >
                    {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                  </button>
                  <a 
                    href={`https://explorer-studio.genlayer.com/address/${address}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="copy-btn" 
                    title="View on Explorer"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Balance Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Native Balance:</span>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#34d399' }}>
                  {balanceGen} GEN
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button 
                  className="btn btn-outline btn-sm btn-block"
                  onClick={disconnect}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#f87171' }}
                >
                  <LogOut size={14} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            /* Connection Options */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option 1: Browser Injected Wallet (MetaMask / Rabby / Coinbase) */}
              <button
                id="connect-injected-wallet-btn"
                className="wallet-option-btn glass-panel"
                onClick={connectInjected}
                disabled={isConnecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: 'rgba(16, 185, 129, 0.06)',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #f97316 0%, #eab308 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}>
                    <Wallet size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ffffff' }}>
                      Browser Web3 Wallet
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      MetaMask, Rabby, Coinbase, Brave, Trust
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isConnecting ? (
                    <RefreshCw size={18} className="animate-spin text-emerald" />
                  ) : hasInjectedWallet ? (
                    <span className="badge badge-emerald" style={{ fontSize: '0.70rem' }}>Detected</span>
                  ) : (
                    <ChevronRight size={18} color="var(--text-dim)" />
                  )}
                </div>
              </button>

              {/* Error Notice */}
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.80rem', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Simulated / Testnet Accounts for Quick Testing */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Or Switch to StudioNet Test Accounts:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {simulatedAccounts.map((acc) => (
                <button
                  key={acc.address}
                  onClick={() => {
                    connectSimulated(acc.address, acc.label);
                    onClose();
                  }}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: address.toLowerCase() === acc.address.toLowerCase() && isConnected ? '1px solid var(--emerald-400)' : '1px solid var(--border-subtle)',
                    background: address.toLowerCase() === acc.address.toLowerCase() && isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#f1f5f9' }}>
                      {acc.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {acc.role} &middot; {acc.address.slice(0, 8)}...{acc.address.slice(-6)}
                    </div>
                  </div>
                  {address.toLowerCase() === acc.address.toLowerCase() && isConnected && (
                    <CheckCircle2 size={16} className="text-emerald" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <ShieldCheck size={14} className="text-emerald" />
            <span>GenLayer StudioNet is gasless. 0 GEN transaction fee.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
