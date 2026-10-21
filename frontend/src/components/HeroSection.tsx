import React from 'react';
import { ShieldCheck, Satellite, Scale, CloudRain, ArrowRight, Zap, CheckCircle2, Lock } from 'lucide-react';
import { CONTRACT_CONFIG } from '../config/contract';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
  stats: {
    totalCapitalGen: string;
    activePoliciesCount: number;
    settledCount: number;
    oracleUptime: string;
  };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, stats }) => {
  return (
    <section className="hero-section">
      <div className="hero-glow-sphere top-left"></div>
      <div className="hero-glow-sphere bottom-right"></div>

      <div className="container hero-content">
        {/* Network & Protocol Status Badge */}
        <div className="hero-badge-wrap">
          <div className="badge-pulse">
            <span className="pulse-dot"></span>
            <span className="badge-text">GenLayer GenVM StudioNet · Chain ID {CONTRACT_CONFIG.chainId}</span>
          </div>
          <span className="badge-divider">/</span>
          <div className="badge-status">
            <ShieldCheck size={14} className="text-emerald" />
            <span>Dual-Satellite Consensus Active</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Autonomous Parametric <br />
          <span className="gradient-text-hero">Crop & Climate Yield</span> Protection
        </h1>

        <p className="hero-description">
          GenVest replaces bureaucratic insurance paperwork with trustless GenLayer Intelligent Contracts.
          Settlement triggers evaluate dual independent atmospheric datasets (Open-Meteo ERA5 & NASA POWER MERRA-2) 
          under AI-validator consensus, with signed dispute clauses adjudicated by decentralized LLM evaluators.
        </p>

        {/* CTA Buttons */}
        <div className="hero-actions">
          <button 
            id="hero-explore-products-btn"
            className="btn btn-primary btn-lg"
            onClick={() => onNavigate('products')}
          >
            <span>Explore Protection Catalog</span>
            <ArrowRight size={18} />
          </button>

          <button 
            id="hero-launch-oracle-btn"
            className="btn btn-secondary btn-lg"
            onClick={() => onNavigate('oracle')}
          >
            <Satellite size={18} className="text-cyan" />
            <span>Live Satellite Radar</span>
          </button>

          <button 
            id="hero-verify-contract-btn"
            className="btn btn-outline btn-lg"
            onClick={() => onNavigate('contract')}
          >
            <Lock size={18} className="text-emerald" />
            <span>On-Chain Contract</span>
          </button>
        </div>

        {/* Live Protocol Telemetry Grid */}
        <div className="hero-stats-grid">
          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap bg-emerald-dim">
              <Zap size={22} className="text-emerald" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Underwriting Reserves</span>
              <div className="stat-value-row">
                <span className="stat-value">{stats.totalCapitalGen}</span>
                <span className="stat-unit">GEN</span>
              </div>
              <span className="stat-subtext">Solvency-backed escrow</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap bg-cyan-dim">
              <Satellite size={22} className="text-cyan" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Consensus Oracles</span>
              <div className="stat-value-row">
                <span className="stat-value">ERA5 + MERRA-2</span>
              </div>
              <span className="stat-subtext">0.1 mm precision verification</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap bg-purple-dim">
              <Scale size={22} className="text-purple" />
            </div>
            <div className="stat-info">
              <span className="stat-label">AI Dispute Adjudication</span>
              <div className="stat-value-row">
                <span className="stat-value">Optimistic Democracy</span>
              </div>
              <span className="stat-subtext">Prompt comparative consensus</span>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon-wrap bg-amber-dim">
              <CloudRain size={22} className="text-amber" />
            </div>
            <div className="stat-info">
              <span className="stat-label">Active & Settled Policies</span>
              <div className="stat-value-row">
                <span className="stat-value">{stats.activePoliciesCount + stats.settledCount}</span>
                <span className="stat-unit">Contracts</span>
              </div>
              <span className="stat-subtext">{stats.settledCount} claims finalized</span>
            </div>
          </div>
        </div>

        {/* Verified Contract Bar */}
        <div className="hero-verified-bar glass-panel">
          <div className="verified-bar-left">
            <CheckCircle2 size={16} className="text-emerald" />
            <span className="verified-label">Deployed on StudioNet:</span>
            <code className="verified-address">{CONTRACT_CONFIG.contractAddress}</code>
          </div>
          <div className="verified-bar-right">
            <a 
              href={CONTRACT_CONFIG.explorerContractUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="verified-link"
            >
              View on GenLayer Explorer &rarr;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
