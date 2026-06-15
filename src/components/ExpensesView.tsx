/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, Transaction } from '../types';
import { calculateTransactionReward } from '../rewardUtils';
import { 
  Plus, 
  ShoppingCart, 
  Utensils, 
  Train, 
  Sparkles, 
  Coins, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  Calendar,
  Layers,
  Heart,
  HeartPulse,
  HandHeart,
  House,
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
  const [category, setCategory] = useState<Transaction['category']>('shopping');
  const [notes, setNotes] = useState('');
  const [contentView, setContentView] = useState<'list' | 'breakdown'>('list');

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
      setCardId(
        initialCardId && cards.some((card) => card.id === initialCardId)
          ? initialCardId
          : 'cash',
      );
      setRewardScenarioId('');
      setCategory('shopping');
      setNotes('');
    }
  }, [isAddingExpense, cards, initialCardId, today]);

  // Trigger editing popup
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setMerchant(tx.merchant);
    setAmount(String(tx.amount));
    setDate(tx.date);
    setCardId(tx.cardId);
    setRewardScenarioId(tx.rewardScenarioId || '');
    setCategory(tx.category);
    setNotes(tx.notes || '');

    setIsAddingExpense(true);
  };

  // Map of categories to style & Lucide icon
  const categoryConfig: {
    [key in Transaction['category']]: {
      icon: React.ComponentType<{ size: number; className?: string }>;
      bgClass: string;
      iconColor: string;
      label: string;
    };
  } = {
    shopping: { icon: ShoppingCart, bgClass: 'bg-[#c3ecd7]', iconColor: 'text-[#294e3f]', label: '購物購物' },
    dining: { icon: Utensils, bgClass: 'bg-[#d9e3f7]', iconColor: 'text-[#3d4757]', label: '美味餐飲' },
    transport: { icon: Train, bgClass: 'bg-[#ece8d9]', iconColor: 'text-[#44474c]', label: '交通通勤' },
    entertainment: { icon: Sparkles, bgClass: 'bg-[#fdd0ea]', iconColor: 'text-[#79576c]', label: '娛樂享樂' },
    medical: { icon: HeartPulse, bgClass: 'bg-[#ffdad6]', iconColor: 'text-[#ba1a1a]', label: '醫療保健' },
    social: { icon: HandHeart, bgClass: 'bg-[#ffe2b8]', iconColor: 'text-[#704d00]', label: '人情往來' },
    home: { icon: House, bgClass: 'bg-[#d5e3ff]', iconColor: 'text-[#344a72]', label: '居家生活' },
    other: { icon: Heart, bgClass: 'bg-[#fcf5c7]', iconColor: 'text-[#846b12]', label: '日常其他' },
  };

  // Convert "2026-05-15" to "2026/05" to group & filter
  const getTransactionMonthStr = (dateStr: string) => {
    // splits YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return '';
  };

  // Get filtered transactions matching the month
  const filteredTransactions = transactions
    .filter((tx) => getTransactionMonthStr(tx.date) === selectedMonth)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Compute Total Expense for the selected month (we can sum up directly or group by currency)
  const totalExpense = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const categorySpends = filteredTransactions.reduce<Record<Transaction['category'], number>>(
    (totals, transaction) => {
      totals[transaction.category] += transaction.amount;
      return totals;
    },
    {
      shopping: 0,
      dining: 0,
      transport: 0,
      entertainment: 0,
      medical: 0,
      social: 0,
      home: 0,
      other: 0,
    },
  );

  const sortedCards = React.useMemo(
    () => [...cards].sort((a, b) => Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite))),
    [cards],
  );
  const selectedPaymentCard = cards.find((card) => card.id === cardId);
  const rewardScenarios = selectedPaymentCard?.rewardScenarios ?? [];

  React.useEffect(() => {
    if (cardId === 'cash') {
      setRewardScenarioId('');
      return;
    }
    if (rewardScenarios.length > 0 && !rewardScenarios.some((item) => item.id === rewardScenarioId)) {
      setRewardScenarioId(rewardScenarios[0].id);
    }
  }, [cardId, rewardScenarioId, rewardScenarios]);

  // Compute Total Rewards (points) for the selected month
  const totalRewardsPoints = filteredTransactions.reduce((sum, tx) => {
    const cardObj = cards.find((c) => c.id === tx.cardId);
    if (!cardObj) return sum;
    return sum + calculateTransactionReward(tx, cardObj);
  }, 0);

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
    if (editingTransaction) {
      const updatedTx: Transaction = {
        ...editingTransaction,
        merchant: merchant.trim(),
        date,
        amount: amt,
        cardId,
        rewardScenarioId: cardId === 'cash' ? undefined : rewardScenarioId || undefined,
        category,
        notes: notes.trim() || undefined,
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
        rewardScenarioId: cardId === 'cash' ? undefined : rewardScenarioId || undefined,
        category,
        notes: notes.trim() || undefined,
        pointsOverride: undefined,
      };
      onAddTransaction(newTx);
    }

    handleCloseModal();
  };

  // Format date readable in Chinese/Taiwan style (e.g. "5月15日, 2026")
  const translateDateString = (dateStr: string) => {
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return dateStr;
      
      const years = parsed.getFullYear();
      const monthNum = String(parsed.getMonth() + 1).padStart(2, '0');
      const dayNum = String(parsed.getDate()).padStart(2, '0');
      
      // Translates YYYY-MM-DD back into Taiwan-friendly layout or standard format
      return `${years}年${monthNum}月${dayNum}日`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-handwriting">
      {/* Month Carousel Navbar */}
      <section className="flex items-center justify-between py-1 bg-[#fcf5c7]/30 sketch-border-sm px-1.5 select-none">
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

      {/* Summary Score Blocks */}
      <section className="flex gap-4 flex-col sm:flex-row">
        {/* Total Expense card */}
        <div className="flex-1 bg-surface-container-low p-4 sketch-border pencil-shadow transform -rotate-1 hover:rotate-0 transition-transform relative">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            當月總消費
          </p>
          <p className="text-2xl font-bold font-display text-primary flex items-baseline gap-1">
            <span className="text-xl font-sans">{currencySymbol}</span>
            <span className="text-3xl font-sans">{totalExpense.toLocaleString()}</span>
          </p>
          <div className="absolute bottom-2 right-3 opacity-15">
            <Layers size={40} className="text-primary" />
          </div>
        </div>

        {/* Total Rewards points card */}
        <div className="flex-1 bg-[var(--accent-bg)] p-4 sketch-border pencil-shadow transform rotate-1 hover:rotate-0 transition-transform relative">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            累計回饋點數
          </p>
          <p className="text-2xl font-bold font-display text-primary flex items-baseline gap-1.5">
            <span className="text-3xl font-sans">{totalRewardsPoints.toLocaleString()}</span>
            <span className="text-sm font-handwriting">pts / 點</span>
          </p>
          <div className="absolute bottom-2 right-3 opacity-15">
            <Coins size={40} className="text-primary" />
          </div>
        </div>
      </section>

      {/* Transaction List Container */}
      <section className="space-y-3 mt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <h3 className="text-md font-bold text-on-surface-variant border-l-4 border-outline pl-2.5">
            {contentView === 'list' ? '消費列表' : '支出類別占比'}
          </h3>
          <span className="text-center text-xs font-bold text-on-surface-variant">
            共 <span className="font-sans text-primary">{filteredTransactions.length}</span> 筆
          </span>
          <button
            type="button"
            onClick={() => setContentView((view) => view === 'list' ? 'breakdown' : 'list')}
            className="ml-auto flex items-center gap-1 bg-white px-2 py-1 text-xs font-bold text-on-surface-variant sketch-border-sm"
          >
            {contentView === 'list' ? <PieChart size={14} /> : <List size={14} />}
            {contentView === 'list' ? '類別占比' : '消費列表'}
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
              const rewardScenario = pairedCard?.rewardScenarios?.find(
                (item) => item.id === tx.rewardScenarioId,
              );
              const config = categoryConfig[tx.category] || categoryConfig['other'];
              const IconComp = config.icon;

              return (
                <article
                  key={tx.id}
                  onClick={() => handleEditClick(tx)}
                  className="flex justify-between items-center py-3.5 group hover:bg-[#ece8d9]/20 px-2 rounded-md transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {/* Circle icon */}
                    <div className={`w-11 h-11 rounded-full ${config.bgClass} flex items-center justify-center sketch-border-sm shadow-sm scale-95 group-hover:scale-100 transition-transform shrink-0`}>
                      <IconComp size={18} className={config.iconColor} />
                    </div>

                    <div className="text-left">
                      <p className="text-md font-bold text-on-surface line-clamp-1 pr-2">
                        {tx.merchant}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-on-surface-variant">
                        <span className="font-sans text-[11px]">
                          {translateDateString(tx.date)}
                        </span>
                        
                        {isCash ? (
                          <span className="px-1.5 py-0.25 sketch-border-sm scale-90 bg-[#fcf5c7] font-display text-[10px]">
                            現金
                          </span>
                        ) : pairedCard && (
                          <>
                            <span className={`px-1.5 py-0.25 sketch-border-sm scale-90 bg-white/60 font-display text-[10px]`}>
                              {pairedCard.name} ({pairedCard.lastFour})
                            </span>
                            {rewardScenario && (
                              <span className="text-[10px] font-bold text-secondary">
                                {rewardScenario.label} {rewardScenario.rate}%
                              </span>
                            )}
                          </>
                        )}

                        {tx.notes && (
                          <span className="italic text-outline opacity-80 max-w-[120px] line-clamp-1">
                            -{tx.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-[17px] font-bold text-[#ba1a1a] font-sans">
                        -{pairedCard?.currency || currencySymbol} {tx.amount.toLocaleString()}
                      </p>
                      <p className="text-xs font-bold text-secondary flex items-center justify-end gap-0.5">
                        <Coins size={12} className="text-[#765469]" />
                        <span>+{calculatedPoints} pts</span>
                      </p>
                    </div>

                    {/* Delete item directly */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTransactionPendingDelete(tx);
                      }}
                      className="text-outline/40 hover:text-[#ba1a1a] p-1 rounded-full hover:bg-neutral-200/50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="刪除交易"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 bg-[#fcf5c7]/20 p-4 sketch-border pencil-shadow">
            {Object.entries(categorySpends).map(([categoryKey, total]) => {
              if (total === 0) return null;
              const config = categoryConfig[categoryKey as Transaction['category']];
              const share = (total / totalExpense) * 100;

              return (
                <div key={categoryKey} className="space-y-1">
                  <div className="flex justify-between gap-3 text-xs font-bold">
                    <span>{config.label}</span>
                    <span className="font-sans">
                      {currencySymbol} {total.toLocaleString()} ({share.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-md border border-outline bg-white p-0.5">
                    <div
                      className={`h-full rounded-sm ${config.bgClass} transition-all duration-500`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {transactionPendingDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#1c1c13]/70 backdrop-blur-sm"
          onClick={() => setTransactionPendingDelete(null)}
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
                className="px-4 py-2 sketch-border-sm bg-white hover:bg-[#ece8d9] text-xs font-bold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(transactionPendingDelete.id);
                  setTransactionPendingDelete(null);
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c1c13]/60 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-[#fdf9e9] sketch-border sketch-shadow w-full max-w-sm max-h-[85vh] flex flex-col p-6 transform scale-100 transition-all duration-300 relative rotate-card-1"
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
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-sm font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  消費項目 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如 美聯社、星巴克"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 font-handwriting py-1 text-sm"
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
                  placeholder="120"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent placeholder-neutral-500 font-handwriting py-1 text-sm font-sans"
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
                    setCardId(e.target.value);
                    setRewardScenarioId('');
                  }}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-sm"
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
                    required
                    value={rewardScenarioId}
                    onChange={(e) => setRewardScenarioId(e.target.value)}
                    className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-sm"
                  >
                    {rewardScenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label}（{scenario.rate}%）
                      </option>
                    ))}
                  </select>
                  {rewardScenarios.find((item) => item.id === rewardScenarioId)?.description && (
                    <div className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-on-surface-variant">
                      <p>
                        <span className="font-bold text-on-surface">規則：</span>
                        {rewardScenarios.find((item) => item.id === rewardScenarioId)?.rule}
                      </p>
                      <p className="text-[#846b12]">
                        <span className="font-bold">上限：</span>
                        {rewardScenarios.find((item) => item.id === rewardScenarioId)?.limit}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  消費類別
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Transaction['category'])}
                  className="w-full border-b-2 border-outline focus:border-primary focus:outline-none bg-transparent font-handwriting py-1 text-sm"
                >
                  <option value="shopping">🛒 購物購物</option>
                  <option value="dining">🍴 美味餐飲</option>
                  <option value="transport">🚇 交通通勤</option>
                  <option value="entertainment">✨ 娛樂生活</option>
                  <option value="medical">🩺 醫療保健</option>
                  <option value="social">🤝 人情往來</option>
                  <option value="home">🏠 居家生活</option>
                  <option value="other">❤️ 日常其他</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 sketch-border-sm hover:bg-[#ece8d9] text-xs font-bold"
                  onClick={handleCloseModal}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 sketch-border-sm bg-[var(--accent-bg)] text-[var(--accent-text)] hover:brightness-95 text-xs font-bold pencil-shadow"
                >
                  {editingTransaction ? '確認修改' : '建立消費紀錄'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
