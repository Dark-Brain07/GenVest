# GenVest — Decentralized Web Application Frontend

The **GenVest** web application is a high-performance, dark-themed decentralized application built using React 18, TypeScript, Vite, and custom cyber-nature Vanilla CSS. It provides an intuitive interface for interacting with the GenVest Intelligent Contract on GenLayer StudioNet.

- **Live Production URL**: [https://genvest.vercel.app](https://genvest.vercel.app)
- **GenLayer StudioNet Contract**: [`0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf`](https://explorer-studio.genlayer.com/address/0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf)

---

## Key Features

1. **Parametric Products Catalog**:
   - Browse crop hedging products (Maize, Wheat, Basmati Rice, Arabica Coffee).
   - Filter by trigger condition: Drought (`RAIN_BELOW`) vs Excess Rain / Flood (`RAIN_ABOVE`).
   - Purchase coverage policies with guaranteed payout escrow.
   - Underwrite new parametric products with signed dispute clauses.

2. **Live Dual-Atmospheric Satellite Radar**:
   - Interactive Open-Meteo ERA5 live API querying.
   - Real-world precipitation data fetching for preset agricultural hubs (Abuja, Cordoba, Punjab, Kiambu, Des Moines) or custom latitude/longitude coordinates.
   - Side-by-side comparison with NASA POWER MERRA-2 models.
   - Visual daily rainfall intensity timeline.

3. **Parametric Policy Lifecycle Manager**:
   - Full progression tracking: `ACTIVE` &rarr; `READ` &rarr; `CONTESTED` &rarr; `DECIDED` &rarr; `SETTLED`.
   - Action triggers for `read_index`, `contest`, `file_photo`, `file_page`, and `finalize`.
   - On-demand pull-ledger claim withdrawal.

4. **AI-Validator Consensus Deliberation View**:
   - Multi-validator committee inspection view for GenLayer Optimistic Democracy.
   - Evaluates submitted geotagged field photos and bulletins under the signed product dispute clause.

5. **Protocol Underwriting & Solvency Dashboard**:
   - Solvency ratio monitoring (Reserves vs Liabilities).
   - Capital injection form for underwriters with yield estimates.

6. **On-Chain Transparency & Verification Matrix**:
   - Direct explorer links to deployed StudioNet contract (`0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf`).
   - Audit compliance checklist.

---

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
npm run build
```
Generates optimized static assets in the `dist/` directory.

---

## Technology Stack
- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (Cyber-Nature Dark Theme, Glassmorphism, Glowing Radars)
- **Network**: GenLayer StudioNet (Chain ID 61999)
