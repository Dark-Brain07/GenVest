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
  ChevronRight,
  Key
} from 'lucide-react';
import { useWeb3Wallet, STUDIO_NET_CONFIG } from '../context/WalletContext';
import { ROLE_ACCOUNTS } from '../services/genlayerService';

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
    connectRoleAccount,
    connectCustomKey,
    disconnect,
    switchToStudioNet,
    error,
  } = useWeb3Wallet();

  const [copied, setCopied] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const roleAccounts = [
    { 
      label: ROLE_ACCOUNTS.UNDERWRITER.label, 
      role: ROLE_ACCOUNTS.UNDERWRITER.role, 
      roleKey: 'UNDERWRITER' as const, 
      address: ROLE_ACCOUNTS.UNDERWRITER.address 
    },
    { 
      label: ROLE_ACCOUNTS.FARMER.label, 
      role: ROLE_ACCOUNTS.FARMER.role, 
      roleKey: 'FARMER' as const, 
      address: ROLE_ACCOUNTS.FARMER.address 
    },
  ];

  const handleApplyCustomKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customKeyInput.trim()) return;
    connectCustomKey(customKeyInput.trim());
    setCustomKeyInput('');
    setShowKeyInput(false);
    onClose();
  };

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
              <h3>{isConnected ? 'Active Signer Wallet' : 'Connect Web3 Wallet'}</h3>
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
                  Transaction Signer Address
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

              {/* Balance Box */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '16px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Wallet Balance:</span>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {balanceGen} GEN
                </span>
              </div>

              {/* Signer Verification Note */}
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '16px', background: 'rgba(56, 189, 248, 0.08)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <strong>Verified Signer:</strong> All GenLayer write transactions dispatched from this interface are signed directly by this address.
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={disconnect} 
                  className="btn btn-outline btn-sm btn-block"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <LogOut size={14} />
                  <span>Reset Default Signer</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Browser Wallet Connector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Connect Injected Browser Wallet:
            </span>
            <button
              onClick={connectInjected}
              disabled={isConnecting}
              className="wallet-option-btn glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(15, 23, 42, 0.6)',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} className="text-emerald" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.90rem', color: '#f1f5f9' }}>
                    Browser Web3 Wallet
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    MetaMask, Rabby, Coinbase, Brave
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

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '0.80rem', color: '#fca5a5' }}>
                {error}
              </div>
            )}
          </div>

          {/* Role Accounts with Guaranteed Real Signers */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Switch Protocol Role Signer (100% On-Chain Signer Sync):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roleAccounts.map((acc) => {
                const isSelected = address.toLowerCase() === acc.address.toLowerCase() && isConnected;
                return (
                  <button
                    key={acc.address}
                    onClick={() => {
                      connectRoleAccount(acc.roleKey);
                      onClose();
                    }}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '1px solid var(--emerald-400)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.4)',
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
                    {isSelected && (
                      <CheckCircle2 size={16} className="text-emerald" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Private Key Toggle */}
          <div style={{ marginTop: '4px' }}>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="btn btn-text btn-sm"
              style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: 0 }}
            >
              <Key size={12} className="inline-icon" />
              <span>{showKeyInput ? 'Hide Custom Private Key' : 'Enter Custom Private Key...'}</span>
            </button>

            {showKeyInput && (
              <form onSubmit={handleApplyCustomKey} style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <input
                  type="password"
                  placeholder="0x..."
                  className="form-input"
                  style={{ fontSize: '0.78rem', padding: '6px 10px', flex: 1 }}
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Load
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            <ShieldCheck size={14} className="text-emerald" />
            <span>GenLayer StudioNet is gasless. Signer address matches `gl.message.sender_address`.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
