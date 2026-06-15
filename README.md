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
| 前端部署 | Vercel |
| 後端 | Supabase |
| 資料庫 | Supabase PostgreSQL |
| 使用者登入 | LINE Login，透過 Supabase Edge Function 串接 |

信用卡公用資料位於：

```text
src/data/taiwan_credit_cards_2026-06-15.json
```

## 目前狀態

目前前端功能可直接使用，使用者資料暫時儲存在瀏覽器
使用者必須以 LINE 登入才能進入主畫面。信用卡、消費、現金、預算與介面
設定皆儲存在 Supabase，不再載入瀏覽器內的範例資料。

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

## 部署到 Vercel

專案已連結至 Vercel 的 `ccra` project，正式網址：

```text
https://ccra-sooty.vercel.app/
```

手動部署 production：

```powershell
npx vercel --prod
```

也可以在 Vercel Dashboard 將 GitHub repository
`Hao0820/CCRA` 連結至該 project，之後推送 `main` 即會自動部署。

Vercel 設定位於 `vercel.json`，包含 Vite build、SPA rewrite 與可公開的
Supabase URL、Publishable key、LINE Login Function URL。

`sb_secret_...`、service-role key 與 LINE Channel Secret 絕對不可放進
Vercel 前端環境或任何 `VITE_` 變數。

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
APP_URL=https://ccra-sooty.vercel.app/
ALLOWED_APP_URLS=https://ccra-sooty.vercel.app/,http://localhost:3000/
```

新版 Supabase Dashboard 可在以下位置取得前端金鑰：

```text
Project Settings > API Keys > Publishable and secret API keys
```

請複製 `Publishable key`，通常以 `sb_publishable_` 開頭。若專案仍使用
舊版金鑰，請開啟 `Legacy API Keys` 並複製 `anon public`。兩者都可以
填入本專案的 `VITE_SUPABASE_ANON_KEY`。

LINE Developers Console 的 Callback URL 必須設定為實際的 Edge Function
callback URL，而 Vercel 網址則用於登入完成後返回前端。

目前 CCRA 使用的 Callback URL：

```text
https://gssfqmiynesmtvbmeklb.supabase.co/functions/v1/line-login/callback
```

請在 LINE Developers Console 的 LINE Login 頻道中，進入
`LINE Login > Callback URL` 加入以上網址。

重新產生 Channel Secret 後，請直接在自己的終端機執行，避免把 secret
貼到聊天或提交至 GitHub：

```powershell
npx supabase secrets set LINE_CHANNEL_SECRET=你的新Secret
```

完成後可用以下網址確認 Function 設定狀態：

```text
https://gssfqmiynesmtvbmeklb.supabase.co/functions/v1/line-login/health
```

回傳 `{"ok":true,"configured":true}` 表示 LINE Login 所需參數已齊全。

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

未登入時只會顯示 LINE 登入頁，不會載入主畫面。登入後以 Supabase
資料為準；新帳號會從空白信用卡與空白消費紀錄開始。後續修改會自動同步
預算、現金、輔色、信用卡及消費紀錄。

## 專案結構

```text
ccra/
├─ vercel.json              Vercel 部署與 SPA 設定
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
