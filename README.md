# 孜孜升小面試 · ZiZi Primary Prep

為 5 歲 **孜孜** 而設的香港升小面試練習 App，內容對齊倉庫內兩份教材：

1. `名校模擬面試 第一周字詞表.pdf` — 時間／人物／動作／地點中英字詞
2. `名校模擬面試 Day 1-6 r.pdf` — 第二週 Day 1–6（自我介紹、看圖、重組、情緒、家人故事、閱讀複習）與 Lv1–4 難度

## 功能

- **第一周字詞表**閃卡（中英朗讀）
- **Day 1–6** 練習：說話、選擇、數學、重組句子、家長互動任務
- **模擬面試**精選問答
- **家長指引**：三個核心能力、四級難度、家長金句（來自教材）
- 星星進度（本機儲存）

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

原因說明：Pages 不能直接跑 Vite 原始碼（`src/main.tsx`），必須先 `npm run build`。

此專案會：
1. 把建置結果輸出到 `docs/`（`vite.config.ts` 已設 `base: '/ZiZiPrimaryPrep/'`）
2. 用 GitHub Actions 自動部署（`.github/workflows/deploy-pages.yml`）

若 Settings → Pages 仍是 **Deploy from a branch**，請改成其中一種：
- **GitHub Actions**（建議），或
- Branch `main` / folder **`/docs`**

## 個人化

編輯 `src/data/content.ts` 的 `CHILD`（姓名、年齡、幼稚園）。

## 原則（來自教材）

不是要全部做對，而是建立：面對難題的勇氣、清晰有禮的表達、答錯再試的態度。Level 4 不是必須完成。
