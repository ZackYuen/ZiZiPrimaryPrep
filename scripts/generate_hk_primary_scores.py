#!/usr/bin/env python3
"""Generate scored report for all HK primary schools (502) with housing cost model."""

import csv
import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://schoolfit.hk/api/schools"
OUT = "/workspace/docs/hk-primary-school-scores-2026.csv"

# Lam Tin / 藍田 (校網48) baseline — 麗港城/康田苑/啟田大廈 2025-26 市場參考
LAMTIN_RENT_MONTH_500 = 18500   # HKD/mo, ~500 sqft practical
LAMTIN_PRICE_500 = 5.25         # HKD million, ~500 sqft practical
LAMTIN_RENT_PSF = 37
LAMTIN_PRICE_PSF = 10500

# District housing midpoints (2025-26 market refs: 28Hse EPI, WeProperty, Centaline aggregates)
# rent_psf: HKD/sqft/month; price_psf: HKD/sqft sale
DISTRICT_HOUSING = {
    "中西區":   {"rent_psf": 62, "price_psf": 22000, "note": "港島核心"},
    "灣仔區":   {"rent_psf": 57, "price_psf": 20000, "note": "港島核心"},
    "香港東區": {"rent_psf": 42, "price_psf": 14000, "note": "港島東"},
    "香港南區": {"rent_psf": 45, "price_psf": 15000, "note": "港島南"},
    "九龍城區": {"rent_psf": 40, "price_psf": 13000, "note": "九龍城/土瓜灣"},
    "油尖旺區": {"rent_psf": 52, "price_psf": 17000, "note": "尖沙咀/佐敦"},
    "深水埗區": {"rent_psf": 33, "price_psf": 9500,  "note": "西九龍"},
    "黃大仙區": {"rent_psf": 35, "price_psf": 10000, "note": "黃大仙/鑽石山"},
    "觀塘區":   {"rent_psf": 37, "price_psf": 10500, "note": "藍田/油塘/觀塘"},
    "西貢區":   {"rent_psf": 38, "price_psf": 12000, "note": "將軍澳/西貢"},
    "沙田區":   {"rent_psf": 36, "price_psf": 11500, "note": "沙田/馬鞍山"},
    "大埔區":   {"rent_psf": 32, "price_psf": 10000, "note": "大埔/粉嶺"},
    "北區":     {"rent_psf": 30, "price_psf": 9000,  "note": "上水/粉嶺北"},
    "葵青區":   {"rent_psf": 31, "price_psf": 9500,  "note": "葵涌/青衣"},
    "荃灣區":   {"rent_psf": 34, "price_psf": 10500, "note": "荃灣"},
    "屯門區":   {"rent_psf": 28, "price_psf": 8500,  "note": "屯門"},
    "元朗區":   {"rent_psf": 29, "price_psf": 8800,  "note": "元朗/天水圍"},
    "離島區":   {"rent_psf": 32, "price_psf": 11000, "note": "東涌/長洲等"},
}

ELITE_SEC = [
    "聖保羅", "皇仁", "喇沙", "拔萃", "英華", "男拔", "女拔", "協恩", "真光",
    "瑪利諾修院", "嘉諾撒書院", "嘉諾撒聖瑪利", "港大同學會", "培正", "聖若瑟書院",
    "民生書院", "福建中學", "保良局羅氏", "滙基書院", "播道書院", "王錦輝",
    "優才", "聖保羅男女", "德望", "沙田培英", "張祝珊", "華仁", "皇仁",
]
GOOD_SEC = [
    "觀塘官立", "何文田官立", "賽馬會官立", "觀塘功樂", "嘉諾撒聖家", "嘉諾撒聖心",
    "嘉諾撒培德", "保良局", "順利天主教", "聖言", "觀塘瑪利諾", "聖傑靈",
    "梁式芝", "藍田聖保祿", "華英", "沙田官立", "荃灣官立", "屯門官立",
    "將軍澳官立", "陳瑞祺", "聖公會林護", "東華三院", "可譽", "真道書院",
]

NET_EASE = {
    "48": 6.5, "65": 6.0, "46": 4.0, "34": 4.5, "35": 5.0, "41": 4.0,
    "12": 3.5, "14": 3.5, "11": 5.0, "18": 4.5,
}

PRACTICAL_SQFT = 500


def fetch_json(url: str, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ZiZiPrimaryPrep/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(0.5 * (i + 1))


def housing_metrics(district: str) -> dict:
    h = DISTRICT_HOUSING.get(district, {"rent_psf": 35, "price_psf": 11000, "note": "估算"})
    rent_mo = round(h["rent_psf"] * PRACTICAL_SQFT)
    price_m = round(h["price_psf"] * PRACTICAL_SQFT / 1_000_000, 2)
    rent_vs = round((rent_mo - LAMTIN_RENT_MONTH_500) / LAMTIN_RENT_MONTH_500 * 100, 1)
    price_vs = round((price_m - LAMTIN_PRICE_500) / LAMTIN_PRICE_500 * 100, 1)
    return {
        "rent_psf": h["rent_psf"],
        "price_psf": h["price_psf"],
        "rent_month": rent_mo,
        "price_million": price_m,
        "rent_vs_lamtin_pct": rent_vs,
        "price_vs_lamtin_pct": price_vs,
        "note": h.get("note", ""),
    }


def score_from_range(value: float, low: float, high: float) -> float:
    """Higher score = lower cost (more affordable)."""
    if high <= low:
        return 5.0
    ratio = (value - low) / (high - low)
    return round(max(1.0, min(10.0, 10.0 - ratio * 9.0)), 1)


def score_housing(district: str) -> dict:
    m = housing_metrics(district)
    rents = [d["rent_psf"] * PRACTICAL_SQFT for d in DISTRICT_HOUSING.values()]
    prices = [d["price_psf"] * PRACTICAL_SQFT for d in DISTRICT_HOUSING.values()]
    rent_s = score_from_range(m["rent_month"], min(rents), max(rents))
    buy_s = score_from_range(m["price_million"] * 1_000_000, min(prices), max(prices))
    combined = round(rent_s * 0.5 + buy_s * 0.5, 1)
    return {**m, "rent_score": rent_s, "buy_score": buy_s, "housing_score": combined}


def parse_area(facts: list) -> float | None:
    for f in facts:
        if f.get("label") == "學校佔地面積":
            match = re.search(r"([\d,]+)\s*平方米", f.get("value", ""))
            if match:
                return float(match.group(1).replace(",", ""))
    return None


def parse_linkage(facts: list) -> dict:
    out = {"dragon": "", "linked": "", "type": "none", "names": []}
    for f in facts:
        label = f.get("label", "")
        val = (f.get("value") or "").strip()
        if label == "一條龍中學" and val not in ("-", ""):
            out["dragon"] = val
            out["type"] = "dragon"
            out["names"].extend([x.strip() for x in re.split(r"[、,]", val) if x.strip()])
        elif label == "直屬中學" and val not in ("-", ""):
            out["linked"] = val
            if out["type"] == "none":
                out["type"] = "direct"
            out["names"].extend([x.strip() for x in re.split(r"[、,]", val) if x.strip()])
        elif label == "聯繫中學" and val not in ("-", ""):
            out["linked"] = val if not out["linked"] else out["linked"] + "、" + val
            if out["type"] == "none":
                out["type"] = "linked"
            out["names"].extend([x.strip() for x in re.split(r"[、,]", val) if x.strip()])
    return out


def parse_facility(facts: list, label: str) -> int | None:
    for f in facts:
        if f.get("label") == label:
            match = re.search(r"(\d+)", f.get("value", ""))
            if match:
                return int(match.group(1))
    return None


def score_area(sqm: float | None) -> float:
    if sqm is None:
        return 5.0
    if sqm >= 12000:
        return 10.0
    if sqm >= 9000:
        return 9.0
    if sqm >= 7000:
        return 7.5
    if sqm >= 5000:
        return 6.0
    if sqm >= 3500:
        return 4.5
    return 3.0


def score_dragon(link: dict) -> float:
    if link["type"] == "none":
        return 3.0
    names = " ".join(link["names"])
    base = 5.0
    if any(k in names for k in ELITE_SEC):
        base = 9.0
    elif any(k in names for k in GOOD_SEC):
        base = 7.0
    if link["type"] == "dragon":
        base = min(10.0, base + 1.0)
    elif link["type"] == "direct":
        base = min(10.0, base + 0.5)
    return round(base, 1)


def score_s1(link: dict, dragon_score: float) -> float:
    s = dragon_score
    if link["type"] == "direct":
        s = min(10.0, s + 0.5)
    return round(min(10.0, max(3.0, s)), 1)


def score_negative(review_signals) -> float:
    if not review_signals:
        return 8.0
    text = json.dumps(review_signals, ensure_ascii=False).lower()
    if any(w in text for w in ["投訴", "爭議", "醜聞", "罷課", "欺凌"]):
        return 5.0
    return 8.0


def score_active(facts: list, primary: dict, area_score: float) -> float:
    playgrounds = parse_facility(facts, "操場數目") or 1
    halls = parse_facility(facts, "禮堂數目") or 1
    after = primary.get("afterSchoolCare", "") or ""
    exam_penalty = 0
    m = re.search(r"高年級考試\s*(\d+)", primary.get("hketReference", {}).get("assessmentSummary", ""))
    if m:
        exam_penalty = min(2.5, int(m.group(1)) * 0.4)
    activity_bonus = 0
    if any(k in after for k in ["體育", "運動", "多元智能", "境外交流", "校隊"]):
        activity_bonus += 1.0
    if any(k in after for k in ["課後", "活動"]):
        activity_bonus += 0.5
    raw = 5.0 + area_score * 0.15 + playgrounds * 0.8 + halls * 0.2 + activity_bonus - exam_penalty
    return round(min(10.0, max(3.0, raw)), 1)


def parse_p1(summary: str) -> dict:
    out = {"total": None, "self": None, "central": None}
    if not summary:
        return out
    m = re.search(r"小一派位\s*(\d+)", summary)
    if m:
        out["total"] = int(m.group(1))
    m = re.search(r"自行\s*(\d+)", summary)
    if m:
        out["self"] = int(m.group(1))
    m = re.search(r"統一\s*(\d+)", summary)
    if m:
        out["central"] = int(m.group(1))
    return out


def score_ease(p1: dict, school_net: str, funding: str) -> float:
    if funding in ("直資", "私立"):
        return 2.0
    total = p1.get("total") or 50
    self_n = p1.get("self") or total // 2
    size_bonus = min(2.0, total / 80)
    self_ratio = self_n / max(total, 1)
    net_bonus = (NET_EASE.get(str(school_net), 5.0) - 5.0) * 0.3
    raw = 4.0 + self_ratio * 4.0 + size_bonus + net_bonus
    return round(min(10.0, max(2.0, raw)), 1)


def score_competition(ease: float) -> float:
    return round(10.0 - ease + 2.0, 1)


def weighted_total(scores: dict, mode: str = "standard") -> float:
    if mode == "relocate":
        w = {
            "area": 0.08, "dragon": 0.08, "s1": 0.12, "negative": 0.07,
            "housing": 0.30, "active": 0.20, "ease": 0.15,
        }
    else:
        w = {
            "area": 0.10, "dragon": 0.08, "s1": 0.12, "negative": 0.10,
            "housing": 0.18, "active": 0.22, "ease": 0.20,
        }
    return round(sum(scores[k] * w[k] for k in w), 2)


def fetch_all_list():
    schools = []
    page = 1
    while True:
        data = fetch_json(f"{BASE}?level=primary&page={page}&limit=24")
        batch = data.get("schools", [])
        if not batch:
            break
        schools.extend(batch)
        if len(batch) < 24:
            break
        page += 1
    return schools


def fetch_detail(slug: str):
    data = fetch_json(f"{BASE}/{slug}")
    return data.get("school", data)


def main():
    print("Fetching school list...")
    schools = fetch_all_list()
    print(f"Listed {len(schools)} schools")

    rows = []
    slugs = [s["slug"] for s in schools]
    details = {}

    print("Fetching details...")
    with ThreadPoolExecutor(max_workers=12) as ex:
        futs = {ex.submit(fetch_detail, slug): slug for slug in slugs}
        done = 0
        for fut in as_completed(futs):
            slug = futs[fut]
            try:
                details[slug] = fut.result()
            except Exception as e:
                print(f"  warn: {slug}: {e}")
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(slugs)}")

    for s in schools:
        slug = s["slug"]
        d = details.get(slug, s)
        facts = d.get("facts", [])
        primary = d.get("stageProfile", {}).get("primary", {}) or s.get("stageProfile", {}).get("primary", {})
        hket = primary.get("hketReference", {}) or {}
        district = s.get("district", d.get("district", ""))

        sqm = parse_area(facts)
        link = parse_linkage(facts)
        p1 = parse_p1(hket.get("p1PlaceSummary", ""))
        house = score_housing(district)

        scores = {
            "area": score_area(sqm),
            "dragon": score_dragon(link),
            "s1": score_s1(link, score_dragon(link)),
            "negative": score_negative(d.get("reviewSignals")),
            "housing": house["housing_score"],
            "active": score_active(facts, {**primary, "hketReference": hket}, score_area(sqm)),
            "ease": score_ease(p1, primary.get("schoolNet", ""), s.get("fundingType", "")),
        }
        scores["competition"] = score_competition(scores["ease"])

        link_text = link["dragon"] or link["linked"] or "無"
        if link["dragon"] and link["linked"]:
            link_text = f"龍:{link['dragon']} | 聯:{link['linked']}"

        vs_rent = house["rent_vs_lamtin_pct"]
        vs_price = house["price_vs_lamtin_pct"]
        if vs_rent <= -5 and vs_price <= -5:
            move_hint = "搬屋更省"
        elif vs_rent >= 10 or vs_price >= 15:
            move_hint = "搬屋更貴"
        elif abs(vs_rent) <= 5 and abs(vs_price) <= 5:
            move_hint = "同藍田水平"
        else:
            move_hint = "視租買取向"

        rows.append({
            "排名": 0,
            "搬屋排名": 0,
            "學校": s["nameZh"],
            "英文名": s["nameEn"],
            "區域": district,
            "校網": primary.get("schoolNet", ""),
            "類別": s.get("fundingType", ""),
            "加權總分": weighted_total(scores, "standard"),
            "搬屋總分": weighted_total(scores, "relocate"),
            "住屋成本分": scores["housing"],
            "租金評分": house["rent_score"],
            "樓價評分": house["buy_score"],
            "參考呎租": house["rent_psf"],
            "參考呎價": house["price_psf"],
            "估計月租500呎": house["rent_month"],
            "估計樓價500呎萬": house["price_million"],
            "較藍田租金差%": vs_rent,
            "較藍田樓價差%": vs_price,
            "搬屋提示": move_hint,
            "校園面積分": scores["area"],
            "佔地平方米": sqm or "",
            "龍校分": scores["dragon"],
            "升中聯繫": link_text,
            "升中成分": scores["s1"],
            "負面新聞分": scores["negative"],
            "孜孜活躍分": scores["active"],
            "易入程度分": scores["ease"],
            "競爭激烈度": scores["competition"],
            "小一學額2026": p1.get("total", ""),
            "自行分配額": p1.get("self", ""),
            "統一派位額": p1.get("central", ""),
            "操場數": parse_facility(facts, "操場數目") or "",
            "CHSC": d.get("chscId", ""),
            "資料來源": d.get("sourceUrl", s.get("sourceUrl", "")),
        })

    rows.sort(key=lambda r: (-r["加權總分"], r["學校"]))
    for i, r in enumerate(rows, 1):
        r["排名"] = i

    rows_reloc = sorted(rows, key=lambda r: (-r["搬屋總分"], r["學校"]))
    rank_map = {r["學校"]: i for i, r in enumerate(rows_reloc, 1)}
    for r in rows:
        r["搬屋排名"] = rank_map[r["學校"]]

    fieldnames = list(rows[0].keys())
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"Wrote {len(rows)} rows to {OUT}")
    top_reloc = sorted(rows, key=lambda r: -r["搬屋總分"])[:5]
    print("搬屋總分 TOP5:", ", ".join(f"{r['學校']}({r['搬屋總分']})" for r in top_reloc))


if __name__ == "__main__":
    main()
