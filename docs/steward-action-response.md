# GenVest — Response & Resolution to GenLayer Steward Action Request

**Target Network**: GenLayer StudioNet (Chain ID: `61999`)  
**Intelligent Contract**: `GenVest`  
**Contract Address**: [`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA)  
**GitHub Repository**: [https://github.com/Dark-Brain07/GenVest](https://github.com/Dark-Brain07/GenVest)  
**Date**: October 22, 2026  

---

## 1. Executive Summary

This document serves as the formal response to the GenLayer Steward action request for the **GenVest** autonomous parametric climate hedging protocol. Every requested item has been resolved, verified through mathematical invariants, tested with direct unit tests, compiled and verified through the GenVM linter, deployed to GenLayer StudioNet, and validated through live on-chain write transactions broadcast directly via `genlayer-js`.

### Steward Request Overview & Action Status

| Steward Request Requirement | Implementation Status | Verification Proof |
| :--- | :---: | :--- |
| **1. Settlement Accounting Correction** (Segregate farmer payout from withdrawable & reusable product capital until claimed) | **RESOLVED** | Deducted from `funded_wei` & tracked in `paid_out_wei` upon settlement |
| **2. Invariant Test Implementation** (Covering settlement, attempted underwriter withdrawal, attempted reuse, and claim) | **RESOLVED** | New direct test `test_settlement_accounting_invariant_segregation_and_claim` (17/17 passed) |
| **3. Application Wallet as Actual Signer** (Synchronize displayed UI address with actual cryptographic transaction signer) | **RESOLVED** | `WalletContext` & `genlayerService` bind genuine signers to `msg.sender` |
| **4. Real Contract IDs & State Usage** (Decode returned IDs and state from receipts instead of synthetic counters) | **RESOLVED** | Returns parsed from leader receipt payload (`P-000002`, `Y-000001`) |
| **5. Preserve Failed Writes as Failures** (No optimistic UI mutations masking on-chain execution errors) | **RESOLVED** | `receipt.consensus_data.leader_receipt[0].result.status` check with zero optimistic fallback |
| **6. Full Dispute/Appeal Workflow Integration** (Connect evidence, response, contest decision, and appeal to contract methods) | **RESOLVED** | All 6 methods (`answer`, `appeal`, `decide_appeal`, `file_photo`, `file_page`, `decide_contest`) fully wired |
| **7. Live Frontend Transactions with `genlayer-js`** (Broadcast and verify real on-chain state changes) | **RESOLVED** | 3 live transactions finalized on StudioNet with consensus |

---

## 2. Detailed Technical Fixes

### 2.1. Settlement Accounting Correction
**Problem**: Previously, when a policy was settled in favor of a farmer, `_release()` released the reserved capital (`reserved_wei -= payout`) into the general pool before the farmer invoked `claim()`. This inadvertently allowed underwriters to withdraw that capital via `withdraw_capital()` or allowed new buyers to reuse that capacity via `buy_policy()`.

**Solution**:
1. Added `"paid_out_wei": "0"` to product storage records in `create_product()`.
2. Updated `_release(self, y: dict, paid_out: bool = False)` in `contracts/genvest.py`:
   - When `paid_out=True` (triggered upon affirmative settlement `_settle(...)`), the payout amount is **permanently deducted** from the product's pool:
     ```python
     if paid_out:
         funded = int(p["funded_wei"])
         p["funded_wei"] = str(max(0, funded - payout))
         p["paid_out_wei"] = str(int(p.get("paid_out_wei", "0")) + payout)
     ```
   - Simultaneously, `reserved_wei` is unreserved.
   - The payout is credited to `self.balances[farmer]`.
3. In `withdraw_capital()`, available unreserved capital is strictly computed as `funded_wei - reserved_wei`. Because `funded_wei` was decreased by `payout`, the underwriter cannot withdraw the farmer's payout.
4. In `buy_policy()`, capacity is strictly bounded by `funded_wei - reserved_wei >= payout`. Because `funded_wei` was decreased, no subsequent policy can reuse the capital allocated to the unsettled/unclaimed claim.
5. In `claim()`, the farmer pulls their payout directly from `self.balances[farmer]`.

### 2.2. Invariant Test Implementation
We authored a dedicated end-to-end invariant test in `tests/test_direct_genvest.py`:
`test_settlement_accounting_invariant_segregation_and_claim(direct_vm, contract_runner)`

**Test Invariant Matrix**:
1. **Initial Setup**: Underwriter creates and funds a product (`P-000001`) with exactly 1.00 GEN (`1,000,000,000,000,000,000` wei).
2. **Policy Issuance**: Farmer buys a policy with 0.50 GEN payout. `reserved_wei` becomes 0.50 GEN. Available unreserved capital = `1.00 - 0.50 = 0.50 GEN`.
3. **Trigger Settlement**: Oracle reads trigger precipitation; policy settles affirmatively (`SETTLED`). Payout (0.50 GEN) is credited to `farmer` balance.
4. **Attempted Underwriter Withdrawal Invariant**:
   - Underwriter attempts to withdraw 0.51 GEN (attempting to tap into the 0.50 GEN payout).
   - **Contract Rejects**: `DirectExecutionError("withdrawal exceeds available unreserved capital (500000000000000000 wei available)")`.
5. **Attempted Capacity Reuse Invariant**:
   - Another policy purchase is attempted when only 0.50 GEN remains in total. If a policy requires 0.51 GEN, or if two policies requiring 0.50 GEN each are attempted:
   - **Contract Rejects**: `DirectExecutionError("underwriting pool lacks unreserved capacity")`.
6. **Farmer Claim Execution**:
   - Farmer calls `claim()`.
   - Contract emits return JSON with `claimed_wei = 500,000,000,000,000,000` wei.
7. **Post-Claim Solvency Check**:
   - Underwriter balance is untouched.
   - Product capital remains strictly `500,000,000,000,000,000` wei unreserved.
   - Product `paid_out_wei` reflects `500,000,000,000,000,000` wei.

**Test Execution Result**:
```bash
python -m pytest tests/test_direct_genvest.py -v
============================= test session starts =============================
tests/test_direct_genvest.py::test_protocol_config_and_initial_stats PASSED
tests/test_direct_genvest.py::test_create_product_validation PASSED
tests/test_direct_genvest.py::test_fund_and_withdraw_capital PASSED
tests/test_direct_genvest.py::test_buy_policy_and_reserve_capital PASSED
tests/test_direct_genvest.py::test_buy_policy_insufficient_capital_rejected PASSED
tests/test_direct_genvest.py::test_read_index_premature_rejection PASSED
tests/test_direct_genvest.py::test_read_index_consensus_both_datasets PASSED
tests/test_direct_genvest.py::test_contest_refused_when_datasets_agree PASSED
tests/test_direct_genvest.py::test_contest_and_adjudication_lifecycle PASSED
tests/test_direct_genvest.py::test_finalize_and_pull_ledger_claim PASSED
tests/test_direct_genvest.py::test_void_unread_after_long_stop PASSED
tests/test_direct_genvest.py::test_lapse_contest_after_long_stop PASSED
tests/test_direct_genvest.py::test_appeal_lifecycle_and_reversal PASSED
tests/test_direct_genvest.py::test_no_reliable_reading_voids_and_refunds PASSED
tests/test_direct_genvest.py::test_photo_evidence_validation PASSED
tests/test_direct_genvest.py::test_web_page_evidence_consensus PASSED
tests/test_direct_genvest.py::test_settlement_accounting_invariant_segregation_and_claim PASSED

============================= 17 passed in 0.99s ==============================
```

### 2.3. Application Wallet as Actual Transaction Signer
**Problem**: The displayed wallet address in the UI could previously drift from the actual signer executing transactions in `genlayer-js`.

**Solution**:
1. Re-architected `frontend/src/services/genlayerService.ts` to manage genuine cryptographic signers:
   - When connected via browser wallet (MetaMask, Rabby), the client signs directly via window provider.
   - When selecting deterministic role accounts (e.g. Underwriter Alice, Farmer Bob), `genlayerService` creates genuine cryptographic accounts using `createAccount(privateKey)` and binds them to the `genlayer-js` client.
   - Added `genlayerService.getSignerAddress()` returning the true cryptographic `account.address`.
2. Updated `frontend/src/context/WalletContext.tsx` to source the displayed address directly from `genlayerService.getSignerAddress()`.
3. Verified on-chain: `msg.sender` in transactions strictly matches the displayed address:
   - Alice: `0xAfc40A8D303e15e3D80572c530Bb0AD3f669e609` &rarr; registered as `insurer` in `P-000002`.
   - Bob: `0xd055e95b0f06B87Fdcc9938076F52c17A34781Ad` &rarr; registered as `farmer` in `Y-000001`.

### 2.4. Real Contract IDs & State Usage
**Problem**: The frontend should not generate synthetic local IDs (e.g. `P-${Date.now()}`) or mock state.

**Solution**:
1. Updated `genlayerService.ts` to extract return values directly from GenVM leader receipts:
   ```typescript
   export function extractReturnedValue(receipt: any): any {
     const leader = receipt.consensus_data?.leader_receipt?.[0];
     if (leader?.result?.payload?.readable) {
       try { return JSON.parse(leader.result.payload.readable); }
       catch { return leader.result.payload.readable; }
     }
     return null;
   }
   ```
2. In `frontend/src/App.tsx`, upon transaction finality of `create_product`, the returned ID (e.g. `P-000002`) is read and refreshed directly from on-chain storage via `get_product(returnedId)`.
3. Upon `buy_policy`, the returned policy ID (e.g. `Y-000001`) is retrieved from the receipt and fetched directly via `get_policy(returnedId)`.
4. On application mount, `App.tsx` queries `get_product_count()` and `get_product(pid)` for all on-chain products, populating the UI purely from persistent blockchain state.

### 2.5. Preserve Failed Writes as Failures
**Problem**: Optimistic state updates or try/catch blocks that fall back to mock UI changes can mask on-chain transaction reverts or contract rejections.

**Solution**:
1. In `genlayerService.ts`, when a transaction receipt is returned by `waitForTransactionReceipt`:
   ```typescript
   const leaderResult = receipt.consensus_data?.leader_receipt?.[0]?.result;
   if (leaderResult && (leaderResult.status === 'contract_error' || leaderResult.status === 'error')) {
     const errorMsg = receipt.consensus_data?.leader_receipt?.[0]?.genvm_result?.stderr 
       || leaderResult.payload?.readable 
       || 'Transaction failed on-chain in GenVM execution';
     throw new Error(errorMsg);
   }
   ```
2. In `App.tsx` and all UI components, if `writeContract` or receipt polling throws an error, the error is immediately propagated to the user through the transaction error modal. Zero optimistic mutations are made to local state.

### 2.6. Full Dispute, Evidence, Response & Appeal Workflow
**Solution**:
All dispute lifecycle methods in `contracts/genvest.py` are now fully exposed and connected in the frontend UI:
- **`answer_contest(policy_id, text)`**: Connected in `PolicyManager.tsx` via `Submit Response` modal.
- **`file_photo(policy_id, url, sha256, lat, lon, capture_time, notes)`**: Connected in `PolicyManager.tsx` via `File Photographic Evidence` modal.
- **`file_page(policy_id, url, sha256, title, text)`**: Connected in `PolicyManager.tsx` via `File Meteorological Bulletin` modal.
- **`decide_contest(policy_id)`**: Connected in `DisputeDeliberationModal.tsx` and `PolicyManager.tsx` with live LLM comparative consensus trigger.
- **`appeal(policy_id, statement)`**: Connected in `PolicyManager.tsx` via `Escalate to Appeal` modal (payable with appeal bond).
- **`decide_appeal(policy_id)`**: Connected in `PolicyManager.tsx` via `Decide Appeal` on-chain transaction.

### 2.7. GenVM `@gl.public.write.payable` Decorators
During StudioNet deployment, we identified that GenVM strictly validates payable entrypoints:
Calling a method with `value > 0` on a method with only `@gl.public.write` raises `ValueError: called non-payable method with non-zero value`.
We updated the four payable methods in `contracts/genvest.py` to use `@gl.public.write.payable`:
- `fund_product` (receives native GEN capital pool funding)
- `buy_policy` (receives exact premium)
- `contest` (receives contest bond)
- `appeal` (receives appeal bond)

---

## 3. Live On-Chain Proofs via `genlayer-js`

### 3.1. Contract Deployment & Flagship Initialization
- **Deployed Contract Address**: [`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA)
- **Deployment Transaction**: [`0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912`](https://explorer-studio.genlayer.com/tx/0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912)
- **Flagship Product Creation (`P-000001` - Abuja Maize)**: [`0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb`](https://explorer-studio.genlayer.com/tx/0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb)
- **Flagship Reserve Funding (`P-000001` - 0.20 GEN)**: [`0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc`](https://explorer-studio.genlayer.com/tx/0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc)

### 3.2. Live Frontend Transactions Executed with `genlayer-js`
The automated test script (`frontend/scripts/run_frontend_live_proof.mjs`) used `genlayer-js` to broadcast and finalize three sequential transactions from genuine role signers:

| # | Action | Signer Role | Signer Address | Value | Transaction Hash | Explorer Link | Consensus Status | Returned ID |
| :-: | :--- | :--- | :--- | :---: | :--- | :--- | :---: | :---: |
| **1** | `create_product` | Underwriter Alice | `0xAfc40A8D303e15e3D80572c530Bb0AD3f669e609` | 0 GEN | `0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36` | [View Tx](https://explorer-studio.genlayer.com/tx/0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36) | `FINALIZED` | `P-000002` |
| **2** | `fund_product` | Underwriter Alice | `0xAfc40A8D303e15e3D80572c530Bb0AD3f669e609` | 0.50 GEN | `0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4` | [View Tx](https://explorer-studio.genlayer.com/tx/0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4) | `FINALIZED` | `500,000,000,000,000,000` wei |
| **3** | `buy_policy` | Farmer Bob | `0xd055e95b0f06B87Fdcc9938076F52c17A34781Ad` | 0.10 GEN | `0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709` | [View Tx](https://explorer-studio.genlayer.com/tx/0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709) | `FINALIZED` | `Y-000001` |

### 3.3. Verified On-Chain Persistent State
Directly following the execution of these transactions, view methods queried against the smart contract returned:
```json
{
  "product_P_000002": {
    "product_id": "P-000002",
    "crop": "Hard Red Winter Wheat",
    "insurer": "0xafc40a8d303e15e3d80572c530bb0ad3f669e609",
    "sold_count": 1,
    "funded_wei": "500000000000000000",
    "reserved_wei": "500000000000000000",
    "paid_out_wei": "0"
  },
  "policy_Y_000001": {
    "policy_id": "Y-000001",
    "farmer": "0xd055e95b0f06b87fdcc9938076f52c17a34781ad",
    "insurer": "0xafc40a8d303e15e3d80572c530bb0ad3f669e609",
    "state": "ACTIVE",
    "reserved": true,
    "premium_wei": "100000000000000000",
    "payout_wei": "500000000000000000"
  },
  "protocol_stats": {
    "product_count": 2,
    "policy_count": 1,
    "held_wei": "800000000000000000"
  }
}
```

---

## 4. Mandatory 6-Point Audit Checklist

| # | Audit Item | Status | Verification Details |
| :-: | :--- | :---: | :--- |
| **1** | **Closure & Storage Pre-Extraction** | **PASSED** | Audited all non-deterministic closures (`leader()`, `leader_fn()`). Zero references to `self.` or contract storage attributes inside closures. All storage data is pre-extracted into local Python primitives (`dict`, `str`, `list`, `int`) prior to defining closures. |
| **2** | **Pinned Runner Dependency** | **PASSED** | Line 1 of `contracts/genvest.py` pins the runner version: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`. No unversioned aliases. |
| **3** | **Zero-Revert Fallback Evidence** | **PASSED** | External weather API calls (Open-Meteo, NASA POWER) and web evidence fetches feature defensive try/except handling and canonical fallback digests, preventing unhandled transaction reverts. |
| **4** | **Consensus & Equivalence Principle** | **PASSED** | Comparative validation closure (`gl.eq_principle.prompt_comparative`) instructs validator LLMs to evaluate only the normalized verdict enum (`STANDS`, `USE_OTHER`, `NO_RELIABLE_READING`), preventing token mismatch disagreement. |
| **5** | **Syntax, AST & Lint Audit** | **PASSED** | `python -m py_compile contracts/genvest.py` passed with 0 errors. `GenVMLinter` validated AST compliance with 0 errors and 0 warnings. Zero forbidden standard library imports. |
| **6** | **Live Frontend & Chain Execution Audit** | **PASSED** | Broadcast and finalized 3 live transactions via `genlayer-js` on StudioNet (`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`). Explorer receipts verified with consensus finality. |

---

## 5. Verification Commands for the Review Team

The review team can verify this deployment and contract state directly using the GenLayer Python SDK or CLI:

```bash
# 1. Read Protocol Stats
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_stats', []))"

# 2. Inspect Verified Product P-000002
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_product', ['P-000002']))"

# 3. Inspect Verified Policy Y-000001
python -c "import genlayer_py as gl; from genlayer_py.chains import studionet; c = gl.create_client(chain=studionet); print(c.read_contract('0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA', 'get_policy', ['Y-000001']))"

# 4. Run the 17-Test Direct Suite (including the new invariant test)
python -m pytest tests/test_direct_genvest.py -v
```
