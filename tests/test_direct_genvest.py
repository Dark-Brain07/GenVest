"""
Comprehensive Direct Mode Test Suite for GenVest Intelligent Contract on GenVM.

Executes all core protocol workflows in-memory via gltest direct mode:
- Product creation, validation boundaries, and underwriter capital pool management
- Policy underwriting, exact premium enforcement, and payout reservation
- Non-deterministic dual-dataset weather readings (Open-Meteo & NASA POWER)
- Disagreement detection and contest admission restrictions
- Adversarial photo format verification (PNG and JFIF-JPEG validation)
- Consensus evidence snapshots from public web pages
- Multi-validator LLM dispute adjudication against signed dispute clauses
- Bond accounting: restitution on reversal vs forfeiture on affirmation
- Two-tier appeal escalation lifecycle and long-stop lapse fallbacks
- Permissionless finalization and pull-ledger native value transfers
"""

import json
import pytest
import zlib
from datetime import date, timedelta

CONTRACT_PATH = "contracts/genvest.py"
BASE_TIME = "2026-08-20T10:00:00Z"

SAMPLE_PNG_HEADER = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00"
    b"\x90\x91h6"
    b"\x00\x00\x00\x0cIDATx\x9cc`\x18\x05\xa3`\x14\x00\x00\x00\x04\x00\x01"
    b"\x12\x34\x56\x78"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def addr_hex(b) -> str:
    if isinstance(b, bytes):
        return "0x" + b.hex().lower()
    return str(b).lower()


def deploy(direct_deploy):
    return direct_deploy(CONTRACT_PATH)


def sample_product_params(**overrides) -> dict:
    params = {
        "crop": "Maize",
        "region": "Federal Capital Territory, Abuja",
        "lat": "9.06",
        "lon": "7.49",
        "trigger": "RAIN_BELOW",
        "threshold_tenths": 1400,        # 140.0 mm
        "window_days": 14,
        "premium_wei": str(10**17),       # 0.10 GEN
        "payout_wei": str(10**18),        # 1.00 GEN
        "capacity": 10,
        "primary": "OPEN_METEO",
        "backup": "NASA_POWER",
        "dispute_clause": "If ERA5 and MERRA-2 disagree on drought threshold, local field photographs and official meteorological reports decide which reading governs.",
        "periods": {
            "contest": 86400,
            "response": 86400,
            "appeal": 86400
        },
        "replay": False
    }
    params.update(overrides)
    return params


# ==============================================================================
# 1. Protocol Configuration & Initialization Tests
# ==============================================================================

def test_protocol_config_and_initial_stats(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    cfg = contract.get_config()
    assert cfg["version"] == "1.0.0"
    assert "OPEN_METEO" in cfg["sources"]
    assert "NASA_POWER" in cfg["sources"]
    assert "STANDS" in cfg["verdicts"]

    stats = contract.get_stats()
    assert stats["product_count"] == 0
    assert stats["policy_count"] == 0
    assert stats["held_wei"] == "0"


# ==============================================================================
# 2. Product Creation, Validation & Capital Reserve Tests
# ==============================================================================

def test_create_product_validation(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)
    direct_vm.sender = direct_alice

    # Valid product creation
    pid = contract.create_product(json.dumps(sample_product_params()))
    assert pid == "P-000001"

    prod = contract.get_product(pid)
    assert prod["crop"] == "Maize"
    assert prod["insurer"] == addr_hex(direct_alice)
    assert prod["active"] is True

    # Payout <= premium must be rejected
    bad_params = sample_product_params(premium_wei=str(10**18), payout_wei=str(10**17))
    with pytest.raises(Exception) as exc_info:
        contract.create_product(json.dumps(bad_params))
    assert "payout must exceed premium" in str(exc_info.value)

    # Identical primary and backup datasets must be rejected
    bad_datasets = sample_product_params(primary="OPEN_METEO", backup="OPEN_METEO")
    with pytest.raises(Exception) as exc_info:
        contract.create_product(json.dumps(bad_datasets))
    assert "distinct providers" in str(exc_info.value)


def test_fund_and_withdraw_capital(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Alice creates product
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params()))

    # Stranger (Bob) attempting to fund Alice's product -> rejected
    direct_vm.sender = direct_bob
    direct_vm.value = 5 * 10**18
    with pytest.raises(Exception) as exc_info:
        contract.fund_product(pid)
    assert "only product underwriter" in str(exc_info.value)

    # Alice funds 5 GEN capital pool
    direct_vm.sender = direct_alice
    direct_vm.value = 5 * 10**18
    res = json.loads(contract.fund_product(pid))
    assert res["funded_wei"] == str(5 * 10**18)

    # Alice withdraws 2 GEN unreserved capital
    direct_vm.value = 0
    w_res = json.loads(contract.withdraw_capital(pid, 2 * 10**18))
    assert w_res["withdrawn_wei"] == str(2 * 10**18)

    prod = contract.get_product(pid)
    assert prod["funded_wei"] == str(3 * 10**18)


# ==============================================================================
# 3. Policy Purchase & Capital Reservation Tests
# ==============================================================================

def test_buy_policy_and_reserve_capital(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Alice creates and funds product with 2 GEN (can cover 2 policies @ 1 GEN payout)
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(payout_wei=str(10**18))))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    # Bob purchases policy for season starting 2026-08-25
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17  # Exact premium (0.10 GEN)
    yid = contract.buy_policy(pid, "2026-08-25")
    assert yid == "Y-000001"

    y = contract.get_policy(yid)
    assert y["farmer"] == addr_hex(direct_bob)
    assert y["state"] == "ACTIVE"
    assert y["reserved"] is True
    assert y["window_start"] == "2026-08-25"
    assert y["window_end"] == "2026-09-07"

    # Product should show 1 GEN reserved, 1 policy sold
    p = contract.get_product(pid)
    assert p["reserved_wei"] == str(10**18)
    assert p["sold_count"] == 1


def test_buy_policy_insufficient_capital_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Alice creates product with 1 GEN payout, but funds only 0.5 GEN
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(payout_wei=str(10**18))))
    direct_vm.value = 5 * 10**17
    contract.fund_product(pid)

    # Bob attempts purchase -> rejected due to insufficient unreserved underwriting capital
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    with pytest.raises(Exception) as exc_info:
        contract.buy_policy(pid, "2026-08-25")
    assert "lacks unreserved capacity" in str(exc_info.value)


# ==============================================================================
# 4. Consensus Weather Index Reading & Trigger Evaluation Tests
# ==============================================================================

def test_read_index_premature_rejection(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Create & buy policy for 2026-08-25 to 2026-09-07
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params()))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-25")

    # Time is still 2026-08-20 (window has not even started, let alone ended)
    with pytest.raises(Exception) as exc_info:
        contract.read_index(yid)
    assert "window has not yet concluded" in str(exc_info.value)


def test_read_index_consensus_both_datasets(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Setup replay policy to test immediate reading
    direct_vm.sender = direct_alice
    replay_params = sample_product_params(
        replay=True,
        replay_start="2026-08-01",
        window_days=14,
        threshold_tenths=1400  # 140.0 mm
    )
    pid = contract.create_product(json.dumps(replay_params))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")

    # Advance time past replay window end
    direct_vm.warp("2026-08-20T12:00:00Z")

    # Mock Open-Meteo API response: 14 days, total 163.0 mm (1630 tenths)
    open_meteo_dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    open_meteo_rain = [10.0, 15.0, 12.0, 8.0, 14.0, 11.0, 9.0, 13.0, 12.0, 10.0, 15.0, 14.0, 10.0, 10.0]
    om_json = json.dumps({"daily": {"time": open_meteo_dates, "precipitation_sum": open_meteo_rain}})

    # Mock NASA POWER API response: 14 days, total 117.2 mm (1172 tenths) -> below 140.0 mm threshold!
    nasa_props = {}
    for d in open_meteo_dates:
        key = d.replace("-", "")
        nasa_props[key] = 8.37  # 8.37 * 14 ~ 117.2 mm
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})

    # Execute read_index
    res_str = contract.read_index(yid)
    res = json.loads(res_str)

    assert res["policy_id"] == yid
    assert res["selected"] == "OPEN_METEO"
    assert res["total_tenths"] == 1630  # 163.0 mm
    # Threshold is RAIN_BELOW 1400 (140.0 mm). 1630 is NOT below 1400, so triggered is False
    assert res["triggered"] is False

    y = contract.get_policy(yid)
    assert y["state"] == "READ"
    assert y["reading"]["other_triggers"] is True  # NASA POWER (1172 tenths) IS below 1400!


# ==============================================================================
# 5. Contest & Dispute Arbitration Tests
# ==============================================================================

def test_contest_refused_when_datasets_agree(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    replay_params = sample_product_params(replay=True, replay_start="2026-08-01")
    pid = contract.create_product(json.dumps(replay_params))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    # Both datasets read > 140.0 mm (both NOT triggered)
    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [15.0] * 14}})
    nasa_props = {d.replace("-", ""): 15.0 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Bob attempts to contest reading when both datasets agree -> must be refused!
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17  # 10% bond
    with pytest.raises(Exception) as exc_info:
        contract.contest(yid, "Both agree but I disagree")
    assert "both datasets agree" in str(exc_info.value)


def test_contest_and_adjudication_lifecycle(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # 1. Setup policy where Open-Meteo reads 163.0 mm (not triggered) & NASA reads 117.2 mm (triggered)
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})   # 163.0 mm
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}                                   # 117.2 mm
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # 2. Bob (farmer) contests because NASA POWER confirms drought
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17  # 10% bond of 1 GEN payout
    c_res = json.loads(contract.contest(yid, "NASA POWER indicates 117.2 mm severe drought; field crops wilted"))
    assert c_res["state"] == "CONTESTED"

    # 3. Alice (insurer) files answer defense
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    contract.answer(yid, "Open-Meteo ERA5 is the primary contractual dataset and must stand.")

    # 4. Advance time past response window
    direct_vm.warp("2026-08-22T00:00:00Z")

    # 5. Mock LLM consensus adjudication: ruling is USE_OTHER (reverses outcome in favor of farmer!)
    direct_vm.mock_llm(
        r".*You are an impartial GenLayer validator.*",
        json.dumps({
            "verdict": "USE_OTHER",
            "reason": "Under dispute clause, ground facts substantiate MERRA-2 drought reading over primary."
        })
    )

    # 6. Execute decide_contest
    d_res = json.loads(contract.decide_contest(yid))
    assert d_res["verdict"] == "USE_OTHER"
    assert d_res["outcome"] is True  # Farmer now triggers payout!
    assert d_res["contest"] == "MOVED"  # Contestant won, so bond is returned!

    # 7. Check pull ledger: Bob should be credited his 0.10 GEN bond back
    b_bal = contract.get_balance(addr_hex(direct_bob))
    assert int(b_bal["claimable_wei"]) >= 10**17


# ==============================================================================
# 6. Finalization & Pull-Ledger Value Claim Tests
# ==============================================================================

def test_finalize_and_pull_ledger_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # Setup policy that triggers on primary dataset
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    # Both report 5.0 mm/day = 70.0 mm total (< 140.0 mm -> TRIGGERED!)
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [5.0] * 14}})
    nasa_props = {d.replace("-", ""): 5.0 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Warp past contest window (86400 seconds)
    direct_vm.warp("2026-08-22T00:00:00Z")

    # Permissionless finalize call
    f_res = json.loads(contract.finalize(yid))
    assert f_res["state"] == "SETTLED"
    assert f_res["paid_to_farmer"] is True

    # Verify pull-ledger balances:
    # Bob (farmer) should be owed 1.00 GEN payout
    # Alice (insurer) should be owed 0.10 GEN premium
    bob_bal = contract.get_balance(addr_hex(direct_bob))
    assert bob_bal["claimable_wei"] == str(10**18)

    alice_bal = contract.get_balance(addr_hex(direct_alice))
    assert int(alice_bal["claimable_wei"]) >= 10**17

    # Bob claims owed payout
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    c_res = json.loads(contract.claim())
    assert c_res["account"] == addr_hex(direct_bob)
    assert c_res["claimed_wei"] == str(10**18)

    # Bob's claimable balance is now 0
    bob_after = contract.get_balance(addr_hex(direct_bob))
    assert bob_after["claimable_wei"] == "0"
    assert bob_after["claimed_wei"] == str(10**18)


# ==============================================================================
# 7. Advanced Edge Cases: Timeouts, Lapses, Evidence & Appeals
# ==============================================================================

def test_void_unread_after_long_stop(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")

    # Warp past read long stop (45 days)
    direct_vm.warp("2026-10-15T00:00:00Z")

    # Permissionless void_unread call
    v_res = json.loads(contract.void_unread(yid))
    assert v_res["state"] == "VOID"

    # Farmer should be refunded their exact premium
    b_bal = contract.get_balance(addr_hex(direct_bob))
    assert b_bal["claimable_wei"] == str(10**17)


def test_lapse_contest_after_long_stop(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Bob contests
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    contract.contest(yid, "NASA indicates severe drought")

    # Advance time past lapse deadline (3 response periods)
    direct_vm.warp("2026-08-30T00:00:00Z")

    l_res = json.loads(contract.lapse_contest(yid))
    assert l_res["state"] == "SETTLED"

    # Bob's bond is safely refunded
    b_bal = contract.get_balance(addr_hex(direct_bob))
    assert int(b_bal["claimable_wei"]) >= 10**17


def test_appeal_lifecycle_and_reversal(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # 1. Bob contests
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    contract.contest(yid, "NASA POWER indicates severe drought")

    # 2. In contest round, LLM affirms STANDS (farmer loses contest)
    direct_vm.warp("2026-08-22T00:00:00Z")
    direct_vm.mock_llm(
        r".*You are an impartial GenLayer validator.*",
        json.dumps({"verdict": "STANDS", "reason": "Primary ERA5 reading stands under initial review."})
    )
    contract.decide_contest(yid)

    # 3. Bob appeals to higher validator consensus tier
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17  # Appeal bond
    app_res = json.loads(contract.appeal(yid, "Ground evidence proves ERA5 missed local convective precipitation shadow."))
    assert app_res["state"] == "APPEALED"

    # 4. Appeal deliberation round: LLM reverses to USE_OTHER!
    direct_vm.warp("2026-08-24T00:00:00Z")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(
        r".*You are an impartial GenLayer validator.*",
        json.dumps({"verdict": "USE_OTHER", "reason": "Appeal evidence demonstrates MERRA-2 correctly captured severe ground drought."})
    )

    a_dec = json.loads(contract.decide_appeal(yid))
    assert a_dec["verdict"] == "USE_OTHER"
    assert a_dec["outcome"] is True
    assert a_dec["appeal"] == "MOVED"

    # Bob should receive payout and his appeal bond back
    b_bal = contract.get_balance(addr_hex(direct_bob))
    assert int(b_bal["claimable_wei"]) >= 10**18 + 10**17


def test_no_reliable_reading_voids_and_refunds(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Bob contests
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    contract.contest(yid, "Both stations have conflicting readings")

    # LLM rules NO_RELIABLE_READING (void)
    direct_vm.warp("2026-08-22T00:00:00Z")
    direct_vm.mock_llm(
        r".*You are an impartial GenLayer validator.*",
        json.dumps({"verdict": "NO_RELIABLE_READING", "reason": "Both radar streams suffered regional anomalies; neither is reliable."})
    )
    d_res = json.loads(contract.decide_contest(yid))
    assert d_res["verdict"] == "NO_RELIABLE_READING"
    assert d_res["contest"] == "MOVED"  # Void moves outcome from loss, returning bond!

    # Finalize
    direct_vm.warp("2026-08-24T00:00:00Z")
    f_res = json.loads(contract.finalize(yid))
    assert f_res["state"] == "VOID"

    # Bob gets premium back + bond back
    b_bal = contract.get_balance(addr_hex(direct_bob))
    assert int(b_bal["claimable_wei"]) >= 2 * 10**17


def test_photo_evidence_validation(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Bob contests
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    contract.contest(yid, "NASA POWER indicates severe drought")

    # Bob files invalid image bytes -> rejected!
    with pytest.raises(Exception) as exc_info:
        contract.file_photo(yid, "Corrupt field picture", b"not-a-valid-image-at-all")
    assert "unsupported image container" in str(exc_info.value)


def test_web_page_evidence_consensus(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(replay=True, replay_start="2026-08-01")))
    direct_vm.value = 2 * 10**18
    contract.fund_product(pid)

    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")
    direct_vm.warp("2026-08-20T12:00:00Z")

    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [11.64] * 14}})
    nasa_props = {d.replace("-", ""): 8.37 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})

    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Bob contests
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    contract.contest(yid, "Severe regional drought report")

    # Bob files public web report
    web_report_text = "Official National Weather Agency Bulletin: Abuja agricultural sector experienced severe rainfall deficit throughout early August 2026." * 3
    direct_vm.mock_web(r".*metagency\.gov\.ng.*", {"status": 200, "body": web_report_text})

    page_res = json.loads(contract.file_page(yid, "Official August Met Bulletin", "https://metagency.gov.ng/bulletin-aug-2026"))
    assert page_res["evidence_id"].startswith("E-")
    assert page_res["chars"] > 200

    # Verify evidence item is stored on policy
    ev_list = contract.get_evidence(yid)
    assert len(ev_list) == 1
    assert ev_list[0]["kind"] == "PAGE"
    assert ev_list[0]["url"] == "https://metagency.gov.ng/bulletin-aug-2026"


def test_settlement_accounting_invariant_segregation_and_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    CRITICAL INVARIANT TEST:
    Ensures that upon policy settlement with triggered payout:
    1. Farmer payout remains strictly segregated from withdrawable and reusable product capital.
    2. Attempted withdrawal by underwriter of settled payout capital MUST BE REJECTED.
    3. Attempted reuse of settled payout capital for new policies MUST BE REJECTED.
    4. Farmer successfully claims payout from pull-ledger.
    5. Pool capital invariants hold before, during, and after claim.
    """
    direct_vm.warp(BASE_TIME)
    contract = deploy(direct_deploy)

    # 1. Alice (Underwriter) creates product: premium = 0.1 GEN, payout = 1.0 GEN
    direct_vm.sender = direct_alice
    pid = contract.create_product(json.dumps(sample_product_params(
        premium_wei=10**17,      # 0.1 GEN
        payout_wei=10**18,       # 1.0 GEN
        capacity=5,
        replay=True,
        replay_start="2026-08-01"
    )))

    # Alice funds exactly 1.0 GEN into the underwriting capital pool
    direct_vm.value = 10**18
    contract.fund_product(pid)

    prod = contract.get_product(pid)
    assert prod["funded_wei"] == str(10**18)
    assert prod["reserved_wei"] == "0"
    assert prod["paid_out_wei"] == "0"

    # 2. Bob (Farmer) buys policy for 0.1 GEN exact premium
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    yid = contract.buy_policy(pid, "2026-08-01")

    # Invariant: exactly 1.0 GEN is now reserved; available pool capital is 0
    prod_locked = contract.get_product(pid)
    assert prod_locked["funded_wei"] == str(10**18)
    assert prod_locked["reserved_wei"] == str(10**18)
    avail_before = int(prod_locked["funded_wei"]) - int(prod_locked["reserved_wei"])
    assert avail_before == 0

    # 3. Reading phase: Weather triggers payout condition (drought)
    direct_vm.warp("2026-08-20T12:00:00Z")
    dates = [(date(2026, 8, 1) + timedelta(days=i)).isoformat() for i in range(14)]
    # Both datasets report drought (5.0 mm/day total 70 mm < 140 mm threshold)
    om_json = json.dumps({"daily": {"time": dates, "precipitation_sum": [5.0] * 14}})
    nasa_props = {d.replace("-", ""): 5.0 for d in dates}
    nasa_json = json.dumps({"properties": {"parameter": {"PRECTOTCORR": nasa_props}}})
    direct_vm.mock_web(r".*open-meteo\.com.*", {"status": 200, "body": om_json})
    direct_vm.mock_web(r".*power\.larc\.nasa\.gov.*", {"status": 200, "body": nasa_json})
    contract.read_index(yid)

    # Warp past contest window and finalize settlement
    direct_vm.warp("2026-08-22T00:00:00Z")
    finalize_res = json.loads(contract.finalize(yid))
    assert finalize_res["state"] == "SETTLED"
    assert finalize_res["paid_to_farmer"] is True

    # 4. Immediate Post-Settlement State (BEFORE Bob claims payout)
    # Bob has not called claim yet!
    bob_bal = contract.get_balance(addr_hex(direct_bob))
    assert bob_bal["claimable_wei"] == str(10**18)
    assert bob_bal["claimed_wei"] == "0"

    # INVARIANT: Product capital accounting must have permanently deducted the payout
    prod_settled = contract.get_product(pid)
    assert prod_settled["funded_wei"] == "0", "Funded pool capital must be reduced to 0 upon payout settlement"
    assert prod_settled["reserved_wei"] == "0", "Reserved pool capital must be released"
    assert prod_settled["paid_out_wei"] == str(10**18), "Product paid_out_wei must track settled payout"
    avail_settled = int(prod_settled["funded_wei"]) - int(prod_settled["reserved_wei"])
    assert avail_settled == 0, "Available unreserved capital must be 0"

    # 5. ATTEMPTED WITHDRAWAL BY UNDERWRITER MUST BE REJECTED
    # Alice attempts to withdraw from the pool (trying to withdraw Bob's segregated payout)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with pytest.raises(Exception) as exc_withdraw:
        contract.withdraw_capital(pid, 10**16)  # Minimum withdrawal (0.01 GEN) cannot be stolen
    assert "withdrawal exceeds available unreserved capital" in str(exc_withdraw.value)

    with pytest.raises(Exception) as exc_withdraw_all:
        contract.withdraw_capital(pid, 10**18)
    assert "withdrawal exceeds available unreserved capital" in str(exc_withdraw_all.value)

    # 6. ATTEMPTED CAPITAL REUSE BY NEW POLICY MUST BE REJECTED
    # Bob or another farmer attempts to buy a new policy expecting coverage from depleted pool
    direct_vm.sender = direct_bob
    direct_vm.value = 10**17
    with pytest.raises(Exception) as exc_reuse:
        contract.buy_policy(pid, "2026-08-01")
    assert "underwriting pool lacks unreserved capacity to guarantee payout" in str(exc_reuse.value)

    # 7. FARMER CLAIMS SEGREGATED PAYOUT
    direct_vm.sender = direct_bob
    direct_vm.value = 0
    claim_res = json.loads(contract.claim())
    assert claim_res["account"] == addr_hex(direct_bob)
    assert claim_res["claimed_wei"] == str(10**18)

    bob_after_claim = contract.get_balance(addr_hex(direct_bob))
    assert bob_after_claim["claimable_wei"] == "0"
    assert bob_after_claim["claimed_wei"] == str(10**18)

    # 8. POST-CLAIM INVARIANT CHECK
    # Underwriter still cannot withdraw
    direct_vm.sender = direct_alice
    with pytest.raises(Exception) as exc_post_withdraw:
        contract.withdraw_capital(pid, 10**16)
    assert "withdrawal exceeds available unreserved capital" in str(exc_post_withdraw.value)

    # Product state remains invariant
    prod_final = contract.get_product(pid)
    assert prod_final["funded_wei"] == "0"
    assert prod_final["reserved_wei"] == "0"
    assert prod_final["paid_out_wei"] == str(10**18)

