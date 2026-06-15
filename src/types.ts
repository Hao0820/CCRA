/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RewardComponent {
  rate: number;
  description: string;
  rewardCap?: number;
  capPeriod?: string;
  unlimited?: boolean;
}

export interface RewardScenario {
  id: string;
  label: string;
  rate: number;
  description: string;
  rule: string;
  limit: string;
  channels?: string[];
  conditions?: string[];
  rewardCap?: number;
  capPeriod?: string;
  spendToCap?: number;
  unlimited?: boolean;
  components?: RewardComponent[];
  sourceUrl?: string;
}

export interface Card {
  id: string;
  bankCode: string; // e.g., "004"
  bankName: string; // e.g., "臺灣銀行"
  name: string;      // e.g., "金采卡"
  lastFour: string;  // e.g., "1234"
  creditLimit: number;
  rewardDesc: string; // e.g., "1% Cash Back everywhere"
  rewardRate: number; // e.g., 1 (for 1% or 1pt/yen)
  colorType: 'pink' | 'mint' | 'sky' | 'beige' | 'yellow' | 'purple';
  currency: 'NT$' | '¥' | '$' | '€';
  catalogCardId?: string;
  catalogVariantId?: string;
  cardLevel?: string;
  cardNetworks?: string[];
  cardImage?: string;
  rewardLimitSummary?: string;
  rewardTargetSpend?: number;
  rewardScenarios?: RewardScenario[];
  achievedConditions?: string[];
  isFavorite?: boolean;
}

export interface Transaction {
  id: string;
  merchant: string;
  date: string; // YYYY-MM-DD
  amount: number;
  cardId: string; // references Card.id
  rewardScenarioId?: string;
  appliedRate?: number; // Snapshot of the rate applied at creation time
  category: 'shopping' | 'dining' | 'transport' | 'entertainment' | 'medical' | 'social' | 'home' | 'other';
  notes?: string;
  pointsOverride?: number; // optional manual points, otherwise calculated
}

export interface Budget {
  monthlyLimit: number;
  currency: string;
}

export type AccentColor =
  | 'lime'
  | 'yellow'
  | 'orange'
  | 'pink'
  | 'magenta'
  | 'cyan'
  | 'aqua'
  | 'blue'
  | 'steel'
  | 'violet';
