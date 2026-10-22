# GenVest — Autonomous Climate & Crop Yield Hedging Protocol

[![Live DApp](https://img.shields.io/badge/Live_DApp-genvest.vercel.app-000000?style=for-the-badge&logo=vercel)](https://genvest.vercel.app)
[![GenLayer StudioNet](https://img.shields.io/badge/GenLayer-StudioNet_61999-10b981?style=for-the-badge&logo=ethereum)](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA)
[![Intelligent Contract](https://img.shields.io/badge/GenVM-Intelligent_Contract-06b6d4?style=for-the-badge&logo=python)](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA)
[![Direct Tests](https://img.shields.io/badge/pytest-17_passed-success?style=for-the-badge)](tests/test_direct_genvest.py)
[![GenVM Linter](https://img.shields.io/badge/genvm--linter-0_errors-brightgreen?style=for-the-badge)](contracts/genvest.py)
[![Steward Resolution](https://img.shields.io/badge/Steward_Action-Resolved-blue?style=for-the-badge)](docs/steward-action-response.md)
[![Sole Contributor](https://img.shields.io/badge/Sole_Author-Dark--Brain07-8b5cf6?style=for-the-badge)](https://github.com/Dark-Brain07)

**GenVest** is a next-generation decentralized parametric crop and climate yield hedging protocol built natively on GenLayer's GenVM execution environment. It eliminates bureaucratic claims adjusters by combining:
1. **Dual-Dataset Consensus Oracles**: Evaluates precipitation triggers concurrently across independent satellite atmospheric reanalysis feeds (**Open-Meteo ERA5** and **NASA POWER MERRA-2**) with 0.1 mm precision.
2. **AI-Validator Dispute Adjudication**: Under signed dispute clauses, multi-validator LLM committees adjudicate localized discrepancies, field photographs, and meteorological station bulletins using GenLayer's **Optimistic Democracy** and `prompt_comparative` equivalence principles.
3. **100% Solvency Reserve Escrow & Pull-Ledger**: Underwriting reserves guarantee full policy payout liability prior to issuance. Claim proceeds are distributed via a trustless pull-ledger (`balances` map), completely eliminating push-payment reentrancy vectors.

---

## Live Deployment (StudioNet & Vercel)

The GenVest protocol and web application are fully deployed and live:

| Property | Value |
| :--- | :--- |
| **Live Web DApp** | [`https://genvest.vercel.app`](https://genvest.vercel.app) |
| **Steward Action Resolution Document** | [`docs/steward-action-response.md`](docs/steward-action-response.md) |
| **Contract Name** | `GenVest` |
| **Deployed Address** | [`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`](https://explorer-studio.genlayer.com/address/0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA) |
| **Deployment Transaction** | [`0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912`](https://explorer-studio.genlayer.com/tx/0xb81684597036ca5c4cb8d934d2e59ed3a74e3909626f9db0ada7999cc6b57912) |
| **Flagship Product (`P-000001`)** | [`0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb`](https://explorer-studio.genlayer.com/tx/0x282496da79fc9d41ddb8802822febf0a0749ae749ce7994bd327d7d551c4a6fb) |
| **Capital Reserve Funding (`P-000001`)** | [`0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc`](https://explorer-studio.genlayer.com/tx/0x08103a5208789c932c918758ea37160b706beccf1ea6783f0a76aa6c60315efc) |
| **Frontend Product Creation (`P-000002`)** | [`0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36`](https://explorer-studio.genlayer.com/tx/0x89cc18566340249c2a1c2c4cd6379344f77ec4a28b46467a0b60f2a6e9975b36) |
| **Frontend Reserve Funding (`P-000002`)** | [`0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4`](https://explorer-studio.genlayer.com/tx/0x40a7b08fe2a070d2556aa51dfe761a0f1c60c5648fd26a87a3734dd9d3735cd4) |
| **Frontend Policy Purchase (`Y-000001`)** | [`0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709`](https://explorer-studio.genlayer.com/tx/0x0d81dcab778f41d176563127fdc6ea98b20a0fc692e0ada8f2819a207174f709) |
| **Deployer Account** | `0x8C69e68B218191ce4839FBe1aEE70388113921B2` |
| **Network** | GenLayer StudioNet (Chain ID: `61999`, Gasless) |
| **Pinned Runner Version** | `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` |

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |            GenVest Intelligent Contract     |
                                      |    (0x59f3A3d77e1e974fd0CEA61a0F56E64844474CEf)     |
                                      +----------------------+----------------------+
                                                             |
                     +---------------------------------------+---------------------------------------+
                     |                                                                               |
                     v                                                                               v
    +---------------------------------+                                             +---------------------------------+
    |   Dual-Dataset Satellite Oracle |                                             |    AI-Validator Adjudication    |
    |   - Open-Meteo ERA5 Reanalysis  |                                             |    - Optimistic Democracy       |
    |   - NASA POWER MERRA-2 Model    |                                             |    - Comparative Equivalence    |
    |   - 0.1 mm Precipitation Logic  |                                             |    - Geotagged Field Photos     |
    +---------------------------------+                                             +---------------------------------+
                     |                                                                               |
                     +---------------------------------------+---------------------------------------+
                                                             |
                                                             v
                                              +-------------------------------+
                                              |   Guaranteed Solvency Escrow  |
                                              |   - 100% Reserved Payout      |
                                              |   - Pull-Ledger `balances`    |
                                              |   - Anti-Reentrancy Claims    |
                                              +-------------------------------+
```

### 1. Dual-Dataset Consensus Weather Oracles
- When a policy window closes, the contract triggers `read_index(policy_id)`.
- The leader validator issues non-deterministic HTTP requests to Open-Meteo ERA5 and NASA POWER MERRA-2 APIs.
- Precipitation timeseries are extracted into canonical digests (`sha256`), and cumulative rainfall is measured in **tenths of a millimeter**.
- If both datasets agree on the settlement trigger (e.g. Drought: rainfall `< threshold`), settlement proceeds deterministically.

### 2. AI-Validator Dispute Adjudication
- If datasets diverge or localized conditions (e.g. cloudburst outside farm perimeter) cause dispute, the claimant stakes a **0.01 GEN bond** to initiate `contest()`.
- Evidence (geotagged drone/camera photos, regional agrometeorological bulletins) is committed on-chain with cryptographic SHA-256 digests.
- GenLayer AI validators evaluate the evidence against the signed product dispute clause using GenVM LLM prompts under `gl.eq_principle.prompt_comparative`.
- Consensus verdicts (`STANDS`, `USE_OTHER`, or `NO_RELIABLE_READING`) resolve the claim definitively.

### 3. Solvency Invariance & Pull-Ledger Payouts
- The protocol prevents underwriting deficits by strictly reserving `payout_wei` from the underwriter's capital pool before any policy can be purchased.
- Upon settlement, funds transfer to the beneficiary's pull-ledger allocation (`self.balances[farmer] += payout`).
- Claimants withdraw via `claim()`, mitigating reentrancy vulnerabilities.

---

## Contract Method Index (30 Methods)

The contract provides **12 View Methods** and **18 Write Methods**:

### View Methods
1. `get_protocol_config()`: Protocol constants, fees, and operational parameters.
2. `get_protocol_stats()`: Global telemetry (policies, settled counts, reserves, total paid).
3. `get_product(product_id)`: Product parameters, trigger criteria, and dispute clauses.
4. `get_product_count()`: Total number of registered products.
5. `get_policy(policy_id)`: Complete policy lifecycle state and reading data.
6. `get_policy_count()`: Total policies issued.
7. `get_user_policies(address)`: Array of policy IDs owned by a user.
8. `get_reading(policy_id)`: Oracle readings, dataset digests, and trigger outcomes.
9. `get_evidence(evidence_id)`: Cryptographic evidence record, URL, and hash.
10. `get_policy_evidence(policy_id)`: All evidence IDs filed for a policy.
11. `get_balance(address)`: Claimable pull-ledger balance in Wei.
12. `get_underwriter_capital(address)`: Capital deposited by an underwriter.

### Write Methods
1. `create_product(...)`: Register a new parametric hedging product.
2. `fund_product(...)`: Inject capital reserves into a specific product pool.
3. `withdraw_capital(...)`: Withdraw unreserved underwriting capital.
4. `buy_policy(...)`: Farmer purchases coverage; locks guaranteed payout in escrow.
5. `read_index(policy_id)`: Autonomous dual-satellite oracle fetch via GenVM.
6. `contest(policy_id, statement)`: File dispute with 0.01 GEN appeal bond.
7. `file_photo(policy_id, ...)`: Commit field photograph evidence.
8. `file_page(policy_id, ...)`: Commit official meteorological bulletin evidence.
9. `answer_contest(policy_id, text)`: Counterparty response to contest.
10. `decide_contest(policy_id)`: GenLayer AI-validator dispute adjudication.
11. `appeal(policy_id, statement)`: Escalation to secondary appeal round.
12. `decide_appeal(policy_id)`: Final appeal ruling.
13. `finalize(policy_id)`: Execute claim payout or release reserved escrow.
14. `void_unread(policy_id)`: Void policy if oracle data is permanently inaccessible.
15. `lapse_contest(policy_id)`: Finalize uncontested policy after contest deadline.
16. `lapse_appeal(policy_id)`: Finalize after appeal deadline.
17. `claim()`: Withdraw claimable payout from pull-ledger.
18. `fund_pool()`: Deposit liquidity into global capital reserves.

---

## Mandatory 6-Point Audit Checklist

Every item of the mandatory GenLayer protocol audit has been verified:

| # | Audit Item | Result | Verification Details |
| :-: | :--- | :-: | :--- |
| **1** | **Closure & Storage Pre-Extraction** | **PASSED** | Zero `self` access inside `leader()` or `gl.eq_principle` closures. All storage variables are pre-extracted into local Python primitives (`dict`, `str`, `list`, `int`) prior to defining closures. |
| **2** | **Pinned Runner Dependency** | **PASSED** | Pinned concrete runner hash `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }` on line 1. No unversioned aliases. |
| **3** | **Zero-Revert Fallback Evidence** | **PASSED** | All web fetches and media URLs feature defensive fallbacks; missing links or network outages never cause unhandled GenVM exceptions. |
| **4** | **Consensus & Equivalence Principle** | **PASSED** | `gl.eq_principle.prompt_comparative` instructs validator LLMs to evaluate only the primary verdict (`STANDS` / `USE_OTHER` / `NO_RELIABLE_READING`), preventing token mismatch disagreements. |
| **5** | **Syntax, AST & Lint Audit** | **PASSED** | Zero AST errors via `python -m py_compile`. Passed `genvm-lint check contracts/genvest.py --json` with 0 errors. Zero forbidden stdlib modules. |
| **6** | **Live Chain Execution Audit** | **PASSED** | Finalized on GenLayer StudioNet (`0x63a35817137b39E6bb338FcdeaFa882F6c99B8bA`), flagship product `P-000001` initialized, and live frontend write transactions (`P-000002`, `Y-000001`) broadcast and finalized via `genlayer-js`. |

---

## Test Suite Execution

### 1. Direct Mode Unit Tests (Fast In-Memory Simulation)
```bash
python -m pytest tests/test_direct_genvest.py -v
```
**Results:** `17 passed in 0.99s` (including settlement accounting invariant segregation and claim)

### 2. Contract Linter
```bash
genvm-lint check contracts/genvest.py --json
```
**Results:** `{"ok":true,"lint":{"ok":true,"passed":3},"validate":{"ok":true,"contract":"GenVest","methods":30}}`

### 3. Frontend Production Build
```bash
cd frontend
npm install
npm run build
```
**Results:** `✓ built in 3.56s` (0 TypeScript errors)

---

## Running the Web Application Locally

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser. The application features:
- **Interactive Coverage Catalog**: Filter products by drought (`RAIN_BELOW`) or flood (`RAIN_ABOVE`), underwrite new policies, and deploy new parametric specs.
- **Live Weather Radar Console**: Query live Open-Meteo ERA5 data for any global coordinate (Abuja, Cordoba, Punjab, Kiambu, Des Moines) with real-time precipitation series visualizer.
- **Policy Lifecycle Manager**: Progress policies from `ACTIVE` &rarr; `READ` &rarr; `CONTESTED` &rarr; `DECIDED` &rarr; `SETTLED`.
- **AI-Validator Deliberation Console**: Inspect live comparative LLM verdicts, submitted evidence dossiers, and consensus voting.
- **Capital Reserves Dashboard**: Monitor protocol solvency and deposit liquidity.
- **On-Chain Verification Matrix**: Direct explorer links and deployment proofs.

---

## Author & Contributor

- **Sole Developer & Contributor**: [Dark-Brain07](https://github.com/Dark-Brain07)
- **GitHub Repository**: [https://github.com/Dark-Brain07/GenVest](https://github.com/Dark-Brain07/GenVest)
- **Built for**: GenLayer Intelligent Contract Hackathon
