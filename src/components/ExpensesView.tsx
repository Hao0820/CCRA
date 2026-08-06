/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, Transaction, RewardScenario } from '../types';
import { calculateTransactionReward, getTransactionRewardRate, getGroupedScenarios } from '../rewardUtils';
import { 
  Coins, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  Layers,
  List,
  PieChart,
} from 'lucide-react';

interface ExpensesViewProps {
  cards: Card[];
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (txId: string) => void;
  currencySymbol: string;
  isAddingExpense: boolean;
  setIsAddingExpense: (isAdding: boolean) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  cashBalance: number;
  initialCardId: string | null;
  onClearInitialCard: () => void;
  onUpdateCard?: (card: Card) => void;
}

const CARD_PALETTE = [
  '#3b82f6', // Blue / Sky
  '#10b981', // Emerald / Mint
  '#f59e0b', // Amber / Gold
  '#ec4899', // Pink
  '#8b5cf6', // Violet / Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
];

interface PaymentMethodSpend {
  id: string;
  name: string;
  lastFour?: string;
  cardImage?: string;
  bankCode?: string;
  totalAmount: number;
  txCount: number;
  earnedPoints: number;
  percentage: number;
  color: string;
}

export default function ExpensesView({
  cards,
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  currencySymbol,
  isAddingExpense,
  setIsAddingExpense,
  selectedMonth,
  setSelectedMonth,
  cashBalance,
  initialCardId,
  onClearInitialCard,
  onUpdateCard,
}: ExpensesViewProps) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Generate selectable months from January last year through December this year.
  const monthsList = React.useMemo(() => {
    const list = [];
    const currentYear = new Date().getFullYear();
    const prevYr = currentYear - 1;
    const currYr = currentYear;
    for (let m = 1; m <= 12; m++) {
      list.push(`${prevYr}/${String(m).padStart(2, '0')}`);
    }
    for (let m = 1; m <= 12; m++) {
      list.push(`${currYr}/${String(m).padStart(2, '0')}`);
    }
    return list;
  }, []);

  // Form states
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [cardId, setCardId] = useState('cash');
  const [rewardScenarioId, setRewardScenarioId] = useState('');
  const [contentView, setContentView] = useState<'list' | 'breakdown'>('list');
  const [filterCardId, setFilterCardId] = useState<string>('all');

  // Editing transaction state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionPendingDelete, setTransactionPendingDelete] = useState<Transaction | null>(null);

  // Handle modal closing & states clearing
  const handleCloseModal = () => {
    setIsAddingExpense(false);
    setEditingTransaction(null);
    onClearInitialCard();
  };

  // Reset form when isAddingExpense is true but no editingTransaction (i.e. click top Quick Add button)
  React.useEffect(() => {
    if (isAddingExpense && !editingTransaction) {
      setMerchant('');
      setAmount('');
      setDate(today);
      const fallbackCardId = cards.find((c) => c.isFavorite)?.id || (cards[0]?.id ?? 'cash');
      const targetCardId =
        initialCardId && cards.some((card) => card.id === initialCardId)
          ? initialCardId
          : fallbackCardId;
      setCardId(targetCardId);

      const targetCard = cards.find((c) => c.id === targetCardId);
      setRewardScenarioId(targetCard?.rewardScenarios?.[0]?.id || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddingExpense, initialCardId, today]);

  // Trigger editing popup
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setMerchant(tx.merchant);
    setAmount(String(tx.amount));
    setDate(tx.date);
    setCardId(tx.cardId);
    setRewardScenarioId(tx.rewardScenarioId || '');

    setIsAddingExpense(true);
  };

  // Convert "2026-05-15" to "2026/05" to group & filter
  const getTransactionMonthStr = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return '';
  };

  // Get filtered transactions matching the month
  const filteredTransactions = transactions
    .filter((tx) => getTransactionMonthStr(tx.date) === selectedMonth)
    .filter((tx) => filterCardId === 'all' || tx.cardId === filterCardId)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute Total Expense for the selected month
  const totalExpense = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  // Compute total rewards points earned in this month
  const totalRewardsPoints = filteredTransactions.reduce((sum, tx) => {
    const pairedCard = cards.find((c) => c.id === tx.cardId);
    return sum + (pairedCard ? calculateTransactionReward(tx, pairedCard) : 0);
  }, 0);

  // Compute spending breakdown by payment method / card
  const paymentMethodSpends = React.useMemo(() => {
    const map = new Map<string, { totalAmount: number; txCount: number; earnedPoints: number }>();

    filteredTransactions.forEach((tx) => {
      const key = tx.cardId;
      const pairedCard = cards.find((c) => c.id === tx.cardId);
      const points = pairedCard ? calculateTransactionReward(tx, pairedCard) : 0;

      const current = map.get(key) || { totalAmount: 0, txCount: 0, earnedPoints: 0 };
      current.totalAmount += tx.amount;
      current.txCount += 1;
      current.earnedPoints += points;
      map.set(key, current);
    });

    const list: PaymentMethodSpend[] = [];
    let colorIdx = 0;

    for (const [key, data] of map.entries()) {
      const isCash = key === 'cash';
      const pairedCard = cards.find((c) => c.id === key);
      const percentage = totalExpense > 0 ? (data.totalAmount / totalExpense) * 100 : 0;
      const color = isCash ? '#64748b' : CARD_PALETTE[colorIdx % CARD_PALETTE.length];
      if (!isCash) colorIdx++;

      list.push({
        id: key,
        name: isCash ? '現金 (Cash)' : (pairedCard?.name || '其他卡片'),
        lastFour: pairedCard?.lastFour,
        cardImage: pairedCard?.cardImage,
        bankCode: pairedCard?.bankCode,
        totalAmount: data.totalAmount,
        txCount: data.txCount,
        earnedPoints: data.earnedPoints,
        percentage,
        color,
      });
    }

    return list.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTransactions, cards, totalExpense]);

  const sortedCards = React.useMemo(
    () => [...cards].sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite))),
    [cards],
  );
  const selectedPaymentCard = cards.find((card) => card.id === cardId);
  const rewardScenarios = React.useMemo(() => {
    return getGroupedScenarios(selectedPaymentCard?.rewardScenarios ?? []);
  }, [selectedPaymentCard]);

  // Ensure active scenario is valid
  const activeScenarioId = rewardScenarioId || rewardScenarios[0]?.id || '';
  const selectedScenario = rewardScenarios.find((item) => item.id === activeScenarioId) || rewardScenarios[0];

  // Handle month carousel navigation
  const handleMonthShift = (direction: 'prev' | 'next') => {
    const currentIndex = monthsList.indexOf(selectedMonth);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedMonth(monthsList[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < monthsList.length - 1) {
      setSelectedMonth(monthsList[currentIndex + 1]);
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount || !date || !cardId) return;

    const selectedCardObj = cards.find((c) => c.id === cardId);
    if (cardId !== 'cash' && !selectedCardObj) return;

    const amt = Number(amount);
    const resolvedScenarioId =
      cardId !== 'cash' && rewardScenarios.length > 0
        ? (activeScenarioId || rewardScenarios[0].id)
        : undefined;
    const txRewardScenarioId = cardId === 'cash' ? undefined : resolvedScenarioId;
    
    // Calculate the appliedRate at creation time
    const dummyTxForRate = { rewardScenarioId: txRewardScenarioId } as Transaction;
    const finalRate = cardId !== 'cash' ? getTransactionRewardRate(dummyTxForRate, selectedCardObj) : 0;

    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...editingTransaction,
        merchant: merchant.trim(),
        date,
        amount: amt,
        cardId,
        rewardScenarioId: txRewardScenarioId,
        appliedRate: finalRate,
        pointsOverride: undefined,
      };
      onUpdateTransaction(updatedTx);
    } else {
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        merchant: merchant.trim(),
        date,
        amount: amt,
        cardId,
        rewardScenarioId: txRewardScenarioId,
        appliedRate: finalRate,
        pointsOverride: undefined,
      };
      onAddTransaction(newTx);
    }

    handleCloseModal();
  };

  // Format date readable in Chinese/Taiwan style (e.g. "2026年05月15日")
  const translateDateString = (dateStr: string) => {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return dateStr;
      
      const years = parsed.getFullYear();
      const monthNum = String(parsed.getMonth() + 1).padStart(2, '0');
      const dayNum = String(parsed.getDate()).padStart(2, '0');
      
      return `${years}年${monthNum}月${dayNum}日`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-handwriting">
      {/* Month Carousel Navbar */}
      <section className="flex items-center justify-between py-1 bg-[var(--color-surface-bg)] sketch-border-sm px-1.5 select-none">
        <button
          onClick={() => handleMonthShift('prev')}
          disabled={selectedMonth === monthsList[0]}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all cursor-pointer"
          aria-label="Previous Month"
        >
          <ChevronLeft />
        </button>

        <div className="flex-grow flex items-center justify-center gap-1 sm:gap-4 text-xs sm:text-sm md:text-base font-bold px-1 min-w-0">
          {(() => {
            const idx = monthsList.indexOf(selectedMonth);
            const prev = idx > 0 ? monthsList[idx - 1] : null;
            const next = idx < monthsList.length - 1 ? monthsList[idx + 1] : null;
            return (
              <>
                {/* Previous month slot */}
                {prev ? (
                  <button
                    onClick={() => setSelectedMonth(prev)}
                    className="w-16 sm:w-20 text-center text-on-surface-variant opacity-40 hover:opacity-85 transition-opacity py-0.5 cursor-pointer truncate"
                  >
                    {prev}
                  </button>
                ) : (
                  <div className="w-16 sm:w-20" />
                )}

                {/* Selected month slot (Centered) */}
                <div className="w-20 sm:w-24 text-center text-primary scale-105 sm:scale-110 font-bold font-display relative py-0.5 shrink-0">
                  {selectedMonth}
                  <div className="absolute -bottom-1 left-1 right-1 h-[6px] sketchy-border-bottom" />
                </div>

                {/* Next month slot */}
                {next ? (
                  <button
                    onClick={() => setSelectedMonth(next)}
                    className="w-16 sm:w-20 text-center text-on-surface-variant opacity-40 hover:opacity-85 transition-opacity py-0.5 cursor-pointer truncate"
                  >
                    {next}
                  </button>
                ) : (
                  <div className="w-16 sm:w-20" />
                )}
              </>
            );
          })()}
        </div>

        <button
          onClick={() => handleMonthShift('next')}
          disabled={selectedMonth === monthsList[monthsList.length - 1]}
          className="p-2 text-on-surface-variant hover:text-on-surface hover:scale-110 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 transition-all cursor-pointer"
          aria-label="Next Month"
        >
          <ChevronRight />
        </button>
      </section>

      {/* Filter by Card/Cash */}
      <section className="relative -mt-2 mb-4">
        <select
          value={filterCardId}
          onChange={(e) => setFilterCardId(e.target.value)}
          className="w-full appearance-none border-2 border-outline rounded-md focus:border-primary focus:outline-none bg-white pl-4 pr-10 py-2.5 text-base font-bold font-sans text-center sketch-border-sm cursor-pointer"
        >
          <option value="all">全部消費</option>
          <option value="cash">現金 (Cash)</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name} (...{card.lastFour})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-on-surface-variant font-bold">
          <svg className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </section>

      {/* Summary Score Blocks */}
      <section className="flex flex-row sketch-border pencil-shadow overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform rounded-xl">
        {/* Total Expense */}
        <div className="flex-1 bg-[var(--color-surface-bg)] p-3 sm:p-4 relative border-r border-outline/30 min-w-0">
          <p className="text-xs sm:text-sm font-black text-on-surface-variant uppercase tracking-wider mb-1 truncate">
            當月總消費
          </p>
          <p className="text-lg sm:text-2xl font-bold font-display text-primary flex items-baseline gap-1 truncate">
            <span className="text-sm sm:text-xl font-sans">{currencySymbol}</span>
            <span className="text-xl sm:text-3xl font-sans truncate">{totalExpense.toLocaleString()}</span>
          </p>
          <div className="absolute bottom-1 right-2 sm:bottom-2 sm:right-3 opacity-15">
            <Layers size={32} className="text-primary sm:w-10 sm:h-10" />
          </div>
        </div>

        {/* Total Rewards points */}
        <div className="flex-1 bg-[var(--accent-bg)] p-3 sm:p-4 relative min-w-0">
          <p className="text-xs sm:text-sm font-black text-on-surface-variant uppercase tracking-wider mb-1 truncate">
            累計回饋點數
          </p>
          <p className="text-lg sm:text-2xl font-bold font-display text-primary flex items-baseline gap-1 truncate">
            <span className="text-xl sm:text-3xl font-sans truncate">{totalRewardsPoints.toLocaleString()}</span>
            <span className="text-xs sm:text-sm font-handwriting shrink-0">pts</span>
          </p>
          <div className="absolute bottom-1 right-2 sm:bottom-2 sm:right-3 opacity-15">
            <Coins size={32} className="text-primary sm:w-10 sm:h-10" />
          </div>
        </div>
      </section>

      {/* Transaction List / Card Spending Breakdown Container */}
      <section className="space-y-3 mt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <h3 className="text-md font-bold text-on-surface-variant border-l-4 border-outline pl-2.5">
            {contentView === 'list' ? '消費列表' : '卡片支出占比'}
          </h3>
          <span className="text-center text-sm font-bold text-on-surface-variant">
            共 <span className="font-sans text-primary">{filteredTransactions.length}</span> 筆
          </span>
          <button
            type="button"
            onClick={() => setContentView((view) => view === 'list' ? 'breakdown' : 'list')}
            className="ml-auto flex items-center gap-1 bg-white px-2 py-1 text-xs font-bold text-on-surface-variant sketch-border-sm cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            {contentView === 'list' ? <PieChart size={14} /> : <List size={14} />}
            {contentView === 'list' ? '卡片占比' : '消費列表'}
          </button>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-10 bg-white/30 border border-dashed border-[#75777d]/30 p-6 rounded-md">
            <p className="text-on-surface-variant text-sm font-bold">這個月度目前還沒有建立消費記錄唷！</p>
            <p className="text-outline text-xs mt-1">點選右上角 ＋，新增一筆消費紀錄。</p>
          </div>
        ) : contentView === 'list' ? (
          <div className="divide-y-2 divide-dashed divide-[#75777d]/20">
            {filteredTransactions.map((tx) => {
              const pairedCard = cards.find((c) => c.id === tx.cardId);
              const isCash = tx.cardId === 'cash';
              const calculatedPoints = pairedCard
                ? calculateTransactionReward(tx, pairedCard)
                : 0;

              return (
                <article
                  key={tx.id}
                  onClick={() => handleEditClick(tx)}
                  className="flex justify-between items-center py-4 group hover:bg-[#ece8d9]/20 px-2 rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Card image or cash badge */}
                    <div className="w-16 h-10 shrink-0 rounded-sm overflow-hidden sketch-border-sm bg-[var(--color-surface-container)] flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      {isCash ? (
                        <span className="text-xs font-bold text-on-surface-variant px-1 text-center leading-tight">現金</span>
                      ) : pairedCard?.cardImage ? (
                        <img src={pairedCard.cardImage} alt={pairedCard.name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <span className="text-[10px] font-bold text-on-surface-variant px-1 text-center leading-tight">{pairedCard?.bankCode}</span>
                      )}
                    </div>

                    <div className="text-left flex flex-col gap-1">
                      <div className="flex items-center gap-2 pr-2">
                        <p className="text-xl font-bold text-on-surface truncate">
                          {tx.merchant}
                        </p>
                      </div>
                      <div className="text-sm text-on-surface-variant font-sans flex items-center gap-1.5 flex-wrap">
                        <span>{translateDateString(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[22px] font-bold text-[#ba1a1a] font-sans leading-tight">
                      -{pairedCard?.currency || currencySymbol}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-sm font-bold text-secondary flex items-center justify-end gap-1 mt-0.5">
                      {!isCash && pairedCard && (
                        <span className="text-outline font-normal opacity-70 font-sans">
                          {getTransactionRewardRate(tx, pairedCard)}%
                        </span>
                      )}
                      <Coins size={14} className="text-[#765469]" />
                      <span>+{calculatedPoints} pts</span>
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4 bg-[var(--color-surface-container-low)]/20 p-4 sketch-border pencil-shadow rounded-xl">
            {(() => {
              const cx = 100;
              const cy = 100;
              const r = 86;
              let currentAngle = -Math.PI / 2; // Start from 12 o'clock

              const slices = paymentMethodSpends.map((item) => {
                const fraction = totalExpense > 0 ? item.totalAmount / totalExpense : 0;
                const sliceAngle = fraction * 2 * Math.PI;
                const startAngle = currentAngle;
                const endAngle = currentAngle + sliceAngle;
                const midAngle = startAngle + sliceAngle / 2;
                currentAngle = endAngle;

                const x1 = cx + r * Math.cos(startAngle);
                const y1 = cy + r * Math.sin(startAngle);
                const x2 = cx + r * Math.cos(endAngle);
                const y2 = cy + r * Math.sin(endAngle);
                const largeArc = sliceAngle > Math.PI ? 1 : 0;

                const labelRadius = r * 0.62;
                const lx = cx + labelRadius * Math.cos(midAngle);
                const ly = cy + labelRadius * Math.sin(midAngle);

                const pathData = paymentMethodSpends.length === 1
                  ? ''
                  : `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

                return {
                  ...item,
                  pathData,
                  lx,
                  ly,
                  fraction,
                };
              });

              return (
                <div className="space-y-5">
                  {/* Pizza-style Sliced Pie Chart */}
                  <div className="flex flex-col items-center justify-center pt-2">
                    <div className="relative w-52 h-52 sm:w-60 sm:h-60 filter drop-shadow-md">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {paymentMethodSpends.length === 1 ? (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill={paymentMethodSpends[0].color}
                            stroke="#ffffff"
                            strokeWidth="3"
                          />
                        ) : (
                          slices.map((slice) => (
                            <path
                              key={slice.id}
                              d={slice.pathData}
                              fill={slice.color}
                              stroke="#ffffff"
                              strokeWidth="2.5"
                              strokeLinejoin="round"
                              className="transition-all duration-300 hover:opacity-90 hover:brightness-105 cursor-pointer"
                            />
                          ))
                        )}

                        {/* Slice Percentage Labels */}
                        {slices.map((slice) => {
                          if (slice.percentage < 6) return null;
                          return (
                            <text
                              key={`label-${slice.id}`}
                              x={paymentMethodSpends.length === 1 ? cx : slice.lx}
                              y={paymentMethodSpends.length === 1 ? cy + 4 : slice.ly + 4}
                              textAnchor="middle"
                              fill="#ffffff"
                              className="text-xs sm:text-sm font-bold font-sans select-none pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                            >
                              {slice.percentage.toFixed(0)}%
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Total Summary Info Banner below Pizza Chart */}
                    <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-white/80 sketch-border-sm text-xs font-bold text-on-surface-variant">
                      <span>當月總支出</span>
                      <span className="font-sans text-primary font-bold text-sm">
                        {currencySymbol}{totalExpense.toLocaleString()}
                      </span>
                      <span className="opacity-40">•</span>
                      <span>{paymentMethodSpends.length} 種支付方式</span>
                    </div>
                  </div>

                  {/* Card Breakdown List */}
                  <div className="w-full space-y-2.5">
                    {paymentMethodSpends.map((item) => {
                      const isCash = item.id === 'cash';
                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-white/90 rounded-md sketch-border-sm space-y-2 hover:bg-white transition-all shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-black/10"
                                style={{ backgroundColor: item.color }}
                              />
                              <div className="w-10 h-6 shrink-0 rounded-sm overflow-hidden sketch-border-sm bg-[var(--color-surface-container)] flex items-center justify-center">
                                {isCash ? (
                                  <span className="text-[10px] font-bold text-on-surface-variant">現金</span>
                                ) : item.cardImage ? (
                                  <img src={item.cardImage} alt={item.name} className="w-full h-full object-contain p-0.5" />
                                ) : (
                                  <span className="text-[9px] font-bold text-on-surface-variant">{item.bankCode}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                                  {item.name}
                                  {!isCash && item.lastFour && (
                                    <span className="text-xs text-on-surface-variant font-sans ml-1 font-normal">
                                      (*{item.lastFour})
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-on-surface-variant font-sans">
                                  {item.txCount} 筆消費
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm sm:text-base font-bold text-[#ba1a1a] font-sans leading-tight">
                                -{currencySymbol}{item.totalAmount.toLocaleString()}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 text-xs mt-0.5">
                                <span className="font-sans font-bold px-1.5 py-0.2 rounded bg-black/5 text-on-surface-variant">
                                  {item.percentage.toFixed(1)}%
                                </span>
                                {item.earnedPoints > 0 && (
                                  <span className="text-secondary font-bold font-sans flex items-center gap-0.5">
                                    <Coins size={11} className="text-[#765469]" />
                                    +{item.earnedPoints} pts
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 p-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(item.percentage, 2)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {transactionPendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-24 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setTransactionPendingDelete(null)}
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
                <h3 className="font-display text-lg font-bold text-[#ba1a1a]">確定刪除消費紀錄？</h3>
                <p className="mt-2 text-sm font-bold text-on-surface">
                  {transactionPendingDelete.merchant}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  金額 {currencySymbol} {transactionPendingDelete.amount.toLocaleString()}，刪除後無法復原。
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-dashed border-[#75777d]/30 pt-4">
              <button
                type="button"
                onClick={() => setTransactionPendingDelete(null)}
                className="px-4 py-2 sketch-border-sm bg-[var(--color-surface-bg)] hover:bg-[var(--color-surface-variant)] text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(transactionPendingDelete.id);
                  setTransactionPendingDelete(null);
                  handleCloseModal();
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

      {/* Add Transaction Popup Modal */}
      {isAddingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-[#1c1c13]/60 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-[var(--color-surface-bg)] sketch-border sketch-shadow w-full max-w-sm max-h-[85vh] flex flex-col p-6 transform scale-100 transition-all duration-300 relative rotate-card-1"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold text-primary mb-4 border-b border-outline border-dashed pb-2 shrink-0">
              {editingTransaction ? '修改消費紀錄' : '記錄新消費'}
            </h3>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-left overflow-y-auto pr-2 pb-2">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  日期 *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-base font-sans cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  消費項目 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 早餐, 衣服"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 font-handwriting py-1 text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  交易金額 *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="ex: 1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 font-handwriting py-1 text-base font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  扣款 *
                </label>
                <select
                  required
                  value={cardId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setCardId(newId);
                    const targetCard = cards.find(c => c.id === newId);
                    setRewardScenarioId(targetCard?.rewardScenarios?.[0]?.id || '');
                  }}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-base cursor-pointer"
                >
                  <option value="cash">
                    現金（餘額 {currencySymbol} {cashBalance.toLocaleString()}）
                  </option>
                  {sortedCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.isFavorite ? '♥ ' : ''}({c.bankCode}) {c.bankName} - {c.name} (...{c.lastFour})
                    </option>
                  ))}
                </select>
              </div>

              {cardId !== 'cash' && rewardScenarios.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">
                    消費方式 *
                  </label>
                  <select
                    value={activeScenarioId}
                    onChange={(e) => setRewardScenarioId(e.target.value)}
                    className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-base cursor-pointer"
                  >
                    {rewardScenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label}（最高 {scenario.rate}%）
                      </option>
                    ))}
                  </select>
                  {(() => {
                    if (!selectedScenario) return null;
                    const card = cards.find(c => c.id === cardId);

                    // Filter out trivial "just spend" conditions
                    const TRIVIAL_CONDITIONS = [
                      '當月有消費、不限金額',
                      '需消費',
                      '不限金額',
                    ];
                    const realConditions = (selectedScenario.conditions ?? []).filter(
                      (c) => !TRIVIAL_CONDITIONS.includes(c.trim())
                    );

                    // Build a list of displayable rows combining components with conditions
                    const components = selectedScenario.components ?? [];

                    type Row = { key: string; label: string; rate: number };

                    // Separate exclusive (radio), additive (checkbox), base (always counted)
                    const exclusiveRows: Row[] = [];
                    let additiveRows: Row[] = [];
                    let baseRate = 0;

                    if (components.length > 0) {
                      // Check if any component is marked exclusive
                      const hasExclusive = components.some((c) => c.exclusive);
                      components.forEach((comp, i) => {
                        const key = `${selectedScenario.id}-comp-${i}`;
                        if (comp.exclusive) {
                          exclusiveRows.push({ key, label: comp.description, rate: comp.rate });
                        } else if (!hasExclusive && (comp.unlimited !== true && i !== components.length - 1)) {
                          additiveRows.push({ key, label: comp.description, rate: comp.rate });
                        } else if (comp.unlimited === true || (!hasExclusive && i === components.length - 1)) {
                          baseRate += comp.rate;
                        }
                      });
                    } else {
                      // Condition-based (no components)
                      additiveRows = realConditions.map((cond) => ({
                        key: `${selectedScenario.id}-${cond}`,
                        label: cond,
                        rate: selectedScenario.rate,
                      }));
                    }

                    const hasExclusiveRows = exclusiveRows.length > 0;
                    const hasAdditiveRows = additiveRows.length > 0;
                    const checkedKeys = card?.achievedConditions ?? [];

                    // For exclusive: default to the first/highest exclusive row if none checked yet
                    const foundExclusiveKey = exclusiveRows.map((r) => r.key).find((k) => checkedKeys.includes(k));
                    const selectedExclusiveKey = foundExclusiveKey || exclusiveRows[0]?.key || null;
                    const exclusiveRate = exclusiveRows.find((r) => r.key === selectedExclusiveKey)?.rate ?? 0;
                    const additiveRate = additiveRows.reduce((sum, row) => checkedKeys.includes(row.key) ? sum + row.rate : sum, 0);
                    const currentRate = baseRate + exclusiveRate + additiveRate;

                    return (
                      <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-on-surface-variant">
                        {selectedScenario.limit && (
                          <div className="text-[#846b12]">
                            <span className="font-bold">上限：</span>
                            {selectedScenario.limit}
                          </div>
                        )}

                        {/* Exclusive (radio) rows — mutually exclusive modes */}
                        {hasExclusiveRows && card && onUpdateCard && (
                          <div className="mt-2 border border-[#75777d]/20 rounded-sm overflow-hidden">
                            <p className="font-bold text-on-surface text-xs bg-[var(--color-surface-container-low)] px-2.5 py-1.5 border-b border-[#75777d]/20">
                              選擇回饋模式（擇一）：
                            </p>
                            {exclusiveRows.map((row, idx) => {
                              const isSelected = selectedExclusiveKey === row.key;
                              return (
                                <label
                                  key={row.key}
                                  className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors ${
                                    idx < exclusiveRows.length - 1 ? 'border-b border-[#75777d]/10' : ''
                                  } ${isSelected ? 'bg-[var(--accent-bg)]/20' : 'hover:bg-[#75777d]/5'}`}
                                >
                                  <input
                                    type="radio"
                                    name={`exclusive-${selectedScenario.id}`}
                                    className="w-4 h-4 accent-primary shrink-0 cursor-pointer"
                                    checked={isSelected}
                                    onChange={() => {
                                      const current = (card.achievedConditions || []).filter(
                                        (k) => !exclusiveRows.some((r) => r.key === k)
                                      );
                                      onUpdateCard({ ...card, achievedConditions: [...current, row.key] });
                                    }}
                                  />
                                  <span className={`flex-1 text-xs leading-snug ${isSelected ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                                    {row.label}
                                  </span>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold font-sans border ${
                                    isSelected
                                      ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border-black/10'
                                      : 'bg-white/60 text-on-surface-variant border-[#75777d]/20'
                                  }`}>
                                    +{row.rate}%
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Additive (checkbox) rows */}
                        {hasAdditiveRows && card && onUpdateCard && (
                          <div className="mt-2 border border-[#75777d]/20 rounded-sm overflow-hidden">
                            <p className="font-bold text-on-surface text-xs bg-[var(--color-surface-container-low)] px-2.5 py-1.5 border-b border-[#75777d]/20">
                              勾選達成的加成條件：
                            </p>
                            {additiveRows.map((row, idx) => {
                              const isChecked = checkedKeys.includes(row.key);
                              return (
                                <label
                                  key={row.key}
                                  className={`flex items-center gap-2 px-2.5 py-2 cursor-pointer transition-colors ${
                                    idx < additiveRows.length - 1 ? 'border-b border-[#75777d]/10' : ''
                                  } ${isChecked ? 'bg-[var(--accent-bg)]/20' : 'hover:bg-[#75777d]/5'}`}
                                >
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded-sm border-outline accent-primary shrink-0 cursor-pointer"
                                    checked={isChecked}
                                    onChange={() => {
                                      const current = card.achievedConditions || [];
                                      const newConditions = current.includes(row.key)
                                        ? current.filter(c => c !== row.key)
                                        : [...current, row.key];
                                      onUpdateCard({ ...card, achievedConditions: newConditions });
                                    }}
                                  />
                                  <span className={`flex-1 text-xs leading-snug ${isChecked ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                                    {row.label}
                                  </span>
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold font-sans border ${
                                    isChecked
                                      ? 'bg-[var(--accent-bg)] text-[var(--accent-text)] border-black/10'
                                      : 'bg-white/60 text-on-surface-variant border-[#75777d]/20'
                                  }`}>
                                    +{row.rate}%
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 px-2.5 py-2 bg-[var(--accent-bg)] text-[var(--accent-text)] rounded-sm border border-black/10 shadow-sm">
                          <span className="text-xs font-bold">預估回饋</span>
                          <span className="text-base font-bold font-sans">{Math.round(currentRate * 100) / 100}%</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#75777d]/20 mt-4">
                {editingTransaction ? (
                  <button
                    type="button"
                    onClick={() => setTransactionPendingDelete(editingTransaction)}
                    className="flex items-center gap-1.5 px-3 py-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-sm text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                    刪除
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 sketch-border-sm hover:bg-[#ece8d9] text-xs font-bold cursor-pointer"
                    onClick={handleCloseModal}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 sketch-border-sm bg-[var(--accent-bg)] text-[var(--accent-text)] hover:brightness-95 text-xs font-bold pencil-shadow cursor-pointer"
                  >
                    {editingTransaction ? '確認修改' : '建立消費紀錄'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
