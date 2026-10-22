# GenVest — Live StudioNet Deployment Proof

This document provides cryptographic proof and on-chain receipts for the deployment, initialization, and frontend transactions of the **GenVest Intelligent Contract** on GenLayer StudioNet.

---

## 1. On-Chain Summary Table

| Transaction Purpose | Transaction Hash | Explorer Link | Execution Source | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Contract Deployment** | `0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912` | [View Deployment Tx](https://explorer-studio.genlayer.com/tx/0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912) | GenLayer Py SDK | `FINALIZED` |
| **Flagship Product (`P-000001`)** | `0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb` | [View Product Tx](https://explorer-studio.genlayer.com/tx/0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb) | GenLayer Py SDK | `FINALIZED` |
| **Reserve Funding (`P-000001`)** | `0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc` | [View Funding Tx](https://explorer-studio.genlayer.com/tx/0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc) | GenLayer Py SDK | `FINALIZED` |
| **Frontend Product Creation (`P-000002`)** | `0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36` | [View Product Tx](https://explorer-studio.genlayer.com/tx/0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36) | `genlayer-js` Client | `FINALIZED` |
| **Frontend Reserve Funding (`P-000002`)** | `0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4` | [View Funding Tx](https://explorer-studio.genlayer.com/tx/0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4) | `genlayer-js` Client | `FINALIZED` |
| **Frontend Policy Purchase (`Y-000001`)** | `0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709` | [View Policy Tx](https://explorer-studio.genlayer.com/tx/0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709) | `genlayer-js` Client | `FINALIZED` |

---

## 2. Deployed Contract Specifications

- **Contract Name**: `GenVest`
- **Contract Address**: [`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA)
- **Deployer Wallet**: `0x8C69e68B218191ce4839FBe1aEE70388113921B2`
- **Network Name**: `GenLayer StudioNet`
- **Chain ID**: `61999`
- **RPC Endpoint**: `https://studio.genlayer.com/api`
- **Runner Hash**: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

---

## 3. Flagship Product Initialized (`P-000001`)

The flagship agricultural protection product was registered directly on-chain during initialization:

```json
{
  "product_id": "P-000001",
  "crop": "Maize (Zea mays)",
  "region": "Federal Capital Territory, Abuja, Nigeria",
  "lat": "9.06",
  "lon": "7.49",
  "trigger": "RAIN_BELOW",
  "threshold_tenths": 1400,
  "window_days": 14,
  "premium_wei": "100000000000000000",
  "payout_wei": "500000000000000000",
  "capacity": 20,
  "primary": "OPEN_METEO",
  "backup": "NASA_POWER",
  "dispute_clause": "If ERA5 and MERRA-2 disagree on drought threshold, local field photographs and official meteorological reports decide which reading governs.",
  "periods": {
    "contest": 86400,
    "response": 86400,
    "appeal": 86400
  },
  "replay": true,
  "replay_start": "2026-08-01"
}
```

---

## 4. Verification CLI Commands

You can verify the contract state independently using the GenLayer Python SDK or CLI:

```bash
# 1. Read Protocol Configuration
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_config', []))"

# 2. Inspect Flagship Product P-000001
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_product', ['P-000001']))"

# 3. Inspect Live Product P-000002
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_product', ['P-000002']))"

# 4. Inspect Live Policy Y-000001
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_policy', ['Y-000001']))"

# 5. Read Protocol Statistics
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_stats', []))"
```
