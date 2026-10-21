import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Coins, 
  TrendingUp, 
  Lock, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  PieChart,
  DollarSign
} from 'lucide-react';
import { CONTRACT_CONFIG } from '../config/contract';

interface CapitalPoolSectionProps {
  totalFundedGen: string;
  totalReservedGen: string;
  totalPaidGen: string;
  solvencyRatio: number;
  onDepositCapital: (amountGen: string) => void;
  connectedAddress: string;
}

export const CapitalPoolSection: React.FC<CapitalPoolSectionProps> = ({
  totalFundedGen,
  totalReservedGen,
  totalPaidGen,
  solvencyRatio,
  onDepositCapital,
  connectedAddress,
}) => {
  const [depositAmount, setDepositAmount] = useState('1.0');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setIsDepositing(true);
    setTimeout(() => {
      onDepositCapital(depositAmount);
      setIsDepositing(false);
      setDepositAmount('1.0');
    }, 800);
  };

  return (
    <div className="capital-pool-section">
      <div className="section-header-row">
        <div>
          <span className="section-kicker text-emerald">Liquidity Underwriting & Solvency</span>
          <h2 className="section-title">Protocol Capital Reserves</h2>
          <p className="section-subtitle">
            Underwriters provide capital liquidity to guarantee 100% solvency for all active parametric crop policies.
          </p>
        </div>

        <div className="solvency-badge-wrap">
          <div className="solvency-badge">
            <ShieldCheck size={18} className="text-emerald" />
            <span>Solvency Ratio: <strong>{solvencyRatio}%</strong></span>
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="capital-stats-grid">
        <div className="cap-stat-card glass-panel">
          <div className="cap-stat-icon-wrap bg-emerald-dim">
            <Coins size={22} className="text-emerald" />
          </div>
          <div className="cap-stat-info">
            <span className="cap-label">Total Capital Escrow</span>
            <div className="cap-val-row">
              <span className="cap-value text-emerald">{totalFundedGen}</span>
              <span className="cap-unit">GEN</span>
            </div>
            <span className="cap-sub">Live on GenLayer StudioNet</span>
          </div>
        </div>

        <div className="cap-stat-card glass-panel">
          <div className="cap-stat-icon-wrap bg-cyan-dim">
            <Lock size={22} className="text-cyan" />
          </div>
          <div className="cap-stat-info">
            <span className="cap-label">Reserved for Active Policies</span>
            <div className="cap-val-row">
              <span className="cap-value text-cyan">{totalReservedGen}</span>
              <span className="cap-unit">GEN</span>
            </div>
            <span className="cap-sub">Locked until policy expiry</span>
          </div>
        </div>

        <div className="cap-stat-card glass-panel">
          <div className="cap-stat-icon-wrap bg-purple-dim">
            <CheckCircle2 size={22} className="text-purple" />
          </div>
          <div className="cap-stat-info">
            <span className="cap-label">Historical Claims Settled</span>
            <div className="cap-val-row">
              <span className="cap-value text-purple">{totalPaidGen}</span>
              <span className="cap-unit">GEN</span>
            </div>
            <span className="cap-sub">Paid out without litigation</span>
          </div>
        </div>

        <div className="cap-stat-card glass-panel">
          <div className="cap-stat-icon-wrap bg-amber-dim">
            <TrendingUp size={22} className="text-amber" />
          </div>
          <div className="cap-stat-info">
            <span className="cap-label">Protocol Solvency</span>
            <div className="cap-val-row">
              <span className="cap-value text-amber">{solvencyRatio}%</span>
            </div>
            <span className="cap-sub">Guaranteed full liquidation</span>
          </div>
        </div>
      </div>

      {/* Capital Actions & Architecture Layout */}
      <div className="capital-content-grid">
        {/* Deposit Capital Form */}
        <div className="deposit-capital-card glass-panel">
          <div className="card-top-title">
            <DollarSign size={20} className="text-emerald" />
            <h3>Underwrite Capital Pool</h3>
          </div>
          <p className="card-description">
            Deposit GEN into the decentralized capital pool to earn yield from parametric policy premiums.
            All capital is held securely in the GenVest Intelligent Contract at <code>{CONTRACT_CONFIG.contractAddress.slice(0, 10)}...</code>.
          </p>

          <form onSubmit={handleDepositSubmit} className="deposit-form">
            <div className="form-group">
              <label className="form-label">Deposit Amount (GEN)</label>
              <div className="input-with-button">
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  className="form-input" 
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm quick-amt-btn"
                  onClick={() => setDepositAmount('5.0')}
                >
                  +5 GEN
                </button>
              </div>
            </div>

            <div className="yield-estimate-box">
              <div className="yield-row">
                <span>Estimated Annualized Yield:</span>
                <strong className="text-emerald">18.4% APY</strong>
              </div>
              <div className="yield-row">
                <span>Underwriting Stakeholder:</span>
                <code>{connectedAddress.slice(0, 10)}...{connectedAddress.slice(-6)}</code>
              </div>
            </div>

            <button 
              id="submit-deposit-capital-btn"
              type="submit" 
              className="btn btn-primary btn-block btn-lg"
              disabled={isDepositing}
            >
              <ArrowUpRight size={18} />
              <span>{isDepositing ? 'Depositing Capital on StudioNet...' : `Deposit ${depositAmount} GEN to Reserves`}</span>
            </button>
          </form>
        </div>

        {/* Capital Safety & Collateral Explainer */}
        <div className="capital-safety-card glass-panel">
          <div className="card-top-title">
            <PieChart size={20} className="text-cyan" />
            <h3>Solvency Architecture</h3>
          </div>

          <div className="safety-points-list">
            <div className="safety-point">
              <div className="safety-point-icon">
                <Lock size={16} className="text-emerald" />
              </div>
              <div className="safety-point-text">
                <h5>100% Reserved Liability</h5>
                <p>
                  Before any farmer purchases coverage, the full potential payout is locked directly from the capital reserves, 
                  making insolvency mathematically impossible.
                </p>
              </div>
            </div>

            <div className="safety-point">
              <div className="safety-point-icon">
                <ShieldCheck size={16} className="text-cyan" />
              </div>
              <div className="safety-point-text">
                <h5>Pull-Ledger Payout Architecture</h5>
                <p>
                  Payouts are credited to a trustless pull-ledger (<code>balances</code> map). Beneficiaries withdraw their funds 
                  on-demand, preventing push-payment reentrancy vulnerabilities.
                </p>
              </div>
            </div>

            <div className="safety-point">
              <div className="safety-point-icon">
                <Layers size={16} className="text-purple" />
              </div>
              <div className="safety-point-text">
                <h5>Dispute Bond Slashing</h5>
                <p>
                  Unsubstantiated disputes forfeit their 0.01 GEN bond to the underwriting pool, penalizing frivolous litigation 
                  and subsidizing honest oracle verifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
