import React from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Cpu, 
  AlertCircle 
} from 'lucide-react';
import { LiveTxResult } from '../services/genlayerService';
import { CONTRACT_CONFIG } from '../config/contract';

interface TransactionModalProps {
  tx: LiveTxResult | null;
  onClose: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ tx, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!tx) return null;

  const handleCopy = () => {
    if (tx.txHash) {
      navigator.clipboard.writeText(tx.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isFinalized = tx.status === 'FINALIZED';
  const isFailed = tx.status === 'FAILED';
  const isPending = tx.status === 'SUBMITTED' || tx.status === 'PROPOSING';

  return (
    <div className="modal-backdrop">
      <div 
        className="modal-dialog glass-panel" 
        style={{ maxWidth: '520px', border: isFinalized ? '1px solid rgba(16, 185, 129, 0.4)' : isFailed ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(6, 182, 212, 0.4)' }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Cpu size={22} className={isFinalized ? 'text-emerald' : isFailed ? 'text-red' : 'text-cyan'} />
            <div>
              <h3>GenLayer On-Chain Transaction</h3>
              <span className="modal-subheading">
                StudioNet (Chain {CONTRACT_CONFIG.chainId}) &middot; Method: <code>{tx.methodName}</code>
              </span>
            </div>
          </div>
          {(isFinalized || isFailed) && (
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Status Indicator Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px',
            borderRadius: '12px',
            background: isFinalized 
              ? 'rgba(16, 185, 129, 0.12)' 
              : isFailed 
              ? 'rgba(239, 68, 68, 0.12)' 
              : 'rgba(6, 182, 212, 0.12)',
            border: isFinalized 
              ? '1px solid rgba(16, 185, 129, 0.3)' 
              : isFailed 
              ? '1px solid rgba(239, 68, 68, 0.3)' 
              : '1px solid rgba(6, 182, 212, 0.3)',
          }}>
            <div>
              {isFinalized && <CheckCircle2 size={32} className="text-emerald" />}
              {isFailed && <AlertCircle size={32} className="text-red" />}
              {isPending && <RefreshCw size={32} className="animate-spin text-cyan" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>
                {isFinalized && 'Transaction Finalized On-Chain!'}
                {isFailed && 'Transaction Execution Failed'}
                {isPending && 'Broadcasting to Validator Committee...'}
              </div>
              <div style={{ fontSize: '0.80rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isFinalized && 'GenLayer AI validators reached consensus and committed state.'}
                {isFailed && (tx.error || 'The transaction reverted on StudioNet.')}
                {isPending && 'Leader proposing execution. Independent validators evaluating quorum...'}
              </div>
            </div>
          </div>

          {/* Transaction Hash */}
          {tx.txHash && (
            <div className="glass-panel" style={{ padding: '14px', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Live Transaction Hash (StudioNet)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {tx.txHash}
                </code>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button 
                    onClick={handleCopy} 
                    className="copy-btn" 
                    title="Copy Hash"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                  >
                    {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
                  </button>
                  <a 
                    href={tx.explorerUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="copy-btn" 
                    title="View on Explorer"
                    style={{ color: 'var(--emerald-400)' }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Direct Explorer Link */}
          {tx.explorerUrl && (
            <a 
              href={tx.explorerUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>View On-Chain Receipt on GenLayer Explorer</span>
              <ExternalLink size={15} />
            </a>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-primary btn-block" 
            disabled={isPending}
            onClick={onClose}
          >
            {isPending ? 'Awaiting Validator Consensus...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
