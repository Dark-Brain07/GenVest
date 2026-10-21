import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';
import { CONTRACT_CONFIG } from '../config/contract';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="footer-wrap">
      <div className="container footer-content">
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-logo-row">
              <div className="footer-logo-icon">
                <ShieldCheck size={24} className="text-emerald" />
              </div>
              <span className="footer-brand-name">GenVest</span>
            </div>
            <p className="footer-tagline">
              Decentralized parametric agricultural and climate yield hedging powered by GenLayer GenVM Intelligent Contracts.
              Dual-dataset atmospheric consensus (ERA5 & MERRA-2) with Optimistic Democracy AI-validator dispute adjudication.
            </p>
            <div className="footer-network-status">
              <span className="network-dot online"></span>
              <span>GenLayer StudioNet · Chain ID {CONTRACT_CONFIG.chainId} (Gasless)</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Protocol Navigation</h4>
            <ul className="footer-links-list">
              <li><button onClick={() => onNavigate('products')}>Protection Catalog</button></li>
              <li><button onClick={() => onNavigate('oracle')}>Live Weather Radar</button></li>
              <li><button onClick={() => onNavigate('policies')}>My Parametric Policies</button></li>
              <li><button onClick={() => onNavigate('pool')}>Liquidity Underwriting</button></li>
              <li><button onClick={() => onNavigate('contract')}>On-Chain Verification</button></li>
            </ul>
          </div>

          {/* Technology & Consensus */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">GenLayer Technology</h4>
            <ul className="footer-links-list">
              <li>
                <a href={CONTRACT_CONFIG.explorerContractUrl} target="_blank" rel="noopener noreferrer">
                  <span>Explorer Contract</span>
                  <ExternalLink size={12} className="inline-icon" />
                </a>
              </li>
              <li>
                <a href={CONTRACT_CONFIG.explorerTxUrl} target="_blank" rel="noopener noreferrer">
                  <span>Deploy Transaction</span>
                  <ExternalLink size={12} className="inline-icon" />
                </a>
              </li>
              <li>
                <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer">
                  <span>GenLayer Documentation</span>
                  <ExternalLink size={12} className="inline-icon" />
                </a>
              </li>
              <li>
                <a href="https://skills.genlayer.com" target="_blank" rel="noopener noreferrer">
                  <span>GenLayer Skills Portal</span>
                  <ExternalLink size={12} className="inline-icon" />
                </a>
              </li>
            </ul>
          </div>

          {/* Security & Architecture */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Contract Specs</h4>
            <div className="footer-specs-box">
              <div className="spec-line">
                <span className="text-muted">Contract:</span>
                <code>{CONTRACT_CONFIG.contractAddress.slice(0, 10)}...</code>
              </div>
              <div className="spec-line">
                <span className="text-muted">Runner:</span>
                <code>1jb45aa8...09h6</code>
              </div>
              <div className="spec-line">
                <span className="text-muted">Consensus:</span>
                <span className="text-cyan">Prompt Comparative</span>
              </div>
              <div className="spec-line">
                <span className="text-muted">Pull-Ledger:</span>
                <span className="text-emerald">Balances Escrow</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <div className="bottom-left">
            <span>&copy; {new Date().getFullYear()} GenVest Protocol. Trustless parametric micro-insurance.</span>
          </div>
          <div className="bottom-right">
            <span>Built by <strong>Dark-Brain07</strong> for GenLayer Intelligent Contract Hackathon</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
