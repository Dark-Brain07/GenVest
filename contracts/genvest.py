# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

"""GenVest: Decentralized Parametric Yield & Climate Hedging Protocol on GenLayer GenVM.

Protects agricultural producers and investors against precipitation anomalies (droughts and
excessive rainfall) using dual independent satellite/reanalysis datasets (Open-Meteo ERA5
and NASA POWER MERRA-2) under optimistic decentralized AI-validator consensus.

When datasets agree on opposite sides of a trigger threshold, aggrieved parties may contest
the reading by posting a bond and submitting photographic field evidence and official weather
reports. Multi-validator consensus adjudicates the dispute strictly against the bilateral
dispute clause signed by both parties at policy issuance.
"""

from genlayer import *
import json
import math
import re
import zlib
import hashlib
from datetime import date, datetime, timedelta, timezone

VERSION = "1.0.0"
RULESET_VERSION = "genvest-rules-v1"

# ── Limits & Configuration Parameters ──────────────────────────────────────────

MAX_PAGE = 50
MIN_WEI = 10**16                          # 0.01 GEN minimum
MIN_WINDOW_DAYS = 7
MAX_WINDOW_DAYS = 120
MAX_CAPACITY = 200
MIN_PERIOD_SECONDS = 600                  # 10 minutes
MAX_PERIOD_SECONDS = 30 * 86400           # 30 days
READ_LONG_STOP_DAYS = 45                  # From window end or purchase, whichever is later
READ_GRACE_DAYS = 10                      # Grace period before single complete dataset may be read alone
LONG_STOP_PERIODS = 3                     # Multiple for undecidable contest/appeal lapse
BOND_BPS = 1000                           # 10% of payout (1,000 bps)
MAX_THRESHOLD_TENTHS = 50_000             # 5,000.0 mm
STATEMENT_MAX = 1_200
CLAUSE_MAX = 900
NAME_MAX = 80
LINE_MAX = 200
LONG_MAX = 2_000
BIG_DAY_TENTHS = 100                      # 10.0 mm daily divergence

# Photographic & Web Evidence Boundaries
EVIDENCE_PER_SIDE = {"PHOTO": 2, "PAGE": 2}
MAX_IMAGE_BYTES = 400_000
PNG_RAW_MAX = 64 * 1024 * 1024           # 64 MB maximum uncompressed pixel buffer
PNG_TEXT_MAX = 1024 * 1024               # 1 MB text/profile buffer
MAX_IMAGE_SIDE = 8192                    # Max pixel dimensions
JPEG_SEGMENTS_MAX = 2048
PAGE_EXCERPT_CHARS = 4_000
PAGE_MIN_CHARS = 200
PAGE_SLACK_CHARS = 300
URL_MAX = 300
CAPTION_MAX = 200

SOURCES = ("OPEN_METEO", "NASA_POWER")
SOURCE_NAMES = {
    "OPEN_METEO": "Open-Meteo Historical Archive (ERA5 Reanalysis)",
    "NASA_POWER": "NASA POWER Daily Agroclimatology (MERRA-2)",
}
TRIGGERS = ("RAIN_BELOW", "RAIN_ABOVE")
VERDICTS = ("STANDS", "USE_OTHER", "NO_RELIABLE_READING")
POLICY_STATES = ("ACTIVE", "READ", "CONTESTED", "DECIDED", "APPEALED", "SETTLED", "VOID")
SETTLED_HOW = ("READING", "CONTEST", "APPEAL", "CONTEST_LAPSED", "APPEAL_LAPSED",
               "NO_READING", "NO_RELIABLE_READING")

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"


# ── Evm Interface for Pull-Ledger Value Transfers ─────────────────────────────

@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass


# ── Internal Pure Utilities (No Contract Storage Access) ──────────────────────

def _refuse(reason: str):
    """Raise formatted expected error that the dApp client can distinguish from network errors."""
    raise gl.vm.UserError(f"{ERROR_EXPECTED} {reason}")


def _now() -> datetime:
    """Current transaction datetime, identical across all consensus nodes."""
    return datetime.now(timezone.utc)


def _iso(when: datetime) -> str:
    return when.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_iso(text: str) -> datetime:
    return datetime.fromisoformat(str(text).replace("Z", "+00:00")).astimezone(timezone.utc)


def _clean(value, limit: int) -> str:
    text = "".join(" " if ord(c) < 0x20 or 0xD800 <= ord(c) <= 0xDFFF else c
                   for c in str(value or ""))
    return " ".join(text.split())[:limit]


_FENCE_END = re.compile(r"END (CLAUSE|STATEMENT|REASON|DATA|POLICY|PAGE|PHOTO)")


def _defuse(text: str) -> str:
    """Prevent party prompt injection by escaping markdown fencing tags."""
    out = _FENCE_END.sub(r"END_\1", str(text or ""))
    while "<<<" in out or ">>>" in out:
        out = out.replace("<<<", "< <<").replace(">>>", ">> >")
    return out


def _to_address(addr) -> Address:
    if isinstance(addr, Address):
        return addr
    if isinstance(addr, (bytes, bytearray)):
        return Address("0x" + bytes(addr).hex())
    s = str(addr).strip()
    if s.startswith("b'") and s.endswith("'"):
        try:
            raw = bytes.fromhex(s[2:-1].encode("latin1").decode("unicode_escape").encode("latin1").hex())
            return Address("0x" + raw.hex())
        except Exception:
            pass
    if not s.startswith("0x") and len(s) == 40:
        s = "0x" + s
    return Address(s)


def _addr_str(addr) -> str:
    if isinstance(addr, bytes):
        return "0x" + addr.hex().lower()
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    if hasattr(addr, "as_bytes"):
        return "0x" + addr.as_bytes.hex().lower()
    s = str(addr).lower()
    return s


def _address_or_refuse(addr: str) -> str:
    try:
        return _addr_str(_to_address(addr))
    except Exception:
        _refuse("invalid wallet address format")


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _int_or_refuse(value, what: str, low: int, high: int) -> int:
    try:
        n = int(str(value).strip())
    except Exception:
        _refuse(f"{what} must be an integer")
    if n < low or n > high:
        _refuse(f"{what} must be between {low:,} and {high:,}")
    return n


def _wei(value, what: str) -> int:
    try:
        n = int(str(value).strip())
    except Exception:
        _refuse(f"{what} must be an integer number of wei")
    if n < MIN_WEI:
        _refuse(f"{what} must be at least {MIN_WEI} wei (0.01 GEN)")
    return n


def _coord(value, what: str, limit: float) -> str:
    """Format geographical coordinate to 2 decimal places for consistent URL construction."""
    try:
        v = float(str(value).strip())
    except Exception:
        _refuse(f"the {what} must be a valid numeric coordinate")
    if not math.isfinite(v) or v < -limit or v > limit:
        _refuse(f"the {what} must be between -{limit:g} and {limit:g}")
    return f"{v:.2f}"


def _day(text, what: str) -> date:
    try:
        return date.fromisoformat(str(text).strip())
    except Exception:
        _refuse(f"{what} must be a valid date in YYYY-MM-DD format")


def _be(data: bytes, at: int, size: int) -> int:
    return int.from_bytes(data[at:at + size], "big")


# ── Image Specification Verification (PNG & JFIF-JPEG) ────────────────────────

_PNG_KINDS = {0: ((1, 2, 4, 8, 16), 1), 2: ((8, 16), 3), 3: ((1, 2, 4, 8), 1),
              4: ((8, 16), 2), 6: ((8, 16), 4)}
_PNG_SIZES = {b"gAMA": 4, b"cHRM": 32, b"sRGB": 1, b"pHYs": 9, b"tIME": 7}
_PNG_PASSES = ((0, 0, 8, 8), (4, 0, 8, 8), (0, 4, 4, 8), (2, 0, 4, 4),
               (0, 2, 2, 4), (1, 0, 2, 2), (0, 1, 1, 2))
_JPEG_APPS = ((0xe0, b"JFIF\x00", 14), (0xe2, b"ICC_PROFILE\x00", 14), (0xee, b"Adobe", 12))


def _png_packed(body: bytes, at: int, room: int) -> int:
    if at >= len(body) or body[at]:
        return -1
    try:
        stream = zlib.decompressobj()
        size = len(stream.decompress(body[at + 1:], room + 1))
        return size if stream.eof and size <= room else -1
    except Exception:
        return -1


def _png_note(body: bytes, room: int) -> int:
    key = body.find(b"\x00", 0, 80)
    if key < 1 or key + 2 >= len(body) or body[key + 1] > 1:
        return -1
    if not body[key + 1]:
        return 0
    lang = body.find(b"\x00", key + 3)
    text = body.find(b"\x00", lang + 1) if lang >= 0 else -1
    return _png_packed(body[key + 2:key + 3] + body[text + 1:], 0, room) if text >= 0 else -1


def _png_problem(data: bytes) -> str:
    end, at, seen_data, closed_data, palette, colours = len(data), 8, False, False, False, 0
    width = height = bits = samples = interlace = kind = 0
    packed = []
    first, room = True, PNG_TEXT_MAX
    while True:
        if at + 12 > end:
            return "truncated before closing chunk"
        size, name = _be(data, at, 4), data[at + 4:at + 8]
        if at + 12 + size > end:
            return "chunk boundary exceeds file length"
        body = data[at + 8:at + 8 + size]
        if zlib.crc32(name + body) & 0xffffffff != _be(data, at + 8 + size, 4):
            return "chunk CRC checksum failed"
        if first != (name == b"IHDR"):
            return "IHDR header missing or invalid position"
        first = False
        if name == b"IHDR":
            if size != 13:
                return "IHDR header size is invalid"
            width, height, bits, kind = _be(body, 0, 4), _be(body, 4, 4), body[8], body[9]
            interlace = body[12]
            if not width or not height or kind not in _PNG_KINDS \
                    or bits not in _PNG_KINDS[kind][0] or body[10] or body[11] \
                    or interlace not in (0, 1):
                return "header values not recognized by PNG decoders"
            if width > MAX_IMAGE_SIDE or height > MAX_IMAGE_SIDE:
                return "image resolution exceeds allowable limits"
            samples = _PNG_KINDS[kind][1]
        elif name == b"PLTE":
            if seen_data or palette or not size or size % 3 or size > 768:
                return "PLTE palette malformed"
            palette, colours = True, size // 3
        elif name == b"IDAT":
            if closed_data:
                return "IDAT fragmented by another chunk"
            seen_data = True
            packed.append(body)
        elif name == b"IEND":
            if at + 12 != end:
                return "trailing bytes after IEND chunk"
            break
        elif not name[:1].islower() or not name.isalpha():
            return "unsupported critical chunk"
        elif name in (b"acTL", b"fcTL", b"fdAT"):
            return "animated PNG format rejected; still images only"
        elif name in (b"iCCP", b"zTXt", b"iTXt"):
            key = body.find(b"\x00", 0, 80)
            used = _png_note(body, room) if name == b"iTXt" \
                else _png_packed(body, key + 1, room) if key >= 1 else -1
            if used < 0:
                return "decompression failure in profile or text chunk"
            room -= used
        if seen_data and name != b"IDAT":
            closed_data = True
        at += 12 + size

    if not seen_data or (kind == 3 and not palette):
        return "missing IDAT pixel payload or palette"

    def rows(w: int, h: int) -> tuple:
        return (h, 1 + (w * samples * bits + 7) // 8)

    if interlace:
        plan = [rows((width - x0 + dx - 1) // dx, (height - y0 + dy - 1) // dy)
                for x0, y0, dx, dy in _PNG_PASSES if width > x0 and height > y0]
    else:
        plan = [rows(width, height)]
    if sum(n * size for n, size in plan) > PNG_RAW_MAX:
        return "uncompressed pixel volume exceeds memory limit"
    stream, feed = zlib.decompressobj(), b"".join(packed)
    step, left, need = 0, plan[0][0], 0
    try:
        while True:
            out = stream.decompress(feed, 1 << 20)
            i = 0
            while i < len(out):
                if not need:
                    while not left:
                        step += 1
                        if step == len(plan):
                            return "pixel stream exceeds header bounds"
                        left = plan[step][0]
                    if out[i] > 4:
                        return "unknown PNG scanline filter"
                    left, need = left - 1, plan[step][1]
                take = min(need, len(out) - i)
                i, need = i + take, need - take
            feed = stream.unconsumed_tail
            if stream.eof or not (out or feed):
                break
    except Exception:
        return "PNG inflation stream failed"
    if not stream.eof or stream.unused_data or need or left or step != len(plan) - 1:
        return "decompressed size mismatch with header"
    return ""


def _jpeg_problem(data: bytes) -> str:
    end, at = len(data), 2
    if data[-2:] != b"\xff\xd9":
        return "missing JPEG EOI termination marker"
    quant, huff, parts, progressive, scans, whole, pieces = set(), set(), {}, False, 0, False, 0
    while True:
        if at + 2 > end or data[at] != 0xff:
            return "corrupted segment marker sequence"
        while data[at + 1] == 0xff and at + 2 < end:
            at += 1
        mark = data[at + 1]
        if mark == 0xd9:
            if at + 2 != end or not scans:
                return "missing image scans or trailing data after EOI"
            return ""
        size, pieces = _be(data, at + 2, 2), pieces + 1
        if size < 2 or at + 2 + size > end - 2:
            return "segment boundary out of file bounds"
        if pieces > JPEG_SEGMENTS_MAX:
            return "segment count exceeds security threshold"
        body = data[at + 4:at + 2 + size]
        if mark == 0xdb:
            i = 0
            while i < len(body):
                wide, ident = body[i] >> 4, body[i] & 15
                if wide > 1 or ident > 3:
                    return "malformed quant table identifier"
                i += 1 + 64 * (wide + 1)
                quant.add(ident)
            if i != len(body):
                return "quant table size mismatch"
        elif mark == 0xc4:
            i = 0
            while i + 17 <= len(body):
                kind, ident = body[i] >> 4, body[i] & 15
                count, code = sum(body[i + 1:i + 17]), 0
                for length in range(1, 17):
                    code = (code + body[i + length]) << 1
                    if code >= 2 << length:
                        count = 257
                if kind > 1 or ident > 3 or count > 256:
                    return "malformed Huffman table specification"
                i += 17 + count
                huff.add((kind, ident))
            if i != len(body):
                return "Huffman table length mismatch"
        elif mark in (0xc0, 0xc1, 0xc2):
            if parts or len(body) < 6:
                return "duplicate or missing SOF frame definition"
            count = body[5]
            if body[0] != 8 or not _be(body, 1, 2) or not _be(body, 3, 2) \
                    or count not in (1, 3, 4) or len(body) != 6 + 3 * count:
                return "unsupported JPEG SOF frame format"
            if _be(body, 1, 2) > MAX_IMAGE_SIDE or _be(body, 3, 2) > MAX_IMAGE_SIDE:
                return "JPEG resolution exceeds permissible dimensions"
            for k in range(count):
                ident, sampling, table = body[6 + 3 * k:9 + 3 * k]
                if not 1 <= sampling >> 4 <= 4 or not 1 <= sampling & 15 <= 4 or table > 3 \
                        or ident in parts:
                    return "invalid SOF component sampling factors"
                parts[ident] = (table, sampling >> 4, sampling & 15)
            progressive = mark == 0xc2
        elif mark == 0xda:
            if not parts or not body:
                return "SOS scan header encountered before SOF frame"
            if whole:
                return "unexpected scan after complete picture"
            count = body[0]
            if not 1 <= count <= len(parts) or len(body) != 4 + 2 * count:
                return "malformed SOS scan header"
            scans += 1
            # Advance past scan data to next marker
            at += 2 + size
            while True:
                at = data.find(b"\xff", at)
                if at < 0 or at + 1 >= end:
                    return "scan data terminated unexpectedly without marker"
                if data[at + 1] == 0 or 0xd0 <= data[at + 1] <= 0xd7:
                    at += 2
                else:
                    break
            continue
        at += 2 + size


def _image_problem(data: bytes) -> str:
    """Validate that raw bytes constitute a well-formed PNG or JFIF JPEG image."""
    if len(data) > MAX_IMAGE_BYTES:
        return f"file exceeds maximum size of {MAX_IMAGE_BYTES // 1024} KB"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        why = _png_problem(data)
        return f"PNG parsing error: {why}" if why else ""
    if data[:4] == b"\xff\xd8\xff\xe0" and data[6:11] == b"JFIF\x00":
        why = _jpeg_problem(data)
        return f"JPEG parsing error: {why}" if why else ""
    return "unsupported image container; file must be standard PNG or JFIF JPEG"


# ── Weather Datasets URL Construction & Series Parser ─────────────────────────

def _source_url(source: str, lat: str, lon: str, start: date, end: date) -> str:
    """Deterministically construct canonical API endpoints for weather data providers."""
    if source == "OPEN_METEO":
        return ("https://archive-api.open-meteo.com/v1/archive?latitude=" + lat
                + "&longitude=" + lon + "&start_date=" + start.isoformat()
                + "&end_date=" + end.isoformat() + "&daily=precipitation_sum&timezone=UTC")
    return ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR"
            "&community=AG&longitude=" + lon + "&latitude=" + lat
            + "&start=" + start.strftime("%Y%m%d") + "&end=" + end.strftime("%Y%m%d")
            + "&format=JSON")


def _tenths(v) -> int:
    """Convert daily rainfall amount to whole tenths of a millimetre (e.g. 14.5 mm -> 145 tenths)."""
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except Exception:
        return None
    if not math.isfinite(f) or f < 0 or f > 2000:
        return None
    return int(round(f * 10))


def _parse_series(source: str, body: str, start: date, days: int) -> list:
    """Parse precipitation values from Open-Meteo or NASA POWER payload into ordered series."""
    data = json.loads(body)
    wanted = [(start + timedelta(days=i)) for i in range(days)]
    found = {}
    if source == "OPEN_METEO":
        d = data["daily"]
        for t, v in zip(d["time"], d["precipitation_sum"]):
            found[str(t)] = _tenths(v)
    else:
        p = data["properties"]["parameter"]["PRECTOTCORR"]
        for k, v in p.items():
            k = str(k)
            if len(k) == 8:
                found[f"{k[0:4]}-{k[4:6]}-{k[6:8]}"] = _tenths(v)
    return [[w.isoformat(), found.get(w.isoformat())] for w in wanted]


def _summary(series: list) -> dict:
    vals = [v for _, v in series]
    present = [v for v in vals if v is not None]
    return {
        "total_tenths": sum(present),
        "days_reported": len(present),
        "days": len(vals),
        "complete": len(present) == len(vals),
        "digest": _sha256(json.dumps(series, separators=(",", ":")))
    }


def _fires(trigger: str, total: int, threshold: int) -> bool:
    return total < threshold if trigger == "RAIN_BELOW" else total > threshold


def _select(product_primary: str, product_backup: str, sums: dict):
    """Deterministic selection rule: primary dataset if complete, backup if complete, otherwise None."""
    if sums[product_primary]["complete"]:
        return product_primary
    if sums[product_backup]["complete"]:
        return product_backup
    return None


def _features(primary: str, backup: str, series: dict) -> dict:
    days = []
    for (d, x), (_, y) in zip(series[primary], series[backup]):
        if x is not None and y is not None and abs(x - y) >= BIG_DAY_TENTHS:
            days.append([d, x, y])

    def wettest(s):
        present = [(v, d) for d, v in s if v is not None]
        return max(present)[1:] + (max(present)[0],) if present else ()

    return {
        "big_differences": days[:20],
        "wettest": {
            primary: list(wettest(series[primary])),
            backup: list(wettest(series[backup]))
        }
    }


def _public_link(value) -> str:
    url = str(value or "").strip()
    if len(url) > URL_MAX or not url.startswith("https://") or any(c.isspace() for c in url) or "@" in url:
        _refuse(f"evidence page must be a public https URL of at most {URL_MAX} characters")
    host = url[8:].split("/")[0].split(":")[0].lower()
    if "." not in host or host in ("localhost",) or host.replace(".", "").isdigit():
        _refuse("evidence page must be hosted on an accessible public domain")
    return url


def _page_text(url: str) -> str:
    text = gl.nondet.web.render(url, mode="text")
    return " ".join(str(text or "").split())[:PAGE_EXCERPT_CHARS]


# Pure standalone fetch function for datasets (MANDATORY RULE 1: ZERO self in nondet closures)
def _fetch_both_datasets(primary: str, backup: str, lat: str, lon: str, start_iso: str, window_days: int) -> dict:
    start = date.fromisoformat(start_iso)
    end = start + timedelta(days=window_days - 1)
    out = {}
    for s in (primary, backup):
        u = _source_url(s, lat, lon, start, end)
        r = gl.nondet.web.get(u)
        status = int(getattr(r, "status", 200) or 200)
        if status >= 400:
            raise gl.vm.UserError(f"{ERROR_LLM} Provider {s} returned HTTP error status {status}")
        raw_body = bytes(r.body).decode("utf-8")
        out[s] = _parse_series(s, raw_body, start, window_days)
    return out


# Pure standalone photo evaluation function for LLM
def _read_photos_pure(items: list, photos_bytes: dict) -> dict:
    out = {}
    for it in items:
        if it.get("kind") != "PHOTO":
            continue
        eid = it["evidence_id"]
        img_data = photos_bytes.get(eid)
        if not img_data:
            continue
        look_prompt = (
            "You are examining a field photograph submitted as evidence in a parametric agricultural yield dispute. "
            "Describe strictly what is observable. Do not speculate or make unsupported assertions.\n"
            f"Filer ({it['by']}) caption: <<<{_defuse(it['caption'])}>>>\n"
            "Respond in STRICT JSON format:\n"
            "{\"readable\": true, \"shows\": \"Two clear sentences describing crop condition, foliage color, soil dryness/cracking, standing water, or evidence of precipitation.\"}"
        )
        try:
            raw = gl.nondet.exec_prompt(look_prompt, response_format="json", images=[img_data])
            parsed = raw if isinstance(raw, dict) else json.loads(str(raw))
            out[eid] = parsed if isinstance(parsed, dict) else {"readable": False, "shows": ""}
        except Exception:
            out[eid] = {"readable": False, "shows": "[Image unreadable by validator model]"}
    return out


# Pure standalone judge prompt builder
def _build_judge_prompt(y: dict, series: dict, sums: dict, case: dict, kind: str, photos_info: dict) -> str:
    feat = _features(y["primary"], y["backup"], series)
    primary_name = SOURCE_NAMES.get(y["primary"], y["primary"])
    backup_name = SOURCE_NAMES.get(y["backup"], y["backup"])

    lines = [
        "You are an impartial GenLayer validator adjudicating a parametric weather insurance dispute.\n",
        f"POLICY DETAILS:\n- Crop: {y['crop']}\n- Location: {y['region']} (Lat: {y['lat']}, Lon: {y['lon']})\n",
        f"- Trigger: {y['trigger']} (Threshold: {y['threshold_tenths'] / 10:.1f} mm)\n",
        f"- Window: {y['window_start']} to {y['window_end']} ({y['window_days']} days)\n\n",
        f"RECORDED PRECIPITATION DATA:\n",
        f"- Primary [{primary_name}]: {sums[y['primary']]['total_tenths'] / 10:.1f} mm total\n",
        f"- Backup [{backup_name}]: {sums[y['backup']]['total_tenths'] / 10:.1f} mm total\n",
        f"- Initial Selected Reading: {y['reading']['selected']}\n",
        f"- Divergence Analysis: {len(feat['big_differences'])} days differed by >= 10.0 mm\n\n",
        f"DISPUTE CLAUSE AGREED BY BOTH PARTIES AT ISSUANCE:\n",
        f"<<<CLAUSE {_defuse(y['dispute_clause'])} END CLAUSE>>>\n\n",
        f"STATEMENTS:\n- Contestant ({case['by']}): <<<{_defuse(case.get('statement', ''))}>>>\n"
    ]
    if case.get("answer"):
        lines.append(f"- Opposing Response: <<<{_defuse(case['answer'])}>>>\n")

    lines.append("\nSUBMITTED EVIDENCE:\n")
    for it in case.get("_evidence", []):
        eid = it["evidence_id"]
        if it["kind"] == "PHOTO":
            p_res = photos_info.get(eid, {})
            lines.append(f"- Photograph by {it['by']} [{it['caption']}]: {p_res.get('shows', 'No details')}\n")
        elif it["kind"] == "PAGE":
            lines.append(f"- Web Document by {it['by']} [{it['caption']} - {it['url']}]: {it.get('excerpt', '')[:600]}\n")

    lines.append(
        "\nDECISION RULES:\n"
        "Evaluate the recorded datasets, evidence, and party statements against the signed dispute clause.\n"
        "Select exactly ONE verdict:\n"
        "- 'STANDS': Under the agreed clause and facts, the initially selected reading governs.\n"
        "- 'USE_OTHER': Under the clause and ground facts, the other weather dataset governs.\n"
        "- 'NO_RELIABLE_READING': Due to irreconcilable data conflict or failure, neither dataset can be relied upon.\n"
        "Respond STRICTLY in JSON format:\n"
        "{\"verdict\": \"STANDS\" | \"USE_OTHER\" | \"NO_RELIABLE_READING\", \"reason\": \"Objective two-sentence rationale citing clause and verified data.\"}"
    )
    return "".join(lines)


# ── Intelligent Contract Class Definition ─────────────────────────────────────

class GenVest(gl.Contract):
    """GenVest Core Intelligent Contract on GenLayer GenVM."""

    deployer: Address
    counters: TreeMap[str, str]
    products: TreeMap[str, str]
    policies: TreeMap[str, str]
    index: TreeMap[str, str]
    rounds: TreeMap[str, str]
    ledger: TreeMap[str, str]
    evidence: TreeMap[str, str]
    evidence_bytes: TreeMap[str, bytes]

    def __init__(self):
        self.deployer = gl.message.sender_address
        for k in ("product", "policy", "round", "settled", "paid_out", "held_wei", "paid_wei", "evidence"):
            self.counters[k] = "0"

    # ── State Helpers ─────────────────────────────────────────────────────────

    def _sender(self) -> str:
        return _addr_str(gl.message.sender_address)

    def _bump(self, key: str, by: int = 1) -> int:
        n = int(self.counters.get(key) or "0") + by
        self.counters[key] = str(n)
        return n

    def _push(self, key: str, value: str) -> None:
        n = self._bump(f"ix|{key}")
        self.index[f"{key}|{n:06d}"] = value

    def _page(self, key: str, offset: int, limit: int) -> list:
        total = int(self.counters.get(f"ix|{key}") or "0")
        offset = max(0, offset)
        limit = min(MAX_PAGE, max(1, limit))
        out = []
        for i in range(offset + 1, min(total + 1, offset + limit + 1)):
            val = self.index.get(f"{key}|{i:06d}")
            if val:
                out.append(val)
        return out

    def _product(self, pid: str) -> dict:
        raw = self.products.get(pid)
        if not raw:
            _refuse("hedging product does not exist")
        return json.loads(raw)

    def _policy(self, yid: str) -> dict:
        raw = self.policies.get(yid)
        if not raw:
            _refuse("insurance policy does not exist")
        return json.loads(raw)

    def _save_product(self, p: dict) -> None:
        self.products[p["product_id"]] = json.dumps(p, sort_keys=True)

    def _save(self, y: dict) -> None:
        self.policies[y["policy_id"]] = json.dumps(y, sort_keys=True)

    def _credit(self, who: str, wei: int) -> None:
        if wei <= 0:
            return
        addr = _addr_str(who)
        row = json.loads(self.ledger.get(addr) or '{"claimable": "0", "claimed": "0"}')
        row["claimable"] = str(int(row["claimable"]) + wei)
        self.ledger[addr] = json.dumps(row, sort_keys=True)

    def _event(self, y: dict, kind: str, note: str = "") -> None:
        n = int(y.get("event_count", 0)) + 1
        y["event_count"] = n
        ev = {"n": n, "at": _iso(_now()), "kind": kind, "note": note}
        y.setdefault("events", []).append(ev)

    def _role(self, y: dict, who: str) -> str:
        s = _addr_str(who)
        if s == y["farmer"]:
            return "FARMER"
        if s == y["insurer"]:
            return "INSURER"
        return "STRANGER"

    def _state(self, y: dict, *allowed) -> None:
        if y["state"] not in allowed:
            _refuse(f"policy is in state '{y['state']}'; operation requires state in {allowed}")

    def _pay(self, y: dict, role: str, wei: int) -> None:
        if wei <= 0:
            return
        dest = y["farmer"] if role == "FARMER" else y["insurer"]
        self._credit(dest, wei)

    def _release(self, y: dict) -> None:
        if y["reserved"]:
            y["reserved"] = False
            p = self._product(y["product_id"])
            p["reserved_wei"] = str(max(0, int(p["reserved_wei"]) - int(y["payout_wei"])))
            self._save_product(p)

    def _settle(self, y: dict, how: str, outcome) -> None:
        """Outcome: True pays farmer, False releases reserve, None voids policy."""
        self._state(y, "ACTIVE", "READ", "CONTESTED", "DECIDED", "APPEALED")
        y["state"] = "SETTLED" if outcome is not None else "VOID"
        y["settled_at"] = _iso(_now())
        y["settled_how"] = how

        if outcome is True:
            # Triggered: payout to farmer, premium to insurer
            y["paid_to_farmer"] = True
            self._pay(y, "FARMER", int(y["payout_wei"]))
            self._pay(y, "INSURER", int(y["premium_wei"]))
            self._release(y)
            self._bump("paid_out")
            self._bump("paid_wei", int(y["payout_wei"]))
        elif outcome is False:
            # Not triggered: premium to insurer, reserve released
            y["paid_to_farmer"] = False
            self._pay(y, "INSURER", int(y["premium_wei"]))
            self._release(y)
        else:
            # Void: refund premium to farmer, release reserve to insurer
            y["paid_to_farmer"] = False
            self._pay(y, "FARMER", int(y["premium_wei"]))
            self._release(y)

        self._bump("settled")
        self._bump("held_wei", -(int(y["premium_wei"])))
        self._event(y, y["state"], how)

    def _clock_from(self, y: dict) -> date:
        return max(date.fromisoformat(y["window_end"]), _parse_iso(y["bought_at"]).date())

    def _bond(self, y: dict) -> int:
        return max(MIN_WEI, int(y["payout_wei"]) * BOND_BPS // 10000)

    def _against(self, y: dict) -> str:
        """The side the current reading went against."""
        r = y.get("reading")
        if not r:
            return ""
        return "INSURER" if r["triggered"] else "FARMER"

    def _rank(self, role: str, outcome) -> int:
        good = True if role == "FARMER" else False
        return 2 if outcome is good else (1 if outcome is None else 0)

    def _short_of_best(self, outcome) -> list:
        return [r for r in ("FARMER", "INSURER") if self._rank(r, outcome) < 2]

    def _outcome(self, y: dict, verdict: str):
        r = y["reading"]
        if verdict == "STANDS":
            return r["triggered"]
        if verdict == "USE_OTHER":
            return r["other_triggers"]
        return None

    def _filing(self, y: dict, role: str, kind: str) -> str:
        stage = "CONTEST" if y["state"] == "CONTESTED" else "APPEAL"
        cnt = sum(1 for e in y.get("evidence_ids", [])
                  if json.loads(self.evidence[e])["by"] == role
                  and json.loads(self.evidence[e])["kind"] == kind
                  and json.loads(self.evidence[e])["stage"] == stage)
        limit = EVIDENCE_PER_SIDE.get(kind, 2)
        if cnt >= limit:
            _refuse(f"each side may file at most {limit} items of {kind.lower()} evidence per stage")
        return stage

    def _store(self, y: dict, record: dict) -> str:
        n = self._bump("evidence")
        eid = f"E-{n:06d}"
        record["evidence_id"] = eid
        record["policy_id"] = y["policy_id"]
        record["filed_at"] = _iso(_now())
        self.evidence[eid] = json.dumps(record, sort_keys=True)
        y.setdefault("evidence_ids", []).append(eid)
        self._save(y)
        return eid

    def _record(self, y: dict, kind: str, got: dict, case: dict) -> dict:
        n = int(y["round_count"]) + 1
        y["round_count"] = n
        rec = {
            "n": n,
            "kind": kind,
            "at": _iso(_now()),
            "ruleset": RULESET_VERSION,
            "verdict": got["verdict"],
            "reason": got["reason"],
            "digests": got["digests"],
            "totals": got["totals"],
            "by": case["by"],
            "evidence": got["evidence"],
            "outcome": self._outcome(y, got["verdict"])
        }
        self.rounds[f"{y['policy_id']}|{n}"] = json.dumps(rec, sort_keys=True)
        self._bump("round")
        return rec

    # ── Public View Methods ───────────────────────────────────────────────────

    @gl.public.view
    def get_config(self) -> dict:
        return {
            "version": VERSION,
            "ruleset": RULESET_VERSION,
            "min_wei": str(MIN_WEI),
            "bond_bps": BOND_BPS,
            "min_window_days": MIN_WINDOW_DAYS,
            "max_window_days": MAX_WINDOW_DAYS,
            "max_capacity": MAX_CAPACITY,
            "read_grace_days": READ_GRACE_DAYS,
            "read_long_stop_days": READ_LONG_STOP_DAYS,
            "sources": list(SOURCES),
            "source_names": SOURCE_NAMES,
            "triggers": list(TRIGGERS),
            "verdicts": list(VERDICTS),
            "policy_states": list(POLICY_STATES)
        }

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "product_count": int(self.counters.get("product") or "0"),
            "policy_count": int(self.counters.get("policy") or "0"),
            "round_count": int(self.counters.get("round") or "0"),
            "settled_count": int(self.counters.get("settled") or "0"),
            "paid_out_count": int(self.counters.get("paid_out") or "0"),
            "held_wei": self.counters.get("held_wei") or "0",
            "paid_wei": self.counters.get("paid_wei") or "0",
            "evidence_count": int(self.counters.get("evidence") or "0")
        }

    @gl.public.view
    def list_products(self, offset: int = 0, limit: int = 20) -> list:
        pids = self._page("products", offset, limit)
        return [self._product(p) for p in pids]

    @gl.public.view
    def list_policies(self, offset: int = 0, limit: int = 20) -> list:
        yids = self._page("policies", offset, limit)
        return [self._policy(y) for y in yids]

    @gl.public.view
    def products_of(self, owner: str, offset: int = 0, limit: int = 20) -> list:
        addr = _address_or_refuse(owner)
        pids = self._page(f"insurer|{addr}", offset, limit)
        return [self._product(p) for p in pids]

    @gl.public.view
    def policies_of(self, holder: str, offset: int = 0, limit: int = 20) -> list:
        addr = _address_or_refuse(holder)
        yids = self._page(f"farmer|{addr}", offset, limit)
        return [self._policy(y) for y in yids]

    @gl.public.view
    def get_product(self, product_id: str) -> dict:
        return self._product(product_id)

    @gl.public.view
    def get_policy(self, policy_id: str) -> dict:
        return self._policy(policy_id)

    @gl.public.view
    def get_evidence(self, policy_id: str) -> list:
        y = self._policy(policy_id)
        return [json.loads(self.evidence[e]) for e in y.get("evidence_ids", []) if e in self.evidence]

    @gl.public.view
    def get_image(self, evidence_id: str) -> str:
        if evidence_id not in self.evidence_bytes:
            _refuse("image not found for evidence record")
        return bytes(self.evidence_bytes[evidence_id]).hex()

    @gl.public.view
    def get_balance(self, account: str) -> dict:
        addr = _address_or_refuse(account)
        row = json.loads(self.ledger.get(addr) or '{"claimable": "0", "claimed": "0"}')
        return {"account": addr, "claimable_wei": row["claimable"], "claimed_wei": row["claimed"]}

    @gl.public.view
    def source_url(self, source: str, lat: str, lon: str, start_date: str, end_date: str) -> str:
        s = source.strip().upper()
        if s not in SOURCES:
            _refuse(f"unknown weather source '{source}'")
        s_date = _day(start_date, "start_date")
        e_date = _day(end_date, "end_date")
        c_lat = _coord(lat, "latitude", 90)
        c_lon = _coord(lon, "longitude", 180)
        return _source_url(s, c_lat, c_lon, s_date, e_date)

    # ── Public Write Methods ──────────────────────────────────────────────────

    @gl.public.write
    def create_product(self, params_json: str) -> str:
        """Publish a new parametric climate yield hedging product."""
        try:
            p = json.loads(params_json)
        except Exception:
            _refuse("product specification must be valid JSON")

        crop = _clean(p.get("crop"), NAME_MAX)
        region = _clean(p.get("region"), LINE_MAX)
        if not crop or not region:
            _refuse("crop name and target region are required")
        lat = _coord(p.get("lat"), "latitude", 90)
        lon = _coord(p.get("lon"), "longitude", 180)
        trigger = str(p.get("trigger") or "").strip().upper()
        if trigger not in TRIGGERS:
            _refuse("trigger must be either RAIN_BELOW or RAIN_ABOVE")
        threshold = _int_or_refuse(p.get("threshold_tenths"), "threshold in tenths of mm", 1, MAX_THRESHOLD_TENTHS)
        window = _int_or_refuse(p.get("window_days"), "window duration in days", MIN_WINDOW_DAYS, MAX_WINDOW_DAYS)
        premium = _wei(p.get("premium_wei"), "policy premium")
        payout = _wei(p.get("payout_wei"), "policy payout")
        if payout <= premium:
            _refuse("policy payout must exceed premium")
        capacity = _int_or_refuse(p.get("capacity"), "policy issuance capacity", 1, MAX_CAPACITY)
        primary = str(p.get("primary") or "").strip().upper()
        backup = str(p.get("backup") or "").strip().upper()
        if primary not in SOURCES or backup not in SOURCES or primary == backup:
            _refuse("must designate two distinct providers from supported registry (OPEN_METEO, NASA_POWER)")
        clause = _clean(p.get("dispute_clause"), CLAUSE_MAX)
        if len(clause) < 20:
            _refuse("comprehensive dispute clause (minimum 20 characters) is required")

        replay = p.get("replay") is True
        season = ""
        if replay:
            start = _day(p.get("replay_start"), "replay season start date")
            season = start.isoformat()

        periods = p.get("periods")
        if not isinstance(periods, dict):
            _refuse("periods configuration required (contest, response, appeal)")
        per = {
            k: _int_or_refuse(periods.get(k), f"{k} period in seconds", MIN_PERIOD_SECONDS, MAX_PERIOD_SECONDS)
            for k in ("contest", "response", "appeal")
        }

        n = self._bump("product")
        pid = f"P-{n:06d}"
        insurer_addr = self._sender()

        prod_record = {
            "product_id": pid,
            "insurer": insurer_addr,
            "crop": crop,
            "region": region,
            "lat": lat,
            "lon": lon,
            "trigger": trigger,
            "threshold_tenths": threshold,
            "window_days": window,
            "premium_wei": str(premium),
            "payout_wei": str(payout),
            "capacity": capacity,
            "sold_count": 0,
            "funded_wei": "0",
            "reserved_wei": "0",
            "primary": primary,
            "backup": backup,
            "dispute_clause": clause,
            "periods": per,
            "replay": replay,
            "replay_start": season,
            "active": True,
            "created_at": _iso(_now())
        }

        self._save_product(prod_record)
        self._push("products", pid)
        self._push(f"insurer|{insurer_addr}", pid)
        return pid

    @gl.public.write
    def fund_product(self, product_id: str) -> str:
        """Fund capital reserve for a product (payable via gl.message.value)."""
        p = self._product(product_id)
        if self._sender() != p["insurer"]:
            _refuse("only product underwriter can fund capital reserve")
        val = int(gl.message.value)
        if val <= 0:
            _refuse("must provide positive native GEN value to fund product")
        p["funded_wei"] = str(int(p["funded_wei"]) + val)
        self._bump("held_wei", val)
        self._save_product(p)
        return json.dumps({"product_id": product_id, "funded_wei": p["funded_wei"]})

    @gl.public.write
    def withdraw_capital(self, product_id: str, amount_wei: int) -> str:
        """Withdraw unreserved underwriting capital from product pool."""
        p = self._product(product_id)
        if self._sender() != p["insurer"]:
            _refuse("only product underwriter can withdraw capital")
        amt = _wei(amount_wei, "withdrawal amount")
        avail = int(p["funded_wei"]) - int(p["reserved_wei"])
        if amt > avail:
            _refuse(f"withdrawal exceeds available unreserved capital ({avail} wei available)")
        p["funded_wei"] = str(int(p["funded_wei"]) - amt)
        self._bump("held_wei", -amt)
        self._credit(p["insurer"], amt)
        self._save_product(p)
        return json.dumps({"product_id": product_id, "withdrawn_wei": str(amt)})

    @gl.public.write
    def close_product(self, product_id: str) -> str:
        """Close product to prevent new policy sales."""
        p = self._product(product_id)
        if self._sender() != p["insurer"]:
            _refuse("only product underwriter can close product")
        p["active"] = False
        self._save_product(p)
        return json.dumps({"product_id": product_id, "active": False})

    @gl.public.write
    def buy_policy(self, product_id: str, season_start_date: str) -> str:
        """Purchase parametric climate hedging policy (payable with exact premium)."""
        p = self._product(product_id)
        if not p["active"]:
            _refuse("product is closed to new policy underwriting")
        if p["sold_count"] >= p["capacity"]:
            _refuse("product capacity has been fully reached")

        premium = int(p["premium_wei"])
        payout = int(p["payout_wei"])
        val = int(gl.message.value)
        if val != premium:
            _refuse(f"exact premium required: sent {val} wei, expected {premium} wei")

        # Verify sufficient unreserved capital is available to cover payout
        avail = int(p["funded_wei"]) - int(p["reserved_wei"])
        if avail < payout:
            _refuse(f"underwriting pool lacks unreserved capacity to guarantee payout ({avail} wei available, {payout} wei required)")

        farmer_addr = self._sender()
        if p["replay"]:
            start_d = date.fromisoformat(p["replay_start"])
        else:
            start_d = _day(season_start_date, "season start date")
            if start_d <= _now().date():
                _refuse("future policy window must start after today")

        end_d = start_d + timedelta(days=p["window_days"] - 1)

        # Reserve payout from underwriting capital pool
        p["reserved_wei"] = str(int(p["reserved_wei"]) + payout)
        p["sold_count"] += 1
        self._save_product(p)
        self._bump("held_wei", premium)

        n = self._bump("policy")
        yid = f"Y-{n:06d}"

        policy_record = {
            "policy_id": yid,
            "product_id": product_id,
            "farmer": farmer_addr,
            "insurer": p["insurer"],
            "crop": p["crop"],
            "region": p["region"],
            "lat": p["lat"],
            "lon": p["lon"],
            "trigger": p["trigger"],
            "threshold_tenths": p["threshold_tenths"],
            "window_days": p["window_days"],
            "window_start": start_d.isoformat(),
            "window_end": end_d.isoformat(),
            "premium_wei": str(premium),
            "payout_wei": str(payout),
            "primary": p["primary"],
            "backup": p["backup"],
            "dispute_clause": p["dispute_clause"],
            "periods": p["periods"],
            "replay": p["replay"],
            "state": "ACTIVE",
            "reserved": True,
            "paid_to_farmer": False,
            "round_count": 0,
            "event_count": 0,
            "bought_at": _iso(_now()),
            "evidence_ids": [],
            "reading": None,
            "contest": None,
            "appeal": None,
            "decision": None
        }

        self._event(policy_record, "BOUGHT", f"window: {start_d.isoformat()} to {end_d.isoformat()}")
        self._save(policy_record)
        self._push("policies", yid)
        self._push(f"farmer|{farmer_addr}", yid)
        self._push(f"product_policies|{product_id}", yid)
        return yid

    @gl.public.write
    def read_index(self, policy_id: str) -> str:
        """
        Execute multi-validator consensus rainfall read from Open-Meteo & NASA POWER.
        Requires exact match across independent validator fetches.
        """
        y = self._policy(policy_id)
        self._state(y, "ACTIVE")
        if _now().date() <= date.fromisoformat(y["window_end"]):
            _refuse("precipitation evaluation window has not yet concluded")

        # Pre-extract local variables (MANDATORY RULE 1: ZERO self in nondet closure)
        p_name = str(y["primary"])
        b_name = str(y["backup"])
        lat = str(y["lat"])
        lon = str(y["lon"])
        start_iso = str(y["window_start"])
        w_days = int(y["window_days"])

        def leader_fn():
            return _fetch_both_datasets(p_name, b_name, lat, lon, start_iso, w_days)

        def validator_fn(res) -> bool:
            if not isinstance(res, gl.vm.Return):
                return False
            try:
                mine = _fetch_both_datasets(p_name, b_name, lat, lon, start_iso, w_days)
            except Exception as e:
                print("[DISAGREE] Could not fetch datasets: " + str(e)[:160])
                return False
            if mine != res.calldata:
                print("[DISAGREE] Weather series mismatch between leader and validator")
                return False
            return True

        got = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(got, dict) or set(got) != {p_name, b_name}:
            raise gl.vm.UserError(f"{ERROR_LLM} validators returned incomplete weather datasets")

        sums = {s: _summary(v) for s, v in got.items()}
        chosen = _select(p_name, b_name, sums)
        if chosen is None:
            _refuse("neither dataset is fully reporting yet; query again later")

        grace = self._clock_from(y) + timedelta(days=READ_GRACE_DAYS)
        if not all(v["complete"] for v in sums.values()) and _now().date() <= grace:
            _refuse(f"both datasets must be complete during initial grace window (expires {grace.isoformat()})")

        total = sums[chosen]["total_tenths"]
        fired = _fires(y["trigger"], total, y["threshold_tenths"])
        other = b_name if chosen == p_name else p_name
        other_fired = _fires(y["trigger"], sums[other]["total_tenths"], y["threshold_tenths"]) if sums[other]["complete"] else None

        y["reading"] = {
            "at": _iso(_now()),
            "selected": chosen,
            "other": other,
            "triggered": fired,
            "series": got,
            "summaries": sums,
            "other_triggers": other_fired
        }
        y["state"] = "READ"
        y["contest_ends"] = _iso(_now() + timedelta(seconds=y["periods"]["contest"]))
        self._event(y, "READ", "TRIGGERED" if fired else "NOT_TRIGGERED")
        self._save(y)

        return json.dumps({
            "policy_id": policy_id,
            "selected": chosen,
            "total_tenths": total,
            "triggered": fired,
            "contest_ends": y["contest_ends"]
        })

    @gl.public.write
    def void_unread(self, policy_id: str) -> str:
        """Permissionless void if index reading cannot be obtained before read long-stop."""
        y = self._policy(policy_id)
        self._state(y, "ACTIVE")
        stop = self._clock_from(y) + timedelta(days=READ_LONG_STOP_DAYS)
        if _now().date() <= stop:
            _refuse(f"read long-stop window active until {stop.isoformat()}; cannot void yet")
        self._settle(y, "NO_READING", None)
        self._save(y)
        return json.dumps({"policy_id": policy_id, "state": y["state"]})

    @gl.public.write
    def contest(self, policy_id: str, statement: str) -> str:
        """
        Disadvantaged party contests the reading by posting a bond (payable via gl.message.value).
        Allowed only when datasets put the policy on opposite sides of the trigger threshold.
        """
        y = self._policy(policy_id)
        self._state(y, "READ")
        if _now() > _parse_iso(y["contest_ends"]):
            _refuse("contest submission window has expired")

        against = self._against(y)
        role = self._role(y, self._sender())
        if role != against:
            _refuse(f"only the disadvantaged side ({against.lower()}) has standing to contest this reading")

        r = y["reading"]
        if r["other_triggers"] is None:
            _refuse("backup dataset is incomplete; contest is not admissible")
        if r["triggered"] == r["other_triggers"]:
            _refuse("both datasets agree on the trigger outcome; no dispute exists to arbitrate")

        bond_req = self._bond(y)
        val = int(gl.message.value)
        if val != bond_req:
            _refuse(f"exact dispute bond of {bond_req} wei required (sent {val} wei)")

        stmt = _clean(statement, STATEMENT_MAX)
        if len(stmt) < 10:
            _refuse("contest statement of at least 10 characters required")

        self._bump("held_wei", bond_req)
        y["state"] = "CONTESTED"
        y["contest"] = {
            "by": role,
            "statement": stmt,
            "bond_wei": str(bond_req),
            "opened_at": _iso(_now()),
            "response_ends": _iso(_now() + timedelta(seconds=y["periods"]["response"])),
            "lapse_at": _iso(_now() + timedelta(seconds=y["periods"]["response"] * LONG_STOP_PERIODS)),
            "answer": None
        }
        self._event(y, "CONTESTED", f"by {role}")
        self._save(y)

        return json.dumps({
            "policy_id": policy_id,
            "state": "CONTESTED",
            "bond_wei": str(bond_req),
            "response_ends": y["contest"]["response_ends"]
        })

    @gl.public.write
    def answer(self, policy_id: str, statement: str) -> str:
        """Submit opposing statement in defense of the contested reading."""
        y = self._policy(policy_id)
        self._state(y, "CONTESTED", "APPEALED")
        case = y["contest"] if y["state"] == "CONTESTED" else y["appeal"]
        if _now() > _parse_iso(case["response_ends"]):
            _refuse("response window has expired")

        opposing = "INSURER" if case["by"] == "FARMER" else "FARMER"
        if self._role(y, self._sender()) != opposing:
            _refuse("only the opposing party may submit a response statement")
        if case.get("answer"):
            _refuse("response statement has already been recorded")

        stmt = _clean(statement, STATEMENT_MAX)
        if len(stmt) < 10:
            _refuse("response statement must be at least 10 characters")

        case["answer"] = stmt
        case["answered_at"] = _iso(_now())
        self._event(y, "ANSWERED")
        self._save(y)
        return json.dumps({"policy_id": policy_id, "answered": True})

    @gl.public.write
    def file_photo(self, policy_id: str, caption: str, image_bytes: bytes) -> str:
        """File photographic field evidence (PNG or JFIF-JPEG format verified)."""
        y = self._policy(policy_id)
        self._state(y, "CONTESTED", "APPEALED")
        case = y["contest"] if y["state"] == "CONTESTED" else y["appeal"]
        if _now() > _parse_iso(case["response_ends"]):
            _refuse("evidence filing window closed")

        role = self._role(y, self._sender())
        if role not in ("FARMER", "INSURER"):
            _refuse("only participating policy parties may file evidence")

        stage = self._filing(y, role, "PHOTO")
        raw = bytes(image_bytes)
        prob = _image_problem(raw)
        if prob:
            _refuse(prob)

        eid = self._store(y, {
            "kind": "PHOTO",
            "by": role,
            "stage": stage,
            "caption": _clean(caption, CAPTION_MAX),
            "bytes_length": len(raw),
            "sha256": hashlib.sha256(raw).hexdigest()
        })
        self.evidence_bytes[eid] = raw
        return json.dumps({"evidence_id": eid, "sha256": hashlib.sha256(raw).hexdigest()})

    @gl.public.write
    def file_page(self, policy_id: str, caption: str, url: str) -> str:
        """File public web page / report evidence with validator consensus snapshot."""
        y = self._policy(policy_id)
        self._state(y, "CONTESTED", "APPEALED")
        case = y["contest"] if y["state"] == "CONTESTED" else y["appeal"]
        if _now() > _parse_iso(case["response_ends"]):
            _refuse("evidence submission window closed")

        role = self._role(y, self._sender())
        if role not in ("FARMER", "INSURER"):
            _refuse("only participating policy parties may file evidence")

        stage = self._filing(y, role, "PAGE")
        link = _public_link(url)

        # Pre-extract pure primitive (MANDATORY RULE 1: ZERO self in nondet closure)
        url_link = str(link)

        def leader_fn():
            return _page_text(url_link)

        def validator_fn(res) -> bool:
            if not isinstance(res, gl.vm.Return) or not isinstance(res.calldata, str):
                return False
            theirs = res.calldata
            if len(theirs) < PAGE_MIN_CHARS:
                return False
            try:
                mine = _page_text(url_link)
            except Exception as e:
                print("[DISAGREE] Could not render page: " + str(e)[:160])
                return False
            if len(mine) < PAGE_MIN_CHARS or not mine.startswith(theirs) or len(theirs) < len(mine) - PAGE_SLACK_CHARS:
                return False
            return True

        text = gl.vm.run_nondet(leader_fn, validator_fn)
        if not isinstance(text, str) or len(text) < PAGE_MIN_CHARS:
            _refuse("web document could not be rendered or content was insufficient")

        text = text[:PAGE_EXCERPT_CHARS]
        eid = self._store(y, {
            "kind": "PAGE",
            "by": role,
            "stage": stage,
            "url": link,
            "caption": _clean(caption, CAPTION_MAX),
            "excerpt": text,
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()
        })
        return json.dumps({"evidence_id": eid, "chars": len(text)})

    @gl.public.write
    def decide_contest(self, policy_id: str) -> str:
        """
        Execute multi-validator consensus adjudication on the contested reading,
        weighing photographic evidence and signed dispute clause against recorded datasets.
        """
        y = self._policy(policy_id)
        self._state(y, "CONTESTED")
        case = y["contest"]
        if _now() <= _parse_iso(case["response_ends"]):
            _refuse("response period is still active; premature adjudication prohibited")

        # Pre-extract all required data into pure local primitives (MANDATORY RULE 1)
        series_data = dict(y["reading"]["series"])
        sums_data = dict(y["reading"]["summaries"])
        ev_items = [
            json.loads(self.evidence[e]) for e in y.get("evidence_ids", [])
            if e in self.evidence and json.loads(self.evidence[e])["stage"] == "CONTEST"
        ]
        photo_bytes_map = {
            it["evidence_id"]: bytes(self.evidence_bytes[it["evidence_id"]])
            for it in ev_items if it["kind"] == "PHOTO" and it["evidence_id"] in self.evidence_bytes
        }

        pure_case = dict(case)
        pure_case["_evidence"] = ev_items
        pure_y = dict(y)

        def judge_fn() -> dict:
            p_info = _read_photos_pure(ev_items, photo_bytes_map)
            prompt = _build_judge_prompt(pure_y, series_data, sums_data, pure_case, "CONTEST", p_info)
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            out = raw if isinstance(raw, dict) else json.loads(str(raw))
            verdict = out.get("verdict") if isinstance(out, dict) else None
            if verdict not in VERDICTS:
                raise gl.vm.UserError(f"{ERROR_LLM} invalid verdict produced by LLM")
            return {"verdict": verdict, "reason": _clean(out.get("reason"), LONG_MAX)}

        def validator_fn(res) -> bool:
            if not isinstance(res, gl.vm.Return) or not isinstance(res.calldata, dict):
                return False
            try:
                mine = judge_fn()
            except Exception as e:
                print("[DISAGREE] Consensus adjudication error: " + str(e)[:160])
                return False
            theirs = res.calldata
            if mine["verdict"] != theirs.get("verdict"):
                print(f"[DISAGREE] Leader verdict '{theirs.get('verdict')}' != Validator verdict '{mine['verdict']}'")
                return False
            return True

        got = gl.vm.run_nondet(judge_fn, validator_fn)
        if not isinstance(got, dict) or got.get("verdict") not in VERDICTS:
            raise gl.vm.UserError(f"{ERROR_LLM} validators reached no consensus verdict")

        decision_data = {
            "verdict": got["verdict"],
            "reason": _clean(got.get("reason"), LONG_MAX),
            "digests": {s: v["digest"] for s, v in sums_data.items()},
            "totals": {s: v["total_tenths"] for s, v in sums_data.items()},
            "evidence": [{"evidence_id": it["evidence_id"], "kind": it["kind"], "by": it["by"], "sha256": it["sha256"]} for it in ev_items]
        }

        rec = self._record(y, "CONTEST", decision_data, case)
        before = y["reading"]["triggered"]
        after = self._outcome(y, got["verdict"])
        moved = self._rank(case["by"], after) > self._rank(case["by"], before)
        other_party = "FARMER" if case["by"] == "INSURER" else "INSURER"

        # Bond resolution: return to contestant if ruling moved their way, else pay to opposing side
        self._pay(y, case["by"] if moved else other_party, int(case["bond_wei"]))
        case["result"] = "MOVED" if moved else "HELD"

        y["decision"] = {
            "verdict": got["verdict"],
            "outcome": after,
            "round": rec["n"],
            "against": self._short_of_best(after)
        }
        y["state"] = "DECIDED"
        y["appeal_ends"] = _iso(_now() + timedelta(seconds=y["periods"]["appeal"]))
        self._event(y, "DECIDED", f"{got['verdict']} -> {case['result']}")
        self._save(y)

        return json.dumps({
            "policy_id": policy_id,
            "verdict": got["verdict"],
            "outcome": after,
            "contest": case["result"],
            "appeal_ends": y["appeal_ends"]
        })

    @gl.public.write
    def lapse_contest(self, policy_id: str) -> str:
        """Resolve contest when adjudication does not conclude prior to lapse deadline."""
        y = self._policy(policy_id)
        self._state(y, "CONTESTED")
        c = y["contest"]
        if _now() <= _parse_iso(c["lapse_at"]):
            _refuse("contest lapse deadline has not yet passed")
        self._pay(y, c["by"], int(c["bond_wei"]))
        c["result"] = "LAPSED"
        self._settle(y, "CONTEST_LAPSED", y["reading"]["triggered"])
        self._save(y)
        return json.dumps({"policy_id": policy_id, "state": y["state"]})

    @gl.public.write
    def appeal(self, policy_id: str, statement: str) -> str:
        """Party short of its optimal outcome posts bond to escalate to second-tier review."""
        y = self._policy(policy_id)
        self._state(y, "DECIDED")
        if _now() > _parse_iso(y["appeal_ends"]):
            _refuse("appeal window has closed")

        role = self._role(y, self._sender())
        if role not in y["decision"]["against"]:
            _refuse(f"only a party whose best outcome was denied has standing to appeal ({y['decision']['against']})")

        bond_req = self._bond(y)
        val = int(gl.message.value)
        if val != bond_req:
            _refuse(f"exact appeal bond of {bond_req} wei required (sent {val} wei)")

        stmt = _clean(statement, STATEMENT_MAX)
        if len(stmt) < 10:
            _refuse("appeal grounds statement must be at least 10 characters")

        self._bump("held_wei", bond_req)
        y["state"] = "APPEALED"
        y["appeal"] = {
            "by": role,
            "statement": stmt,
            "bond_wei": str(bond_req),
            "opened_at": _iso(_now()),
            "response_ends": _iso(_now() + timedelta(seconds=y["periods"]["response"])),
            "lapse_at": _iso(_now() + timedelta(seconds=y["periods"]["response"] * LONG_STOP_PERIODS)),
            "answer": None
        }
        self._event(y, "APPEALED", f"by {role}")
        self._save(y)

        return json.dumps({
            "policy_id": policy_id,
            "state": "APPEALED",
            "bond_wei": str(bond_req),
            "response_ends": y["appeal"]["response_ends"]
        })

    @gl.public.write
    def decide_appeal(self, policy_id: str) -> str:
        """Consensus adjudication of appeal round on the recorded evidence series."""
        y = self._policy(policy_id)
        self._state(y, "APPEALED")
        case = y["appeal"]
        if _now() <= _parse_iso(case["response_ends"]):
            _refuse("appeal response period is active")

        series_data = dict(y["reading"]["series"])
        sums_data = dict(y["reading"]["summaries"])
        ev_items = [json.loads(self.evidence[e]) for e in y.get("evidence_ids", []) if e in self.evidence]
        photo_bytes_map = {
            it["evidence_id"]: bytes(self.evidence_bytes[it["evidence_id"]])
            for it in ev_items if it["kind"] == "PHOTO" and it["evidence_id"] in self.evidence_bytes
        }

        pure_case = dict(case)
        pure_case["_evidence"] = ev_items
        pure_y = dict(y)

        def judge_fn() -> dict:
            p_info = _read_photos_pure(ev_items, photo_bytes_map)
            prompt = _build_judge_prompt(pure_y, series_data, sums_data, pure_case, "APPEAL", p_info)
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            out = raw if isinstance(raw, dict) else json.loads(str(raw))
            verdict = out.get("verdict") if isinstance(out, dict) else None
            if verdict not in VERDICTS:
                raise gl.vm.UserError(f"{ERROR_LLM} invalid verdict produced")
            return {"verdict": verdict, "reason": _clean(out.get("reason"), LONG_MAX)}

        def validator_fn(res) -> bool:
            if not isinstance(res, gl.vm.Return) or not isinstance(res.calldata, dict):
                return False
            try:
                mine = judge_fn()
            except Exception as e:
                print("[DISAGREE] Appeal consensus error: " + str(e)[:160])
                return False
            theirs = res.calldata
            if mine["verdict"] != theirs.get("verdict"):
                return False
            return True

        got = gl.vm.run_nondet(judge_fn, validator_fn)
        if not isinstance(got, dict) or got.get("verdict") not in VERDICTS:
            raise gl.vm.UserError(f"{ERROR_LLM} validators reached no appeal verdict")

        decision_data = {
            "verdict": got["verdict"],
            "reason": _clean(got.get("reason"), LONG_MAX),
            "digests": {s: v["digest"] for s, v in sums_data.items()},
            "totals": {s: v["total_tenths"] for s, v in sums_data.items()},
            "evidence": [{"evidence_id": it["evidence_id"], "kind": it["kind"], "by": it["by"], "sha256": it["sha256"]} for it in ev_items]
        }

        rec = self._record(y, "APPEAL", decision_data, case)
        before = y["decision"]["outcome"]
        after = self._outcome(y, got["verdict"])
        moved = self._rank(case["by"], after) > self._rank(case["by"], before)
        other_party = "FARMER" if case["by"] == "INSURER" else "INSURER"

        self._pay(y, case["by"] if moved else other_party, int(case["bond_wei"]))
        case["result"] = "MOVED" if moved else "HELD"
        y["decision"] = {
            "verdict": got["verdict"],
            "outcome": after,
            "round": rec["n"],
            "against": self._short_of_best(after)
        }
        self._settle(y, "APPEAL" if after is not None else "NO_RELIABLE_READING", after)
        self._save(y)

        return json.dumps({
            "policy_id": policy_id,
            "verdict": got["verdict"],
            "outcome": after,
            "appeal": case["result"]
        })

    @gl.public.write
    def lapse_appeal(self, policy_id: str) -> str:
        """Resolve lapsed appeal by reverting to previous decision and returning bond."""
        y = self._policy(policy_id)
        self._state(y, "APPEALED")
        a = y["appeal"]
        if _now() <= _parse_iso(a["lapse_at"]):
            _refuse("appeal lapse deadline has not yet passed")
        self._pay(y, a["by"], int(a["bond_wei"]))
        a["result"] = "LAPSED"
        self._settle(y, "APPEAL_LAPSED", y["decision"]["outcome"])
        self._save(y)
        return json.dumps({"policy_id": policy_id, "state": y["state"]})

    @gl.public.write
    def finalize(self, policy_id: str) -> str:
        """Permissionlessly settle uncontested reading or unappealed decision after deadline."""
        y = self._policy(policy_id)
        self._state(y, "READ", "DECIDED")
        if y["state"] == "READ":
            if _now() <= _parse_iso(y["contest_ends"]):
                _refuse("contest window remains open")
            self._settle(y, "READING", y["reading"]["triggered"])
        else:
            if _now() <= _parse_iso(y["appeal_ends"]):
                _refuse("appeal window remains open")
            out = y["decision"]["outcome"]
            self._settle(y, "CONTEST" if out is not None else "NO_RELIABLE_READING", out)
        self._save(y)
        return json.dumps({
            "policy_id": policy_id,
            "state": y["state"],
            "paid_to_farmer": y["paid_to_farmer"]
        })

    @gl.public.write
    def claim(self) -> str:
        """Claim accumulated pull-ledger payouts or refunds via native GEN transfer."""
        who = self._sender()
        row = json.loads(self.ledger.get(who) or '{"claimable": "0", "claimed": "0"}')
        owed = int(row["claimable"])
        if owed <= 0:
            _refuse("no claimable balance available for this address")
        row["claimable"] = "0"
        row["claimed"] = str(int(row["claimed"]) + owed)
        self.ledger[who] = json.dumps(row, sort_keys=True)
        # Execute EVM transfer to wallet
        _Payee(_to_address(who)).emit_transfer(value=u256(owed))
        return json.dumps({"account": who, "claimed_wei": str(owed)})
