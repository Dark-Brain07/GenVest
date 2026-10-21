import React, { useState } from 'react';
import { ShieldCheck, Coins, Wallet, ChevronDown, CheckCircle2 } from 'lucide-react';

export interface NavbarProps {
  activeTab: 'products' | 'oracle' | 'policies' | 'pool' | 'contract';
  onSelectTab: (tab: 'products' | 'oracle' | 'policies' | 'pool' | 'contract') => void;
  connectedAddress: string;
  onSwitchAddress: (account: string) => void;
  claimableWei: string;
  onClaim?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  connectedAddress,
  onSwitchAddress,
  claimableWei,
  onClaim,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedToast, setClaimedToast] = useState(false);

  const demoAccounts = [
    { label: 'Alice (Underwriter)', address: '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5' },
    { label: 'Bob (Maize Producer)', address: '0x81b637d8fcd2c6dac59e696113a1170de795e4a1' },
    { label: 'Charlie (Arbitrator)', address: '0x3252f04b1923b6fe4e53396f1fc80a0db1cb3c17' },
  ];

  const claimableGen = (Number(claimableWei) / 10 ** 18).toFixed(2);

  const handleClaimClick = () => {
    if (Number(claimableWei) <= 0) return;
    setIsClaiming(true);
    setTimeout(() => {
      if (onClaim) onClaim();
      setIsClaiming(false);
      setClaimedToast(true);
      setTimeout(() => setClaimedToast(false), 4000);
    }, 1200);
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      background: 'rgba(7, 10, 19, 0.85)',
      borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
      padding: '12px 0',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        {/* Brand Logo */}
        <div 
          onClick={() => onSelectTab('products')} 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.45)',
          }}>
            <ShieldCheck size={24} color="#ffffff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                GenVest
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                GenVM
              </span>
            </div>
            <div style={{ fontSize: '0.70rem', color: 'var(--text-dim)', letterSpacing: '0.02em', marginTop: '-2px' }}>
              Parametric Climate & Yield Protocol
            </div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => onSelectTab('products')}
            className={`btn btn-sm ${activeTab === 'products' ? 'btn-primary' : 'btn-text'}`}
            style={{ fontSize: '0.82rem' }}
          >
            Products
          </button>
          <button
            onClick={() => onSelectTab('oracle')}
            className={`btn btn-sm ${activeTab === 'oracle' ? 'btn-primary' : 'btn-text'}`}
            style={{ fontSize: '0.82rem' }}
          >
            Weather Radar
          </button>
          <button
            onClick={() => onSelectTab('policies')}
            className={`btn btn-sm ${activeTab === 'policies' ? 'btn-primary' : 'btn-text'}`}
            style={{ fontSize: '0.82rem' }}
          >
            My Policies
          </button>
          <button
            onClick={() => onSelectTab('pool')}
            className={`btn btn-sm ${activeTab === 'pool' ? 'btn-primary' : 'btn-text'}`}
            style={{ fontSize: '0.82rem' }}
          >
            Capital Pool
          </button>
          <button
            onClick={() => onSelectTab('contract')}
            className={`btn btn-sm ${activeTab === 'contract' ? 'btn-primary' : 'btn-text'}`}
            style={{ fontSize: '0.82rem' }}
          >
            On-Chain Proof
          </button>
        </div>

        {/* Pull Ledger Rewards & Wallet Controller */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Pull Ledger Claim Bar */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pull Ledger
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#34d399', fontSize: '0.90rem' }}>
                <Coins size={14} />
                <span>{claimableGen} GEN</span>
              </div>
            </div>
            <button
              onClick={handleClaimClick}
              disabled={Number(claimableWei) <= 0 || isClaiming}
              className="btn btn-sm btn-primary"
              style={{
                opacity: Number(claimableWei) <= 0 ? 0.45 : 1,
                cursor: Number(claimableWei) <= 0 ? 'not-allowed' : 'pointer',
                padding: '4px 10px',
                fontSize: '0.78rem',
              }}
            >
              {isClaiming ? 'Transferring...' : 'Claim'}
            </button>
          </div>

          {/* Wallet Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Wallet size={15} color="var(--emerald-400)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
              </span>
              <ChevronDown size={14} />
            </button>

            {showAccountMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '280px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '8px',
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                zIndex: 200,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Simulated Wallets (StudioNet)
                </div>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.address}
                    onClick={() => {
                      onSwitchAddress(acc.address);
                      setShowAccountMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      background: connectedAddress.toLowerCase() === acc.address.toLowerCase() ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      border: 'none',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                      {acc.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {acc.address.slice(0, 10)}...{acc.address.slice(-6)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {claimedToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          zIndex: 9999,
          animation: 'slideIn 0.3s ease',
        }}>
          <CheckCircle2 size={20} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Payout delivered via _Payee.emit_transfer() to your wallet!
          </span>
        </div>
      )}
    </nav>
  );
};
