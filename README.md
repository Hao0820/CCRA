# CCRA

CCRA 是一套台灣信用卡回饋與消費管理工具。使用者必須透過 LINE 登入，
信用卡、現金餘額、消費紀錄與介面設定會同步至 Supabase。

## 主要功能

- LINE Login 登入與 Supabase 雲端同步
- 瀏覽台灣信用卡及國內、海外、網購、支付等回饋方式
- 保留同一卡片的 Visa、Mastercard、JCB 與卡等版本
- 記錄持有信用卡、末四碼、額度及常用卡片
- 同銀行信用卡共用額度，統計時每家銀行只計算一次
- 記錄信用卡或現金消費並自動估算回饋
- 顯示回饋上限進度、已刷滿或尚差多少消費
- 依月份查看消費列表、回饋點數及支出類別占比
- 管理現金餘額與全站輔色
- 顯示雲端同步狀態，失敗時可手動重試

## 技術架構

| 項目 | 技術 |
| --- | --- |
| 前端 | React 19、TypeScript、Vite |
| 樣式 | Tailwind CSS |
| 圖示 | Lucide React |
| 部署 | Vercel |
| 後端與資料庫 | Supabase、PostgreSQL |
| 登入 | LINE Login、Supabase Edge Function |

## 信用卡資料

信用卡公用資料位於：

```text
public/data/taiwan_credit_cards_2026-06-15.json
```

目前目錄包含 652 個信用卡產品與 1,026 個卡組織／卡等版本。資料在使用者
登入後才動態下載，不會打包進首頁 JavaScript。

資料主要依 iCard 公開頁面整理：

```text
https://icard.ai/home/all_cards
```

優惠期限、登錄資格、回饋上限與排除項目仍以發卡銀行最新公告為準。

## 本機開發

環境需求：

- Node.js 22 或以上
- npm

安裝並啟動：

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

開啟：

```text
http://localhost:3000/
```

檢查與正式建置：

```powershell
npm run check
```

其他指令：

```powershell
npm run lint
npm run build
npm run preview
```

## 環境變數

前端 `.env.local`：

```dotenv
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_KEY"
VITE_APP_URL="https://YOUR_DOMAIN"
VITE_LINE_LOGIN_URL="https://YOUR_PROJECT.supabase.co/functions/v1/line-login"
```

`VITE_` 變數會包含在前端程式中，只能放可公開資料。下列機密不得提交至
GitHub，也不得放入任何 `VITE_` 變數：

- `LINE_CHANNEL_SECRET`
- Supabase secret/service-role key
- 私人 API Key

## Supabase

Migration 位於：

```text
supabase/migrations/
```

主要資料表：

| 資料表 | 用途 |
| --- | --- |
| `profiles` | LINE 顯示名稱、現金餘額及輔色 |
| `user_cards` | 持有卡片、末四碼、額度、版本及收藏狀態 |
| `transactions` | 消費、扣款方式、類別及回饋快照 |

每張卡的額度保存在 `user_cards.card_data`。前端會依銀行代碼視為共用額度，
同銀行多張卡只會加總一次。

套用 Migration：

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

資料表已啟用 Row Level Security，登入者只能存取自己的資料。

## LINE Login

LINE Login 使用 OAuth 2.0 Authorization Code Flow，登入流程由
`supabase/functions/line-login` 處理。

Supabase Edge Function Secrets：

```text
LINE_CHANNEL_ID
LINE_CHANNEL_SECRET
APP_URL=https://ccra-sooty.vercel.app/
ALLOWED_APP_URLS=https://ccra-sooty.vercel.app/,http://localhost:3000/
```

設定 Secret：

```powershell
npx supabase secrets set LINE_CHANNEL_ID=你的ChannelId
npx supabase secrets set LINE_CHANNEL_SECRET=你的ChannelSecret
```

LINE Developers Console 的 Callback URL：

```text
https://YOUR_PROJECT.supabase.co/functions/v1/line-login/callback
```

未登入時只會顯示登入頁。登入成功後才會下載信用卡目錄並載入使用者的
Supabase 資料。

## Vercel 部署

正式網址：

```text
https://ccra-sooty.vercel.app/
```

GitHub repository：

```text
https://github.com/Hao0820/CCRA
```

Vercel 已連結 repository，推送 `main` 後會自動建置與部署。也可以手動執行：

```powershell
npx vercel --prod
```

部署設定位於 `vercel.json`，包含 Vite build、SPA rewrite 與公開前端環境變數。

## 專案結構

```text
ccra/
├─ public/data/              信用卡公用 JSON
├─ src/
│  ├─ components/           頁面與彈窗元件
│  ├─ App.tsx               登入、同步、狀態與頁面切換
│  ├─ creditCardCatalog.ts  信用卡資料動態載入與轉換
│  ├─ rewardUtils.ts        回饋計算
│  └─ types.ts              TypeScript 型別
├─ supabase/
│  ├─ functions/            LINE Login Edge Function
│  └─ migrations/           PostgreSQL schema
├─ vercel.json
├─ .env.example
└─ package.json
```

## License

Copyright © 2026 CCRA Inc.
