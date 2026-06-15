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

type CatalogVariantSource = {
  card_id: string;
  card_networks?: string[];
  card_level?: string | null;
  image?: { source_url?: string | null } | null;
  apply_url?: string | null;
};

type CatalogCardSource = {
  card_id: string;
  card_name: string;
  card_networks?: string[];
  card_level?: string | null;
  image?: { source_url?: string | null };
  apply_url?: string | null;
  variants?: CatalogVariantSource[];
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
  bank_code?: string;
  cards: CatalogCardSource[];
};

type CatalogSource = {
  issuers?: CatalogIssuerSource[];
};

export type CreditCardCatalogVariant = {
  id: string;
  cardNetworks: string[];
  cardLevel?: string;
  imageUrl?: string;
  applyUrl?: string;
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
  variants: CreditCardCatalogVariant[];
};

export type CreditCardCatalogIssuer = {
  issuerName: string;
  bankName: string;
  bankCode: string;
};

export type CreditCardCatalog = {
  cards: CreditCardCatalogItem[];
  issuers: CreditCardCatalogIssuer[];
};

const PERIOD_LABELS: Record<string, string> = {
  month: '每月',
  billing_cycle: '每期帳單',
  year: '每年',
  new_card_first_90_days: '新卡前 90 天',
};

function getRewardRate(card: CatalogCardSource): number {
  const officialRates = (card.reward_limit_analysis?.rules ?? [])
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

  const verified = (card.reward_limit_analysis?.rules ?? [])
    .filter((item) => item.cap_status !== 'not_found' && item.cap_status !== 'not_confirmed')
    .slice(0, 3)
    .map((item) =>
      item.headline_reward_rate_percent
        ? `${item.benefit_name} ${item.headline_reward_rate_percent}%`
        : item.benefit_name,
    );

  return (
    verified.join('、') ||
    card.existing_customer_or_regular_rewards?.feature_summary?.[0] ||
    '回饋內容請以發卡銀行最新公告為準'
  );
}

function formatRewardLimit(card: CatalogCardSource): string {
  if (card.reward_scenarios?.length) {
    const best = [...card.reward_scenarios].sort((a, b) => b.rate - a.rate)[0];
    return `${best.label}：${best.limit}`;
  }

  const summaries = (card.reward_limit_analysis?.rules ?? [])
    .filter((item) => ['capped', 'spend_capped', 'threshold_reward'].includes(item.cap_status))
    .slice(0, 3)
    .map((item) => {
      const period = PERIOD_LABELS[item.cap_period ?? ''] ?? item.cap_period ?? '';
      if (item.eligible_spend_to_reach_cap_twd != null) {
        return `${item.benefit_name}：${period}約刷 NT$${item.eligible_spend_to_reach_cap_twd.toLocaleString()} 達上限`;
      }
      if (item.reward_cap_amount != null) {
        return `${item.benefit_name}：${period}上限 ${item.reward_cap_amount.toLocaleString()} ${item.reward_cap_unit ?? ''}`;
      }
      return `${item.benefit_name}：${item.conditions ?? '依活動規則'}`;
    });

  if (summaries.length > 0) return summaries.join('；');
  if ((card.reward_limit_analysis?.rules ?? []).some((item) => item.cap_status === 'unlimited')) {
    return '回饋無上限';
  }
  return '回饋上限請以發卡銀行最新公告為準';
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

function mapCatalog(source: CatalogSource): CreditCardCatalog {
  const cards = (source.issuers ?? []).flatMap((issuer) =>
    issuer.cards.map((card) => {
      const variants = (card.variants?.length
        ? card.variants
        : [{
            card_id: card.card_id,
            card_networks: card.card_networks,
            card_level: card.card_level,
            image: card.image,
            apply_url: card.apply_url,
          }]
      ).map((variant) => ({
        id: variant.card_id,
        cardNetworks: variant.card_networks ?? [],
        cardLevel: variant.card_level ?? undefined,
        imageUrl: variant.image?.source_url ?? undefined,
        applyUrl: variant.apply_url ?? undefined,
      }));

      return {
        id: card.card_id,
        issuerName: issuer.issuer_name,
        bankName: issuer.short_name,
        bankCode: issuer.bank_code ?? '999',
        cardName: card.card_name,
        imageUrl: card.image?.source_url ?? variants[0]?.imageUrl,
        rewardRate: getRewardRate(card),
        rewardDescription: formatRewardDescription(card),
        rewardLimitSummary: formatRewardLimit(card),
        rewardTargetSpend: getRewardTargetSpend(card),
        rewardRules: card.reward_limit_analysis?.rules ?? [],
        rewardScenarios: card.reward_scenarios ?? [],
        variants,
      };
    }),
  );

  const issuers = Array.from(
    new Map(
      cards.map((card) => [
        card.issuerName,
        {
          issuerName: card.issuerName,
          bankName: card.bankName,
          bankCode: card.bankCode,
        },
      ]),
    ).values(),
  ).sort(
    (a, b) =>
      Number(a.bankCode) - Number(b.bankCode) ||
      a.issuerName.localeCompare(b.issuerName, 'zh-TW'),
  );

  return { cards, issuers };
}

let catalogPromise: Promise<CreditCardCatalog> | null = null;

export function loadCreditCardCatalog(): Promise<CreditCardCatalog> {
  if (!catalogPromise) {
    const catalogUrl = `${import.meta.env.BASE_URL}data/taiwan_credit_cards_2026-06-15.json`;
    catalogPromise = fetch(catalogUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`信用卡資料下載失敗 (${response.status})`);
        }
        return response.json() as Promise<CatalogSource>;
      })
      .then(mapCatalog)
      .catch((error) => {
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}
