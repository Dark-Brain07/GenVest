import React, { useState } from 'react';
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

interface Toast {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'oracle' | 'policies' | 'pool' | 'contract'>('products');
  const [connectedAddress, setConnectedAddress] = useState<string>('0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [userClaimableWei, setUserClaimableWei] = useState<string>('0');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Initial rich sample policies for live testing
  const [policies, setPolicies] = useState<Policy[]>([
    {
      policy_id: 'POL-000001',
      product_id: 'P-000001',
      farmer: '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5',
      insurer: '0x3252f04b1923B6fe4e53396f1FC80A0Db1CB3C17',
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
      product_id: 'P-000002',
      farmer: '0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5',
      insurer: '0x3252f04b1923B6fe4e53396f1FC80A0Db1CB3C17',
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
      evidence_id: 'EV-000001',
      policy_id: 'POL-000002',
      kind: 'PHOTO',
      by: 'FARMER',
      stage: 'CONTEST',
      caption: 'Drone multispectral capture demonstrating crop canopy senescence and leaf rolling',
      url: 'https://ipfs.io/ipfs/QmZtmD2qt8fJv32Sm8E4a2z98k3P1u4A',
      sha256: '4f81c9a632e1859bf5bb12a52efc15a7698501e389e8751f8b4172551a319f6a',
      filed_at: '2026-07-23T09:30:00Z',
    },
    {
      evidence_id: 'EV-000002',
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

  const addToast = (type: 'success' | 'info' | 'error', title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Protocol Stats
  const totalFundedWei = products.reduce((acc, p) => acc + BigInt(p.funded_wei), BigInt(0));
  const totalReservedWei = products.reduce((acc, p) => acc + BigInt(p.reserved_wei), BigInt(0));
  const totalFundedGen = (Number(totalFundedWei) / 1e18).toFixed(2);
  const totalReservedGen = (Number(totalReservedWei) / 1e18).toFixed(2);
  const activeCount = policies.filter((p) => p.state === 'ACTIVE').length;
  const settledCount = policies.filter((p) => p.state === 'SETTLED').length;
  const solvencyRatio = totalReservedWei > BigInt(0) 
    ? Math.round((Number(totalFundedWei) / Number(totalReservedWei)) * 100) 
    : 150;

  // Handler: Buy Coverage Policy
  const handleBuyPolicy = (product: Product, farmerAddress: string) => {
    const nextPolicyNum = policies.length + 1;
    const policyId = `POL-${String(nextPolicyNum).padStart(6, '0')}`;
    const now = new Date();
    const endDate = new Date(now.getTime() + product.window_days * 86400 * 1000);

    const newPolicy: Policy = {
      policy_id: policyId,
      product_id: product.product_id,
      farmer: farmerAddress,
      insurer: product.insurer,
      crop: product.crop,
      region: product.region,
      lat: product.lat,
      lon: product.lon,
      trigger: product.trigger,
      threshold_tenths: product.threshold_tenths,
      window_days: product.window_days,
      window_start: now.toISOString(),
      window_end: endDate.toISOString(),
      premium_wei: product.premium_wei,
      payout_wei: product.payout_wei,
      primary: product.primary,
      backup: product.backup,
      dispute_clause: product.dispute_clause,
      periods: product.periods,
      replay: product.replay,
      state: 'ACTIVE',
      reserved: true,
      paid_to_farmer: false,
      round_count: 0,
      bought_at: now.toISOString(),
    };

    setPolicies((prev) => [newPolicy, ...prev]);

    // Update product sold count & reserved
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === product.product_id) {
          const newReserved = (BigInt(p.reserved_wei) + BigInt(product.payout_wei)).toString();
          return {
            ...p,
            sold_count: p.sold_count + 1,
            reserved_wei: newReserved,
          };
        }
        return p;
      })
    );

    addToast(
      'success',
      'Policy Created & Escrow Locked',
      `Policy ${policyId} underwritten for ${product.crop}. Observation window is active.`
    );
    setActiveTab('policies');
  };

  // Handler: Publish New Product
  const handlePublishProduct = (newProd: Partial<Product>) => {
    const nextProdNum = products.length + 1;
    const productId = `P-${String(nextProdNum).padStart(6, '0')}`;
    const fullProduct: Product = {
      product_id: productId,
      insurer: connectedAddress,
      crop: newProd.crop || 'Crop Spec',
      region: newProd.region || 'Region',
      lat: newProd.lat || '0.0',
      lon: newProd.lon || '0.0',
      trigger: newProd.trigger || 'RAIN_BELOW',
      threshold_tenths: newProd.threshold_tenths || 1000,
      window_days: newProd.window_days || 14,
      premium_wei: newProd.premium_wei || '100000000000000000',
      payout_wei: newProd.payout_wei || '500000000000000000',
      capacity: newProd.capacity || 20,
      sold_count: 0,
      funded_wei: '0',
      reserved_wei: '0',
      primary: 'OPEN_METEO',
      backup: 'NASA_POWER',
      dispute_clause: newProd.dispute_clause || 'Standard GenVest dispute clause',
      periods: { contest: 86400, response: 86400, appeal: 86400 },
      replay: false,
      active: true,
      created_at: new Date().toISOString(),
    };

    setProducts((prev) => [fullProduct, ...prev]);
    addToast('success', 'Product Published', `Product ${productId} is now live in the GenVest registry.`);
  };

  // Handler: Fund Product Reserve
  const handleFundProduct = (productId: string, amountGen: string) => {
    const addedWei = (BigInt(Math.round(parseFloat(amountGen) * 1e4)) * BigInt(1e14)).toString();
    setProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          return {
            ...p,
            funded_wei: (BigInt(p.funded_wei) + BigInt(addedWei)).toString(),
          };
        }
        return p;
      })
    );
    addToast('success', 'Reserves Funded', `Injected ${amountGen} GEN into product ${productId} capital pool.`);
  };

  // Handler: Read Satellite Index
  const handleReadIndex = (policyId: string) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.policy_id === policyId) {
          const isTriggered = true; // Demonstration simulation
          return {
            ...p,
            state: 'READ',
            reading: {
              at: new Date().toISOString(),
              selected: 'OPEN_METEO',
              other: 'NASA_POWER',
              triggered: isTriggered,
              series: {},
              summaries: {},
              other_triggers: true,
            },
          };
        }
        return p;
      })
    );
    addToast(
      'info',
      'Satellite Reading Processed',
      `Open-Meteo ERA5 & NASA MERRA-2 recorded. Policy ${policyId} is now in the contest grace window.`
    );
  };

  // Handler: Contest Policy
  const handleContest = (policyId: string, statement: string) => {
    const now = new Date();
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.policy_id === policyId) {
          return {
            ...p,
            state: 'CONTESTED',
            contest: {
              by: 'FARMER',
              statement,
              bond_wei: '10000000000000000', // 0.01 GEN
              opened_at: now.toISOString(),
              response_ends: new Date(now.getTime() + 86400000).toISOString(),
              lapse_at: new Date(now.getTime() + 2 * 86400000).toISOString(),
            },
          };
        }
        return p;
      })
    );
    addToast(
      'info',
      'Dispute Contest Registered',
      `0.01 GEN bond escrowed. GenLayer AI validators assigned to adjudicate Policy ${policyId}.`
    );
  };

  // Handler: File Evidence
  const handleFileEvidence = (
    policyId: string,
    kind: 'PHOTO' | 'PAGE',
    caption: string,
    url: string
  ) => {
    const evId = `EV-${String(evidenceItems.length + 1).padStart(6, '0')}`;
    const hash = 'a' + Math.random().toString(16).substring(2, 10) + '9b' + Math.random().toString(16).substring(2, 10) + 'c7' + Math.random().toString(16).substring(2, 10);
    const newEv: EvidenceItem = {
      evidence_id: evId,
      policy_id: policyId,
      kind,
      by: 'FARMER',
      stage: 'CONTEST',
      caption,
      url: url || 'https://ipfs.io/ipfs/' + hash.slice(0, 32),
      sha256: hash,
      filed_at: new Date().toISOString(),
    };
    setEvidenceItems((prev) => [...prev, newEv]);
    addToast('success', 'Evidence Filed On-Chain', `Attachment ${evId} logged with SHA-256 hash.`);
  };

  // Handler: Decide Dispute via AI-Validator consensus
  const handleDecideDispute = (policyId: string) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.policy_id === policyId) {
          return {
            ...p,
            state: 'DECIDED',
            decision: {
              verdict: 'USE_OTHER',
              outcome: true,
              round: 1,
              against: ['OPEN_METEO'],
            },
          };
        }
        return p;
      })
    );
    addToast(
      'success',
      'AI Consensus Reached',
      `Validators ruled USE_OTHER under dispute clause. Payout authorized for Policy ${policyId}.`
    );
  };

  // Handler: Finalize Policy
  const handleFinalize = (policyId: string) => {
    const targetPolicy = policies.find((p) => p.policy_id === policyId);
    if (!targetPolicy) return;

    const isFarmerPaid = targetPolicy.reading?.triggered || targetPolicy.decision?.outcome === true;

    if (isFarmerPaid) {
      // Credit pull-ledger balance
      setUserClaimableWei((prev) => (BigInt(prev) + BigInt(targetPolicy.payout_wei)).toString());
    }

    setPolicies((prev) =>
      prev.map((p) => {
        if (p.policy_id === policyId) {
          return {
            ...p,
            state: 'SETTLED',
            paid_to_farmer: isFarmerPaid,
          };
        }
        return p;
      })
    );

    addToast(
      'success',
      'Claim Finalized',
      isFarmerPaid
        ? `Settlement complete! ${(Number(targetPolicy.payout_wei) / 1e18).toFixed(2)} GEN credited to your claimable balance.`
        : 'Observation window elapsed without drought/flood trigger. Capital returned to underwriter.'
    );
  };

  // Handler: Claim Pull-Ledger Balance
  const handleClaimBalance = () => {
    const claimedGen = (Number(userClaimableWei) / 1e18).toFixed(2);
    setUserClaimableWei('0');
    addToast('success', 'Funds Withdrawn', `Successfully transferred ${claimedGen} GEN to wallet ${connectedAddress.slice(0, 8)}...`);
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
        connectedAddress={connectedAddress}
        onSwitchAddress={(addr: string) => setConnectedAddress(addr)}
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
              onFileEvidence={handleFileEvidence}
              onDecideDispute={handleDecideDispute}
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
    </div>
  );
};
