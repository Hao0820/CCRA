const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/data/taiwan_credit_cards_2026-06-15.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

let dawhoCount = 0;
let unicardCount = 0;

for (const issuer of data.issuers || []) {
  for (const card of issuer.cards || []) {
    // 1. 永豐 DAWHO
    if (card.card_name && card.card_name.includes('DAWHO現金回饋信用卡')) {
      dawhoCount++;
      card.description = "國內 3.5%（400點，上限刷$11,428）；刷國外 4.5%（含在上限回饋400內）";
      card.reward_scenarios = [
        {
          id: "5e15aec65c386d001d3898a3-domestic",
          label: "國內",
          rate: 3.5,
          description: "國內 3.5%（400點，上限刷$11,428）",
          rule: "國內 3.5%（400點，上限刷$11,428）。需完成指定任務：①綁定DAWHO數位帳戶自動扣繳信用卡帳款 ②使用電子或行動帳單。",
          limit: "每月上限 400 點/元；約刷 NT$11,428 達上限",
          channels: [
            "國內一般消費"
          ],
          conditions: [
            "需完成指定任務（DAWHO數位帳戶自動扣繳＋電子帳單）"
          ],
          rewardCap: 400,
          capPeriod: "month",
          spendToCap: 11428,
          unlimited: false,
          components: [
            {
              rate: 2.5,
              description: "【大戶等級加碼】國內 2.5%（月上限 400 點，上限刷 $11,428）",
              unlimited: false,
              exclusive: true,
              rewardCap: 400,
              rewardCapUnit: "點",
              capPeriod: "month"
            },
            {
              rate: 1,
              description: "【基本回饋】國內 1%（無上限）",
              unlimited: true,
              exclusive: false
            }
          ],
          sourceUrl: "https://bank.sinopac.com/sinopacBT/personal/credit-card/introduction/bankcard/DAWHO.html"
        },
        {
          id: "5e15aec65c386d001d3898a3-foreign",
          label: "國外",
          rate: 4.5,
          description: "刷國外 4.5%（含在上限回饋400內）",
          rule: "刷國外 4.5%（含在上限回饋400內）。需完成指定任務：①綁定DAWHO數位帳戶自動扣繳信用卡帳款 ②使用電子或行動帳單。",
          limit: "每月上限 400 點/元（含在國內外加碼共用 400 點上限內）",
          channels: [
            "國外一般消費"
          ],
          conditions: [
            "需完成指定任務（DAWHO數位帳戶自動扣繳＋電子帳單）"
          ],
          rewardCap: 400,
          capPeriod: "month",
          spendToCap: 11428,
          unlimited: false,
          components: [
            {
              rate: 2.5,
              description: "【大戶等級加碼】國外 2.5%（含在上限回饋 400 點內）",
              unlimited: false,
              exclusive: true,
              rewardCap: 400,
              rewardCapUnit: "點",
              capPeriod: "month"
            },
            {
              rate: 2,
              description: "【基本回饋】國外 2%（無上限）",
              unlimited: true,
              exclusive: false
            }
          ],
          sourceUrl: "https://bank.sinopac.com/sinopacBT/personal/credit-card/introduction/bankcard/DAWHO.html"
        }
      ];
    }

    // 2. 玉山 Unicard
    if (card.card_name && card.card_name.includes('Unicard')) {
      unicardCount++;
      card.description = "【簡單選】百大特店最高 3%；【任意選】任選8家特店最高 3.5%；【UP選】百大特店最高 4.5%；一般消費 1% 無上限";
      card.reward_scenarios = [
        {
          id: "66bab92561f35dfd3010d703-special-stores",
          label: "百大特店",
          rate: 4.5,
          description: "百大特店最高 4.5%（UP選 4.5% / 任意選 3.5% / 簡單選 3%）",
          rule: "申辦帳單e化及綁定玉山帳戶自扣享1%無上限。方案加碼：【簡單選】百大特店+2%(上限1,000點)；【任意選】任選8家特店+2.5%(上限1,000點)；【UP選】百大特店+3.5%(上限5,000點)",
          limit: "UP選加碼上限 5,000 點（約刷 NT$142,857 達上限）；任意選/簡單選加碼上限 1,000 點",
          channels: [
            "行動支付 (LINE Pay/街口/全支付/悠遊付/玉山Wallet/icash Pay等)",
            "交通加油 (中油直營/台鐵/高鐵/Uber/台灣大車隊等)",
            "量販生活 (家樂福/屈臣氏/康是美/UNIQLO/NET等)",
            "百貨餐飲 (新光三越/SOGO/Uber Eats/foodpanda/王品/瓦城等)",
            "電商旅遊 (momo/蝦皮/淘寶/酷澎/華航/長榮/Agoda/Klook/日韓歐美實體等)"
          ],
          conditions: [
            "申辦帳單e化及綁定玉山帳戶自扣"
          ],
          rewardCap: 5000,
          capPeriod: "month",
          spendToCap: 142857.14,
          unlimited: true,
          components: [
            {
              rate: 3.5,
              description: "【UP選】百大特店 +3.5%（月上限 5,000 點）",
              unlimited: false,
              exclusive: true,
              rewardCap: 5000,
              rewardCapUnit: "點",
              capPeriod: "month"
            },
            {
              rate: 2.5,
              description: "【任意選】任選8家特店 +2.5%（月上限 1,000 點）",
              unlimited: false,
              exclusive: true,
              rewardCap: 1000,
              rewardCapUnit: "點",
              capPeriod: "month"
            },
            {
              rate: 2,
              description: "【簡單選】百大特店 +2%（月上限 1,000 點）",
              unlimited: false,
              exclusive: true,
              rewardCap: 1000,
              rewardCapUnit: "點",
              capPeriod: "month"
            },
            {
              rate: 1,
              description: "【基本回饋】一般消費 1%（無上限）",
              unlimited: true,
              exclusive: false
            }
          ],
          sourceUrl: "https://icard.ai/home/all_cards"
        },
        {
          id: "66bab92561f35dfd3010d703-general",
          label: "一般消費（非特店）",
          rate: 1.0,
          description: "一般消費 1% 玉山 e point 回饋無上限",
          rule: "需同時申辦帳單e化及申辦玉山銀行臺幣帳戶自動扣繳",
          limit: "回饋無上限",
          channels: [
            "國內外非百大特店一般消費"
          ],
          conditions: [
            "申辦帳單e化及綁定玉山帳戶自扣"
          ],
          unlimited: true,
          components: [
            {
              rate: 1,
              description: "【基本回饋】一般消費 1%（無上限）",
              unlimited: true,
              exclusive: false
            }
          ],
          sourceUrl: "https://icard.ai/home/all_cards"
        }
      ];
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Updated DAWHO: ${dawhoCount} card(s), Unicard: ${unicardCount} card(s).`);
