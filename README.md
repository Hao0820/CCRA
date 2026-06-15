# CCRA

CCRA 是一套台灣信用卡回饋與消費管理工具，可記錄信用卡、現金餘額與
消費明細，並依不同消費方式估算信用卡回饋及回饋上限進度。

## 主要功能

- 瀏覽台灣信用卡與各消費方式的回饋規則
- 新增個人持有的信用卡及末四碼
- 收藏常用信用卡
- 記錄信用卡或現金消費
- 依國內、海外、網購、行動支付等方式計算回饋
- 顯示距離回饋上限的消費金額
- 管理每月預算、現金餘額與介面輔色
- 依月份查看消費明細及累計回饋

## 技術架構

| 項目 | 技術 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite |
| 樣式 | Tailwind CSS |
| 圖示 | Lucide React |
| 前端部署 | GitHub Pages |
| 後端 | Supabase |
| 資料庫 | Supabase PostgreSQL |
| 使用者登入 | LINE Login，透過 Supabase Edge Function 串接 |

信用卡公用資料位於：

```text
src/data/taiwan_credit_cards_2026-06-15.json
```

## 目前狀態

目前前端功能可直接使用，使用者資料暫時儲存在瀏覽器
`localStorage`。已建立 GitHub Pages 部署流程以及 Supabase
資料庫 schema，但 LINE Login、Supabase API 和既有資料搬移仍待正式串接。

尚未設定 Supabase 時，應用程式仍可在本機正常使用。

## 本機開發

### 環境需求

- Node.js 22 或以上
- npm

### 安裝與啟動

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

開啟：

```text
http://localhost:3000/
```

### 檢查與建置

```powershell
npm run check
```

此指令會執行 TypeScript 檢查及 production build。

其他可用指令：

```powershell
npm run lint
npm run build
npm run preview
```

## 環境變數

複製 `.env.example` 為 `.env.local`，再填入以下資料：

```dotenv
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
VITE_APP_URL="https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY"
VITE_LINE_LOGIN_URL="https://YOUR_PROJECT.supabase.co/functions/v1/line-login"
```

`VITE_` 開頭的值會包含在前端程式中，只能放可公開的資料。

以下資料不可放進 `.env.local` 的 `VITE_` 變數，也不可提交到 GitHub：

- `LINE_CHANNEL_SECRET`
- Supabase service-role key
- 任何私人 API Key

## 部署到 GitHub Pages

專案已包含：

```text
.github/workflows/deploy-pages.yml
```

### 1. 建立 GitHub Repository

在 GitHub 建立新的 repository，接著於專案目錄執行：

```powershell
git add .
git commit -m "Initial CCRA release"
git remote add origin https://github.com/YOUR_GITHUB_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

請將網址中的帳號與 repository 名稱換成自己的資料。

### 2. 啟用 GitHub Pages

進入 repository：

```text
Settings > Pages > Build and deployment
```

將 `Source` 設定為 `GitHub Actions`。

### 3. 設定 GitHub Actions Secrets

進入：

```text
Settings > Secrets and variables > Actions
```

新增：

| Secret | 說明 |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Publishable key；舊專案也可使用 `anon public` |
| `VITE_LINE_LOGIN_URL` | LINE Login Edge Function URL |

每次推送到 `main` 分支後，GitHub Actions 會自動檢查、建置並部署網站。

## 建立 Supabase 後端

### 資料表

資料庫 migration 位於：

```text
supabase/migrations/202606150001_initial_schema.sql
```

包含以下資料表：

| 資料表 | 用途 |
| --- | --- |
| `profiles` | LINE 帳號、顯示名稱、預算、現金餘額及輔色 |
| `user_cards` | 使用者持有的信用卡、末四碼與收藏狀態 |
| `transactions` | 消費紀錄、扣款方式及回饋快照 |

信用卡完整規則不會為每位使用者重複存入資料庫。
`user_cards` 只保存信用卡目錄 ID，實際卡片資料由共用 JSON 提供。

### 套用 Migration

安裝並登入 Supabase CLI 後執行：

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

資料表已啟用 Row Level Security，登入者只能讀寫自己的資料。

## LINE Login 規劃

LINE Login 將採用 OAuth 2.0 Authorization Code Flow 搭配 PKCE：

1. 前端將使用者導向 LINE 授權頁面。
2. LINE 將 authorization code 傳給 Supabase Edge Function。
3. Edge Function 驗證 `state`、PKCE、ID Token 及 nonce。
4. 使用 LINE ID Token 的 `sub` 作為穩定的 LINE 使用者識別。
5. 後端建立或取得 Supabase 使用者及 session。
6. 前端登入後載入該使用者的設定、信用卡與消費紀錄。

Supabase Edge Function Secrets 預計包含：

```text
LINE_CHANNEL_ID=2010393614
LINE_CHANNEL_SECRET
APP_URL
```

新版 Supabase Dashboard 可在以下位置取得前端金鑰：

```text
Project Settings > API Keys > Publishable and secret API keys
```

請複製 `Publishable key`，通常以 `sb_publishable_` 開頭。若專案仍使用
舊版金鑰，請開啟 `Legacy API Keys` 並複製 `anon public`。兩者都可以
填入本專案的 `VITE_SUPABASE_ANON_KEY`。

LINE Developers Console 的 Callback URL 必須設定為實際的 Edge Function
callback URL，而 GitHub Pages 網址則用於登入完成後返回前端。

## 資料同步規劃

正式接上後端時，會將目前的瀏覽器資料對應如下：

| localStorage | Supabase |
| --- | --- |
| `my_ledger_name` | `profiles.display_name` |
| `my_ledger_budget` | `profiles.monthly_budget` |
| `ccra_cash_balance` | `profiles.cash_balance` |
| `ccra_accent_color` | `profiles.accent_color` |
| `my_ledger_cards` | `user_cards` |
| `my_ledger_txs` | `transactions` |

第一次登入時可偵測本機資料並詢問使用者是否上傳，避免覆蓋既有的雲端資料。

## 專案結構

```text
ccra/
├─ .github/workflows/       GitHub Pages 部署流程
├─ src/
│  ├─ components/          頁面與彈窗元件
│  ├─ data/                信用卡 JSON 資料
│  ├─ App.tsx              應用程式狀態與頁面切換
│  ├─ creditCardCatalog.ts 信用卡資料轉換
│  ├─ rewardUtils.ts       回饋與上限計算
│  └─ types.ts             TypeScript 型別
├─ supabase/
│  ├─ migrations/          PostgreSQL schema
│  └─ README.md            Supabase 設定摘要
├─ .env.example
├─ package.json
└─ vite.config.ts
```

## 資料來源提醒

信用卡回饋可能隨銀行活動、登錄名額與活動期間調整。畫面上的計算結果僅供
參考，實際權益仍應以各發卡銀行最新公告為準。

## License

Copyright © 2026 CCRA Inc.
