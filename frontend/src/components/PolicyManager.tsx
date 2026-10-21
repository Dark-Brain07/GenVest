import React, { useState } from 'react';
import { 
  FileCheck, 
  AlertTriangle, 
  Scale, 
  CheckCircle2, 
  Satellite, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  MapPin, 
  DollarSign 
} from 'lucide-react';
import { Policy, EvidenceItem } from '../types';
import { DisputeDeliberationModal } from './DisputeDeliberationModal';

interface PolicyManagerProps {
  policies: Policy[];
  evidenceItems: EvidenceItem[];
  onReadIndex: (policyId: string) => void;
  onContest: (policyId: string, statement: string) => void;
  onFileEvidence: (policyId: string, kind: 'PHOTO' | 'PAGE', caption: string, url: string) => void;
  onDecideDispute: (policyId: string) => void;
  onFinalize: (policyId: string) => void;
  onClaimBalance: () => void;
  userClaimableWei: string;
  connectedAddress: string;
}

export const PolicyManager: React.FC<PolicyManagerProps> = ({
  policies,
  evidenceItems,
  onReadIndex,
  onContest,
  onFileEvidence,
  onDecideDispute,
  onFinalize,
  onClaimBalance,
  userClaimableWei,
  connectedAddress,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'READ' | 'CONTESTED' | 'SETTLED'>('ALL');
  const [selectedPolicyForDeliberation, setSelectedPolicyForDeliberation] = useState<Policy | null>(null);
  const [contestModalPolicy, setContestModalPolicy] = useState<Policy | null>(null);
  const [contestStatement, setContestStatement] = useState('');
  const [evidenceModalPolicy, setEvidenceModalPolicy] = useState<Policy | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<'PHOTO' | 'PAGE'>('PHOTO');
  const [evidenceCaption, setEvidenceCaption] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  const formatGen = (weiStr: string): string => {
    try {
      const num = Number(BigInt(weiStr)) / 1e18;
      return num.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const filteredPolicies = policies.filter((p) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return p.state === 'ACTIVE';
    if (filter === 'READ') return p.state === 'READ';
    if (filter === 'CONTESTED') return p.state === 'CONTESTED' || p.state === 'APPEALED';
    if (filter === 'SETTLED') return p.state === 'SETTLED';
    return true;
  });

  const handleContestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contestModalPolicy || !contestStatement) return;
    onContest(contestModalPolicy.policy_id, contestStatement);
    setContestModalPolicy(null);
    setContestStatement('');
  };

  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceModalPolicy || !evidenceCaption) return;
    onFileEvidence(evidenceModalPolicy.policy_id, evidenceKind, evidenceCaption, evidenceUrl);
    setEvidenceModalPolicy(null);
    setEvidenceCaption('');
    setEvidenceUrl('');
  };

  const claimableGen = formatGen(userClaimableWei);

  return (
    <div className="policy-manager-section">
      <div className="section-header-row">
        <div>
          <span className="section-kicker text-emerald">Portfolio & Claim Operations</span>
          <h2 className="section-title">My Parametric Policies</h2>
          <p className="section-subtitle">
            Track policy observation periods, execute satellite settlement checks, file photographic disputes, and claim payouts.
            {' '}<span className="text-muted">(Connected as <code>{connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}</code>)</span>
          </p>
        </div>

        {/* Claimable Balance Box */}
        <div className="claimable-balance-card glass-panel">
          <div className="claimable-info">
            <span className="claimable-label">Claimable Payout Balance</span>
            <div className="claimable-value text-emerald">
              <DollarSign size={18} className="inline-icon" />
              <span>{claimableGen} GEN</span>
            </div>
          </div>
          <button
            id="claim-balance-btn"
            className="btn btn-primary btn-sm"
            disabled={BigInt(userClaimableWei || '0') === BigInt(0)}
            onClick={onClaimBalance}
          >
            Withdraw to Wallet
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar glass-panel">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilter('ALL')}
          >
            All Policies ({policies.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setFilter('ACTIVE')}
          >
            Active Observation ({policies.filter(p => p.state === 'ACTIVE').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'READ' ? 'active' : ''}`}
            onClick={() => setFilter('READ')}
          >
            Oracle Read ({policies.filter(p => p.state === 'READ').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'CONTESTED' ? 'active' : ''}`}
            onClick={() => setFilter('CONTESTED')}
          >
            In Dispute ({policies.filter(p => p.state === 'CONTESTED' || p.state === 'APPEALED').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'SETTLED' ? 'active' : ''}`}
            onClick={() => setFilter('SETTLED')}
          >
            Settled ({policies.filter(p => p.state === 'SETTLED').length})
          </button>
        </div>
      </div>

      {/* Policies List */}
      <div className="policies-list">
        {filteredPolicies.length === 0 ? (
          <div className="empty-state-panel glass-panel">
            <FileCheck size={48} className="text-muted" />
            <h3>No Policies Found</h3>
            <p className="text-muted">You do not have any policies matching the selected filter criteria.</p>
          </div>
        ) : (
          filteredPolicies.map((policy) => {
            const isExpanded = expandedPolicyId === policy.policy_id;
            const thresholdMm = (policy.threshold_tenths / 10).toFixed(1);
            const payoutGen = formatGen(policy.payout_wei);
            const premiumGen = formatGen(policy.premium_wei);
            const relatedEvidence = evidenceItems.filter(e => e.policy_id === policy.policy_id);

            return (
              <div key={policy.policy_id} className="policy-item-card glass-panel">
                {/* Header Row */}
                <div className="policy-item-header">
                  <div className="policy-id-crop">
                    <span className="policy-id-badge">{policy.policy_id}</span>
                    <h3 className="policy-crop-title">{policy.crop}</h3>
                    <div className="policy-loc-tag">
                      <MapPin size={13} className="text-muted" />
                      <span>{policy.region}</span>
                    </div>
                  </div>

                  <div className="policy-state-badge-wrap">
                    <span className={`state-badge state-${policy.state.toLowerCase()}`}>
                      {policy.state}
                    </span>
                  </div>
                </div>

                {/* Lifecycle Progress Bar */}
                <div className="lifecycle-track-wrap">
                  <div className="lifecycle-steps">
                    <div className={`lifecycle-step ${['ACTIVE', 'READ', 'CONTESTED', 'DECIDED', 'SETTLED'].includes(policy.state) ? 'done' : ''}`}>
                      <div className="step-circle">1</div>
                      <span>Active Coverage</span>
                    </div>
                    <div className="step-connector"></div>
                    <div className={`lifecycle-step ${['READ', 'CONTESTED', 'DECIDED', 'SETTLED'].includes(policy.state) ? 'done' : ''}`}>
                      <div className="step-circle">2</div>
                      <span>Oracle Read</span>
                    </div>
                    <div className="step-connector"></div>
                    <div className={`lifecycle-step ${['CONTESTED', 'DECIDED'].includes(policy.state) ? 'in-dispute' : policy.state === 'SETTLED' ? 'done' : ''}`}>
                      <div className="step-circle">3</div>
                      <span>Dispute Window</span>
                    </div>
                    <div className="step-connector"></div>
                    <div className={`lifecycle-step ${policy.state === 'SETTLED' ? 'done' : ''}`}>
                      <div className="step-circle">4</div>
                      <span>Final Settlement</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="policy-metrics-row">
                  <div className="metric-cell">
                    <span className="metric-label">Trigger Condition</span>
                    <span className="metric-val">Rain {policy.trigger === 'RAIN_BELOW' ? '<' : '>'} <strong>{thresholdMm} mm</strong></span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">Window Duration</span>
                    <span className="metric-val">{policy.window_days} Days ({policy.window_start.slice(0, 10)} to {policy.window_end.slice(0, 10)})</span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">Guaranteed Payout</span>
                    <span className="metric-val text-cyan">{payoutGen} GEN</span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">Premium Paid</span>
                    <span className="metric-val text-emerald">{premiumGen} GEN</span>
                  </div>
                  <div className="metric-cell">
                    <span className="metric-label">Beneficiary</span>
                    <span className="metric-val"><code>{policy.farmer.slice(0, 8)}...{policy.farmer.slice(-6)}</code></span>
                  </div>
                </div>

                {/* Oracle Reading Banner (if READ or beyond) */}
                {policy.reading && (
                  <div className="oracle-reading-banner">
                    <div className="reading-icon-wrap">
                      <Satellite size={18} className="text-cyan" />
                    </div>
                    <div className="reading-info">
                      <span className="reading-title">Dual-Satellite Observation Recorded:</span>
                      <span className="reading-details">
                        {policy.reading.selected} recorded <strong>{policy.reading.triggered ? 'TRIGGERED' : 'NORMAL'}</strong> rainfall. 
                        Cross-check ({policy.reading.other}): <strong>{policy.reading.other_triggers ? 'TRIGGERED' : 'NORMAL'}</strong>.
                      </span>
                    </div>
                    <div className={`reading-badge ${policy.reading.triggered ? 'badge-triggered' : 'badge-normal'}`}>
                      {policy.reading.triggered ? 'PAYOUT CONDITION MET' : 'NO TRIGGER'}
                    </div>
                  </div>
                )}

                {/* Dispute Status Banner (if CONTESTED or DECIDED) */}
                {policy.contest && (
                  <div className="dispute-status-banner">
                    <div className="dispute-icon-wrap">
                      <AlertTriangle size={18} className="text-amber" />
                    </div>
                    <div className="dispute-info">
                      <span className="dispute-title">Contest Filed by {policy.contest.by}:</span>
                      <span className="dispute-statement">"{policy.contest.statement}"</span>
                    </div>
                    <div className="dispute-evidence-count">
                      <span>{relatedEvidence.length} Evidence files attached</span>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="policy-actions-bar">
                  <div className="left-actions">
                    {/* State: ACTIVE -> Read Index */}
                    {policy.state === 'ACTIVE' && (
                      <button
                        id={`read-index-btn-${policy.policy_id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => onReadIndex(policy.policy_id)}
                      >
                        <Satellite size={14} />
                        <span>Read Settlement Index</span>
                      </button>
                    )}

                    {/* State: READ -> Contest Dispute */}
                    {policy.state === 'READ' && (
                      <>
                        <button
                          id={`contest-btn-${policy.policy_id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setContestModalPolicy(policy)}
                        >
                          <AlertTriangle size={14} />
                          <span>File Dispute / Contest (0.01 GEN Stake)</span>
                        </button>
                        <button
                          id={`finalize-btn-${policy.policy_id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => onFinalize(policy.policy_id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Finalize Without Contest</span>
                        </button>
                      </>
                    )}

                    {/* State: CONTESTED -> Attach Evidence / View Deliberation */}
                    {(policy.state === 'CONTESTED' || policy.state === 'APPEALED') && (
                      <>
                        <button
                          id={`attach-evidence-btn-${policy.policy_id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEvidenceModalPolicy(policy)}
                        >
                          <Upload size={14} />
                          <span>Submit Geotagged Evidence</span>
                        </button>
                        <button
                          id={`view-deliberation-btn-${policy.policy_id}`}
                          className="btn btn-outline btn-sm"
                          onClick={() => setSelectedPolicyForDeliberation(policy)}
                        >
                          <Scale size={14} className="text-purple" />
                          <span>Inspect AI-Validator Deliberation</span>
                        </button>
                      </>
                    )}

                    {/* State: DECIDED -> Finalize Claim */}
                    {policy.state === 'DECIDED' && (
                      <button
                        id={`finalize-decided-btn-${policy.policy_id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => onFinalize(policy.policy_id)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Execute Final Claim Settlement</span>
                      </button>
                    )}

                    {/* State: SETTLED */}
                    {policy.state === 'SETTLED' && (
                      <span className="settled-status-text text-emerald">
                        <CheckCircle2 size={15} className="inline-icon" />
                        Settlement Finalized on StudioNet
                      </span>
                    )}
                  </div>

                  <div className="right-actions">
                    <button
                      className="btn btn-text btn-sm"
                      onClick={() => setExpandedPolicyId(isExpanded ? null : policy.policy_id)}
                    >
                      <span>{isExpanded ? 'Hide Specs' : 'View Full Specs'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div className="expanded-specs-panel glass-panel">
                    <div className="specs-grid-3">
                      <div className="spec-item">
                        <span className="spec-kicker">Dispute Clause</span>
                        <p className="spec-desc">"{policy.dispute_clause}"</p>
                      </div>
                      <div className="spec-item">
                        <span className="spec-kicker">Satellite Sources</span>
                        <p className="spec-desc">Primary: <strong>{policy.primary}</strong> / Backup: <strong>{policy.backup}</strong></p>
                      </div>
                      <div className="spec-item">
                        <span className="spec-kicker">Underwriting Insurer</span>
                        <p className="spec-desc"><code>{policy.insurer}</code></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Contest Dispute Modal */}
      {contestModalPolicy && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <AlertTriangle size={22} className="text-amber" />
                <h3>File Dispute Contest for {contestModalPolicy.policy_id}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setContestModalPolicy(null)}>&times;</button>
            </div>

            <form onSubmit={handleContestSubmit}>
              <div className="modal-body">
                <p className="text-muted">
                  Under the product's signed dispute clause, you can challenge the satellite reading by posting a <strong>0.01 GEN bond</strong>. 
                  GenLayer AI validators will review your grounds and evidence under Optimistic Democracy.
                </p>

                <div className="form-group">
                  <label className="form-label">Contest Ground / Statement</label>
                  <textarea 
                    className="form-input textarea" 
                    rows={4}
                    placeholder="Describe discrepancy (e.g. Local rain gauge recorded 40mm deficit; localized flash drought not captured by 25km satellite grid)..."
                    value={contestStatement}
                    onChange={(e) => setContestStatement(e.target.value)}
                    required
                  />
                </div>

                <div className="bond-notice-box">
                  <DollarSign size={16} className="text-amber" />
                  <span>Contest Bond: <strong>0.01 GEN</strong> (Returned if contest is upheld by validators).</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setContestModalPolicy(null)}>
                  Cancel
                </button>
                <button id="confirm-contest-submit-btn" type="submit" className="btn btn-secondary">
                  Post Bond & Submit Contest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Evidence Modal */}
      {evidenceModalPolicy && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Upload size={22} className="text-emerald" />
                <h3>Submit Dispute Evidence for {evidenceModalPolicy.policy_id}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setEvidenceModalPolicy(null)}>&times;</button>
            </div>

            <form onSubmit={handleEvidenceSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Evidence Type</label>
                  <select 
                    className="form-input"
                    value={evidenceKind}
                    onChange={(e) => setEvidenceKind(e.target.value as any)}
                  >
                    <option value="PHOTO">Field Photography (Geotagged Camera / Drone)</option>
                    <option value="PAGE">Official Weather Bulletin / Web Archive URL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Evidence Caption / Verification Notes</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Drone orthomosaic of parched maize canopy at Field Sector 4..."
                    value={evidenceCaption}
                    onChange={(e) => setEvidenceCaption(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Media URL / Web Link</label>
                  <input 
                    type="url" 
                    className="form-input"
                    placeholder="https://ipfs.io/ipfs/... or https://met-agency.gov/bulletin"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                  />
                  <span className="form-hint">GenVM AI validators fetch external URLs to verify timestamp and meteorological facts.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEvidenceModalPolicy(null)}>
                  Cancel
                </button>
                <button id="confirm-file-evidence-btn" type="submit" className="btn btn-primary">
                  Commit Evidence to GenLayer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI-Validator Deliberation Modal */}
      {selectedPolicyForDeliberation && (
        <DisputeDeliberationModal
          policy={selectedPolicyForDeliberation}
          evidenceItems={evidenceItems.filter(e => e.policy_id === selectedPolicyForDeliberation.policy_id)}
          onClose={() => setSelectedPolicyForDeliberation(null)}
          onDecideDispute={(pid) => {
            onDecideDispute(pid);
            setSelectedPolicyForDeliberation(null);
          }}
        />
      )}
    </div>
  );
};
