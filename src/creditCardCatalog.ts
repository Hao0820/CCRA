import creditCardData from './data/taiwan_credit_cards_2026-06-15.json';
import { RewardScenario } from './types';

type RewardRule = {
  benefit_name: string;
  headline_reward_rate_percent: number | null;
  rate_used_for_cap_calculation_percent: number | null;
  cap_status: string;
  reward_cap_amount: number | null;
  reward_cap_unit: string | null;
  cap_period: string | null;
  eligible_spend_to_reach_cap_twd: number | null;
  conditions: string | null;
};

type CatalogCardSource = {
  card_id: string;
  card_name: string;
  image?: { source_url?: string | null };
  existing_customer_or_regular_rewards?: {
    structured_rewards?: Array<{
      value?: string | number | null;
      suffix?: string | null;
    }>;
    feature_summary?: string[];
  };
  reward_limit_analysis?: { rules?: RewardRule[] };
  reward_scenarios?: RewardScenario[];
};

type CatalogIssuerSource = {
  issuer_name: string;
  short_name: string;
  cards: CatalogCardSource[];
};

export type CreditCardCatalogItem = {
  id: string;
  issuerName: string;
  bankName: string;
  bankCode: string;
  cardName: string;
  imageUrl?: string;
  rewardRate: number;
  rewardDescription: string;
  rewardLimitSummary: string;
  rewardTargetSpend?: number;
  rewardRules: RewardRule[];
  rewardScenarios: RewardScenario[];
};

const BANK_CODES: Record<string, string> = {
  臺灣銀行: '004',
  台灣銀行: '004',
  土地銀行: '005',
  合作金庫: '006',
  第一銀行: '007',
  華南銀行: '008',
  彰化銀行: '009',
  上海銀行: '011',
  台北富邦: '012',
  國泰世華: '013',
  高雄銀行: '016',
  兆豐銀行: '017',
  台灣企銀: '050',
  渣打銀行: '052',
  台中銀行: '053',
  滙豐銀行: '081',
  華泰商銀: '102',
  新光銀行: '103',
  陽信銀行: '108',
  三信商銀: '147',
  聯邦銀行: '803',
  遠東商銀: '805',
  元大銀行: '806',
  永豐銀行: '807',
  玉山銀行: '808',
  凱基銀行: '809',
  星展銀行: '810',
  台新銀行: '812',
  安泰銀行: '816',
  中國信託: '822',
  台灣樂天: '樂天',
  美國運通: 'AMEX',
  王道銀行: '048',
  'LINE Bank': '824',
  將來銀行: '823',
  臺灣土地銀行: '005',
  合作金庫商業銀行: '006',
  第一商業銀行: '007',
  華南商業銀行: '008',
  彰化商業銀行: '009',
  上海商業儲蓄銀行: '011',
  台北富邦商業銀行: '012',
  國泰世華商業銀行: '013',
  兆豐國際商業銀行: '017',
  臺灣中小企業銀行: '050',
  渣打國際商業銀行: '052',
  台中商業銀行: '053',
  '滙豐(台灣)商業銀行': '081',
  華泰商業銀行: '102',
  臺灣新光商業銀行: '103',
  陽信商業銀行: '108',
  三信商業銀行: '147',
  聯邦商業銀行: '803',
  遠東國際商業銀行: '805',
  元大商業銀行: '806',
  永豐商業銀行: '807',
  玉山商業銀行: '808',
  凱基商業銀行: '809',
  '星展(台灣)商業銀行': '810',
  台新國際商業銀行: '812',
  安泰商業銀行: '816',
  中國信託商業銀行: '822',
  台灣樂天信用卡股份有限公司: '樂天',
  '台灣美國運通國際(股)公司': 'AMEX',
};

const PERIOD_LABELS: Record<string, string> = {
  month: '每月',
  billing_cycle: '每期帳單',
  year: '每年',
  new_card_first_90_days: '核卡後 90 天',
};

function getRewardRate(card: CatalogCardSource): number {
  const rules = card.reward_limit_analysis?.rules ?? [];
  const officialRates = rules
    .flatMap((item) => [
      item.headline_reward_rate_percent,
      item.rate_used_for_cap_calculation_percent,
    ])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (officialRates.length > 0) return Math.max(...officialRates);

  const structuredRates = (card.existing_customer_or_regular_rewards?.structured_rewards ?? [])
    .filter((item) => String(item.suffix ?? '').includes('%'))
    .map((item) => Number(item.value))
    .filter(Number.isFinite);

  return structuredRates.length > 0 ? Math.max(...structuredRates) : 0;
}

function formatRewardDescription(card: CatalogCardSource): string {
  if (card.reward_scenarios?.length) {
    return [...card.reward_scenarios]
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map((item) => `${item.label}最高 ${item.rate}%`)
      .join('、');
  }
  const rules = card.reward_limit_analysis?.rules ?? [];
  const verified = rules
    .filter((item) => item.cap_status !== 'not_found' && item.cap_status !== 'not_confirmed')
    .slice(0, 3)
    .map((item) =>
      item.headline_reward_rate_percent
        ? `${item.benefit_name} ${item.headline_reward_rate_percent}%`
        : item.benefit_name,
    );

  return (
    verified.join('；') ||
    card.existing_customer_or_regular_rewards?.feature_summary?.[0] ||
    '詳細回饋依發卡機構最新公告'
  );
}

function formatRewardLimit(card: CatalogCardSource): string {
  if (card.reward_scenarios?.length) {
    const best = [...card.reward_scenarios].sort((a, b) => b.rate - a.rate)[0];
    return `${best.label}：${best.limit}`;
  }
  const rules = card.reward_limit_analysis?.rules ?? [];
  const summaries = rules
    .filter((item) => ['capped', 'spend_capped', 'threshold_reward'].includes(item.cap_status))
    .slice(0, 3)
    .map((item) => {
      const period = PERIOD_LABELS[item.cap_period ?? ''] ?? item.cap_period ?? '';
      if (item.eligible_spend_to_reach_cap_twd != null) {
        return `${item.benefit_name}：${period}消費約 NT$${item.eligible_spend_to_reach_cap_twd.toLocaleString()} 達上限`;
      }
      if (item.reward_cap_amount != null) {
        return `${item.benefit_name}：${period}上限 ${item.reward_cap_amount.toLocaleString()} ${item.reward_cap_unit ?? ''}`;
      }
      return `${item.benefit_name}：${item.conditions ?? '詳見活動辦法'}`;
    });

  if (summaries.length > 0) return summaries.join('；');
  if (rules.some((item) => item.cap_status === 'unlimited')) return '主要回饋無上限';
  return '尚未確認固定回饋上限，請依銀行最新公告';
}

function getRewardTargetSpend(card: CatalogCardSource): number | undefined {
  if (card.reward_scenarios?.length) {
    return [...card.reward_scenarios].sort((a, b) => b.rate - a.rate)[0].spendToCap;
  }
  return (card.reward_limit_analysis?.rules ?? [])
    .map((item) => item.eligible_spend_to_reach_cap_twd)
    .filter((value): value is number => typeof value === 'number' && value > 0)
    .sort((a, b) => a - b)[0];
}

const issuers = creditCardData.issuers as CatalogIssuerSource[];

export const CREDIT_CARD_CATALOG: CreditCardCatalogItem[] = issuers.flatMap((issuer) =>
  issuer.cards.map((card) => ({
    id: card.card_id,
    issuerName: issuer.issuer_name,
    bankName: issuer.short_name,
    bankCode: BANK_CODES[issuer.issuer_name] ?? '—',
    cardName: card.card_name,
    imageUrl: card.image?.source_url ?? undefined,
    rewardRate: getRewardRate(card),
    rewardDescription: formatRewardDescription(card),
    rewardLimitSummary: formatRewardLimit(card),
    rewardTargetSpend: getRewardTargetSpend(card),
    rewardRules: card.reward_limit_analysis?.rules ?? [],
    rewardScenarios: card.reward_scenarios ?? [],
  })),
);

export const CREDIT_CARD_ISSUERS = Array.from(
  new Map(
    CREDIT_CARD_CATALOG.map((card) => [
      card.issuerName,
      { issuerName: card.issuerName, bankName: card.bankName, bankCode: card.bankCode },
    ]),
  ).values(),
);
