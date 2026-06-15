import { Card, RewardScenario, Transaction } from './types';

export function getBestRewardScenario(card: Card): RewardScenario | undefined {
  return card.rewardScenarios?.reduce<RewardScenario | undefined>(
    (best, scenario) => (!best || scenario.rate > best.rate ? scenario : best),
    undefined,
  );
}

export function getBestRewardScenarios(card: Card): RewardScenario[] {
  const scenarios = card.rewardScenarios ?? [];
  const highestRate = Math.max(...scenarios.map((scenario) => scenario.rate), 0);
  return scenarios.filter((scenario) => scenario.rate === highestRate);
}

export function getTransactionRewardRate(transaction: Transaction, card?: Card): number {
  if (!card) return 0;
  const scenario = card.rewardScenarios?.find(
    (item) => item.id === transaction.rewardScenarioId,
  );
  return scenario?.rate ?? card.rewardRate;
}

export function calculateTransactionReward(transaction: Transaction, card?: Card): number {
  return Math.round(transaction.amount * (getTransactionRewardRate(transaction, card) / 100));
}
