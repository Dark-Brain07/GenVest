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
  DollarSign,
  MessageSquare,
  ShieldAlert,
  Gavel
} from 'lucide-react';
import { Policy, EvidenceItem } from '../types';
import { DisputeDeliberationModal } from './DisputeDeliberationModal';

interface PolicyManagerProps {
  policies: Policy[];
  evidenceItems: EvidenceItem[];
  onReadIndex: (policyId: string) => void;
  onContest: (policyId: string, statement: string) => void;
  onAnswer: (policyId: string, statement: string) => void;
  onFileEvidence: (policyId: string, kind: 'PHOTO' | 'PAGE', caption: string, url: string) => void;
  onDecideDispute: (policyId: string) => void;
  onAppeal: (policyId: string, statement: string) => void;
  onDecideAppeal: (policyId: string) => void;
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
  onAnswer,
  onFileEvidence,
  onDecideDispute,
  onAppeal,
  onDecideAppeal,
  onFinalize,
  onClaimBalance,
  userClaimableWei,
  connectedAddress,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'READ' | 'CONTESTED' | 'SETTLED'>('ALL');
  const [selectedPolicyForDeliberation, setSelectedPolicyForDeliberation] = useState<Policy | null>(null);
  
  // Modals state
  const [contestModalPolicy, setContestModalPolicy] = useState<Policy | null>(null);
  const [contestStatement, setContestStatement] = useState('');
  
  const [answerModalPolicy, setAnswerModalPolicy] = useState<Policy | null>(null);
  const [answerStatement, setAnswerStatement] = useState('');

  const [appealModalPolicy, setAppealModalPolicy] = useState<Policy | null>(null);
  const [appealStatement, setAppealStatement] = useState('');

  const [evidenceModalPolicy, setEvidenceModalPolicy] = useState<Policy | null>(null);
  const [evidenceKind, setEvidenceKind] = useState<'PHOTO' | 'PAGE'>('PAGE');
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

  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerModalPolicy || !answerStatement) return;
    onAnswer(answerModalPolicy.policy_id, answerStatement);
    setAnswerModalPolicy(null);
    setAnswerStatement('');
  };

  const handleAppealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealModalPolicy || !appealStatement) return;
    onAppeal(appealModalPolicy.policy_id, appealStatement);
    setAppealModalPolicy(null);
    setAppealStatement('');
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
          <h2 className="section-title">Parametric Yield Policies</h2>
          <p className="section-subtitle">
            Track policy observation periods, execute satellite settlement checks, file evidence, and claim payouts.
            {' '}<span className="text-muted">(Connected as <code>{connectedAddress ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}` : 'Disconnected'}</code>)</span>
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
            In Dispute / Appeal ({policies.filter(p => p.state === 'CONTESTED' || p.state === 'APPEALED').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'SETTLED' ? 'active' : ''}`}
            onClick={() => setFilter('SETTLED')}
          >
            Settled Claims ({policies.filter(p => p.state === 'SETTLED').length})
          </button>
        </div>
      </div>

      {/* Policies List */}
      <div className="policies-list">
        {filteredPolicies.length === 0 ? (
          <div className="empty-state-card glass-panel text-center">
            <FileCheck size={40} className="text-muted" style={{ margin: '0 auto 12px' }} />
            <h3>No Policies Found</h3>
            <p className="text-muted">
              You haven't underwritten or purchased policies in this category yet. Browse the catalog to protect crops with smart contracts.
            </p>
          </div>
        ) : (
          filteredPolicies.map((policy) => {
            const isExpanded = expandedPolicyId === policy.policy_id;
            const payoutGen = formatGen(policy.payout_wei);
            const premiumGen = formatGen(policy.premium_wei);
            const relatedEvidence = evidenceItems.filter((e) => e.policy_id === policy.policy_id);

            return (
              <div key={policy.policy_id} className={`policy-card glass-panel state-${policy.state.toLowerCase()}`}>
                {/* Policy Header */}
                <div className="policy-header-row">
                  <div className="policy-main-info">
                    <span className="policy-id-badge"><code>{policy.policy_id}</code></span>
                    <h3 className="policy-crop-title">{policy.crop}</h3>
                    <div className="policy-location-chip">
                      <MapPin size={13} />
                      <span>{policy.region}</span>
                    </div>
                  </div>

                  <div className="policy-header-meta">
                    <div className="policy-payout-box">
                      <span className="meta-label">Coverage (Premium)</span>
                      <span className="meta-val text-emerald">{payoutGen} GEN <small style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>({premiumGen} GEN)</small></span>
                    </div>
                    <div className={`policy-state-badge state-badge-${policy.state.toLowerCase()}`}>
                      {policy.state}
                    </div>
                  </div>
                </div>

                {/* Satellite Reading Status Banner (if READ) */}
                {policy.reading && (
                  <div className={`satellite-reading-banner ${policy.reading.triggered ? 'triggered' : 'normal'}`}>
                    <div className="reading-icon-wrap">
                      <Satellite size={18} />
                    </div>
                    <div className="reading-text-wrap">
                      <span className="reading-heading">Dual Satellite Consensus Cross-Check:</span>
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

                {/* Dispute Status Banner (if CONTESTED or DECIDED or APPEALED) */}
                {policy.contest && (
                  <div className="dispute-status-banner">
                    <div className="dispute-icon-wrap">
                      <AlertTriangle size={18} className="text-amber" />
                    </div>
                    <div className="dispute-info">
                      <span className="dispute-title">Contest Ground ({policy.contest.by}):</span>
                      <span className="dispute-statement">"{policy.contest.statement}"</span>
                    </div>
                    <div className="dispute-evidence-count">
                      <span>{relatedEvidence.length} Evidence logged</span>
                    </div>
                  </div>
                )}

                {/* Actions Bar */}
                <div className="policy-actions-bar">
                  <div className="left-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

                    {/* State: READ -> Contest Dispute or Finalize */}
                    {policy.state === 'READ' && (
                      <>
                        <button
                          id={`contest-btn-${policy.policy_id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setContestModalPolicy(policy)}
                        >
                          <AlertTriangle size={14} />
                          <span>File Dispute Contest (0.01 GEN Stake)</span>
                        </button>
                        <button
                          id={`finalize-btn-${policy.policy_id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => onFinalize(policy.policy_id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Finalize Settlement</span>
                        </button>
                      </>
                    )}

                    {/* State: CONTESTED -> Attach Evidence / File Answer / Adjudicate */}
                    {policy.state === 'CONTESTED' && (
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
                          id={`file-answer-btn-${policy.policy_id}`}
                          className="btn btn-outline btn-sm"
                          onClick={() => setAnswerModalPolicy(policy)}
                        >
                          <MessageSquare size={14} />
                          <span>File Response Statement</span>
                        </button>
                        <button
                          id={`view-deliberation-btn-${policy.policy_id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedPolicyForDeliberation(policy)}
                        >
                          <Scale size={14} />
                          <span>Execute AI Consensus Verdict</span>
                        </button>
                      </>
                    )}

                    {/* State: DECIDED -> Finalize Claim or File Escalation Appeal */}
                    {policy.state === 'DECIDED' && (
                      <>
                        <button
                          id={`finalize-decided-btn-${policy.policy_id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => onFinalize(policy.policy_id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Execute Final Claim Settlement</span>
                        </button>
                        <button
                          id={`appeal-btn-${policy.policy_id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAppealModalPolicy(policy)}
                        >
                          <ShieldAlert size={14} />
                          <span>File Escalation Appeal (0.01 GEN Bond)</span>
                        </button>
                      </>
                    )}

                    {/* State: APPEALED -> Execute Appeal Consensus */}
                    {policy.state === 'APPEALED' && (
                      <button
                        id={`decide-appeal-btn-${policy.policy_id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => onDecideAppeal(policy.policy_id)}
                      >
                        <Gavel size={14} />
                        <span>Execute Appeal Consensus Verdict</span>
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
                  Challenge the satellite reading by posting a <strong>0.01 GEN bond</strong>. 
                  GenLayer AI validators will adjudicate strictly against the bilateral dispute clause signed at policy issuance.
                </p>

                <div className="form-group">
                  <label className="form-label">Contest Grounds / Statement</label>
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
                  <span>Contest Bond: <strong>0.01 GEN</strong> (Restituted if contest is upheld by AI consensus).</span>
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

      {/* Answer / Response Counter-Statement Modal */}
      {answerModalPolicy && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <MessageSquare size={22} className="text-cyan" />
                <h3>File Counter-Statement for {answerModalPolicy.policy_id}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAnswerModalPolicy(null)}>&times;</button>
            </div>

            <form onSubmit={handleAnswerSubmit}>
              <div className="modal-body">
                <p className="text-muted">
                  Submit a formal response counter-statement on-chain to contest allegations before validator consensus deliberation.
                </p>

                <div className="form-group">
                  <label className="form-label">Response Statement</label>
                  <textarea 
                    className="form-input textarea" 
                    rows={4}
                    placeholder="Provide counter-evidence details (e.g. Regional irrigation canals remained operational; ERA5 reanalysis reflects aggregate soil moisture)..."
                    value={answerStatement}
                    onChange={(e) => setAnswerStatement(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAnswerModalPolicy(null)}>
                  Cancel
                </button>
                <button id="confirm-answer-submit-btn" type="submit" className="btn btn-primary">
                  Commit Response On-Chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appeal Escalation Modal */}
      {appealModalPolicy && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <ShieldAlert size={22} className="text-purple" />
                <h3>Escalate Appeal for {appealModalPolicy.policy_id}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setAppealModalPolicy(null)}>&times;</button>
            </div>

            <form onSubmit={handleAppealSubmit}>
              <div className="modal-body">
                <p className="text-muted">
                  Appeal an adverse first-tier decision to the higher-tier consensus committee by posting an <strong>appeal bond (0.01 GEN)</strong>.
                </p>

                <div className="form-group">
                  <label className="form-label">Appeal Grounds</label>
                  <textarea 
                    className="form-input textarea" 
                    rows={4}
                    placeholder="Provide specific legal or factual grounds under the signed dispute clause why the initial ruling should be overturned..."
                    value={appealStatement}
                    onChange={(e) => setAppealStatement(e.target.value)}
                    required
                  />
                </div>

                <div className="bond-notice-box">
                  <DollarSign size={16} className="text-purple" />
                  <span>Appeal Bond: <strong>0.01 GEN</strong> (Escrowed on StudioNet until final adjudication).</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setAppealModalPolicy(null)}>
                  Cancel
                </button>
                <button id="confirm-appeal-submit-btn" type="submit" className="btn btn-primary">
                  Escalate Appeal On-Chain
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
                    <option value="PAGE">Official Weather Bulletin / Web Archive URL</option>
                    <option value="PHOTO">Field Photography (Camera / Drone Snapshot)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Evidence Caption / Verification Notes</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. INTA Regional Agrometeorological Bulletin confirming rainfall deficit..."
                    value={evidenceCaption}
                    onChange={(e) => setEvidenceCaption(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Source URL / Web Link</label>
                  <input 
                    type="url" 
                    className="form-input"
                    placeholder="https://metagency.gov.ng/bulletin-aug-2026 or https://ipfs.io/ipfs/..."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    required
                  />
                  <span className="form-hint">GenVM AI validators fetch external URLs to verify timestamps, rainfall statistics, and facts.</span>
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
