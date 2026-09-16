#!/usr/bin/env python3
"""Generate scored report for all HK primary schools (502) — Zizi (boy) family profile."""

import csv
import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://schoolfit.hk/api/schools"
OUT = "/workspace/docs/hk-primary-school-scores-2026.csv"

# 碩孜 Zizi — 現居觀塘月華街（校網48）
HOME_LABEL = "觀塘月華街"
HOME_SQFT = 633
HOME_RENT = 17000
HOME_PARKING = 2250
HOME_TOTAL_MONTHLY = HOME_RENT + HOME_PARKING  # 19250
HOME_RENT_PSF = round(HOME_RENT / HOME_SQFT, 2)  # ~26.86
HOME_PRICE_PSF = 6900  # 月華大廈/遠景大廈區 2025-26 成交參考
HOME_PRICE_TOTAL_M = round(HOME_SQFT * HOME_PRICE_PSF / 1_000_000, 2)  # ~4.37
HOME_SCHOOL_NET = "48"
STUDENT = "男生"

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
    "觀塘區":   {"rent_psf": 27, "price_psf": 7500,  "note": "觀塘/月華街/藍田/油塘"},
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

# Monthly car-park rent estimate by district (HKD)
PARKING_MONTHLY = {
    "中西區": 2800, "灣仔區": 2600, "香港東區": 2400, "香港南區": 2500,
    "九龍城區": 2400, "油尖旺區": 2700, "深水埗區": 2200, "黃大仙區": 2250,
    "觀塘區": 2250, "西貢區": 2100, "沙田區": 2000, "大埔區": 1900,
    "北區": 1800, "葵青區": 1900, "荃灣區": 2000, "屯門區": 1800,
    "元朗區": 1800, "離島區": 2000,
}
DEFAULT_PARKING = 2000

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

def boy_eligible(gender: str) -> bool:
    return gender != "女校"


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
    parking = PARKING_MONTHLY.get(district, DEFAULT_PARKING)
    rent_mo = round(h["rent_psf"] * HOME_SQFT)
    price_m = round(h["price_psf"] * HOME_SQFT / 1_000_000, 2)
    total_mo = rent_mo + parking
    rent_vs = round((rent_mo - HOME_RENT) / HOME_RENT * 100, 1)
    parking_vs = round((parking - HOME_PARKING) / HOME_PARKING * 100, 1)
    total_vs = round((total_mo - HOME_TOTAL_MONTHLY) / HOME_TOTAL_MONTHLY * 100, 1)
    price_vs = round((price_m - HOME_PRICE_TOTAL_M) / HOME_PRICE_TOTAL_M * 100, 1)
    return {
        "rent_psf": h["rent_psf"],
        "price_psf": h["price_psf"],
        "rent_month": rent_mo,
        "parking_month": parking,
        "total_monthly": total_mo,
        "price_million": price_m,
        "rent_vs_home_pct": rent_vs,
        "parking_vs_home_pct": parking_vs,
        "total_vs_home_pct": total_vs,
        "price_vs_home_pct": price_vs,
        "note": h.get("note", ""),
    }


def score_from_range(value: float, low: float, high: float) -> float:
    """Higher score = lower cost (more affordable)."""
    if high <= low:
        return 5.0
    ratio = (value - low) / (high - low)
    return round(max(1.0, min(10.0, 10.0 - ratio * 9.0)), 1)


def score_housing(district: str, school_net: str = "") -> dict:
    m = housing_metrics(district)
    totals = []
    rents = []
    prices = []
    for d_name, d in DISTRICT_HOUSING.items():
        p = PARKING_MONTHLY.get(d_name, DEFAULT_PARKING)
        rents.append(d["rent_psf"] * HOME_SQFT)
        prices.append(d["price_psf"] * HOME_SQFT)
        totals.append(d["rent_psf"] * HOME_SQFT + p)
    rent_s = score_from_range(m["rent_month"], min(rents), max(rents))
    buy_s = score_from_range(m["price_million"] * 1_000_000, min(prices), max(prices))
    total_s = score_from_range(m["total_monthly"], min(totals), max(totals))
    # Rent 40% + buy 35% + total incl. parking 25%
    combined = round(rent_s * 0.40 + buy_s * 0.35 + total_s * 0.25, 1)
    if school_net == HOME_SCHOOL_NET:
        stay_s = 10.0
    else:
        stay_s = round(max(3.0, combined), 1)
    return {
        **m,
        "rent_score": rent_s,
        "buy_score": buy_s,
        "total_score": total_s,
        "housing_score": combined,
        "stay_housing_score": stay_s,
    }


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
    elif mode == "stay":
        w = {
            "area": 0.10, "dragon": 0.08, "s1": 0.12, "negative": 0.10,
            "housing": 0.22, "active": 0.22, "ease": 0.16,
        }
        scores = {**scores, "housing": scores.get("stay_housing", scores["housing"])}
    else:
        w = {
            "area": 0.10, "dragon": 0.08, "s1": 0.12, "negative": 0.10,
            "housing": 0.18, "active": 0.22, "ease": 0.20,
        }
    return round(sum(scores[k] * w[k] for k in w), 2)


def move_hint(total_vs: float, rent_vs: float, school_net: str) -> str:
    if school_net == HOME_SCHOOL_NET:
        return "留現址(校網48)"
    if total_vs <= -8:
        return "搬屋更省"
    if total_vs >= 12:
        return "搬屋更貴"
    if abs(total_vs) <= 5:
        return "同現址水平"
    return "視租買取向"


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
        gender = d.get("gender", s.get("gender", "男女校"))
        school_net = primary.get("schoolNet", "")
        eligible = boy_eligible(gender)

        sqm = parse_area(facts)
        link = parse_linkage(facts)
        p1 = parse_p1(hket.get("p1PlaceSummary", ""))
        house = score_housing(district, school_net)

        scores = {
            "area": score_area(sqm),
            "dragon": score_dragon(link),
            "s1": score_s1(link, score_dragon(link)),
            "negative": score_negative(d.get("reviewSignals")),
            "housing": house["housing_score"],
            "stay_housing": house["stay_housing_score"],
            "active": score_active(facts, {**primary, "hketReference": hket}, score_area(sqm)),
            "ease": score_ease(p1, school_net, s.get("fundingType", "")),
        }
        if gender == "男校":
            scores["active"] = round(min(10.0, scores["active"] + 0.3), 1)
        scores["competition"] = score_competition(scores["ease"])

        link_text = link["dragon"] or link["linked"] or "無"
        if link["dragon"] and link["linked"]:
            link_text = f"龍:{link['dragon']} | 聯:{link['linked']}"

        hint = move_hint(house["total_vs_home_pct"], house["rent_vs_home_pct"], school_net)

        rows.append({
            "男生排名": 0,
            "男生搬屋排名": 0,
            "男生留現址排名": 0,
            "學校": s["nameZh"],
            "英文名": s["nameEn"],
            "性別收生": gender,
            "男生適讀": "是" if eligible else "否(女校)",
            "區域": district,
            "校網": school_net,
            "類別": s.get("fundingType", ""),
            "加權總分": weighted_total(scores, "standard") if eligible else "",
            "搬屋總分": weighted_total(scores, "relocate") if eligible else "",
            "留現址總分": weighted_total(scores, "stay") if eligible else "",
            "住屋成本分": house["housing_score"],
            "留現址住屋分": house["stay_housing_score"],
            "租金評分": house["rent_score"],
            "樓價評分": house["buy_score"],
            "總住屋評分": house["total_score"],
            "參考呎租": house["rent_psf"],
            "參考呎價": house["price_psf"],
            "估計月租633呎": house["rent_month"],
            "估計車位月租": house["parking_month"],
            "估計住屋總月費": house["total_monthly"],
            "估計樓價633呎萬": house["price_million"],
            "較現址租金差%": house["rent_vs_home_pct"],
            "較現址車位差%": house["parking_vs_home_pct"],
            "較現址總月費差%": house["total_vs_home_pct"],
            "較現址樓價差%": house["price_vs_home_pct"],
            "搬屋提示": hint,
            "現址基準": f"{HOME_LABEL} {HOME_SQFT}呎 租${HOME_RENT}+位${HOME_PARKING}",
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

    def rank_boys(rows_in: list, key: str, field: str):
        boys = [r for r in rows_in if r["男生適讀"] == "是" and r.get(key)]
        boys.sort(key=lambda r: (-float(r[key]), r["學校"]))
        rank_map = {r["學校"]: i for i, r in enumerate(boys, 1)}
        for r in rows_in:
            r[field] = rank_map.get(r["學校"], "")

    rank_boys(rows, "加權總分", "男生排名")
    rank_boys(rows, "搬屋總分", "男生搬屋排名")
    rank_boys(rows, "留現址總分", "男生留現址排名")

    # Sort CSV: boys first by 男生搬屋排名, then girls schools at end
    def sort_key(r):
        if r["男生適讀"] != "是" or not r.get("男生搬屋排名"):
            return (1, 9999, r["學校"])
        return (0, int(r["男生搬屋排名"]), r["學校"])

    rows.sort(key=sort_key)

    fieldnames = list(rows[0].keys())
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    boys = [r for r in rows if r["男生適讀"] == "是"]
    print(f"Wrote {len(rows)} rows ({len(boys)} boys-eligible) to {OUT}")
    top_stay = sorted(boys, key=lambda r: -float(r["留現址總分"]))[:5]
    top_reloc = sorted(boys, key=lambda r: -float(r["搬屋總分"]))[:5]
    print("留現址 TOP5:", ", ".join(f"{r['學校']}({r['留現址總分']})" for r in top_stay))
    print("搬屋 TOP5:", ", ".join(f"{r['學校']}({r['搬屋總分']})" for r in top_reloc))


if __name__ == "__main__":
    main()
