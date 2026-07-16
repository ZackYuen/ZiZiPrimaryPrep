# 孜孜升小面試 · ZiZi Primary Prep

為 5 歲 **袁碩孜（Seth Yuen）**、藍田靈糧幼稚園而設的香港升小面試練習 App，內容對齊倉庫內兩份教材：

1. `名校模擬面試 第一周字詞表.pdf` — 時間／人物／動作／地點中英字詞
2. `名校模擬面試 Day 1-6 r.pdf` — 第二週 Day 1–6（自我介紹、看圖、重組、情緒、家人故事、閱讀複習）與 Lv1–4 難度

## 功能

- **第一周字詞表**閃卡（中英朗讀）
- **Day 1–6** 練習：說話、選擇、數學、重組句子、家長互動任務
- **模擬面試**精選問答
- **家長指引**：三個核心能力、四級難度、家長金句（來自教材）
- 星星進度（本機儲存）
- 吉祥物動畫、看圖場景插畫、答對彩紙、點擊／答對／星星音效

## 開始

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## GitHub Pages

網站：https://zackyuen.github.io/ZiZiPrimaryPrep/  
（會自動導向建置後的 `/docs/`）

原因：Pages 若直接伺服 repo 根目錄，會載入 Vite 原始碼（`src/main.tsx`），瀏覽器無法執行，畫面空白。

目前做法（無需改 Settings 也能看）：
1. `npm run build` 輸出到 `docs/`，`base` 設為 `/ZiZiPrimaryPrep/docs/`
2. 根目錄 `index.html` 在 `github.io` 上會導向 `/docs/`

建議之後在 **Settings → Pages** 改成：
- **GitHub Actions**，或
- Branch `main` + folder **`/docs`**（那時可把 `base` 改回 `/ZiZiPrimaryPrep/`）

## 個人化

預設：`袁碩孜` / `Seth Yuen` / `藍田靈糧`。可在 `src/data/content.ts` 的 `CHILD` 再改。

## 原則（來自教材）

不是要全部做對，而是建立：面對難題的勇氣、清晰有禮的表達、答錯再試的態度。Level 4 不是必須完成。
