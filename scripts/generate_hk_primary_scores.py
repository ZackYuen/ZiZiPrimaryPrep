#!/usr/bin/env python3
"""Generate scored report for HK primary schools — Zizi (boy) at 觀塘月華街."""

import csv
import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BASE = "https://schoolfit.hk/api/schools"
ROOT = Path(__file__).resolve().parent
OUT = Path("/workspace/docs/hk-primary-school-scores-2026.csv")
P1_PATH = ROOT / "data" / "p1_places_schooland_2026.json"
SEC_GENDER_PATH = ROOT / "data" / "secondary_gender_schoolfit.json"
CACHE_PATH = Path("/tmp/schoolfit_primary_details.json")

# 碩孜 Zizi — 現居觀塘月華街（校網48）
HOME_LABEL = "觀塘月華街"
HOME_SQFT = 633
HOME_RENT = 17000
HOME_PARKING = 2250
HOME_TOTAL_MONTHLY = HOME_RENT + HOME_PARKING  # 19250
HOME_RENT_PSF = round(HOME_RENT / HOME_SQFT, 2)  # 26.86
HOME_PRICE_PSF = 6900  # 月華大廈 2025-26 成交約 $6.5k–$6.9k
HOME_PRICE_TOTAL_M = round(HOME_SQFT * HOME_PRICE_PSF / 1_000_000, 2)  # 4.37
HOME_SCHOOL_NET = "48"
HOME_DISTRICT = "觀塘區"

# 搬屋用：2026 私人大型屋苑中位（實用呎），唔包括唐樓／居屋未補價／山頂豪宅。
# 官方錨：差估署《香港物業報告》每月補編 2026 Q2 私人住宅 B 類（40–69.9㎡≈430–750呎）
# 平均租金 港島 $431/㎡≈$40/呎、九龍 $403/㎡≈$37/呎、新界 $293/㎡≈$27/呎（÷10.764）。
# 差估署只有三大區，無18區；分區數字改用 2026 中原／美聯／28Hse 屋苑成交中位上調（校網熱點會貴過全區平均）。
PRIVATE_HOUSING = {
    "中西區":   {"rent_psf": 55, "price_psf": 24000, "parking": 4500, "note": "半山/西營盤私人", "src": "差估署港島B類~$40；半山私人呎租常見$50-65、呎價$22-28k；車位中環/半山叫價$4.5-6k"},
    "灣仔區":   {"rent_psf": 52, "price_psf": 22000, "parking": 4000, "note": "跑馬地/灣仔私人", "src": "差估署港島B類~$40；跑馬地/灣仔私人中位高過東區"},
    "香港東區": {"rent_psf": 42, "price_psf": 15500, "parking": 2800, "note": "太古/鰂魚涌", "src": "太古城2026中原成交約$15.5-16.9k"},
    "香港南區": {"rent_psf": 42, "price_psf": 16000, "parking": 2800, "note": "薄扶林/鴨脷洲私人", "src": "差估署港島B類~$40，南區私人略高於東區舊樓"},
    "九龍城區": {"rent_psf": 50, "price_psf": 17000, "parking": 3200, "note": "九龍塘/何文田（喇沙圈）", "src": "又一居2026成交約$16-18k、呎租$52-64；土瓜灣更平、畢架山$24k+。車位約$3-4k"},
    "油尖旺區": {"rent_psf": 48, "price_psf": 18000, "parking": 3500, "note": "佐敦/油麻地私人", "src": "差估署九龍B類~$37；尖沙咀/佐敦私人高過全九龍平均"},
    "深水埗區": {"rent_psf": 36, "price_psf": 12000, "parking": 2600, "note": "美孚/長沙灣私人", "src": "差估署九龍B類~$37；美孚/長沙灣私人中位約$11-14k"},
    "黃大仙區": {"rent_psf": 36, "price_psf": 11500, "parking": 2500, "note": "鑽石山私人", "src": "差估署九龍B類~$37；鑽石山私人略低於九龍塘"},
    "觀塘區":   {"rent_psf": 35, "price_psf": 12000, "parking": 2800, "note": "麗港城級私人（非月華舊樓）", "src": "麗港城2026成交約$11-13k、呎租約$34-36；凱滙叫價$18-20k。現址月華大廈成交$6.5-6.9k、租$17k/633呎。車位28Hse觀塘住宅約$2.6-3.3k"},
    "西貢區":   {"rent_psf": 42, "price_psf": 13500, "parking": 2500, "note": "將軍澳私人", "src": "日出康城2026中原約$14k；將軍澳租盤實用呎租常見$47-50"},
    "沙田區":   {"rent_psf": 38, "price_psf": 13000, "parking": 2300, "note": "沙田/馬鞍山私人", "src": "差估署新界B類~$27；沙田第一城2026約$15k，區內中位略低"},
    "大埔區":   {"rent_psf": 32, "price_psf": 11000, "parking": 2200, "note": "大埔私人", "src": "差估署新界B類~$27，大埔私人略高於屯門"},
    "北區":     {"rent_psf": 30, "price_psf": 10000, "parking": 2000, "note": "上水/粉嶺私人", "src": "差估署新界B類~$27"},
    "葵青區":   {"rent_psf": 32, "price_psf": 11000, "parking": 2200, "note": "葵涌/青衣私人", "src": "差估署新界B類~$27"},
    "荃灣區":   {"rent_psf": 34, "price_psf": 11500, "parking": 2300, "note": "荃灣私人", "src": "差估署新界B類~$27"},
    "屯門區":   {"rent_psf": 28, "price_psf": 9500,  "parking": 2000, "note": "屯門私人", "src": "差估署新界B類~$27"},
    "元朗區":   {"rent_psf": 28, "price_psf": 9800,  "parking": 2000, "note": "元朗/天水圍私人", "src": "差估署新界B類~$27"},
    "離島區":   {"rent_psf": 34, "price_psf": 11500, "parking": 3000, "note": "東涌私人", "src": "東涌屋苑2025-26呎租約$31-39；東環車位叫租見$4k，取$3k中位"},
}
DEFAULT_PRIVATE = {"rent_psf": 35, "price_psf": 11000, "parking": 2200, "note": "估算", "src": "缺區資料，用九龍/新界中位"}

# Longer names first. No bare 保良局 / 東華三院 / 可譽 / 真光.
ELITE_SEC = [
    "聖保羅男女中學", "聖保羅書院", "拔萃男書院", "喇沙書院", "皇仁書院",
    "英華書院", "聖若瑟書院", "培正中學", "民生書院", "福建中學",
    "港大同學會書院", "華仁書院", "張祝珊英文中學", "保良局羅氏基金中學",
    "滙基書院", "播道書院", "王錦輝中學", "優才書院", "沙田培英中學",
]
GOOD_SEC = [
    "觀塘官立中學", "何文田官立中學", "賽馬會官立中學", "觀塘功樂官立中學",
    "順利天主教中學", "聖言中學", "觀塘瑪利諾書院",
    "華英中學", "沙田官立中學", "荃灣官立中學", "屯門官立中學",
    "將軍澳官立中學", "陳瑞祺（喇沙）書院", "陳瑞祺(喇沙)書院",
    "聖公會林護紀念中學", "真道書院",
]
GIRLS_SEC = [
    "拔萃女書院", "協恩中學", "瑪利諾修院", "嘉諾撒聖瑪利", "嘉諾撒書院",
    "嘉諾撒聖心", "嘉諾撒聖家書院", "德望學校", "聖保祿中學", "聖傑靈",
    "聖嘉勒", "瑪利曼", "聖羅撒", "聖士提反女子", "聖母書院",
    "九龍真光", "香港真光", "真光女書院", "藍田聖保祿", "聖保祿學校",
    "培道中學",
]

# EDB POA 2027 Net 48 discretionary-place quotas (booklet dated 8/2026).
NET48_DP_EDB = {
    "觀塘官立小學": 50,
    "天主教佑華小學": 50,
    "中華基督教會基法小學": 25,
    "樂善堂楊仲明學校": 50,
    "閩僑小學": 50,
    "聖公會基顯小學": 50,
    "聖公會基樂小學": 50,
    "聖公會聖約翰曾肇添小學": 63,
    "秀茂坪天主教小學": 63,
    "聖安當小學": 63,
    "聖若翰天主教小學": 50,
    "聖公會李兆強小學": 63,
    "藍田循道衞理小學": 63,
    "香港道教聯合會圓玄學院陳呂重德紀念學校": 63,
    "聖愛德華天主教小學": 63,
    "基督教聖約教會堅樂小學": 63,
    "秀明小學": 63,
    "樂華天主教小學": 50,
    "路德會聖馬太學校（秀茂坪）": 50,
    "聖公會德田李兆強小學": 75,
    "聖公會油塘基顯小學": 75,
    "中華基督教會基法小學（油塘）": 75,
    "觀塘官立小學（秀明道）": 63,
}

NO_P1_SCHOOLS = {
    "東華三院高可寧紀念小學",
    "新界婦孺福利會基督教銘恩小學",
}

# Minutes-not-needed 0–10 walk/MTR score from 月華街 / 觀塘站.
COMMUTE_SCHOOL = {
    "中華基督教會基法小學": 10.0,  # 月華街34號 同街
    "聖若翰天主教小學": 9.5,       # 宜安街
    "觀塘官立小學": 8.8,            # 牛頭角道
    "樂華天主教小學": 8.2,          # 振華道
    "樂善堂楊仲明學校": 8.0,
    "聖公會基樂小學": 7.8,
    "天主教佑華小學": 7.6,          # 翠屏
    "閩僑小學": 7.5,
    "聖公會基顯小學": 7.5,
    "聖公會聖約翰曾肇添小學": 7.3,
    "聖公會德田李兆強小學": 7.4,    # 藍田，近現讀幼稚園
    "聖公會李兆強小學": 7.3,        # 平田
    "藍田循道衞理小學": 7.2,
    "聖愛德華天主教小學": 7.2,      # 慶田街
    "福建中學附屬學校": 8.5,        # 觀塘直資
    "聖若瑟英文小學": 8.0,
    "觀塘官立小學（秀明道）": 6.4,  # 秀茂坪
    "基督教聖約教會堅樂小學": 6.3,
    "秀明小學": 6.3,
    "路德會聖馬太學校（秀茂坪）": 6.2,
    "秀茂坪天主教小學": 6.1,
    "聖安當小學": 6.6,              # 油塘港鐵
    "聖公會油塘基顯小學": 6.6,
    "中華基督教會基法小學（油塘）": 6.6,
    "香港道教聯合會圓玄學院陳呂重德紀念學校": 6.4,
}

DISTRICT_COMMUTE = {
    "觀塘區": 7.0, "黃大仙區": 6.2, "西貢區": 5.8, "九龍城區": 5.5,
    "油尖旺區": 5.2, "深水埗區": 4.8, "香港東區": 4.5, "灣仔區": 4.0,
    "中西區": 3.8, "香港南區": 3.2, "沙田區": 4.2, "荃灣區": 3.8,
    "葵青區": 4.0, "大埔區": 2.8, "北區": 2.4, "屯門區": 2.2,
    "元朗區": 2.2, "離島區": 2.0,
}

STAY_DSS_DISTRICTS = {"觀塘區", "黃大仙區", "九龍城區"}

# 2027/28 小一最終取錄公佈（直資／私立）。唔記入圍次輪、首輪結果。
# 官立／資助用教育局統籌，此欄留空。優先校方；其次公開時間表，標「約」。
DSS_PRIVATE_RESULT = {
    "香港浸會大學附屬學校王錦輝中小學": {
        "date": "2026年12月",
        "note": "校方：最終結果公布＝十二月",
    },
    "福建中學附屬學校": {
        "date": "2026年12月前；第二階段約2027年4月",
        "note": "校方：第一階段最終取錄12月前電郵；第二階段最終約4月中",
    },
    "聖保羅男女中學附屬小學": {
        "date": "暫定2027年1月中下旬",
        "note": "校方暫定最終取錄",
    },
    "拔萃男書院附屬小學": {
        "date": "約2026年12月–2027年1月",
        "note": "最終取錄。校方未寫死；公開時間表多寫12月，往年亦見1月",
    },
    "英華小學": {
        "date": "約2027年1月",
        "note": "最終取錄。公開時間表寫翌年1月；校方未寫死",
    },
    "香港華人基督教聯會真道書院": {
        "date": "2026年12月下旬",
        "note": "簡介會資料：12月下旬公佈最終結果",
    },
    "優才（楊殷有娣）書院": {
        "date": "2026年10月下旬",
        "note": "校方時間表：第二階段面見結果＝最終取錄。7–9月只係入圍通知",
    },
    "聖保羅書院小學": {"date": "約2026年12月", "note": "最終取錄，公開時間表"},
    "港大同學會小學": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "救恩學校": {"date": "約2026年10月", "note": "最終取錄，公開時間表"},
    "拔萃女小學": {"date": "約2026年12月", "note": "最終取錄，公開時間表"},
    "保良局陳守仁小學": {"date": "約2027年1月", "note": "最終取錄，公開時間表"},
    "香港培正小學": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "保良局陸慶濤小學": {"date": "約2026年12月", "note": "最終取錄，次輪2026-12-05之後"},
    "保良局林文燦英文小學": {"date": "約2026年11月底–12月", "note": "最終取錄，次輪2026-11-14之後"},
    "保良局香港道教聯合會圓玄小學": {"date": "約2026年10月中後", "note": "最終取錄，次輪2026-10-03之後；校方未寫死日子"},
    "和富慈善基金李宗德小學": {"date": "約2026年9月底–10月", "note": "最終取錄，次輪2026-09-19之後；校方未寫死日子"},
    "嶺南大學香港同學會小學": {"date": "約2026年9月底–10月", "note": "最終取錄，次輪2026-09-12／19之後；校方未寫死日子"},
    "漢華中學（小學部）": {"date": "約2026年12月", "note": "最終取錄，面試至11月"},
    "聖士提反書院附屬小學": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "九龍塘宣道小學": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "嘉諾撒聖心學校私立部": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "香港真光中學附屬小學暨幼稚園": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "聖方濟各英文小學": {"date": "約2026年11月", "note": "最終取錄，公開時間表"},
    "九龍塘學校（小學部）": {"date": "約2027年5月", "note": "最終取錄，公開時間表"},
    "播道書院": {"date": "待校方公布", "note": "最終取錄日期未見公佈"},
    "培僑書院": {"date": "待校方公布", "note": "最終取錄日期未見公佈"},
    "基督教香港信義會宏信書院": {"date": "待校方公布", "note": "最終取錄日期未見公佈"},
    "聖瑪加利男女英文中小學": {"date": "待校方公布", "note": "最終取錄日期未見公佈"},
    "地利亞（閩僑）英文小學": {"date": "待校方公布", "note": "最終取錄日期未見公佈"},
    "民生書院小學": {"date": "往年約入學年夏季", "note": "最終取錄。往年約同年5月先收生；以校網為準"},
}


def dss_tuition(detail: dict, funding: str):
    """Return (annual_fee_hkd, fee_note) for DSS/private; blank otherwise."""
    if funding not in ("直資", "私立"):
        return "", ""
    fee = detail.get("annualTuitionHkd")
    if fee in (None, "", 0):
        for f in detail.get("facts") or []:
            if (f.get("label") or "") == "學費":
                m = re.search(r"\$?\s*([\d,]+)", str(f.get("value") or ""))
                if m:
                    fee = int(m.group(1).replace(",", ""))
                    break
    if not fee:
        return "", ""
    note = "教育局小學概覽2026（年費）"
    return int(fee), note


def dss_result(name_zh: str, funding: str):
    if funding not in ("直資", "私立"):
        return "", ""
    row = DSS_PRIVATE_RESULT.get(name_zh)
    if not row:
        return "待查／未公佈", "未見校方或公開時間表寫死日期"
    return row["date"], row.get("note", "")

NET_EASE = {
    "48": 6.5, "65": 6.0, "46": 4.0, "34": 4.5, "35": 5.0, "41": 4.0,
    "12": 3.5, "14": 3.5, "11": 5.0, "18": 4.5,
}

NAME_ALIASES = {
    "基法小學": "中華基督教會基法小學",
    "基法小學油塘": "中華基督教會基法小學（油塘）",
    "陳呂重德紀念學校": "香港道教聯合會圓玄學院陳呂重德紀念學校",
    "可譽小學": "嗇色園主辦可譽中學暨可譽小學",
    "黃楚標學校": "香港教育工作者聯會黃楚標學校",
    "梁省德學校": "博愛醫院歷屆總理聯誼會梁省德學校",
    "寶安商會溫浩根小學": "寶安商會温浩根小學",
    "觀塘官立小學(秀明道)": "觀塘官立小學（秀明道）",
    "路德會聖馬太學校(秀茂坪)": "路德會聖馬太學校（秀茂坪）",
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


def norm_text(s: str) -> str:
    s = (s or "").replace("衞", "衛").replace("溫", "温")
    s = s.replace("(", "（").replace(")", "）")
    s = re.sub(r"[\s．.·'’]", "", s)
    return s


def norm_en(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def load_p1_index() -> dict:
    raw = json.loads(P1_PATH.read_text(encoding="utf-8"))
    by_zh, by_en = {}, {}
    for r in raw:
        zh = NAME_ALIASES.get(r["name"], r["name"])
        by_zh[norm_text(zh)] = r
        by_zh[norm_text(r["name"])] = r
        if r.get("en"):
            by_en[norm_en(r["en"])] = r
    return {"zh": by_zh, "en": by_en, "rows": raw}


def lookup_p1(index: dict, name_zh: str, name_en: str) -> dict | None:
    zh = NAME_ALIASES.get(name_zh, name_zh)
    hit = index["zh"].get(norm_text(zh)) or index["zh"].get(norm_text(name_zh))
    if hit:
        return hit
    en = norm_en(name_en)
    hit = index["en"].get(en)
    if hit:
        return hit
    for key, row in index["en"].items():
        if key and en and (key in en or en in key) and min(len(key), len(en)) >= 12:
            return row
    nzh = norm_text(name_zh)
    for key, row in index["zh"].items():
        if key and nzh and (key in nzh or nzh in key) and min(len(key), len(nzh)) >= 6:
            return row
    return None


def private_cost(district: str) -> dict:
    h = PRIVATE_HOUSING.get(district, DEFAULT_PRIVATE)
    rent_mo = round(h["rent_psf"] * HOME_SQFT)
    parking = h["parking"]
    price_m = round(h["price_psf"] * HOME_SQFT / 1_000_000, 2)
    total_mo = rent_mo + parking
    return {
        "rent_psf": h["rent_psf"],
        "price_psf": h["price_psf"],
        "rent_month": rent_mo,
        "parking_month": parking,
        "total_monthly": total_mo,
        "price_million": price_m,
        "note": h.get("note", ""),
        "src": h.get("src", ""),
    }


def home_cost() -> dict:
    return {
        "rent_psf": HOME_RENT_PSF,
        "price_psf": HOME_PRICE_PSF,
        "rent_month": HOME_RENT,
        "parking_month": HOME_PARKING,
        "total_monthly": HOME_TOTAL_MONTHLY,
        "price_million": HOME_PRICE_TOTAL_M,
        "note": "現址月華舊樓實際（非觀塘私人屋苑）",
        "src": "家庭現租$17000+車位$2250；月華大廈2025-26美聯/28Hse成交約$6,515-$6,907/呎",
    }


def vs_home(rent_mo, parking, total_mo, price_m) -> dict:
    return {
        "rent_vs_home_pct": round((rent_mo - HOME_RENT) / HOME_RENT * 100, 1),
        "parking_vs_home_pct": round((parking - HOME_PARKING) / HOME_PARKING * 100, 1),
        "total_vs_home_pct": round((total_mo - HOME_TOTAL_MONTHLY) / HOME_TOTAL_MONTHLY * 100, 1),
        "price_vs_home_pct": round((price_m - HOME_PRICE_TOTAL_M) / HOME_PRICE_TOTAL_M * 100, 1),
    }


def score_from_range(value: float, low: float, high: float) -> float:
    if high <= low:
        return 5.0
    ratio = (value - low) / (high - low)
    return round(max(1.0, min(10.0, 10.0 - ratio * 9.0)), 1)


def score_housing(district: str, use_home_display: bool) -> dict:
    priv = private_cost(district)
    shown = home_cost() if use_home_display else priv
    rents, prices, totals = [], [], []
    for d_name in PRIVATE_HOUSING:
        p = private_cost(d_name)
        rents.append(p["rent_month"])
        prices.append(p["price_million"] * 1_000_000)
        totals.append(p["total_monthly"])
    # 搬屋住屋分用「該區私人中位」；留現址顯示現址實際但不入搬屋排名
    score_base = priv
    rent_s = score_from_range(score_base["rent_month"], min(rents), max(rents))
    buy_s = score_from_range(score_base["price_million"] * 1_000_000, min(prices), max(prices))
    total_s = score_from_range(score_base["total_monthly"], min(totals), max(totals))
    combined = round(rent_s * 0.40 + buy_s * 0.35 + total_s * 0.25, 1)
    vs = vs_home(shown["rent_month"], shown["parking_month"], shown["total_monthly"], shown["price_million"])
    vs_priv = vs_home(priv["rent_month"], priv["parking_month"], priv["total_monthly"], priv["price_million"])
    return {
        **shown,
        **vs,
        "rent_score": rent_s,
        "buy_score": buy_s,
        "total_score": total_s,
        "housing_score": combined,
        "stay_housing_score": 10.0,
        "口径": shown["note"],
        "priv_rent_psf": priv["rent_psf"],
        "priv_price_psf": priv["price_psf"],
        "priv_rent_month": priv["rent_month"],
        "priv_parking": priv["parking_month"],
        "priv_total": priv["total_monthly"],
        "priv_price_m": priv["price_million"],
        "priv_vs_home_pct": vs_priv["total_vs_home_pct"],
        "priv_src": priv["src"],
    }


def parse_area(facts: list) -> float | None:
    for f in facts:
        if f.get("label") == "學校佔地面積":
            match = re.search(r"([\d,]+)\s*平方米", f.get("value", ""))
            if match:
                sqm = float(match.group(1).replace(",", ""))
                if sqm > 30000:  # 安基司等明顯錯值
                    return None
                return sqm
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


def _name_hit(names: list[str], keys: list[str]) -> bool:
    blob = " ".join(names)
    return any(k and k in blob for k in keys)


def norm_zh(s: str) -> str:
    s = (s or "").replace("衞", "衛").replace("(", "（").replace(")", "）")
    return re.sub(r"[\s（）]", "", s)


def load_secondary_index() -> dict:
    rows = json.loads(SEC_GENDER_PATH.read_text(encoding="utf-8"))
    by_norm = {}
    for r in rows:
        by_norm[norm_zh(r["nameZh"])] = r
    return by_norm


def lookup_sec(name: str, index: dict) -> dict | None:
    n = norm_zh(name)
    if not n:
        return None
    if n in index:
        return index[n]
    hits = []
    for key, row in index.items():
        if key and (key in n or n in key) and min(len(key), len(n)) >= 4:
            hits.append((len(key), row))
    if hits:
        hits.sort(key=lambda x: x[0], reverse=True)
        return hits[0][1]
    return None


def secondary_gender(name: str, index: dict) -> str | None:
    row = lookup_sec(name, index)
    if row:
        return row.get("gender")
    if _name_hit([name], GIRLS_SEC):
        return "女校"
    return None


def split_sec_names(val: str) -> list[str]:
    return [x.strip() for x in re.split(r"[、,]", val or "") if x.strip()]


def filter_link_for_boy(link: dict, sec_gender: dict) -> dict:
    """Drop girls secondaries so they count as no 升中聯繫 for Zizi."""
    dropped = [n for n in link["names"] if secondary_gender(n, sec_gender) == "女校"]
    kept = [n for n in link["names"] if n not in dropped]

    def keep_text(val: str) -> str:
        parts = [p for p in split_sec_names(val) if secondary_gender(p, sec_gender) != "女校"]
        return "、".join(parts)

    out = {
        "dragon": keep_text(link.get("dragon", "")),
        "linked": keep_text(link.get("linked", "")),
        "type": "none",
        "names": kept,
        "dropped_girls": dropped,
    }
    if out["dragon"]:
        out["type"] = "dragon"
    elif link.get("type") == "direct" and out["linked"]:
        out["type"] = "direct"
    elif out["linked"]:
        out["type"] = "linked"
    return out


def score_dragon(link: dict) -> float:
    if link["type"] == "none" or not link.get("names"):
        return 3.0
    elite = _name_hit(link["names"], ELITE_SEC)
    good = _name_hit(link["names"], GOOD_SEC)
    # 一條龍/直屬只代表「有位」，質素另外用升中成分（Band）
    if link["type"] in ("dragon", "direct"):
        base = 9.0 if elite else (7.0 if good else 5.0)
        if link["type"] == "dragon":
            base = min(10.0, base + 1.0)
        else:
            base = min(10.0, base + 0.5)
    else:
        base = 6.5 if elite else (6.0 if good else 5.0)
    return round(base, 1)


BAND_SCORE = {
    "Band 1A": 10.0,
    "Band 1B": 9.2,
    "Band 1C": 8.4,
    "Band 2A": 7.2,
    "Band 2B": 6.4,
    "Band 2C": 5.6,
    "Band 3A": 4.8,
    "Band 3B": 4.2,
    "Band 3C": 3.6,
}


def linked_banding(link: dict, sec_index: dict) -> str:
    best = ""
    best_s = -1
    for n in link.get("names") or []:
        row = lookup_sec(n, sec_index)
        band = (row or {}).get("banding") or ""
        s = BAND_SCORE.get(band, -1)
        if s > best_s:
            best_s = s
            best = band
    return best


def score_s1(link: dict, sec_index: dict) -> float:
    """升中成分 = 聯繫中學 Band（女校已剔除），唔再用龍校分複製。"""
    if link["type"] == "none" or not link.get("names"):
        return 3.0
    band = linked_banding(link, sec_index)
    if band in BAND_SCORE:
        return BAND_SCORE[band]
    return 5.0  # 有聯繫但無 Band 資料


def score_negative(review_signals) -> float:
    if not review_signals:
        return 8.0
    text = json.dumps(review_signals, ensure_ascii=False).lower()
    if any(w in text for w in ["投訴", "爭議", "醜聞", "罷課", "欺凌"]):
        return 5.0
    return 8.0


def score_active(facts: list, area_score: float, gender: str) -> float:
    playgrounds = parse_facility(facts, "操場數目") or 1
    halls = parse_facility(facts, "禮堂數目") or 1
    raw = 5.0 + area_score * 0.15 + min(playgrounds, 4) * 0.8 + halls * 0.2
    if gender == "男校":
        raw += 0.3
    return round(min(10.0, max(3.0, raw)), 1)


def score_commute(name_zh: str, district: str) -> float:
    if name_zh in COMMUTE_SCHOOL:
        return COMMUTE_SCHOOL[name_zh]
    return DISTRICT_COMMUTE.get(district, 4.0)


def score_ease_dp(p1: dict, school_net: str, funding: str) -> float:
    if funding in ("直資", "私立"):
        return 3.0
    if not p1.get("total"):
        return 4.0
    dp = p1.get("self") or 0
    ca = p1.get("central") or dp or 1
    fill = ca / max(dp, 1)
    if fill >= 1.2:
        competition = 8.0
    elif fill >= 0.9:
        competition = 6.5
    elif fill >= 0.7:
        competition = 5.0
    else:
        competition = 3.5
    net_bonus = 1.5 if str(school_net) == HOME_SCHOOL_NET else 0.0
    size_bonus = min(1.5, (dp or 0) / 80)
    return round(min(10.0, max(2.0, competition + net_bonus + size_bonus)), 1)


def score_ease_ca(p1: dict, school_net: str, funding: str, mode: str) -> float:
    if funding in ("直資", "私立"):
        return 2.0 if mode != "ca_stay" else 0.0
    if mode == "ca_stay" and str(school_net) != HOME_SCHOOL_NET:
        return 1.0
    total = p1.get("total") or 50
    self_n = p1.get("self") or total // 2
    size_bonus = min(2.0, total / 80)
    self_ratio = self_n / max(total, 1)
    net_key = str(school_net)
    net_bonus = (NET_EASE.get(net_key, 5.0) - 5.0) * 0.3
    raw = 4.0 + self_ratio * 4.0 + size_bonus + net_bonus
    return round(min(10.0, max(2.0, raw)), 1)


def weighted_total(scores: dict, mode: str = "standard") -> float:
    if mode == "relocate":
        w = {
            "area": 0.08, "dragon": 0.10, "s1": 0.12, "negative": 0.07,
            "housing": 0.28, "active": 0.20, "ease": 0.15,
        }
    elif mode == "stay":
        w = {
            "area": 0.08, "dragon": 0.12, "s1": 0.12, "negative": 0.08,
            "active": 0.18, "ease": 0.18, "commute": 0.24,
        }
    elif mode == "dp":
        w = {
            "area": 0.10, "dragon": 0.14, "s1": 0.14, "negative": 0.08,
            "active": 0.18, "ease": 0.10, "commute": 0.26,
        }
    else:
        w = {
            "area": 0.10, "dragon": 0.10, "s1": 0.12, "negative": 0.10,
            "housing": 0.16, "active": 0.22, "ease": 0.20,
        }
    return round(sum(scores[k] * w[k] for k in w), 2)


def stay_path(funding: str, school_net: str, district: str, has_p1: bool) -> str:
    if funding in ("官立", "資助"):
        if not has_p1:
            return "暫停小一"
        if str(school_net) == HOME_SCHOOL_NET:
            return "留現址-統一派位+自行分配"
        return "自行分配可申請(校網外)"
    if funding in ("直資", "私立"):
        if district in STAY_DSS_DISTRICTS:
            return "直資私立可通勤"
        return "直資私立但通勤遠"
    return "需搬屋"


def move_hint(total_vs: float, school_net: str, path: str) -> str:
    if path == "留現址-統一派位+自行分配":
        return "留現址(校網48)"
    if path == "直資私立可通勤":
        return "留現址通勤(直資/私立)"
    if path == "自行分配可申請(校網外)":
        return "自行分配可申請；統一派位需搬入該網"
    if path == "暫停小一":
        return "本年度無小一"
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


def rank_subset(rows_in: list, key: str, field: str, predicate):
    subset = [r for r in rows_in if predicate(r) and r.get(key) not in ("", None)]
    subset.sort(key=lambda r: (-float(r[key]), r["學校"]))
    rank_map = {r["學校"]: i for i, r in enumerate(subset, 1)}
    for r in rows_in:
        r[field] = rank_map.get(r["學校"], "")


def main():
    print("Loading P1 quotas...")
    p1_index = load_p1_index()
    print(f"P1 rows: {len(p1_index['rows'])}")
    sec_index = load_secondary_index()
    print(f"Secondary index: {len(sec_index)}")

    print("Fetching school list...")
    schools = fetch_all_list()
    print(f"Listed {len(schools)} schools")

    details = {}
    if CACHE_PATH.exists():
        try:
            details = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
            print(f"Loaded {len(details)} cached details")
        except Exception:
            details = {}

    slugs = [s["slug"] for s in schools]
    missing = [slug for slug in slugs if slug not in details]
    if missing:
        print(f"Fetching {len(missing)} details...")
        with ThreadPoolExecutor(max_workers=12) as ex:
            futs = {ex.submit(fetch_detail, slug): slug for slug in missing}
            done = 0
            for fut in as_completed(futs):
                slug = futs[fut]
                try:
                    details[slug] = fut.result()
                except Exception as e:
                    print(f"  warn: {slug}: {e}")
                done += 1
                if done % 50 == 0:
                    print(f"  {done}/{len(missing)}")
        CACHE_PATH.write_text(json.dumps(details, ensure_ascii=False), encoding="utf-8")

    rows = []
    for s in schools:
        slug = s["slug"]
        d = details.get(slug, s)
        facts = d.get("facts", [])
        primary = d.get("stageProfile", {}).get("primary", {}) or s.get("stageProfile", {}).get("primary", {})
        district = s.get("district", d.get("district", ""))
        gender = d.get("gender", s.get("gender", "男女校"))
        funding = s.get("fundingType", "")
        name_zh = s["nameZh"]
        name_en = s["nameEn"]
        eligible = boy_eligible(gender)

        p1_row = lookup_p1(p1_index, name_zh, name_en)
        school_net = str(primary.get("schoolNet") or "").strip()
        if school_net in ("", "/", "網/"):
            school_net = ""
        if p1_row and p1_row.get("net"):
            school_net = str(p1_row["net"])
        if funding in ("直資", "私立"):
            net_display = "不適用（直資/私立）"
        elif school_net:
            net_display = school_net
        else:
            net_display = "不適用"

        p1 = {"total": None, "self": None, "central": None, "classes": None}
        if p1_row:
            p1 = {
                "total": p1_row.get("total"),
                "self": p1_row.get("dp"),
                "central": p1_row.get("ca"),
                "classes": p1_row.get("classes"),
            }
        if name_zh in NET48_DP_EDB:
            p1["self"] = NET48_DP_EDB[name_zh]
            if p1.get("total") is None:
                p1["total"] = NET48_DP_EDB[name_zh] * 2

        has_p1 = bool(p1.get("total") or p1.get("self")) and name_zh not in NO_P1_SCHOOLS
        if name_zh in NO_P1_SCHOOLS:
            has_p1 = False
            p1 = {"total": 0, "self": 0, "central": 0, "classes": 0}

        path = stay_path(funding, school_net, district, has_p1)
        stay_display = path in ("留現址-統一派位+自行分配", "直資私立可通勤") and district == HOME_DISTRICT
        sqm = parse_area(facts)
        link = filter_link_for_boy(parse_linkage(facts), sec_index)
        house = score_housing(district, stay_display)
        commute = score_commute(name_zh, district)
        dragon = score_dragon(link)
        s1 = score_s1(link, sec_index)
        area_s = score_area(sqm)
        active = score_active(facts, area_s, gender)
        ease_dp = score_ease_dp(p1, school_net, funding)
        ease_ca_stay = score_ease_ca(p1, school_net, funding, "ca_stay")
        ease_ca_move = score_ease_ca(p1, school_net, funding, "ca_move")
        ease_std = ease_dp if funding in ("直資", "私立") else ease_ca_move

        scores_std = {
            "area": area_s, "dragon": dragon, "s1": s1,
            "negative": score_negative(d.get("reviewSignals")),
            "housing": house["housing_score"], "active": active, "ease": ease_std,
        }
        scores_rel = {**scores_std, "ease": ease_ca_move if funding not in ("直資", "私立") else 3.0}
        scores_stay = {
            "area": area_s, "dragon": dragon, "s1": s1,
            "negative": scores_std["negative"], "active": active,
            "ease": ease_ca_stay if funding not in ("直資", "私立") else ease_dp,
            "commute": commute,
        }
        scores_dp = {
            "area": area_s, "dragon": dragon, "s1": s1,
            "negative": scores_std["negative"], "active": active,
            "ease": ease_dp, "commute": commute,
        }

        rankable = eligible and (has_p1 or funding in ("直資", "私立"))
        stay_ok = path == "留現址-統一派位+自行分配" and rankable
        dss_stay_ok = path == "直資私立可通勤" and eligible
        dp_ok = eligible and has_p1 and funding in ("官立", "資助")
        # 已可留月華街入讀 → 唔使搬，搬屋總分留空，避免同留現址列混淆
        move_ok = rankable and path in (
            "自行分配可申請(校網外)",
            "直資私立但通勤遠",
            "需搬屋",
        )

        link_text = link["dragon"] or link["linked"] or "無"
        if link["dragon"] and link["linked"]:
            link_text = f"龍:{link['dragon']} | 聯:{link['linked']}"
        if link.get("dropped_girls") and not link["names"]:
            link_text = "無（原聯繫為女校中學）"
        elif link.get("dropped_girls"):
            link_text = f"{link_text}｜已剔除女校:{'、'.join(link['dropped_girls'])}"

        source_note = "校網48自行額=教育局2027名冊；其餘學額=升學天地2026"
        if funding in ("直資", "私立"):
            source_note = "直資/私立不經官津派位"
        elif not has_p1:
            source_note = "教育局/概覽顯示本年度無小一"

        if stay_ok:
            score_use = "留現址請只睇「留現址總分」；已在校網48，無搬屋總分"
        elif dss_stay_ok:
            score_use = "留現址通勤請只睇「現址直資總分」；唔使搬，無搬屋總分"
        elif dp_ok and move_ok:
            score_use = "唔搬申請睇「自行分配總分」；要入該網先讀到先睇「搬屋總分」"
        elif move_ok:
            score_use = "要搬近學校／入該網先讀到，請睇「搬屋總分」"
        else:
            score_use = ""

        fee_hkd, fee_note = dss_tuition(d, funding)
        result_date, result_note = dss_result(name_zh, funding)

        rows.append({
            "男生排名": 0,
            "男生搬屋排名": 0,
            "男生留現址排名": 0,
            "男生自行分配排名": 0,
            "男生現址直資排名": 0,
            "學校": name_zh,
            "英文名": name_en,
            "性別收生": gender,
            "男生適讀": "是" if eligible else "否(女校)",
            "現址入學途徑": path,
            "分數用途": score_use,
            "暫停小一": "是" if path == "暫停小一" else "否",
            "區域": district,
            "校網": net_display,
            "類別": funding,
            "年費港元": fee_hkd,
            "學費備註": fee_note,
            "最終結果公佈": result_date,
            "結果備註": result_note,
            "加權總分": weighted_total(scores_std, "standard") if rankable else "",
            "搬屋總分": weighted_total(scores_rel, "relocate") if move_ok else "",
            "留現址總分": weighted_total(scores_stay, "stay") if stay_ok else "",
            "自行分配總分": weighted_total(scores_dp, "dp") if dp_ok else "",
            "現址直資總分": weighted_total(scores_stay, "stay") if dss_stay_ok else "",
            "住屋成本分": house["housing_score"],
            "留現址住屋分": 10.0,
            "住屋口徑": house["口径"],
            "住屋資料來源": house["src"] if stay_display else house["priv_src"],
            "現址通勤分": commute,
            "租金評分": house["rent_score"],
            "樓價評分": house["buy_score"],
            "總住屋評分": house["total_score"],
            "參考呎租": house["rent_psf"],
            "參考呎價": house["price_psf"],
            "估計月租633呎": house["rent_month"],
            "估計車位月租": house["parking_month"],
            "估計住屋總月費": house["total_monthly"],
            "估計樓價633呎萬": house["price_million"],
            "該區私人呎租": house["priv_rent_psf"],
            "該區私人呎價": house["priv_price_psf"],
            "該區私人月租633呎": house["priv_rent_month"],
            "該區私人車位月租": house["priv_parking"],
            "該區私人總月費": house["priv_total"],
            "該區私人樓價633呎萬": house["priv_price_m"],
            "較現址租金差%": house["rent_vs_home_pct"],
            "較現址車位差%": house["parking_vs_home_pct"],
            "較現址總月費差%": house["total_vs_home_pct"],
            "較現址樓價差%": house["price_vs_home_pct"],
            "較現址私人屋苑總月費差%": house["priv_vs_home_pct"],
            "搬屋提示": move_hint(house["total_vs_home_pct"], school_net, path),
            "現址基準": f"{HOME_LABEL} {HOME_SQFT}呎 租${HOME_RENT}+位${HOME_PARKING}",
            "校園面積分": area_s,
            "佔地平方米": sqm or "",
            "龍校分": dragon,
            "升中聯繫": link_text,
            "聯繫中學Band": linked_banding(link, sec_index) or "",
            "升中成分": s1,
            "負面新聞分": scores_std["negative"],
            "孜孜活躍分": active,
            "自行分配易入分": ease_dp,
            "統一派位易入分": ease_ca_stay if str(school_net) == HOME_SCHOOL_NET else ease_ca_move,
            "競爭激烈度": round(10.0 - ease_dp + 2.0, 1) if dp_ok else "",
            "小一學額": p1.get("total") or "",
            "自行分配額": p1.get("self") or "",
            "統一派位額": p1.get("central") or "",
            "操場數": parse_facility(facts, "操場數目") or "",
            "CHSC": d.get("chscId", ""),
            "學額來源": source_note,
            "資料來源": d.get("sourceUrl", s.get("sourceUrl", "")),
            "_stay_ok": stay_ok,
            "_dss_stay_ok": dss_stay_ok,
            "_dp_ok": dp_ok,
            "_move_ok": move_ok,
            "_rankable": rankable,
        })

    rank_subset(rows, "加權總分", "男生排名", lambda r: r["_rankable"])
    rank_subset(rows, "搬屋總分", "男生搬屋排名", lambda r: r["_move_ok"])
    rank_subset(rows, "留現址總分", "男生留現址排名", lambda r: r["_stay_ok"])
    rank_subset(rows, "自行分配總分", "男生自行分配排名", lambda r: r["_dp_ok"])
    rank_subset(rows, "現址直資總分", "男生現址直資排名", lambda r: r["_dss_stay_ok"])

    def sort_key(r):
        if r["男生適讀"] != "是" or not r.get("男生留現址排名"):
            if r["男生適讀"] != "是":
                return (2, 9999, r["學校"])
            if r.get("男生自行分配排名"):
                return (1, int(r["男生自行分配排名"]), r["學校"])
            return (1, 9000, r["學校"])
        return (0, int(r["男生留現址排名"]), r["學校"])

    rows.sort(key=sort_key)
    for r in rows:
        r.pop("_stay_ok", None)
        r.pop("_dss_stay_ok", None)
        r.pop("_dp_ok", None)
        r.pop("_move_ok", None)
        r.pop("_rankable", None)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    boys = [r for r in rows if r["男生適讀"] == "是"]
    stay = [r for r in rows if r.get("男生留現址排名")]
    dss = [r for r in rows if r.get("男生現址直資排名")]
    print(f"Wrote {len(rows)} rows ({len(boys)} boys-eligible, {len(stay)} net48-stay, {len(dss)} dss-commute) to {OUT}")
    top_stay = sorted(stay, key=lambda r: int(r["男生留現址排名"]))[:8]
    top_dss = sorted(dss, key=lambda r: int(r["男生現址直資排名"]))[:5]
    top_dp = sorted([r for r in rows if r.get("男生自行分配排名")], key=lambda r: int(r["男生自行分配排名"]))[:8]
    top_rel = sorted([r for r in rows if r.get("男生搬屋排名")], key=lambda r: int(r["男生搬屋排名"]))[:8]
    print("留現址(校網48) TOP:", ", ".join(f"{r['學校']}({r['留現址總分']})" for r in top_stay))
    print("現址直資 TOP:", ", ".join(f"{r['學校']}({r['現址直資總分']})" for r in top_dss))
    print("自行分配 TOP:", ", ".join(f"{r['學校']}({r['自行分配總分']})" for r in top_dp))
    print("搬屋 TOP:", ", ".join(f"{r['學校']}({r['搬屋總分']})" for r in top_rel))


if __name__ == "__main__":
    main()
