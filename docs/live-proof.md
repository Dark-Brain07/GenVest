# GenVest — Live StudioNet Deployment Proof

This document provides cryptographic proof and on-chain receipts for the deployment and initialization of the **GenVest Intelligent Contract** on GenLayer StudioNet.

---

## 1. On-Chain Summary Table

| Transaction Purpose | Transaction Hash | Explorer Link | Execution Source | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Contract Deployment** | `0xa149f549da1d8582038a6cfb259ff950c7b5af0c2a3c0239b5e0ac99a16dc8e7` | [View Deployment Tx](https://explorer-studio.genlayer.com/tx/0xa149f549da1d8582038a6cfb259ff950c7b5af0c2a3c0239b5e0ac99a16dc8e7) | GenLayer Py SDK | `FINALIZED` |
| **Flagship Product (`P-000001`)** | `0xdd4512a2a0dff28bc0595b0f6aebdf3e0c31009e8ccd7952733e0bb7fb97daaf` | [View Product Tx](https://explorer-studio.genlayer.com/tx/0xdd4512a2a0dff28bc0595b0f6aebdf3e0c31009e8ccd7952733e0bb7fb97daaf) | GenLayer Py SDK | `FINALIZED` |
| **Reserve Funding (`P-000001`)** | `0x4ffe4c5cfeccd7f0c73f4a85295d9d12f84d4b5676629dff7cacc3c0e67bdad8` | [View Funding Tx](https://explorer-studio.genlayer.com/tx/0x4ffe4c5cfeccd7f0c73f4a85295d9d12f84d4b5676629dff7cacc3c0e67bdad8) | GenLayer Py SDK | `FINALIZED` |
| **Product Creation (`P-000002`)** | `0x07227e7c00c19f3edcd20ecc0a80989e03b357bef46d4e0024f8c1064268dbbb` | [View Product Tx](https://explorer-studio.genlayer.com/tx/0x07227e7c00c19f3edcd20ecc0a80989e03b357bef46d4e0024f8c1064268dbbb) | GenLayer JS Client | `FINALIZED` |
| **Reserve Funding (`P-000002`)** | `0xb57078dba9891d97b086a7074c32a2c3c42e349c3dc79d65d0bca92d9dfee722` | [View Funding Tx](https://explorer-studio.genlayer.com/tx/0xb57078dba9891d97b086a7074c32a2c3c42e349c3dc79d65d0bca92d9dfee722) | GenLayer JS Client | `FINALIZED` |
| **Policy Underwriting (`POL-000001`)** | `0x2db24a38acce9c14e9cb438cbdb1d47a0ce4dd13f97f53c5ff46fb1e8229a1e9` | [View Policy Tx](https://explorer-studio.genlayer.com/tx/0x2db24a38acce9c14e9cb438cbdb1d47a0ce4dd13f97f53c5ff46fb1e8229a1e9) | GenLayer JS Client | `FINALIZED` |
| **Live Frontend Product (`P-000003`)** | `0x1a12a5e097ddd838068f1979752ed536c618feb2ad14ba82aea41253a64aeba9` | [View Frontend Tx](https://explorer-studio.genlayer.com/tx/0x1a12a5e097ddd838068f1979752ed536c618feb2ad14ba82aea41253a64aeba9) | **Vercel dApp UI (`genvest.vercel.app`)** | `FINALIZED` |

---

## 2. Deployed Contract Specifications

- **Contract Name**: `GenVest`
- **Live Web Application (Vercel)**: [`https://genvest.vercel.app`](https://genvest.vercel.app)
- **Contract Address**: [`0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf`](https://explorer-studio.genlayer.com/address/0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf)
- **Deployer Wallet**: `0x99Ec7a50886C5769Fc45B53c9D7afc40e88923F5`
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

You can verify the contract state independently using the GenLayer CLI or Python SDK:

```bash
# 1. Read Protocol Configuration
python -c "from genlayer_py import GenLayerClient; client = GenLayerClient('https://studio.genlayer.com/api'); print(client.read_contract('0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf', 'get_protocol_config'))"

# 2. Inspect Flagship Product P-000001
python -c "from genlayer_py import GenLayerClient; client = GenLayerClient('https://studio.genlayer.com/api'); print(client.read_contract('0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf', 'get_product', ['P-000001']))"

# 3. Read Protocol Statistics
python -c "from genlayer_py import GenLayerClient; client = GenLayerClient('https://studio.genlayer.com/api'); print(client.read_contract('0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf', 'get_protocol_stats'))"
```
