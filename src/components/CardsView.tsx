/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, RewardScenario, Transaction } from '../types';
import {
  CreditCardCatalogIssuer,
  CreditCardCatalogItem,
} from '../creditCardCatalog';
import { CreditCard, Coins, Plus, Trash2, Award, Database, Heart, HeartPlus } from 'lucide-react';
import {
  calculateTransactionReward,
  getBestRewardScenario,
  getBestRewardScenarios,
} from '../rewardUtils';

interface CardsViewProps {
  cards: Card[];
  transactions: Transaction[];
  catalog: CreditCardCatalogItem[];
  catalogIssuers: CreditCardCatalogIssuer[];
  onAddCard: (card: Card) => void;
  onUpdateCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  currencySymbol: string;
  isAddingCard: boolean;
  setIsAddingCard: (isAdding: boolean) => void;
  onAddExpenseForCard: (cardId: string) => void;
}

export default function CardsView({
  cards,
  transactions,
  catalog,
  catalogIssuers,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  currencySymbol,
  isAddingCard,
  setIsAddingCard,
  onAddExpenseForCard,
}: CardsViewProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [viewRewardScenarioId, setViewRewardScenarioId] = useState<string>('');
  const [selectedRewardScenario, setSelectedRewardScenario] = useState<RewardScenario | null>(null);
  const [cardPendingDelete, setCardPendingDelete] = useState<Card | null>(null);

  // Form Fields
  const [issuerName, setIssuerName] = useState('');
  const [catalogCardId, setCatalogCardId] = useState('');
  const [catalogVariantId, setCatalogVariantId] = useState('');
  const [lastFour, setLastFour] = useState('');
  const [creditLimit, setCreditLimit] = useState('');

  const availableCards = catalog.filter((card) => card.issuerName === issuerName);
  const selectedCatalogCard = catalog.find((card) => card.id === catalogCardId);
  const selectedCatalogVariant =
    selectedCatalogCard?.variants.find((variant) => variant.id === catalogVariantId) ??
    selectedCatalogCard?.variants[0];
  const existingBankLimit = selectedCatalogCard
    ? Math.max(
        ...cards
          .filter((card) => card.bankCode === selectedCatalogCard.bankCode)
          .map((card) => Number(card.creditLimit) || 0),
        0,
      )
    : 0;

  React.useEffect(() => {
    if (!selectedCatalogCard) {
      setCreditLimit('');
      return;
    }
    setCreditLimit(existingBankLimit > 0 ? String(existingBankLimit) : '');
  }, [existingBankLimit, selectedCatalogCard]);

  // Group cards by Bank Code
  const bankGroups: { [key: string]: { name: string; cards: Card[] } } = {};
  cards.filter((card) => !card.isFavorite).forEach((card) => {
    const key = `${card.bankCode}. ${card.bankName}`;
    if (!bankGroups[key]) {
      bankGroups[key] = { name: card.bankName, cards: [] };
    }
    bankGroups[key].cards.push(card);
  });
  const favoriteCards = cards.filter((card) => card.isFavorite);

  // Calculate current spend for a card
  const getCardSpend = (cardId: string) => {
    return transactions
      .filter((tx) => tx.cardId === cardId)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  // Calculate rewards for a card
  const getCardRewards = (card: Card) => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter((tx) => tx.cardId === card.id && tx.date.startsWith(monthPrefix))
      .reduce((sum, tx) => sum + calculateTransactionReward(tx, card), 0);
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogCard || lastFour.length !== 4 || Number(creditLimit) < 0) return;

    const newCard: Card = {
      id: `card-${Date.now()}`,
      bankCode: selectedCatalogCard.bankCode,
      bankName: selectedCatalogCard.bankName,
      name: selectedCatalogCard.cardName,
      lastFour: lastFour.trim().slice(-4),
      creditLimit: Number(creditLimit),
      rewardDesc: selectedCatalogCard.rewardDescription,
      rewardRate: selectedCatalogCard.rewardRate,
      colorType: 'beige',
      currency: 'NT$',
      catalogCardId: selectedCatalogCard.id,
      catalogVariantId: selectedCatalogVariant?.id,
      cardLevel: selectedCatalogVariant?.cardLevel,
      cardNetworks: selectedCatalogVariant?.cardNetworks,
      cardImage: selectedCatalogVariant?.imageUrl ?? selectedCatalogCard.imageUrl,
      rewardLimitSummary: selectedCatalogCard.rewardLimitSummary,
      rewardTargetSpend: selectedCatalogCard.rewardTargetSpend,
      rewardScenarios: selectedCatalogCard.rewardScenarios,
    };

    onAddCard(newCard);
    setIsAddingCard(false);

    // Reset Form
    setIssuerName('');
    setCatalogCardId('');
    setCatalogVariantId('');
    setLastFour('');
    setCreditLimit('');
  };

  const handleToggleCondition = (conditionKey: string) => {
    if (!selectedCard) return;
    const current = selectedCard.achievedConditions || [];
    const newConditions = current.includes(conditionKey)
      ? current.filter(c => c !== conditionKey)
      : [...current, conditionKey];
    const updatedCard = { ...selectedCard, achievedConditions: newConditions };
    onUpdateCard(updatedCard);
    setSelectedCard(updatedCard);
  };

  // Alternate custom rotations based on code or index to mimic casual placement
  const getRotationClass = (index: number) => {
    const rotations = [
      'rotate-1 transform hover:rotate-0',
      '-rotate-1 transform hover:rotate-0',
      'rotate-[0.5deg] transform hover:rotate-0',
      '-rotate-[0.5deg] transform hover:rotate-0',
      'rotate-[1.5deg] transform hover:rotate-[0.5deg]',
      '-rotate-[1.2deg] transform hover:rotate-[-0.2deg]',
    ];
    return rotations[index % rotations.length];
  };

  const getCurrentMonthSpend = (cardId: string, rewardScenarioId?: string) => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return transactions
      .filter(
        (tx) =>
          tx.cardId === cardId &&
          tx.date.startsWith(monthPrefix) &&
          (!rewardScenarioId || tx.rewardScenarioId === rewardScenarioId),
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const getRewardTarget = (card: Card) => {
    if (card.rewardTargetSpend) return card.rewardTargetSpend;
    return catalog.find(
      (item) =>
        item.id === card.catalogCardId ||
        item.variants.some((variant) => variant.id === card.catalogVariantId),
    )?.rewardTargetSpend;
  };

  const getAllScenarioProgress = (card: Card) => {
    const candidates = getBestRewardScenarios(card).filter((scenario) => scenario.spendToCap);
    if (candidates.length === 0) {
      const target = getRewardTarget(card);
      return target
        ? [{ spend: getCurrentMonthSpend(card.id), target, label: '一般', rate: card.rewardRate }]
        : [];
    }

    // Group scenarios with the same spendToCap together
    // (e.g. SPO card has 網購+行動支付 both with spendToCap=10000 — they share a cap)
    const grouped = new Map<number, { label: string; rate: number; ids: string[] }>();
    for (const scenario of candidates) {
      const key = scenario.spendToCap!;
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        // Keep highest rate, combine label if rate differs
        if (scenario.rate > existing.rate) {
          existing.rate = scenario.rate;
          existing.label = scenario.label;
        } else if (scenario.rate === existing.rate && !existing.label.includes(scenario.label)) {
          existing.label = `${existing.label}/${scenario.label}`;
        }
        existing.ids.push(scenario.id);
      } else {
        grouped.set(key, { label: scenario.label, rate: scenario.rate, ids: [scenario.id] });
      }
    }

    return Array.from(grouped.entries())
      .map(([rawTarget, { label, rate, ids }]) => {
        // Cap the target at the card's credit limit to avoid showing unreachable goals
        const target = card.creditLimit > 0 ? Math.min(rawTarget, card.creditLimit) : rawTarget;
        // For spend: sum across all scenarios in this group
        const spend = ids.reduce(
          (sum, id) => sum + getCurrentMonthSpend(card.id, id),
          0
        );
        return { spend, target, label, rate };
      })
      .sort((a, b) => b.rate - a.rate);
  };

  const getBestScenarioProgress = (card: Card) => {
    const all = getAllScenarioProgress(card);
    return all.length > 0 ? all[0] : null;
  };

  const renderCardItem = (card: Card, index: number) => {
    const rotation = getRotationClass(index);
    const spend = getCardSpend(card.id);
    const bestScenario = getBestRewardScenario(card);
    const allProgress = getAllScenarioProgress(card);

    return (
      <div
        key={card.id}
        onClick={() => {
          setSelectedCard(card);
          if (card.rewardScenarios && card.rewardScenarios.length > 0) {
            setViewRewardScenarioId(card.rewardScenarios[0].id);
          } else {
            setViewRewardScenarioId('');
          }
        }}
        className={`sketch-border sketch-shadow cursor-pointer transition-all duration-300 bg-white/90 ${rotation} hover:scale-[1.02] flex items-center gap-3 p-3`}
      >
        <div className="w-24 h-16 shrink-0 bg-[var(--color-surface-container-low)] rounded-md overflow-hidden flex items-center justify-center sketch-border-sm relative">
          {card.cardImage ? (
            <img
              src={card.cardImage}
              alt={card.name}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-[#75777d]">
              <CreditCard size={20} />
              <span className="text-[8px]">暫無圖片</span>
            </div>
          )}
          {card.isFavorite && (
            <Heart size={14} fill="currentColor" className="absolute left-1 top-1 text-[#ba1a1a]" />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex justify-between items-start gap-1">
            <p className="truncate text-lg font-bold text-primary font-display leading-tight">
              {card.name} <span className="text-xs text-on-surface-variant font-sans font-normal ml-1">...{card.lastFour}</span>
            </p>
            <span className="shrink-0 rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-xs font-bold text-[var(--accent-text)] sketch-border-sm">
              {bestScenario?.rate ?? card.rewardRate}%
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm text-on-surface-variant font-bold">
            <Coins size={14} className="opacity-75 shrink-0" />
            <span className="truncate font-sans">
              {card.currency} {spend.toLocaleString()}
            </span>
          </div>

          {allProgress.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {allProgress.slice(0, 2).map((prog, i) => {
                const remaining = Math.max(prog.target - prog.spend, 0);
                return (
                  <span
                    key={i}
                    className={`rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-bold font-sans ${
                      remaining === 0
                        ? 'bg-[#c3ecd7] text-[#294e3f]'
                        : 'bg-[#fcf5c7] text-[#846b12]'
                    }`}
                  >
                    {remaining === 0
                      ? `[${prog.label}] 已滿`
                      : `[${prog.label}] 剩 ${card.currency}${Math.ceil(remaining).toLocaleString()}`}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="space-y-8 font-handwriting">
      {cards.length === 0 ? (
        <div className="text-center py-12 bg-white/40 sketch-border border-dashed p-6">
          <p className="text-on-surface-variant font-bold text-lg mb-2">這裡還沒有卡片！</p>
          <p className="text-on-surface-variant text-sm">點選右上角的新增卡片來記錄您的第一張信用卡吧。</p>
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-display text-body-lg font-bold text-[#ba1a1a] transform -rotate-0.5 inline-flex items-center gap-1.5 bg-[#ffdad6] px-3 py-1 sketch-border-sm">
              <Heart size={16} fill="currentColor" />
              我的最愛
            </h3>
            {favoriteCards.length > 0 ? (
              <div className="flex flex-col gap-4">
                {favoriteCards.map((card, index) => renderCardItem(card, index))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#ba1a1a]/30 bg-[#ffdad6]/20 px-4 py-3 text-center text-xs text-on-surface-variant">
                點選信用卡查看詳情，再按空心愛心＋加入我的最愛。
              </div>
            )}
            <div className="hand-line mt-4"></div>
          </section>

          {Object.entries(bankGroups).map(([bankKey, group], groupIndex) => (
          <section key={bankKey} className="space-y-3">
            <h3 className="font-display text-body-lg font-bold text-on-surface transform rotate-0.5 inline-block bg-surface-container-high px-3 py-1 sketch-border-sm">
              {bankKey}
            </h3>

            <div className="flex flex-col gap-4">
              {group.cards.map((card, idx) => renderCardItem(card, groupIndex + idx))}
            </div>
            
            <div className="hand-line mt-4"></div>
          </section>
          ))}
        </>
      )}

      {/* Card Details Popup Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 pb-24 bg-[#1c1c13]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-[var(--color-surface-bg)] sketch-border sketch-shadow w-full max-w-md max-h-[calc(100dvh-7rem)] overflow-y-auto p-4 transform scale-100 transition-all duration-300 relative rotate-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-outline border-dashed pb-2">
              <h3 className="font-display text-lg font-bold text-primary">
                卡片詳細資訊
              </h3>
              <button
                type="button"
                onClick={() => {
                  const updatedCard = { ...selectedCard, isFavorite: !selectedCard.isFavorite };
                  onUpdateCard(updatedCard);
                  setSelectedCard(updatedCard);
                }}
                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-colors ${
                  selectedCard.isFavorite
                    ? 'bg-[#ffdad6] text-[#ba1a1a]'
                    : 'bg-white text-on-surface-variant border border-[#75777d]/30'
                }`}
                title={selectedCard.isFavorite ? '取消我的最愛' : '加入我的最愛'}
              >
                {selectedCard.isFavorite ? (
                  <Heart size={18} fill="currentColor" />
                ) : (
                  <HeartPlus size={18} />
                )}
                <span>{selectedCard.isFavorite ? '已收藏' : '加入最愛'}</span>
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  發卡銀行與名稱
                </p>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-md font-bold text-primary font-display">
                    ({selectedCard.bankCode}) {selectedCard.bankName} - {selectedCard.name}
                  </p>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 px-2 py-1 sketch-border-sm text-[#ba1a1a] hover:bg-[#ffdad6] active:scale-95 transition-all text-[10px] font-bold"
                    onClick={() => setCardPendingDelete(selectedCard)}
                  >
                    <Trash2 size={12} />
                    刪除卡片
                  </button>
                </div>
              </div>

              {selectedCard.rewardScenarios && selectedCard.rewardScenarios.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    消費方式
                  </p>
                  <select
                    value={viewRewardScenarioId}
                    onChange={(e) => setViewRewardScenarioId(e.target.value)}
                    className="w-full border-2 border-outline rounded-md focus:border-primary focus:outline-none bg-white p-2 text-sm font-bold font-sans mb-3"
                  >
                    {selectedCard.rewardScenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label} ({scenario.rate}%)
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const scenario = selectedCard.rewardScenarios.find(s => s.id === viewRewardScenarioId);
                    if (!scenario) return null;
                    const TRIVIAL_CONDITIONS = ['當月有消費、不限金額', '需消費', '不限金額'];
                    const realConditions = (scenario.conditions ?? []).filter(
                      (c) => !TRIVIAL_CONDITIONS.includes(c.trim())
                    );
                    return (
                      <div className="rounded-md border border-[#75777d]/20 bg-white/50 p-3 text-left">
                        <div className="flex items-center justify-between gap-2 text-sm font-bold">
                          <span>{scenario.label}</span>
                          <span className="text-secondary font-sans">{scenario.rate}%</span>
                        </div>
                        {scenario.components && scenario.components.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-dashed border-[#75777d]/20 pt-2">
                            {scenario.components.map((comp, idx) => (
                              <div key={idx} className="flex justify-between items-start text-xs">
                                <span className="text-on-surface flex-1">├─ {comp.description}</span>
                                <span className="text-primary font-bold whitespace-nowrap ml-2">{comp.rate}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {realConditions.length > 0 && (
                          <div className="mt-3 bg-[var(--color-surface-container-low)] p-2.5 rounded-sm space-y-2 text-[11px] text-on-surface-variant">
                            <p className="font-bold text-on-surface text-xs">需達成條件 (新增消費時可勾選)：</p>
                            <ul className="list-disc pl-4 space-y-1">
                              {realConditions.map((cond, idx) => (
                                <li key={idx} className="leading-snug">{cond}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-bold text-on-surface-variant">末四碼</p>
                  <p className="text-sm font-sans font-bold text-on-surface">
                    •••• {selectedCard.lastFour || 'XXXX'}
                  </p>
                  {(selectedCard.cardNetworks?.length || selectedCard.cardLevel) && (
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      {[selectedCard.cardNetworks?.join(' / '), selectedCard.cardLevel]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold text-on-surface-variant">額度</p>
                  <p className="text-sm font-sans font-bold text-on-surface">
                    {selectedCard.currency} {(selectedCard.creditLimit ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-[#75777d]/20 bg-[#f8f4e4] p-2">
                  <p className="mb-1 text-[10px] font-bold text-on-surface-variant">
                    本月累積消費金額
                  </p>
                  <p className="text-base font-bold font-sans text-primary">
                    {selectedCard.currency} {getCurrentMonthSpend(selectedCard.id).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md border border-[#75777d]/20 bg-[var(--accent-bg)]/40 p-2">
                  <p className="mb-1 text-[10px] font-bold text-on-surface-variant">
                    本月累積回饋數
                  </p>
                  <p className="flex items-center gap-1 text-base font-bold font-sans text-secondary">
                    <Coins size={14} />
                    {getCardRewards(selectedCard).toLocaleString()} 點
                  </p>
                </div>
              </div>

              {(!selectedCard.rewardScenarios || selectedCard.rewardScenarios.length === 0) && (
              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  回饋規則 (Reward Details)
                </p>
                <div className="text-sm text-on-surface flex items-start gap-2 bg-[#f2eede]/50 p-2 rounded-md border border-[#75777d]/20">
                  <Award size={18} className="text-secondary mt-0.5 shrink-0" />
                  <span>{selectedCard.rewardDesc}</span>
                </div>
              </div>
              )}

              {selectedCard.rewardLimitSummary &&
                (!selectedCard.rewardScenarios || selectedCard.rewardScenarios.length === 0) && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                    回饋上限與達檻消費
                  </p>
                  <div className="text-sm text-on-surface flex items-start gap-2 bg-[#fcf5c7]/60 p-2 rounded-md border border-[#75777d]/20">
                    <Database size={18} className="text-[#846b12] mt-0.5 shrink-0" />
                    <span>{selectedCard.rewardLimitSummary}</span>
                  </div>
                </div>
              )}

            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-2 pt-2 border-t border-dashed border-[#75777d]/30">
              <button
                type="button"
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 sketch-border-sm bg-[var(--accent-bg)] text-[var(--accent-text)] hover:brightness-95 active:scale-95 transition-all text-xs font-bold pencil-shadow"
                onClick={() => onAddExpenseForCard(selectedCard.id)}
              >
                <Plus size={14} />
                新增消費
              </button>

              <button
                className="px-4 py-1.5 sketch-border-sm bg-[#ece8d9] text-on-surface hover:bg-[#e6e3d3] active:scale-95 transition-all text-xs font-bold pencil-shadow"
                onClick={() => setSelectedCard(null)}
              >
                知道了 (Got it)
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRewardScenario && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 pb-24 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setSelectedRewardScenario(null)}
        >
          <div
            className="relative w-full max-w-sm max-h-[78vh] overflow-y-auto bg-[var(--color-surface-bg)] p-6 sketch-border sketch-shadow -rotate-[0.5deg]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-dashed border-outline pb-3">
              <p className="text-xs font-bold text-on-surface-variant">消費方式</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h3 className="font-display text-xl font-bold text-primary">
                  {selectedRewardScenario.label}
                </h3>
                <span className="rounded-full bg-[var(--accent-bg)] px-3 py-1 text-sm font-bold font-sans text-[var(--accent-text)]">
                  {selectedRewardScenario.rate}%
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-left">
              <div>
                <p className="text-xs font-bold text-on-surface-variant">回饋上限</p>
                <p className="mt-1 rounded-md border border-[#846b12]/20 bg-[#fcf5c7]/60 p-3 text-sm leading-relaxed text-[#846b12]">
                  {selectedRewardScenario.limit}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-on-surface-variant">完整規則</p>
                <p className="mt-1 whitespace-pre-line rounded-md border border-[#75777d]/20 bg-white/50 p-3 text-sm leading-relaxed text-on-surface">
                  {selectedRewardScenario.rule}
                </p>
              </div>

              {selectedRewardScenario.channels && selectedRewardScenario.channels.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">適用通路</p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface">
                    {selectedRewardScenario.channels.join('、')}
                  </p>
                </div>
              )}

              {selectedRewardScenario.conditions && selectedRewardScenario.conditions.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-on-surface-variant">適用條件</p>
                  <p className="mt-1 text-xs leading-relaxed text-on-surface">
                    {selectedRewardScenario.conditions.join('、')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cardPendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-24 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setCardPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[var(--color-surface-bg)] p-6 sketch-border sketch-shadow -rotate-[0.5deg]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffdad6] sketch-border-sm">
                <Trash2 size={20} className="text-[#ba1a1a]" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-[#ba1a1a]">確定刪除信用卡？</h3>
                <p className="mt-2 text-sm font-bold text-on-surface">
                  {cardPendingDelete.name}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  刪除後，與這張卡片相關的消費紀錄也會一併移除，此動作無法復原。
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-dashed border-[#75777d]/30 pt-4">
              <button
                type="button"
                onClick={() => setCardPendingDelete(null)}
                className="px-4 py-2 sketch-border-sm bg-white hover:bg-[#ece8d9] text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCard(cardPendingDelete.id);
                  setCardPendingDelete(null);
                  setSelectedCard(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 sketch-border-sm bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffb4ab] text-xs font-bold pencil-shadow"
              >
                <Trash2 size={14} />
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Dialog */}
      {isAddingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-[#1c1c13]/60 backdrop-blur-sm"
          onClick={() => setIsAddingCard(false)}
        >
          <div
            className="bg-[var(--color-surface-bg)] sketch-border sketch-shadow w-full max-w-md max-h-[85vh] flex flex-col p-6 transform scale-100 transition-all duration-300 relative -rotate-[0.5deg]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold text-primary mb-4 border-b border-outline border-dashed pb-2 shrink-0">
              新增信用卡
            </h3>

            <form onSubmit={handleCreateCard} className="space-y-4 text-left overflow-y-auto pr-2 pb-2">
              <div className="rounded-lg border border-[#75777d]/30 bg-[#f2eede]/60 p-3 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2 font-bold text-primary mb-1">
                  <Database size={16} />
                  從台灣信用卡資料庫匯入
                </div>
                選擇銀行與卡片後，系統會自動帶入回饋率、回饋上限、達上限消費額與卡面圖片。
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  發卡銀行 *
                </label>
                <select
                  required
                  value={issuerName}
                  onChange={(e) => {
                    setIssuerName(e.target.value);
                    setCatalogCardId('');
                    setCatalogVariantId('');
                  }}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent py-2 text-sm"
                >
                  <option value="">請選擇銀行</option>
                  {catalogIssuers.map((issuer) => (
                    <option key={issuer.issuerName} value={issuer.issuerName}>
                      {issuer.bankCode} {issuer.bankName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  信用卡 *
                </label>
                <select
                  required
                  disabled={!issuerName}
                  value={catalogCardId}
                  onChange={(e) => {
                    const nextCard = catalog.find((card) => card.id === e.target.value);
                    setCatalogCardId(e.target.value);
                    setCatalogVariantId(nextCard?.variants[0]?.id ?? '');
                  }}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent py-2 text-sm disabled:opacity-50"
                >
                  <option value="">{issuerName ? '請選擇信用卡' : '請先選擇銀行'}</option>
                  {availableCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.cardName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCatalogCard && selectedCatalogCard.variants.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    卡片版本 *
                  </label>
                  <select
                    required
                    value={selectedCatalogVariant?.id ?? ''}
                    onChange={(e) => setCatalogVariantId(e.target.value)}
                    className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent py-2 text-sm"
                  >
                    {selectedCatalogCard.variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {[variant.cardNetworks.join(' / '), variant.cardLevel]
                          .filter(Boolean)
                          .join(' · ') || '一般版本'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedCatalogCard && (
                <div className="grid grid-cols-[96px_1fr] gap-3 rounded-lg bg-white/50 border border-[#75777d]/20 p-3">
                  <div className="flex items-center justify-center">
                    {(selectedCatalogVariant?.imageUrl ?? selectedCatalogCard.imageUrl) ? (
                      <img
                        src={selectedCatalogVariant?.imageUrl ?? selectedCatalogCard.imageUrl}
                        alt={selectedCatalogCard.cardName}
                        className="max-w-24 max-h-16 object-contain"
                      />
                    ) : (
                      <CreditCard size={38} className="text-[#75777d]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-primary">{selectedCatalogCard.cardName}</p>
                    {(selectedCatalogVariant?.cardNetworks.length || selectedCatalogVariant?.cardLevel) && (
                      <p className="mt-1 text-[10px] font-bold text-on-surface-variant">
                        {[selectedCatalogVariant.cardNetworks.join(' / '), selectedCatalogVariant.cardLevel]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                    <p className="text-xs mt-1 text-on-surface">{selectedCatalogCard.rewardDescription}</p>
                    <p className="text-xs mt-1 text-[#846b12]">{selectedCatalogCard.rewardLimitSummary}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  您的卡號末四碼 *
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="ex: 5678"
                  value={lastFour}
                  onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ''))}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 py-2 text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  額度 *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="ex: 100000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  readOnly={existingBankLimit > 0}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 py-2 text-sm font-sans read-only:opacity-60"
                />
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  {existingBankLimit > 0
                    ? `已沿用 ${selectedCatalogCard?.bankName} 的共用額度。`
                    : '同一家銀行的信用卡通常共用此額度，只需設定一次。'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  className="px-4 py-2 sketch-border-sm hover:bg-[#ece8d9] text-xs font-bold"
                  onClick={() => setIsAddingCard(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 sketch-border-sm bg-[var(--accent-bg)] text-[var(--accent-text)] hover:brightness-95 text-xs font-bold pencil-shadow"
                >
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
