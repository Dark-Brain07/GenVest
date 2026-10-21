"""
GenVest StudioNet Deployment & On-Chain Verification Pipeline.

Automates:
1. Deployment of the GenVest intelligent contract to GenLayer StudioNet (Chain ID 61999)
2. Polling for validator consensus finality (TransactionStatus.FINALIZED)
3. Live on-chain view method verification (get_config, get_stats)
4. Initialization of flagship live product (Abuja Maize Drought Protection)
5. Underwriter capital reserve funding
6. Persistence of deployment proofs and transaction hashes for documentation
"""

from __future__ import annotations
import json
import os
import sys
import time
from pathlib import Path

try:
    import genlayer_py as gl
    from genlayer_py.chains import studionet
    from genlayer_py.types import TransactionStatus
except ImportError:
    print("Error: genlayer-py is required. Run: pip install genlayer-py")
    sys.exit(1)


def main():
    root = Path(__file__).resolve().parents[1]
    contract_path = root / "contracts" / "genvest.py"

    if not contract_path.exists():
        print(f"Error: Contract not found at {contract_path}")
        sys.exit(1)

    print("=" * 75, flush=True)
    print("      GENVEST PROTOCOL - STUDIONET DEPLOYMENT & PROOF PIPELINE     ", flush=True)
    print("=" * 75, flush=True)

    # 1. Setup Deployer Account
    raw_key = os.environ.get("DEPLOYER_PRIVATE_KEY", "").strip()
    if raw_key:
        account = gl.create_account(raw_key if raw_key.startswith("0x") else f"0x{raw_key}")
        print(f"[+] Using configured account from DEPLOYER_PRIVATE_KEY: {account.address}", flush=True)
    else:
        account = gl.create_account()
        print(f"[+] Generated fresh deployment account: {account.address}", flush=True)

    client = gl.create_client(chain=studionet, account=account)

    # 2. Fund Deployer via StudioNet Faucet
    balance = client.get_balance(account.address)
    print(f"[*] Initial Account Balance: {balance} wei", flush=True)
    if balance < 10**17:
        print("[*] Requesting testnet funds via StudioNet faucet...", flush=True)
        try:
            client.fund_account(account.address, 10**18)
            time.sleep(3)
            balance = client.get_balance(account.address)
            print(f"[+] Updated Account Balance: {balance} wei (1.0 GEN)", flush=True)
        except Exception as e:
            print(f"[*] Faucet status note: {e}", flush=True)

    # 3. Read Contract Code
    contract_code = contract_path.read_text(encoding="utf-8")
    print(f"\n[*] Loaded contract code from {contract_path} ({len(contract_code):,} bytes)")

    # 4. Deploy Contract
    print("\n[+] Deploying GenVest intelligent contract to GenLayer StudioNet...", flush=True)
    try:
        deploy_tx_hash = client.deploy_contract(code=contract_code, args=[])
        print(f"[+] Deployment Transaction Hash: {deploy_tx_hash}", flush=True)
        print("[*] Awaiting multi-validator consensus & finality on StudioNet...", flush=True)

        receipt = client.wait_for_transaction_receipt(
            transaction_hash=deploy_tx_hash,
            status=TransactionStatus.FINALIZED,
            interval=3000,
            retries=90,
        )

        # Extract address safely
        contract_address = None
        if isinstance(receipt, dict):
            contract_address = (
                receipt.get("data", {}).get("contract_address")
                or receipt.get("contract_address")
            )
        elif hasattr(receipt, "contract_address"):
            contract_address = receipt.contract_address

        if not contract_address and isinstance(receipt, dict) and "data" in receipt:
            contract_address = receipt["data"].get("address")

        print("\n" + "=" * 75, flush=True)
        print("  DEPLOYMENT MINED AND FINALIZED BY GENLAYER VALIDATOR QUORUM!  ", flush=True)
        print("=" * 75, flush=True)
        print(f"Contract Name:             GenVest")
        print(f"Deployed Contract Address: {contract_address}")
        print(f"Deployment Tx Hash:        {deploy_tx_hash}")
        explorer_address_url = f"https://explorer-studio.genlayer.com/address/{contract_address}"
        explorer_tx_url = f"https://explorer-studio.genlayer.com/tx/{deploy_tx_hash}"
        print(f"Explorer Contract Link:    {explorer_address_url}")
        print(f"Explorer Tx Link:          {explorer_tx_url}")

        # 5. Live View Call Verification
        print("\n[*] Verifying live contract view methods...", flush=True)
        config = client.read_contract(
            address=contract_address,
            function_name="get_config",
            args=[],
        )
        print(f"[+] get_config() returned: version={config.get('version')} ruleset={config.get('ruleset')}")
        print(f"[+] Supported sources: {config.get('sources')}")

        stats = client.read_contract(
            address=contract_address,
            function_name="get_stats",
            args=[],
        )
        print(f"[+] get_stats() returned: {stats}")

        # 6. Initialize Flagship Product (Abuja Maize Drought Protection)
        print("\n[*] Publishing flagship climate hedging product on-chain...", flush=True)
        product_params = {
            "crop": "Maize (Zea mays)",
            "region": "Federal Capital Territory, Abuja, Nigeria",
            "lat": "9.06",
            "lon": "7.49",
            "trigger": "RAIN_BELOW",
            "threshold_tenths": 1400,        # 140.0 mm
            "window_days": 14,
            "premium_wei": str(10**17),       # 0.10 GEN
            "payout_wei": str(5 * 10**17),    # 0.50 GEN
            "capacity": 20,
            "primary": "OPEN_METEO",
            "backup": "NASA_POWER",
            "dispute_clause": "If ERA5 and MERRA-2 disagree on drought threshold, local field photographs and official meteorological reports decide which reading governs.",
            "periods": {
                "contest": 86400,
                "response": 86400,
                "appeal": 86400
            },
            "replay": True,
            "replay_start": "2026-08-01"
        }

        create_tx = client.write_contract(
            address=contract_address,
            function_name="create_product",
            args=[json.dumps(product_params)],
        )
        print(f"[+] create_product() Tx Hash: {create_tx}", flush=True)
        client.wait_for_transaction_receipt(
            transaction_hash=create_tx,
            status=TransactionStatus.FINALIZED,
            interval=3000,
            retries=60,
        )
        print(f"[+] Flagship product published and finalized! (Tx: {create_tx})")

        # 7. Fund Underwriter Capital Pool
        print("\n[*] Funding capital pool for flagship product (0.20 GEN)...", flush=True)
        fund_tx = client.write_contract(
            address=contract_address,
            function_name="fund_product",
            args=["P-000001"],
            value=2 * 10**17,
        )
        print(f"[+] fund_product() Tx Hash: {fund_tx}", flush=True)
        client.wait_for_transaction_receipt(
            transaction_hash=fund_tx,
            status=TransactionStatus.FINALIZED,
            interval=3000,
            retries=60,
        )
        print(f"[+] Capital pool funded and finalized! (Tx: {fund_tx})")

        # 8. Record Deployment Metadata
        deploy_meta = {
            "network": "studionet",
            "chain_id": studionet.id,
            "contract_name": "GenVest",
            "contract_address": contract_address,
            "deploy_tx_hash": deploy_tx_hash,
            "deployer_address": account.address,
            "explorer_contract_url": explorer_address_url,
            "explorer_tx_url": explorer_tx_url,
            "flagship_product_id": "P-000001",
            "create_product_tx_hash": create_tx,
            "create_product_tx_url": f"https://explorer-studio.genlayer.com/tx/{create_tx}",
            "fund_product_tx_hash": fund_tx,
            "fund_product_tx_url": f"https://explorer-studio.genlayer.com/tx/{fund_tx}",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        docs_dir = root / "docs"
        docs_dir.mkdir(exist_ok=True)
        meta_file = docs_dir / "deployment.json"
        meta_file.write_text(json.dumps(deploy_meta, indent=2), encoding="utf-8")
        print(f"\n[+] Saved complete deployment metadata to {meta_file}")

        return deploy_meta

    except Exception as e:
        print(f"\n[!] Deployment error: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
