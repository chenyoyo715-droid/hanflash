# HanFlash（韓文 3 秒開刷）產品與技術規格書

> **文件版本**：v1.0.0  
> **最後更新**：2026-11-27  
> **專案定位**：個人與小圈子使用的極致低阻力韓文背單字跨裝置 Web App / PWA

---

## 1. 產品定位與核心設計原則

| 維度 | 定案規格 |
| :--- | :--- |
| **目標語言** | 韓文（專為繁體中文母語者設計，內建漢字詞與實際音變標註） |
| **使用對象** | 個人與小圈子（共用系統內建詞庫；個人進度與自建詞庫各自獨立） |
| **運行平台** | 跨裝置 Web App / PWA（電腦鍵盤極速流 + 手機單手觸控友善，支援加入主畫面） |
| **核心賣點** | **打開 3 秒內開刷**——零複雜設定、首頁直接進入刷詞畫面，預設抽「生詞 + 模糊」混刷 |
| **記憶機制** | **極簡 3 鍵精準分桶**（`生詞` / `模糊` / `熟詞`），生詞於本輪 3 張後自動插隊重考；底層保留完整 `review_logs` 供日後無痛升級 FSRS |
| **發音方案** | 瀏覽器內建免費 Web Speech `ko-KR` 韓語朗讀（支援自動發音與單獨唸例句／回應） |
| **製卡與匯入** | 單字 Gemini AI 一鍵補全 + CSV／純文字批次匯入（純韓文清單支援單次最多 20 字批次 AI 生成） |

---

## 2. 功能規格明細

### 2.1 三秒開刷工作區 (`ReviewWorkspace` / `FlashCard`)
- **直達刷詞**：進入首頁即載入當前詞庫的「待背（生詞 + 模糊）」隨機佇列。
- **卡片正面**：顯示分桶徽章、詞性／情境標籤、自適應字體大小的韓文單字或長句、單字發音鈕。
- **卡片背面**：
  - **實際連音／變音標註**（僅於發音與拼寫不同時顯示，例如 `한국어 [한구거]`、`괜찮다 [괜찬타]`）
  - **漢字詞對應**（如 `도서관 → 圖書館`）
  - **繁體中文釋義**
  - **語境例句 / 常見對話延伸**（附獨立韓語朗讀鈕）
  - **助記提示**（音變規則、文法句型或不規則變化提醒）
- **鍵盤快捷鍵**：
  - `Space` / `Enter`：翻開答案
  - `1`：標記為 **生詞**（本輪 3 張後插隊重考）
  - `2`：標記為 **模糊**（保留在待背清單）
  - `3`：標記為 **熟詞**（移出本輪）
  - `S` / `R`：朗讀韓文單字／句子
  - `E`：朗讀例句／對話回應

### 2.2 內建 500 張精選韓文詞庫 (`src/data/decks/`)
系統預設內建 **5 大主題詞庫 × 100 張 = 500 張唯一不重複卡片**：

1. **TOPIK I 核心名詞與漢字詞**（`sys-topik-1`，100 詞）— `src/data/decks/topikNouns.ts`
2. **TOPIK I 必背動詞與形容詞**（`sys-topik-verbs`，100 詞）— `src/data/decks/topikVerbs.ts`
3. **日常追劇 & 生活高頻詞**（`sys-daily-kr`，100 詞）— `src/data/decks/dailyWords.ts`
4. **生活日常必背常用句**（`sys-sentences-daily`，100 句）— `src/data/decks/dailySentences.ts`
5. **韓國旅遊 & 應急實戰句**（`sys-sentences-travel`，100 句）— `src/data/decks/travelSentences.ts`

### 2.3 製卡、批次匯入與 Gemini AI 補全
- **後端安全代理**：`POST /api/ai/enrich` 在 Next.js 伺服器端呼叫 Gemini API（預設 `gemini-2.5-flash`），以 JSON Schema 嚴格輸出結構化韓文學習欄位，`GEMINI_API_KEY` 絕不暴露於前端。
- **匯入模式**：
  - 單字快速新增 + 1 鍵 AI 補全
  - 上傳或貼上 CSV / TSV（`韓文,中文,讀音,漢字詞,詞性,例句,例句翻譯,助記法`）
  - 貼上每行一個純韓文單字清單 → 偵測後可 1 鍵呼叫 AI 批次補齊（單次上限 20 字）

---

## 3. 技術架構與資料模型

### 3.1 技術棧
- **前端框架**：Next.js 15 (App Router) + React 19 + TypeScript (Strict)
- **樣式與字體**：Tailwind CSS 3 + `Noto Sans TC` & `Noto Sans KR`（深淺色主題切換）
- **資料庫與驗證**：Supabase (PostgreSQL + Auth + Row Level Security)，未設定金鑰時自動降級為 `localStorage` 本機體驗模式
- **AI 服務**：Google Gemini API (`GEMINI_API_KEY`)
- **PWA**：`public/manifest.json`、`public/sw.js`、`public/icon.svg`

### 3.2 資料庫 Schema (`supabase/schema.sql`)
- `public.decks`：詞庫清單（`is_system = true` 所有人可讀；自建詞庫僅 `owner_id = auth.uid()` 可讀寫）
- `public.cards`：單字與句子卡片（關聯 `deck_id`）
- `public.user_card_progress`：每位使用者的卡片分桶狀態（`new` / `fuzzy` / `known`、`review_count`、`last_reviewed_at`）
- `public.review_logs`：每次刷詞不可變日誌（為日後導入 FSRS 遺忘曲線保留完整訓練資料）

---

## 4. Git / GitHub 版本控制與協作規範

### 4.1 遠端儲存庫資訊
- **託管平台**：GitHub（Private 私人儲存庫）
- **擁有者帳號**：`chenyoyo715-droid`
- **遠端位址 (Remote `origin`)**：`https://github.com/chenyoyo715-droid/hanflash`
- **預設主分支**：`main`（保持隨時可建置、可部署狀態）

### 4.2 分支管理策略
| 分支命名 | 用途 | 合併規則 |
| :--- | :--- | :--- |
| `main` | 穩定主線（對應正式環境／Vercel 自動部署） | 僅接受通過 `tsc --noEmit` 與 `npm run build` 的變更 |
| `feat/<feature-name>` | 新功能開發（例：`feat/anki-apkg-import`、`feat/fsrs-scheduler`） | 完成並自測通過後合併回 `main` |
| `fix/<issue-name>` | Bug 修復（例：`fix/tts-safari-voice`） | 修復並驗證後合併回 `main` |
| `content/<deck-name>` | 詞庫新增與勘誤（例：`content/topik-2-deck`） | 需通過無重複卡片檢查腳本 |

### 4.3 Commit Message 規範（Conventional Commits）
格式：`<type>(<scope>): <簡潔說明>`
- `feat`: 新增功能（例：`feat(deck): expand built-in Korean library to 500 cards`）
- `fix`: 錯誤修復（例：`fix(card): scale typography for long Korean sentences`）
- `docs`: 規格書與文件更新（例：`docs(spec): add product specification and GitHub workflow`）
- `refactor`: 重構（不影響外部行為）
- `chore`: 套件升級、設定檔與建置維護

### 4.4 敏感資訊與版控安全守則
- **嚴禁提交密鑰**：`.env*` 已列入 `.gitignore`（僅保留範本 `.env.example`），`GEMINI_API_KEY` 與 Supabase 金鑰不得進入 Git 歷史。
- **排除建置產物**：`node_modules/`、`.next/`、`out/` 均由 `.gitignore` 忽略。
- **發布前檢核清單**：
  1. 確認 500+ 系統詞庫無重複 `korean` 與 `id`
  2. 執行 `npx tsc --noEmit` 與 `npm run build` 零錯誤
  3. 推送至 `origin main` 後確認遠端同步完成

---

## 5. 後續版本規劃 (Roadmap)
- **v1.1**：手機卡片左右滑動手勢、雙向測驗（看中文想韓文／純聽力盲測）
- **v1.2**：瀏覽器端 Anki `.apkg` 匯入（`jszip` + `sql.js`）
- **v1.3**：基於 `review_logs` 無痛升級 FSRS 科學記憶排程（`ts-fsrs`）
- **v1.4**：小圈子分享自建詞庫連結、部署至 Vercel 供手機安裝 PWA
