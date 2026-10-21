import React, { useState } from 'react';
import { Coins, Wallet, CheckCircle2, Menu, X } from 'lucide-react';
import { useWeb3Wallet } from '../context/WalletContext';
import { WalletModal } from './WalletModal';

export interface NavbarProps {
  activeTab: 'products' | 'oracle' | 'policies' | 'pool' | 'contract';
  onSelectTab: (tab: 'products' | 'oracle' | 'policies' | 'pool' | 'contract') => void;
  claimableWei: string;
  onClaim?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  claimableWei,
  onClaim,
}) => {
  const { address, isConnected, balanceGen, isCorrectNetwork } = useWeb3Wallet();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimedToast, setClaimedToast] = useState(false);

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

  const navItems = [
    { id: 'products', label: 'Products' },
    { id: 'oracle', label: 'Weather Radar' },
    { id: 'policies', label: 'My Policies' },
    { id: 'pool', label: 'Capital Pool' },
    { id: 'contract', label: 'On-Chain Proof' },
  ];

  return (
    <>
      <nav className="navbar-root">
        <div className="container navbar-container">
          {/* Brand Logo */}
          <div 
            onClick={() => onSelectTab('products')} 
            className="navbar-brand"
          >
            <div className="brand-logo-glow">
              <img src="/logo.png" alt="GenVest Logo" className="brand-logo-img" />
            </div>
            <div className="brand-text-col">
              <div className="brand-title-row">
                <span className="brand-name">GenVest</span>
                <span className="badge badge-emerald brand-genvm-badge">StudioNet</span>
              </div>
              <div className="brand-subtext">Parametric Climate Protocol</div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="navbar-links-desktop">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as any)}
                className={`nav-tab-btn ${activeTab === item.id ? 'active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action Bar */}
          <div className="navbar-right-actions">
            {/* Pull Ledger Claim Bar */}
            <div className="pull-ledger-pill">
              <div className="ledger-info">
                <span className="ledger-label">Escrow</span>
                <div className="ledger-amount">
                  <Coins size={13} className="text-emerald" />
                  <span>{claimableGen} GEN</span>
                </div>
              </div>
              <button
                onClick={handleClaimClick}
                disabled={Number(claimableWei) <= 0 || isClaiming}
                className="btn btn-sm btn-primary claim-pill-btn"
              >
                {isClaiming ? 'Claiming...' : 'Claim'}
              </button>
            </div>

            {/* Wallet Connect / Account Button */}
            <button
              id="navbar-wallet-connect-btn"
              onClick={() => setIsWalletModalOpen(true)}
              className={`wallet-connect-btn ${isConnected ? 'connected' : 'unconnected'}`}
            >
              <div className="wallet-btn-inner">
                <div className="wallet-icon-circle">
                  <Wallet size={16} />
                </div>
                {isConnected ? (
                  <div className="wallet-btn-details">
                    <span className="wallet-addr-text">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <span className="wallet-bal-text">{balanceGen} GEN</span>
                  </div>
                ) : (
                  <span className="wallet-cta-text">Connect Wallet</span>
                )}
                <div className={`status-dot ${isConnected ? (isCorrectNetwork ? 'green' : 'red') : 'pulse'}`}></div>
              </div>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button 
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="mobile-menu-drawer glass-panel">
            <div className="mobile-links-list">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Claimed Toast */}
        {claimedToast && (
          <div className="toast-float-bottom glass-panel">
            <CheckCircle2 size={18} className="text-emerald" />
            <span>Payout transferred from pull-ledger to your wallet!</span>
          </div>
        )}
      </nav>

      {/* Web3 Wallet Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
};
