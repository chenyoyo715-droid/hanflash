# HanFlash — 韓文 3 秒開刷 (PWA)

> 完整產品與技術規格、資料庫設計與 GitHub 版本控制規範請見 [`SPEC.md`](./SPEC.md)。  
> GitHub 儲存庫：https://github.com/chenyoyo715-droid/hanflash

專為個人與小圈子打造的極致低阻力韓文背單字 Web App / PWA（內建 **5 大主題詞庫共 500 張** 韓文單字與實戰常用句）：

- **打開 3 秒即開刷**：預設直接抽取「生詞 + 模糊」混刷，不經過複雜儀表板。
- **極簡 3 鍵分桶**：`[1] 生詞`（本輪 3 張後插隊重考）、`[2] 模糊`、`[3] 熟詞`，支援鍵盤快捷鍵（`Space` 翻面、`1/2/3` 分桶、`S` 單字發音、`E` 例句發音）。
- **韓文專屬卡片結構**：內建 **漢字詞對應**（如 `도서관 → 圖書館`）、**真實連音／變音標註**（如 `한국어 [한구거]`、`괜찮다 [괜찬타]`）、例句與助記提示。
- **免費韓語發音**：內建瀏覽器 Web Speech `ko-KR` 語音朗讀，支援自動發音開關。
- **Gemini AI 一鍵製卡 & 批次匯入**：單字輸入韓文按一下即自動補齊所有欄位；亦支援 CSV 匯入或貼上純韓文清單批次 AI 補全（單次最多 20 字）。
- **雙模儲存**：免設定即可「本機模式」開刷；填入 Supabase 金鑰後無縫切換「雲端同步」，電腦手機即時同步且保留 `review_logs` 方便未來升級 FSRS。

## 快速啟動

### 1. 安裝 Node.js（若尚未安裝）
在 Windows PowerShell 執行：
```powershell
winget install OpenJS.NodeJS.LTS
```
安裝完成後重開終端機。

### 2. 安裝相依套件並啟動開發伺服器
```powershell
npm install
npm run dev
```
打開瀏覽器前往 `http://localhost:3000` 即可直接以本機模式體驗完整刷詞流程。

### 3. 開啟雲端同步（Supabase）與 AI 製卡（Gemini API）
1. 複製 `.env.example` 為 `.env.local` 並填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`（從 Google AI Studio 取得，僅在 Next.js 後端路由使用，不會暴露給瀏覽器）
2. 到 Supabase Dashboard 的 **SQL Editor**，貼上並執行 [`supabase/schema.sql`](./supabase/schema.sql)。
3. 重新啟動 `npm run dev`，點右上角硬碟圖示登入／註冊即可跨裝置同步。

## 檔案架構
```text
hanflash/
├── supabase/schema.sql             # Postgres 資料表 + RLS 權限規則
├── public/                         # PWA manifest、Service Worker 與圖示
└── src/
    ├── app/
    │   ├── page.tsx                # 3 秒開刷首頁
    │   └── api/ai/enrich/route.ts  # Gemini 結構化韓文製卡 API
    ├── components/
    │   ├── ReviewWorkspace.tsx     # 主刷詞狀態機與快捷鍵
    │   ├── FlashCard.tsx           # 韓文正反面單字卡
    │   ├── DeckModal.tsx           # 詞庫切換、新建、重置
    │   ├── AddImportModal.tsx      # 單字 AI 製卡與 CSV 批次匯入
    │   └── AuthModal.tsx           # Supabase 雲端同步登入
    ├── data/seedDecks.ts           # 內建 TOPIK I + 日常追劇精選詞庫
    └── lib/                        # storage 雙模層、tts 發音、csv 解析
```
