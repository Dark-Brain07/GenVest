import React from 'react';
import { 
  Scale, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon, 
  Cpu, 
  Hash, 
  Sparkles
} from 'lucide-react';
import { Policy, EvidenceItem } from '../types';

interface DisputeDeliberationModalProps {
  policy: Policy;
  evidenceItems: EvidenceItem[];
  onClose: () => void;
  onDecideDispute: (policyId: string) => void;
}

export const DisputeDeliberationModal: React.FC<DisputeDeliberationModalProps> = ({
  policy,
  evidenceItems,
  onClose,
  onDecideDispute,
}) => {

  // Simulated AI-validator consensus votes for demonstration of GenLayer Optimistic Democracy
  const validators = [
    {
      id: 'Leader (0x99Ec...23F5)',
      vote: 'USE_OTHER',
      confidence: '94%',
      rationale: 'Submitted ground-level drone photographs and local weather station logs show severe precipitation deficit not captured by primary grid node.',
      status: 'Proposed Verdict',
    },
    {
      id: 'Validator-Alpha (0x3252...3C17)',
      vote: 'USE_OTHER',
      confidence: '96%',
      rationale: 'Prompt comparative equivalence matches leader conclusion: backup NASA dataset reflects ground evidence better than uncalibrated primary.',
      status: 'Agreed (Comparative Consensus)',
    },
    {
      id: 'Validator-Beta (0xeb9a...4640)',
      vote: 'USE_OTHER',
      confidence: '91%',
      rationale: 'Photographic evidence verified against timestamp & geotag hashes. Backup data correctly reflects verified drought damage.',
      status: 'Agreed (Comparative Consensus)',
    },
    {
      id: 'Validator-Gamma (0x712a...9811)',
      vote: 'USE_OTHER',
      confidence: '95%',
      rationale: 'Equivalence principle confirmed: both primary and backup criteria resolved under agreed dispute clause.',
      status: 'Agreed (Comparative Consensus)',
    },
  ];

  const handleExecuteDecision = () => {
    onDecideDispute(policy.policy_id);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-xl glass-panel">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Scale size={24} className="text-purple" />
            <div>
              <h3>AI-Validator Dispute Adjudication</h3>
              <span className="modal-subheading">
                Optimistic Democracy consensus resolution for Policy <code>{policy.policy_id}</code>
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body deliberation-grid">
          {/* Left Column: Dispute Dossier & Evidence */}
          <div className="deliberation-dossier">
            <div className="dossier-card glass-panel">
              <div className="dossier-header">
                <FileText size={16} className="text-cyan" />
                <h4>Signed Product Dispute Clause</h4>
              </div>
              <blockquote className="dispute-quote">
                "{policy.dispute_clause}"
              </blockquote>
            </div>

            <div className="dossier-card glass-panel">
              <div className="dossier-header">
                <ShieldCheck size={16} className="text-amber" />
                <h4>Contest Statement Filed by Claimant</h4>
              </div>
              <div className="contest-meta-row">
                <span className="badge badge-amber">{policy.contest?.by || 'FARMER'} CONTEST</span>
                <span className="text-muted text-sm">Bond Held: 0.01 GEN</span>
              </div>
              <p className="contest-statement-text">
                {policy.contest?.statement || 'Ground sensor readings and localized crop wilting indicate precipitation failed to reach minimum threshold despite grid reporting.'}
              </p>
            </div>

            {/* Evidence Items */}
            <div className="dossier-card glass-panel">
              <div className="dossier-header">
                <ImageIcon size={16} className="text-emerald" />
                <h4>Submitted Evidence Dossier ({evidenceItems.length})</h4>
              </div>

              {evidenceItems.length === 0 ? (
                <div className="empty-evidence-notice">
                  <span>No external media attachments filed. Evaluation based on satellite reanalysis & signed clause.</span>
                </div>
              ) : (
                <div className="evidence-list">
                  {evidenceItems.map((item) => (
                    <div key={item.evidence_id} className="evidence-item-card">
                      <div className="evidence-item-top">
                        <span className="badge badge-outline">{item.kind}</span>
                        <span className="evidence-caption">{item.caption}</span>
                      </div>
                      <div className="evidence-hash-row">
                        <Hash size={12} className="text-muted" />
                        <code>{item.sha256.slice(0, 20)}...</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: GenLayer AI-Validator Consensus Deliberation */}
          <div className="deliberation-consensus">
            <div className="consensus-summary-card glass-panel">
              <div className="consensus-summary-header">
                <div className="ai-badge-wrap">
                  <Sparkles size={18} className="text-purple" />
                  <h4>GenVM Multi-Validator Committee</h4>
                </div>
                <div className="consensus-rule-tag">
                  <code>gl.eq_principle.prompt_comparative</code>
                </div>
              </div>

              <p className="consensus-explainer">
                Under GenLayer's Optimistic Democracy, the leader proposes a verdict after parsing all evidence 
                against the signed dispute clause using GenVM LLM. Independent validators execute comparative prompts to confirm consensus.
              </p>

              {/* Validator Votes Cards */}
              <div className="validator-votes-list">
                {validators.map((val, idx) => (
                  <div key={idx} className="validator-vote-card">
                    <div className="vote-card-header">
                      <div className="validator-identity">
                        <Cpu size={14} className="text-cyan" />
                        <span className="val-id">{val.id}</span>
                      </div>
                      <div className="verdict-tag USE_OTHER">
                        VERDICT: {val.vote}
                      </div>
                    </div>
                    <p className="val-rationale">"{val.rationale}"</p>
                    <div className="vote-card-footer">
                      <span className="confidence-label">Confidence: <strong>{val.confidence}</strong></span>
                      <span className="status-label text-emerald">
                        <CheckCircle2 size={13} className="inline-icon" />
                        {val.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Final Adjudicated Result */}
              <div className="final-verdict-box">
                <div className="verdict-outcome-row">
                  <span className="verdict-label">Consensus Ruling:</span>
                  <span className="verdict-value text-emerald">USE_OTHER &rarr; DROUGHT TRIGGER CONFIRMED</span>
                </div>
                <p className="verdict-subtext">
                  The committee unanimously determined that the backup satellite dataset (NASA MERRA-2) accurately reflects ground conditions. 
                  Settlement payout is authorized for release to the policyholder.
                </p>
              </div>

              {policy.state === 'CONTESTED' && (
                <div className="decision-action-wrap">
                  <button
                    id="execute-adjudication-btn"
                    className="btn btn-primary btn-block btn-lg"
                    onClick={handleExecuteDecision}
                  >
                    <Scale size={18} />
                    <span>Execute AI-Validator Consensus Verdict</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
