import React, { useState } from 'react';
import { 
  CloudRain, 
  Sun, 
  MapPin, 
  ShieldCheck, 
  PlusCircle, 
  Check, 
  AlertCircle, 
  Layers, 
  Calendar, 
  FileText,
  DollarSign
} from 'lucide-react';
import { Product, TriggerType } from '../types';

interface ProductsCatalogProps {
  products: Product[];
  onBuyPolicy: (product: Product, farmerAddress: string) => void;
  onPublishProduct: (newProduct: Partial<Product>) => void;
  onFundProduct: (productId: string, amountGen: string) => void;
  connectedAddress: string;
}

export const ProductsCatalog: React.FC<ProductsCatalogProps> = ({
  products,
  onBuyPolicy,
  onPublishProduct,
  onFundProduct,
  connectedAddress,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'RAIN_BELOW' | 'RAIN_ABOVE'>('ALL');
  const [selectedProductForBuy, setSelectedProductForBuy] = useState<Product | null>(null);
  const [selectedProductForFund, setSelectedProductForFund] = useState<Product | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('0.5');

  // New product form state
  const [newCrop, setNewCrop] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newLat, setNewLat] = useState('9.06');
  const [newLon, setNewLon] = useState('7.49');
  const [newTrigger, setNewTrigger] = useState<TriggerType>('RAIN_BELOW');
  const [newThreshold, setNewThreshold] = useState('120'); // in mm
  const [newDays, setNewDays] = useState('14');
  const [newPremium, setNewPremium] = useState('0.1');
  const [newPayout, setNewPayout] = useState('0.5');
  const [newCapacity, setNewCapacity] = useState('25');
  const [newClause, setNewClause] = useState('ERA5 and MERRA-2 precipitation feeds decide trigger. Contests resolved using geotagged field photos.');

  const filteredProducts = products.filter(p => {
    if (filter === 'ALL') return true;
    return p.trigger === filter;
  });

  const formatGen = (weiStr: string): string => {
    try {
      const num = Number(BigInt(weiStr)) / 1e18;
      return num.toFixed(2);
    } catch {
      return '0.00';
    }
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrop || !newRegion) return;

    const thresholdTenths = Math.round(parseFloat(newThreshold) * 10);
    const premiumWei = (BigInt(Math.round(parseFloat(newPremium) * 1e4)) * BigInt(1e14)).toString();
    const payoutWei = (BigInt(Math.round(parseFloat(newPayout) * 1e4)) * BigInt(1e14)).toString();

    onPublishProduct({
      crop: newCrop,
      region: newRegion,
      lat: newLat,
      lon: newLon,
      trigger: newTrigger,
      threshold_tenths: thresholdTenths,
      window_days: parseInt(newDays, 10),
      premium_wei: premiumWei,
      payout_wei: payoutWei,
      capacity: parseInt(newCapacity, 10),
      primary: 'OPEN_METEO',
      backup: 'NASA_POWER',
      dispute_clause: newClause,
      periods: { contest: 86400, response: 86400, appeal: 86400 },
      replay: false,
    });

    setIsPublishModalOpen(false);
    // Reset form
    setNewCrop('');
    setNewRegion('');
  };

  return (
    <div className="products-catalog-section">
      <div className="section-header-row">
        <div>
          <span className="section-kicker text-emerald">Parametric Hedging Registry</span>
          <h2 className="section-title">Verified Agricultural Products</h2>
          <p className="section-subtitle">
            Index-based parametric contracts with predefined triggers, dual-satellite verification, and guaranteed escrow reserves.
          </p>
        </div>

        <div className="section-header-actions">
          <button 
            id="open-publish-modal-btn"
            className="btn btn-primary"
            onClick={() => setIsPublishModalOpen(true)}
          >
            <PlusCircle size={18} />
            <span>Publish New Product</span>
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
            All Products ({products.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'RAIN_BELOW' ? 'active' : ''}`}
            onClick={() => setFilter('RAIN_BELOW')}
          >
            <Sun size={15} className="text-amber" />
            Drought Protection (RAIN_BELOW)
          </button>
          <button 
            className={`filter-tab ${filter === 'RAIN_ABOVE' ? 'active' : ''}`}
            onClick={() => setFilter('RAIN_ABOVE')}
          >
            <CloudRain size={15} className="text-cyan" />
            Excess Rain / Flood (RAIN_ABOVE)
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="products-grid">
        {filteredProducts.map((product) => {
          const thresholdMm = (product.threshold_tenths / 10).toFixed(1);
          const premiumGen = formatGen(product.premium_wei);
          const payoutGen = formatGen(product.payout_wei);
          const fundedGen = formatGen(product.funded_wei);
          const availableUnits = product.capacity - product.sold_count;
          const isSoldOut = availableUnits <= 0;

          return (
            <div key={product.product_id} className="product-card glass-panel">
              <div className="product-card-header">
                <div className="product-crop-badge">
                  <div className="crop-icon-bubble">
                    {product.trigger === 'RAIN_BELOW' ? (
                      <Sun size={20} className="text-amber" />
                    ) : (
                      <CloudRain size={20} className="text-cyan" />
                    )}
                  </div>
                  <div>
                    <h3 className="product-crop-name">{product.crop}</h3>
                    <div className="product-id-tag">{product.product_id}</div>
                  </div>
                </div>

                <div className={`trigger-pill ${product.trigger === 'RAIN_BELOW' ? 'pill-drought' : 'pill-flood'}`}>
                  {product.trigger === 'RAIN_BELOW' ? 'DROUGHT HEDGE' : 'EXCESS FLOOD'}
                </div>
              </div>

              {/* Location & Coordinates */}
              <div className="product-region-row">
                <MapPin size={16} className="text-muted" />
                <span className="region-name">{product.region}</span>
                <span className="coords-badge">({product.lat}°, {product.lon}°)</span>
              </div>

              {/* Trigger Specifications */}
              <div className="product-specs-box">
                <div className="spec-row">
                  <span className="spec-label">Settlement Trigger</span>
                  <span className="spec-value highlight">
                    Rain {product.trigger === 'RAIN_BELOW' ? '<' : '>'} <strong>{thresholdMm} mm</strong>
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Observation Window</span>
                  <span className="spec-value">
                    <Calendar size={14} className="inline-icon" />
                    {product.window_days} Days
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Dual Oracles</span>
                  <span className="spec-value text-cyan">
                    {product.primary} + {product.backup}
                  </span>
                </div>
              </div>

              {/* Financial Metrics */}
              <div className="product-financials-grid">
                <div className="financial-cell">
                  <span className="financial-label">Coverage Premium</span>
                  <span className="financial-value text-emerald">{premiumGen} GEN</span>
                </div>
                <div className="financial-cell">
                  <span className="financial-label">Guaranteed Payout</span>
                  <span className="financial-value text-cyan">{payoutGen} GEN</span>
                </div>
                <div className="financial-cell">
                  <span className="financial-label">Capital Escrow</span>
                  <span className="financial-value">{fundedGen} GEN</span>
                </div>
                <div className="financial-cell">
                  <span className="financial-label">Available Capacity</span>
                  <span className={`financial-value ${isSoldOut ? 'text-red' : ''}`}>
                    {availableUnits} / {product.capacity}
                  </span>
                </div>
              </div>

              {/* Dispute Clause */}
              <div className="dispute-clause-box">
                <div className="clause-header">
                  <FileText size={13} className="text-muted" />
                  <span className="clause-title">Signed Dispute Clause</span>
                </div>
                <p className="clause-text">"{product.dispute_clause}"</p>
              </div>

              {/* Action Buttons */}
              <div className="product-card-actions">
                <button
                  id={`buy-policy-${product.product_id}`}
                  className="btn btn-primary btn-block"
                  disabled={isSoldOut}
                  onClick={() => setSelectedProductForBuy(product)}
                >
                  <ShieldCheck size={16} />
                  <span>{isSoldOut ? 'Capacity Exhausted' : `Buy Policy (${premiumGen} GEN)`}</span>
                </button>

                <button
                  id={`fund-product-${product.product_id}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedProductForFund(product)}
                  title="Underwriters: Inject capital reserves to increase capacity"
                >
                  <DollarSign size={14} />
                  <span>Fund Pool</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Buy Policy Modal */}
      {selectedProductForBuy && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <ShieldCheck size={22} className="text-emerald" />
                <h3>Underwrite Coverage Policy</h3>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setSelectedProductForBuy(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <div className="purchase-summary-card">
                <h4>{selectedProductForBuy.crop}</h4>
                <p className="text-muted">{selectedProductForBuy.region}</p>
                <div className="purchase-details-list">
                  <div className="detail-item">
                    <span>Trigger Condition:</span>
                    <strong>
                      Rainfall {selectedProductForBuy.trigger === 'RAIN_BELOW' ? '<' : '>'} {(selectedProductForBuy.threshold_tenths / 10).toFixed(1)} mm
                    </strong>
                  </div>
                  <div className="detail-item">
                    <span>Observation Duration:</span>
                    <strong>{selectedProductForBuy.window_days} Days</strong>
                  </div>
                  <div className="detail-item">
                    <span>Settlement Payout:</span>
                    <strong className="text-cyan">{formatGen(selectedProductForBuy.payout_wei)} GEN</strong>
                  </div>
                  <div className="detail-item">
                    <span>Premium to Pay:</span>
                    <strong className="text-emerald">{formatGen(selectedProductForBuy.premium_wei)} GEN</strong>
                  </div>
                  <div className="detail-item">
                    <span>Dual Oracles:</span>
                    <span>Open-Meteo ERA5 & NASA POWER MERRA-2</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Beneficiary Farmer Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={connectedAddress}
                  readOnly
                />
                <span className="form-hint">Address that receives automatic compensation upon settlement trigger.</span>
              </div>

              <div className="legal-notice-box">
                <AlertCircle size={16} className="text-amber" />
                <p>
                  By confirming, this policy is created on GenLayer GenVM. Once the observation window elapses, 
                  the decentralized oracle will read ERA5 & MERRA-2 satellite data. If triggered, payouts are released via pull-ledger.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setSelectedProductForBuy(null)}
              >
                Cancel
              </button>
              <button 
                id="confirm-buy-policy-btn"
                className="btn btn-primary"
                onClick={() => {
                  onBuyPolicy(selectedProductForBuy, connectedAddress);
                  setSelectedProductForBuy(null);
                }}
              >
                <Check size={16} />
                <span>Confirm & Sign Policy ({formatGen(selectedProductForBuy.premium_wei)} GEN)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fund Product Modal */}
      {selectedProductForFund && (
        <div className="modal-backdrop">
          <div className="modal-dialog glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <DollarSign size={22} className="text-cyan" />
                <h3>Fund Underwriting Reserve</h3>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setSelectedProductForFund(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body">
              <p className="text-muted">
                Inject capital into <strong>{selectedProductForFund.product_id}</strong> ({selectedProductForFund.crop}).
                Capital reserves back policy payouts and enable selling more coverage policies.
              </p>

              <div className="form-group">
                <label className="form-label">Capital Amount (GEN)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  className="form-input"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                />
              </div>

              <div className="stat-preview-row">
                <span>Current Capital Pool:</span>
                <strong>{formatGen(selectedProductForFund.funded_wei)} GEN</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-outline"
                onClick={() => setSelectedProductForFund(null)}
              >
                Cancel
              </button>
              <button 
                id="confirm-fund-btn"
                className="btn btn-secondary"
                onClick={() => {
                  onFundProduct(selectedProductForFund.product_id, fundAmount);
                  setSelectedProductForFund(null);
                }}
              >
                Deposit Capital
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Product Modal */}
      {isPublishModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog modal-lg glass-panel">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Layers size={22} className="text-emerald" />
                <h3>Publish New Hedging Product</h3>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setIsPublishModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePublishSubmit}>
              <div className="modal-body modal-grid-form">
                <div className="form-group">
                  <label className="form-label">Crop Name & Spec</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Yellow Dent Corn (Zea mays)"
                    value={newCrop}
                    onChange={(e) => setNewCrop(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Agricultural Region / District</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Des Moines County, Iowa, USA"
                    value={newRegion}
                    onChange={(e) => setNewRegion(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Latitude</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Longitude</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={newLon}
                      onChange={(e) => setNewLon(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Trigger Direction</label>
                    <select 
                      className="form-input"
                      value={newTrigger}
                      onChange={(e) => setNewTrigger(e.target.value as TriggerType)}
                    >
                      <option value="RAIN_BELOW">Drought (Rainfall Below Threshold)</option>
                      <option value="RAIN_ABOVE">Excess Rain / Flood (Rainfall Above Threshold)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Threshold (mm)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="form-input" 
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Window Days</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={newDays}
                      onChange={(e) => setNewDays(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Premium (GEN)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-input" 
                      value={newPremium}
                      onChange={(e) => setNewPremium(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payout (GEN)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-input" 
                      value={newPayout}
                      onChange={(e) => setNewPayout(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Max Policy Capacity</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Signed Dispute Adjudication Clause</label>
                  <textarea 
                    className="form-input textarea" 
                    rows={3}
                    value={newClause}
                    onChange={(e) => setNewClause(e.target.value)}
                    required
                  />
                  <span className="form-hint">Governs how GenLayer AI-validators adjudicate subjective disputes if satellite data is contested.</span>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-outline"
                  onClick={() => setIsPublishModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  id="submit-publish-product-btn"
                  type="submit" 
                  className="btn btn-primary"
                >
                  Deploy Product on GenLayer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
