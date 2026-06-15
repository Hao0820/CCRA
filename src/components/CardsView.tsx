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
    return transactions
      .filter((tx) => tx.cardId === card.id)
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

  const getBestScenarioProgress = (card: Card) => {
    const candidates = getBestRewardScenarios(card).filter((scenario) => scenario.spendToCap);
    if (candidates.length === 0) {
      const target = getRewardTarget(card);
      return target
        ? { spend: getCurrentMonthSpend(card.id), target }
        : null;
    }

    return candidates
      .map((scenario) => ({
        spend: getCurrentMonthSpend(card.id, scenario.id),
        target: scenario.spendToCap!,
      }))
      .sort((a, b) => (b.spend / b.target) - (a.spend / a.target))[0];
  };

  const renderCardItem = (card: Card, index: number) => {
    const rotation = getRotationClass(index);
    const spend = getCardSpend(card.id);
    const bestScenario = getBestRewardScenario(card);
    const progress = getBestScenarioProgress(card);
    const remainingSpend = progress
      ? Math.max(progress.target - progress.spend, 0)
      : null;

    return (
      <div
        key={card.id}
        onClick={() => setSelectedCard(card)}
        className={`sketch-border sketch-shadow cursor-pointer transition-all duration-300 bg-white/90 ${rotation} hover:scale-[1.02] relative overflow-hidden aspect-[1.586/1]`}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-[#f8f4e4]">
          {card.cardImage ? (
            <img
              src={card.cardImage}
              alt={card.name}
              className="w-full h-full object-contain p-3 drop-shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-[#75777d]">
              <CreditCard size={36} />
              <span className="text-[10px]">暫無卡面圖片</span>
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/55 px-2.5 pt-5 pb-2">
          <div className="flex items-end justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-[12px] sm:text-sm font-bold text-primary font-display">
                {card.name}
              </p>
              <div className="mt-1 flex items-center gap-1 text-[10px] sm:text-xs text-on-surface-variant font-bold">
                <Coins size={12} className="opacity-75 shrink-0" />
                <span className="truncate font-sans">
                  {card.currency} {spend.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {remainingSpend !== null && (
                <span className={`rounded-full border border-black/10 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold ${
                  remainingSpend === 0
                    ? 'bg-[#c3ecd7] text-[#294e3f]'
                    : 'bg-[#fcf5c7] text-[#846b12]'
                }`}>
                  {remainingSpend === 0
                    ? '已刷滿'
                    : `再刷 ${card.currency}${Math.ceil(remainingSpend).toLocaleString()}`}
                </span>
              )}
              <span className="rounded-full bg-[var(--accent-bg)] border border-black/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-[var(--accent-text)]">
                {bestScenario?.rate ?? card.rewardRate}%
              </span>
            </div>
          </div>
        </div>

        {card.isFavorite && (
          <Heart size={16} fill="currentColor" className="absolute left-2 top-2 text-[#ba1a1a] drop-shadow-sm" />
        )}
        <span className="absolute top-2 right-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold font-sans text-on-surface-variant shadow-sm">
          ...{card.lastFour}
        </span>
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
              <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c13]/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="bg-[#fdf9e9] sketch-border sketch-shadow w-full max-w-md max-h-[82vh] overflow-y-auto p-5 transform scale-100 transition-all duration-300 relative rotate-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-outline border-dashed pb-2">
              <h3 className="font-display text-xl font-bold text-primary">
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

            <div className="space-y-4 text-left">
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
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCard.rewardScenarios.map((scenario) => (
                      <button
                        key={scenario.id}
                        type="button"
                        onClick={() => setSelectedRewardScenario(scenario)}
                        className="rounded-md border border-[#75777d]/20 bg-white/50 p-2 text-left transition-colors hover:bg-[var(--accent-bg)]/30"
                      >
                          <div className="flex items-center justify-between gap-2 text-xs font-bold">
                            <span>{scenario.label}</span>
                            <span className="text-secondary font-sans">{scenario.rate}%</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-[#846b12]">
                            {scenario.limit}
                          </p>
                          <p className="mt-1 text-[9px] font-bold text-secondary">
                            點選查看規則 ＋
                          </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  末四碼
                </p>
                <p className="text-sm font-sans font-bold text-on-surface">
                  •••• •••• •••• {selectedCard.lastFour || 'XXXX'}
                </p>
                {(selectedCard.cardNetworks?.length || selectedCard.cardLevel) && (
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {[selectedCard.cardNetworks?.join(' / '), selectedCard.cardLevel]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  額度
                </p>
                <p className="text-sm font-sans font-bold text-on-surface">
                  {selectedCard.currency} {(selectedCard.creditLimit ?? 0).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  本月累積消費金額 (Current Spend)
                </p>
                <p className="text-lg text-primary font-bold sketch-border-sm px-3 py-1.5 inline-block bg-[#f8f4e4] shadow-sm font-sans">
                  {selectedCard.currency} {getCardSpend(selectedCard.id).toLocaleString()}
                </p>
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

              <div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  本月累計回饋數 (Estimated Rewards)
                </p>
                <p className="text-md font-bold text-secondary flex items-center gap-1.5">
                  <Coins size={18} className="text-[#765469]" />
                  <span className="text-lg font-sans underline decoration-dashed decoration-secondary">
                    {getCardRewards(selectedCard).toLocaleString()}
                  </span>{' '}
                  pts / 點
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-2 pt-2 border-t border-dashed border-[#75777d]/30">
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
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setSelectedRewardScenario(null)}
        >
          <div
            className="relative w-full max-w-sm max-h-[78vh] overflow-y-auto bg-[#fdf9e9] p-6 sketch-border sketch-shadow -rotate-[0.5deg]"
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
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setCardPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[#fdf9e9] p-6 sketch-border sketch-shadow -rotate-[0.5deg]"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c13]/60 backdrop-blur-sm"
          onClick={() => setIsAddingCard(false)}
        >
          <div
            className="bg-[#fdf9e9] sketch-border sketch-shadow w-full max-w-md p-6 transform scale-100 transition-all duration-300 relative -rotate-[0.5deg]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold text-primary mb-4 border-b border-outline border-dashed pb-2">
              新增信用卡
            </h3>

            <form onSubmit={handleCreateCard} className="space-y-4 text-left">
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
                  placeholder="5678"
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
                  placeholder="例如 100000"
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
