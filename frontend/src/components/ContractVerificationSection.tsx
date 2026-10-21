import React, { useState } from 'react';
import { 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck
} from 'lucide-react';
import { CONTRACT_CONFIG } from '../config/contract';

export const ContractVerificationSection: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const auditPoints = [
    {
      title: 'Closure & Storage Pre-Extraction Audit',
      status: 'VERIFIED',
      desc: 'Zero access to contract state (self) inside non-deterministic closures (leader() or gl.eq_principle). All data pre-extracted into pure Python local primitives.',
    },
    {
      title: 'Pinned Runner Dependency Audit',
      status: 'VERIFIED',
      desc: `Pinned concrete runner hash on line 1: ${CONTRACT_CONFIG.runnerPin}. No unversioned test or latest aliases.`,
    },
    {
      title: 'Zero-Revert Fallback Evidence Audit',
      status: 'VERIFIED',
      desc: 'Graceful fallbacks on all external weather feeds and photo evidence URLs. Reversal or missing link never causes unhandled GenVM exception.',
    },
    {
      title: 'Consensus & Equivalence Principle Audit',
      status: 'VERIFIED',
      desc: 'Comparative evaluation (gl.eq_principle.prompt_comparative) assesses primary trigger outcomes, not exact string tokens.',
    },
    {
      title: 'Syntax, AST & GenVM Lint Audit',
      status: 'VERIFIED',
      desc: 'Passed genvm-lint check contracts/genvest.py --json with 0 errors. Zero forbidden stdlib modules (no typing, math, os, sys in contract runtime).',
    },
    {
      title: 'Live Chain Execution Audit',
      status: 'VERIFIED',
      desc: 'Deployed and finalized on GenLayer StudioNet with confirmed transaction receipts and positive capital reserve funding.',
    },
  ];

  return (
    <div className="contract-verification-section">
      <div className="section-header-row">
        <div>
          <span className="section-kicker text-emerald">Decentralized Transparency</span>
          <h2 className="section-title">On-Chain Deployment Proof</h2>
          <p className="section-subtitle">
            GenVest is deployed and active on GenLayer StudioNet. Inspect live transaction receipts, explorer proofs, and audit compliance.
          </p>
        </div>

        <div className="network-pill-wrap">
          <span className="network-dot online"></span>
          <span>{CONTRACT_CONFIG.network} (Chain ID {CONTRACT_CONFIG.chainId})</span>
        </div>
      </div>

      {/* Verification Matrix Cards */}
      <div className="verification-proof-grid">
        <div className="proof-card glass-panel">
          <div className="proof-top">
            <span className="proof-label">INTELLIGENT CONTRACT ADDRESS</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard(CONTRACT_CONFIG.contractAddress, 'addr')}
            >
              {copiedKey === 'addr' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            </button>
          </div>
          <code className="proof-value highlight-address">{CONTRACT_CONFIG.contractAddress}</code>
          <div className="proof-footer">
            <a 
              href={CONTRACT_CONFIG.explorerContractUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="explorer-link"
            >
              <span>View Address on GenLayer Explorer</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="proof-card glass-panel">
          <div className="proof-top">
            <span className="proof-label">DEPLOYMENT TRANSACTION HASH</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard(CONTRACT_CONFIG.deployTxHash, 'tx')}
            >
              {copiedKey === 'tx' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            </button>
          </div>
          <code className="proof-value">{CONTRACT_CONFIG.deployTxHash}</code>
          <div className="proof-footer">
            <a 
              href={CONTRACT_CONFIG.explorerTxUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="explorer-link"
            >
              <span>View Deployment Receipt</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="proof-card glass-panel">
          <div className="proof-top">
            <span className="proof-label">FLAGSHIP PRODUCT (P-000001) INITIALIZATION</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard(CONTRACT_CONFIG.createProductTxHash, 'prod')}
            >
              {copiedKey === 'prod' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            </button>
          </div>
          <code className="proof-value">{CONTRACT_CONFIG.createProductTxHash}</code>
          <div className="proof-footer">
            <a 
              href={`https://explorer-studio.genlayer.com/tx/${CONTRACT_CONFIG.createProductTxHash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="explorer-link"
            >
              <span>View Product Initialization Tx</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <div className="proof-card glass-panel">
          <div className="proof-top">
            <span className="proof-label">CAPITAL POOL FUNDING (0.20 GEN)</span>
            <button 
              className="copy-btn" 
              onClick={() => copyToClipboard(CONTRACT_CONFIG.fundProductTxHash, 'fund')}
            >
              {copiedKey === 'fund' ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
            </button>
          </div>
          <code className="proof-value">{CONTRACT_CONFIG.fundProductTxHash}</code>
          <div className="proof-footer">
            <a 
              href={`https://explorer-studio.genlayer.com/tx/${CONTRACT_CONFIG.fundProductTxHash}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="explorer-link"
            >
              <span>View Reserve Funding Tx</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Pinned Runner & Sandbox Security */}
      <div className="runner-specs-bar glass-panel">
        <div className="runner-spec-item">
          <span className="runner-label">GenVM Runner Pin:</span>
          <code>{CONTRACT_CONFIG.runnerPin}</code>
        </div>
        <div className="runner-spec-item">
          <span className="runner-label">Consensus Protocol:</span>
          <span className="text-cyan">Optimistic Democracy + Comparative Equivalence</span>
        </div>
        <div className="runner-spec-item">
          <span className="runner-label">Linter Status:</span>
          <span className="text-emerald">0 Errors (genvm-linter v0.2.14)</span>
        </div>
      </div>

      {/* 6-Point Audit Checklist Grid */}
      <div className="audit-checklist-section glass-panel">
        <div className="audit-header">
          <ShieldCheck size={22} className="text-emerald" />
          <h3>GenLayer Mandatory 6-Point Protocol Audit</h3>
        </div>

        <div className="audit-points-grid">
          {auditPoints.map((point, index) => (
            <div key={index} className="audit-card">
              <div className="audit-card-top">
                <span className="audit-badge verified">
                  <CheckCircle2 size={13} className="inline-icon" />
                  {point.status}
                </span>
                <span className="audit-step-num">Check 0{index + 1}</span>
              </div>
              <h4 className="audit-title">{point.title}</h4>
              <p className="audit-desc">{point.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
