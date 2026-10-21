# GenVest — Protocol Security & Verification Review

This document details the security architecture, threat model, and mitigation mechanisms designed into the **GenVest Intelligent Contract** running on GenVM.

---

## 1. Storage Pre-Extraction Rule Enforcement

### The Vulnerability
In GenVM, non-deterministic closures (such as `leader()`, `leader_fn()`, or functions passed to `gl.eq_principle.prompt_comparative`) execute in an isolated validator subprocess. If a contract attempts to access `self` or contract storage attributes (`self.policies`, `self.products`, `self.evidence`) from within these closures, GenVM attempts to serialize the entire contract state object, leading to pickling failures, memory leaks, and consensus desynchronization.

### GenVest Mitigation
GenVest enforces a **strict storage pre-extraction pattern**:
```python
# 1. Deterministically pre-extract storage attributes into pure local Python primitives
pure_product = self._get_pure_product(pol["product_id"])
evidence_list = self._get_policy_evidence_pure(policy_id)
clause = str(pol["dispute_clause"])

# 2. Closure uses ONLY pure local variables (NEVER self)
def leader() -> str:
    verdict_raw = _evaluate_dispute_llm(clause, pure_product, evidence_list)
    return json.dumps(verdict_raw, sort_keys=True)

res = json.loads(gl.eq_principle.prompt_comparative(leader, "Equal if same primary verdict."))
```
All helper functions operating inside non-deterministic closures (`_fetch_both_datasets`, `_read_photos_pure`, `_normalize_summary`) are declared as pure standalone Python functions outside the contract class.

---

## 2. Pull-Ledger Pattern & Reentrancy Elimination

### The Vulnerability
Directly transferring funds (`gl.message.send(beneficiary, amount)`) inside settlement functions (`finalize()`) exposes contracts to reentrancy attacks and transaction gas griefing if the recipient address is a smart contract with malicious fallback logic.

### GenVest Mitigation
GenVest implements an escrowed pull-ledger pattern:
1. When a policy claim is finalized in favor of a farmer, funds are credited internally:
   ```python
   self.balances[farmer_addr] = self.balances[farmer_addr] + payout_wei
   ```
2. The beneficiary withdraws funds on-demand via an explicit, reentrancy-safe `claim()` call:
   ```python
   @gl.public.write
   def claim(self) -> None:
       caller = gl.message.sender_address
       amt = self.balances[caller]
       if amt == u256(0):
           return
       self.balances[caller] = u256(0)  # Check-Effects-Interactions
       _Payee.emit_transfer(caller, amt)
   ```

---

## 3. Strict Solvency Reserve Invariance

### The Vulnerability
A common vulnerability in parametric insurance protocols is selling coverage without verifying whether underwriting capital is sufficient to cover simultaneous maximum payouts during catastrophic climate disasters (e.g. province-wide drought).

### GenVest Mitigation
GenVest enforces a strict mathematical reserve invariance:
- Prior to creating a policy, the contract checks:
  ```python
  required_capital = self.products[prod_id].reserved_wei + payout_wei
  if required_capital > self.products[prod_id].funded_wei:
      raise Exception("Insufficient product capital reserve")
  ```
- Capital cannot be withdrawn by underwriters while it is committed to active policies. This guarantees 100% solvency under all catastrophic loss scenarios.

---

## 4. Economic Griefing & Dispute Bond Slashing

### The Vulnerability
If dispute contests were free, malicious policyholders or underwriters could delay legitimate claim payouts indefinitely by filing unsubstantiated contest claims on every single policy.

### GenVest Mitigation
- Filing a contest requires posting an upfront **0.01 GEN bond** (`MIN_CONTEST_BOND = 10**16 Wei`).
- If GenLayer AI validators uphold the claimant's dispute (`MOVED`), the bond is fully returned.
- If the contest is rejected as frivolous (`HELD`), the bond is forfeited and deposited into the product's underwriting capital pool, compensating underwriters for delay.

---

## 5. Dual-Dataset Consensus & Oracle Bribery Resistance

### The Vulnerability
Relying on a single third-party weather API introduces single-point-of-failure vulnerabilities, sensor outages, or potential manipulation of public endpoints.

### GenVest Mitigation
- GenVest concurrently queries two completely independent atmospheric models:
  1. **Open-Meteo ERA5 Reanalysis** (European Centre for Medium-Range Weather Forecasts)
  2. **NASA POWER MERRA-2 Model** (Modern-Era Retrospective analysis for Research and Applications)
- Cumulative rainfall is computed independently for each source.
- If both sources yield identical trigger outcomes, settlement executes without dispute delay.
- If sources diverge, the contract halts automated settlement and enters the Optimistic Democracy dispute window, where validators review local ground evidence under the signed contract clause.

---

## 6. AST & Sandbox Restrictions Compliance

- **Zero Forbidden Modules**: GenVM strictly forbids standard library modules such as `typing`, `math`, `os`, `sys`, `random`, or `subprocess`. GenVest contract runtime uses strictly allowed imports:
  ```python
  from genlayer import *
  import json
  ```
- **Type Coercion & Sized Integers**: All financial and wei balances utilize GenLayer's sized `u256` integers to avoid arithmetic overflow.
- **Defensive LLM Output Parsing**: Validator closures enforce `response_format="json"`, normalize field aliases (`outcome`, `verdict`, `decision`), and provide deterministic fallbacks when external web links are unavailable.
