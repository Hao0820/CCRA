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
  if (transaction.appliedRate !== undefined) return transaction.appliedRate;
  if (!card) return 0;
  const scenario = card.rewardScenarios?.find(
    (item) => item.id === transaction.rewardScenarioId,
  );
  if (!scenario) return card.rewardRate;

  const TRIVIAL_CONDITIONS = ['當月有消費、不限金額', '需消費', '不限金額'];
  const checkedKeys = card.achievedConditions ?? [];

  // If scenario has components (tiered rewards)
  if (scenario.components && scenario.components.length > 0) {
    const isBase = (i: number) =>
      scenario.components![i].unlimited === true || i === scenario.components!.length - 1;

    const total = scenario.components.reduce((sum, comp, i) => {
      if (isBase(i)) return sum + comp.rate; // base is always counted
      const key = `${scenario.id}-comp-${i}`;
      return checkedKeys.includes(key) ? sum + comp.rate : sum;
    }, 0);
    return Math.round(total * 100) / 100;
  }

  // Condition-based rate
  const realConditions = (scenario.conditions ?? []).filter((c) => !TRIVIAL_CONDITIONS.includes(c.trim()));
  if (realConditions.length > 0) {
    const allConditionsMet = realConditions.every((cond) =>
      checkedKeys.includes(`${scenario.id}-${cond}`)
    );
    if (!allConditionsMet) return card.rewardRate;
  }

  return scenario.rate;
}

export function calculateTransactionReward(transaction: Transaction, card?: Card): number {
  return Math.round(transaction.amount * (getTransactionRewardRate(transaction, card) / 100));
}
