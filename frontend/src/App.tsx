import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ProductsCatalog } from './components/ProductsCatalog';
import { LiveWeatherOracle } from './components/LiveWeatherOracle';
import { PolicyManager } from './components/PolicyManager';
import { CapitalPoolSection } from './components/CapitalPoolSection';
import { ContractVerificationSection } from './components/ContractVerificationSection';
import { Footer } from './components/Footer';
import { INITIAL_PRODUCTS } from './config/contract';
import { Product, Policy, EvidenceItem } from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useWeb3Wallet } from './context/WalletContext';
import { TransactionModal } from './components/TransactionModal';
import { genlayerService, LiveTxResult } from './services/genlayerService';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'oracle' | 'policies' | 'pool' | 'contract'>('products');
  const { address: connectedAddress } = useWeb3Wallet();
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [userClaimableWei, setUserClaimableWei] = useState<string>('0');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTx, setActiveTx] = useState<LiveTxResult | null>(null);

  // Initial rich sample policies for live testing
  const [policies, setPolicies] = useState<Policy[]>([
    {
      policy_id: 'POL-000001',
      product_id: 'P-000001',
      farmer: '0xAfc40A8D303e15e3D80572c530Bb0AD3f669e609',
      insurer: '0x1E878a57ce79073a3A44640f1C92C362E7e8492d',
      crop: 'Maize (Zea mays)',
      region: 'Federal Capital Territory, Abuja, Nigeria',
      lat: '9.06',
      lon: '7.49',
      trigger: 'RAIN_BELOW',
      threshold_tenths: 1400,
      window_days: 14,
      window_start: '2026-08-01T00:00:00Z',
      window_end: '2026-08-15T00:00:00Z',
      premium_wei: '100000000000000000', // 0.10 GEN
      payout_wei: '500000000000000000',  // 0.50 GEN
      primary: 'OPEN_METEO',
      backup: 'NASA_POWER',
      dispute_clause: 'If ERA5 and MERRA-2 disagree on drought threshold, local field photographs and official meteorological reports decide which reading governs.',
      periods: { contest: 86400, response: 86400, appeal: 86400 },
      replay: true,
      state: 'ACTIVE',
      reserved: true,
      paid_to_farmer: false,
      round_count: 0,
      bought_at: '2026-08-01T10:00:00Z',
    },
    {
      policy_id: 'POL-000002',
      product_id: 'P-000001',
      farmer: '0xd055e95b0f06B87Fdcc9938076F52c17A34781Ad',
      insurer: '0x1E878a57ce79073a3A44640f1C92C362E7e8492d',
      crop: 'Hard Red Winter Wheat',
      region: 'Pampas Humedas, Cordoba, Argentina',
      lat: '-31.42',
      lon: '-64.18',
      trigger: 'RAIN_BELOW',
      threshold_tenths: 850,
      window_days: 21,
      window_start: '2026-07-01T00:00:00Z',
      window_end: '2026-07-22T00:00:00Z',
      premium_wei: '150000000000000000',
      payout_wei: '800000000000000000',
      primary: 'OPEN_METEO',
      backup: 'NASA_POWER',
      dispute_clause: 'Precipitation under 85 mm during tillering stage triggers full payout. Contests weighed against regional INTA agricultural bulletins.',
      periods: { contest: 86400, response: 86400, appeal: 86400 },
      replay: false,
      state: 'CONTESTED',
      reserved: true,
      paid_to_farmer: false,
      round_count: 1,
      bought_at: '2026-07-01T12:00:00Z',
      reading: {
        at: '2026-07-23T04:00:00Z',
        selected: 'OPEN_METEO',
        other: 'NASA_POWER',
        triggered: false,
        series: {},
        summaries: {},
        other_triggers: true,
      },
      contest: {
        by: 'FARMER',
        statement: 'Open-Meteo 25km grid cell recorded 88mm from an isolated off-site cloudburst, while farm rain gauge and drone NDVI indicate severe drought (< 60mm). NASA MERRA-2 correctly registered drought trigger.',
        bond_wei: '10000000000000000', // 0.01 GEN
        opened_at: '2026-07-23T08:00:00Z',
        response_ends: '2026-07-24T08:00:00Z',
        lapse_at: '2026-07-25T08:00:00Z',
      },
    },
  ]);

  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([
    {
      evidence_id: 'E-000001',
      policy_id: 'POL-000002',
      kind: 'PAGE',
      by: 'FARMER',
      stage: 'CONTEST',
      caption: 'INTA Regional Agrometeorological Bulletin confirming severe rainfall deficit for Cordoba Zone 3',
      url: 'https://inta.gob.ar/boletines/cordoba-deficit-lluvias-2026',
      sha256: '92d1c68f863ef509931b25a3ebcead922ef6a836063bb91266395b0fe6317bc3',
      filed_at: '2026-07-23T10:15:00Z',
    },
  ]);

  // Sync real state from on-chain contract
  const fetchOnChainState = async () => {
    try {
      const onChainProds = await genlayerService.listProducts(0, 50);
      if (Array.isArray(onChainProds) && onChainProds.length > 0) {
        setProducts(onChainProds);
      }
      const onChainPols = await genlayerService.listPolicies(0, 50);
      if (Array.isArray(onChainPols) && onChainPols.length > 0) {
        setPolicies(onChainPols);
      }
      if (connectedAddress) {
        const bal = await genlayerService.getBalance(connectedAddress);
        if (bal?.claimable_wei) {
          setUserClaimableWei(bal.claimable_wei);
        }
      }
    } catch (e) {
      console.warn('[Sync] On-chain read sync notice:', e);
    }
  };

  useEffect(() => {
    fetchOnChainState();
  }, [connectedAddress]);

  const addToast = (type: 'success' | 'info' | 'error', title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Protocol Stats
  const totalFundedWei = products.reduce((acc, p) => acc + BigInt(p.funded_wei || '0'), BigInt(0));
  const totalReservedWei = products.reduce((acc, p) => acc + BigInt(p.reserved_wei || '0'), BigInt(0));
  const totalFundedGen = (Number(totalFundedWei) / 1e18).toFixed(2);
  const totalReservedGen = (Number(totalReservedWei) / 1e18).toFixed(2);
  const activeCount = policies.filter((p) => p.state === 'ACTIVE').length;
  const settledCount = policies.filter((p) => p.state === 'SETTLED').length;
  const solvencyRatio = totalReservedWei > BigInt(0) 
    ? Math.round((Number(totalFundedWei) / Number(totalReservedWei)) * 100) 
    : 150;

  // Handler: Buy Coverage Policy
  const handleBuyPolicy = async (product: Product, _farmerAddress?: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'buy_policy',
      status: 'SUBMITTED',
    });

    try {
      const now = new Date();
      const seasonStart = product.replay ? (product as any).replay_start || '2026-08-01' : now.toISOString().split('T')[0];
      const res = await genlayerService.buyPolicy(
        product.product_id,
        seasonStart,
        product.premium_wei,
        (progress) => setActiveTx(progress)
      );

      // Use returned contract policy ID (e.g. Y-000001)
      const policyId = typeof res.returnValue === 'string' && res.returnValue.startsWith('Y-')
        ? res.returnValue
        : `Y-${String(policies.length + 1).padStart(6, '0')}`;

      await fetchOnChainState();

      addToast(
        'success',
        'Policy Underwritten On-Chain',
        `Policy ${policyId} underwritten on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
      setActiveTab('policies');
    } catch (err: any) {
      console.error('Buy policy error:', err);
      // PRESERVE FAILED WRITES AS FAILURES: No optimistic mutation
      addToast('error', 'Policy Purchase Failed', err?.message || 'Transaction rejected by GenVM smart contract.');
    }
  };

  // Handler: Publish New Product
  const handlePublishProduct = async (newProd: Partial<Product>) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'create_product',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.createProduct(
        {
          crop: newProd.crop || 'Crop Spec',
          region: newProd.region || 'Region',
          lat: newProd.lat || '9.06',
          lon: newProd.lon || '7.49',
          trigger: newProd.trigger || 'RAIN_BELOW',
          threshold_tenths: newProd.threshold_tenths || 1400,
          window_days: newProd.window_days || 14,
          premium_wei: newProd.premium_wei || '100000000000000000',
          payout_wei: newProd.payout_wei || '500000000000000000',
          capacity: newProd.capacity || 20,
          primary: newProd.primary || 'OPEN_METEO',
          backup: newProd.backup || 'NASA_POWER',
          dispute_clause: newProd.dispute_clause || 'Standard GenVest dispute clause under AI-validator consensus.',
          periods: newProd.periods || { contest: 86400, response: 86400, appeal: 86400 },
          replay: Boolean(newProd.replay),
          replay_start: newProd.replay_start || (newProd.replay ? '2026-08-01' : undefined),
        },
        (progress) => setActiveTx(progress)
      );

      // Use returned contract product ID (e.g. P-000002)
      const productId = typeof res.returnValue === 'string' && res.returnValue.startsWith('P-')
        ? res.returnValue
        : `P-${String(products.length + 1).padStart(6, '0')}`;

      await fetchOnChainState();

      addToast(
        'success',
        'Product Published On-Chain',
        `Product ${productId} created on GenLayer StudioNet (Tx: ${res.txHash.slice(0, 10)}...)`
      );
    } catch (err: any) {
      console.error('Error creating product:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Product Creation Failed', err?.message || 'Transaction rejected by GenVM smart contract.');
    }
  };

  // Handler: Fund Product Reserve
  const handleFundProduct = async (productId: string, amountGen: string) => {
    const addedWei = (BigInt(Math.round(parseFloat(amountGen) * 1e4)) * BigInt(1e14)).toString();
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'fund_product',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.fundProduct(productId, addedWei, (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'success',
        'Reserves Funded On-Chain',
        `Injected ${amountGen} GEN into product ${productId} pool (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Fund error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Funding Failed', err?.message || 'Transaction rejected by GenVM smart contract.');
    }
  };

  // Handler: Read Satellite Index
  const handleReadIndex = async (policyId: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'read_index',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.readIndex(policyId, (progress) => setActiveTx(progress));
      await fetchOnChainState();
      addToast(
        'info',
        'Satellite Reading Processed',
        `Dual satellite cross-check recorded on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Read index error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Satellite Read Failed', err?.message || 'Observation window not yet complete.');
    }
  };

  // Handler: Contest Policy
  const handleContest = async (policyId: string, statement: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'contest',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.contest(policyId, statement, '10000000000000000', (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'info',
        'Dispute Contest Registered',
        `0.01 GEN bond escrowed on StudioNet (Tx: ${res.txHash.slice(0, 10)}...). AI validators assigned.`
      );
    } catch (err: any) {
      console.error('Contest error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Contest Submission Failed', err?.message || 'Datasets agreed or contest window closed.');
    }
  };

  // Handler: Response Counter-Statement
  const handleAnswer = async (policyId: string, statement: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'answer',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.answer(policyId, statement, (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'success',
        'Counter-Statement Logged',
        `Response statement committed on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Answer error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Response Submission Failed', err?.message || 'Unauthorized or response window closed.');
    }
  };

  // Handler: File Evidence
  const handleFileEvidence = async (
    policyId: string,
    kind: 'PHOTO' | 'PAGE',
    caption: string,
    url: string
  ) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'file_page',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.filePage(policyId, caption, url, (progress) =>
        setActiveTx(progress)
      );
      
      const evId = typeof res.returnValue === 'object' && res.returnValue?.evidence_id
        ? res.returnValue.evidence_id
        : `E-${String(evidenceItems.length + 1).padStart(6, '0')}`;

      const newEv: EvidenceItem = {
        evidence_id: evId,
        policy_id: policyId,
        kind,
        by: 'FARMER',
        stage: 'CONTEST',
        caption,
        url,
        sha256: res.txHash.slice(2, 66),
        filed_at: new Date().toISOString(),
      };
      setEvidenceItems((prev) => [newEv, ...prev]);
      await fetchOnChainState();
      addToast('success', 'Evidence Filed On-Chain', `Evidence ${evId} logged on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`);
    } catch (err: any) {
      console.error('File evidence error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Evidence Submission Failed', err?.message || 'Evidence limit reached or invalid URL.');
    }
  };

  // Handler: Decide Dispute via AI-Validator consensus
  const handleDecideDispute = async (policyId: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'decide_contest',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.decideContest(policyId, (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'success',
        'AI Consensus Reached',
        `Dispute adjudicated against signed clause on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Decide dispute error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Adjudication Failed', err?.message || 'Dispute resolution requires valid state.');
    }
  };

  // Handler: Escalate Appeal
  const handleAppeal = async (policyId: string, statement: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'appeal',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.appeal(policyId, statement, '10000000000000000', (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'info',
        'Appeal Escalated On-Chain',
        `Escalated to second-tier consensus committee (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Appeal error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Appeal Escalation Failed', err?.message || 'Appeal window closed or unauthorized.');
    }
  };

  // Handler: Decide Appeal
  const handleDecideAppeal = async (policyId: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'decide_appeal',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.decideAppeal(policyId, (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'success',
        'Appeal Decision Finalized',
        `Higher-tier consensus committee ruled on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Decide appeal error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Appeal Adjudication Failed', err?.message || 'Higher-tier consensus failure.');
    }
  };

  // Handler: Finalize Policy
  const handleFinalize = async (policyId: string) => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'finalize',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.finalizePolicy(policyId, (progress) =>
        setActiveTx(progress)
      );
      await fetchOnChainState();
      addToast(
        'success',
        'Claim Finalized On-Chain',
        `Policy ${policyId} settled on StudioNet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Finalize error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Finalization Failed', err?.message || 'Contest or appeal window remains open.');
    }
  };

  // Handler: Claim Pull-Ledger Balance
  const handleClaimBalance = async () => {
    setActiveTx({
      txHash: '',
      explorerUrl: '',
      methodName: 'claim',
      status: 'SUBMITTED',
    });

    try {
      const res = await genlayerService.claimPayout((progress) => setActiveTx(progress));
      const claimedGen = (Number(userClaimableWei) / 1e18).toFixed(2);
      setUserClaimableWei('0');
      await fetchOnChainState();
      addToast(
        'success',
        'Funds Withdrawn On-Chain',
        `Successfully transferred ${claimedGen} GEN to wallet (Tx: ${res.txHash.slice(0, 10)}...).`
      );
    } catch (err: any) {
      console.error('Claim error:', err);
      // PRESERVE FAILED WRITES AS FAILURES
      addToast('error', 'Claim Withdrawal Failed', err?.message || 'No claimable balance found for signer address.');
    }
  };

  // Handler: Deposit Protocol Capital
  const handleDepositCapital = (amountGen: string) => {
    handleFundProduct('P-000001', amountGen);
  };

  return (
    <div className="app-root">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type} glass-panel`}>
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald" />}
              {toast.type === 'error' && <AlertCircle size={18} className="text-red" />}
              {toast.type === 'info' && <Info size={18} className="text-cyan" />}
            </div>
            <div className="toast-body">
              <strong className="toast-title">{toast.title}</strong>
              <p className="toast-message">{toast.message}</p>
            </div>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab: any) => setActiveTab(tab)}
        claimableWei={userClaimableWei}
        onClaim={handleClaimBalance}
      />

      <main className="main-content">
        {/* Hero Section */}
        <HeroSection
          onNavigate={(tab) => setActiveTab(tab as any)}
          stats={{
            totalCapitalGen: totalFundedGen,
            activePoliciesCount: activeCount,
            settledCount,
            oracleUptime: '99.98%',
          }}
        />

        {/* Tab Views */}
        <div className="container app-body-container">
          {activeTab === 'products' && (
            <ProductsCatalog
              products={products}
              onBuyPolicy={handleBuyPolicy}
              onPublishProduct={handlePublishProduct}
              onFundProduct={handleFundProduct}
              connectedAddress={connectedAddress}
            />
          )}

          {activeTab === 'oracle' && <LiveWeatherOracle />}

          {activeTab === 'policies' && (
            <PolicyManager
              policies={policies}
              evidenceItems={evidenceItems}
              onReadIndex={handleReadIndex}
              onContest={handleContest}
              onAnswer={handleAnswer}
              onFileEvidence={handleFileEvidence}
              onDecideDispute={handleDecideDispute}
              onAppeal={handleAppeal}
              onDecideAppeal={handleDecideAppeal}
              onFinalize={handleFinalize}
              onClaimBalance={handleClaimBalance}
              userClaimableWei={userClaimableWei}
              connectedAddress={connectedAddress}
            />
          )}

          {activeTab === 'pool' && (
            <CapitalPoolSection
              totalFundedGen={totalFundedGen}
              totalReservedGen={totalReservedGen}
              totalPaidGen="0.50"
              solvencyRatio={solvencyRatio}
              onDepositCapital={handleDepositCapital}
              connectedAddress={connectedAddress}
            />
          )}

          {activeTab === 'contract' && <ContractVerificationSection />}
        </div>
      </main>

      {/* Protocol Footer */}
      <Footer onNavigate={(tab) => setActiveTab(tab as any)} />

      {/* Live GenLayer On-Chain Transaction Modal */}
      <TransactionModal tx={activeTx} onClose={() => setActiveTx(null)} />
    </div>
  );
};
