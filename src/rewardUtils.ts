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

export function getGroupedScenarios(scenarios: RewardScenario[]): RewardScenario[] {
  // Retain all individual distinct scenarios so the user can choose specific channels/modes
  const seen = new Set<string>();
  const list: RewardScenario[] = [];
  for (const s of scenarios) {
    const key = `${s.label}-${s.rate}-${s.limit ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      list.push(s);
    }
  }
  return list.length > 0 ? list : scenarios;
}

export function getTransactionRewardRate(transaction: Transaction, card?: Card): number {
  if (transaction.appliedRate !== undefined) return transaction.appliedRate;
  if (!card) return 0;
  const scenario = card.rewardScenarios?.find(
    (item) => item.id === transaction.rewardScenarioId,
  ) || card.rewardScenarios?.[0];
  if (!scenario) return card.rewardRate;

  const TRIVIAL_CONDITIONS = ['當月有消費、不限金額', '需消費', '不限金額'];
  const checkedKeys = card.achievedConditions ?? [];

  // If scenario has components (tiered rewards)
  if (scenario.components && scenario.components.length > 0) {
    const hasExclusive = scenario.components.some((c) => c.exclusive);

    let total = 0;
    if (hasExclusive) {
      // Base: all non-exclusive unlimited components
      scenario.components.forEach((comp) => {
        if (!comp.exclusive && (comp.unlimited === true)) {
          total += comp.rate;
        }
      });
      // Exclusive: find the selected one or default to the highest exclusive rate
      const selectedExclusive = scenario.components.find((comp, i) => {
        if (!comp.exclusive) return false;
        const key = `${scenario.id}-comp-${i}`;
        return checkedKeys.includes(key);
      });

      if (selectedExclusive) {
        total += selectedExclusive.rate;
      } else {
        // If nothing explicitly checked yet, default to highest exclusive
        const exclusiveComps = scenario.components.filter((c) => c.exclusive);
        if (exclusiveComps.length > 0) {
          const maxExclusive = Math.max(...exclusiveComps.map((c) => c.rate));
          total += maxExclusive;
        }
      }
    } else {
      // Standard: last component is base, others need checkbox
      const isBase = (i: number) =>
        scenario.components![i].unlimited === true || i === scenario.components!.length - 1;
      scenario.components.forEach((comp, i) => {
        if (isBase(i)) {
          total += comp.rate;
        } else {
          const key = `${scenario.id}-comp-${i}`;
          if (checkedKeys.includes(key)) total += comp.rate;
        }
      });
    }

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
