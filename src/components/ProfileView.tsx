/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Card, Transaction } from '../types';
import {
  Banknote,
  CreditCard,
  LogOut,
  Palette,
  RefreshCw,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { calculateTransactionReward } from '../rewardUtils';

interface ProfileViewProps {
  cards: Card[];
  transactions: Transaction[];
  currencySymbol: string;
  cashBalance: number;
  onUpdateCashBalance: (amount: number) => void;
  selectedMonth: string;
  authUserName?: string;
  authPictureUrl?: string;
  authError?: string;
  syncStatus: 'loading' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  lastSyncedAt?: Date | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRetrySync: () => void;
  onSignOut: () => void;
}

export default function ProfileView({
  cards,
  transactions,
  currencySymbol,
  cashBalance,
  onUpdateCashBalance,
  selectedMonth,
  authUserName,
  authPictureUrl,
  authError,
  syncStatus,
  syncError,
  lastSyncedAt,
  isDarkMode,
  onToggleDarkMode,
  onRetrySync,
  onSignOut,
}: ProfileViewProps) {
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashBalance));

  const currentMonthStr = `${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const selectedMonthTransactions = transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7).replace('-', '/') === currentMonthStr,
  );
  const selectedMonthCardSpent = selectedMonthTransactions
    .filter((transaction) => transaction.cardId !== 'cash')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const selectedMonthPoints = selectedMonthTransactions.reduce(
    (sum, transaction) => {
      const card = cards.find((item) => item.id === transaction.cardId);
      return sum + calculateTransactionReward(transaction, card);
    },
    0,
  );

  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(cashInput);
    if (Number.isFinite(amount)) {
      onUpdateCashBalance(amount);
      setEditingCash(false);
    }
  };

  React.useEffect(() => {
    setCashInput(String(cashBalance));
  }, [cashBalance]);

  const bankCreditLimits = cards.reduce<Map<string, number>>((limits, card) => {
    const bankKey = card.bankCode || card.bankName;
    const currentLimit = limits.get(bankKey) ?? 0;
    limits.set(bankKey, Math.max(currentLimit, Number(card.creditLimit) || 0));
    return limits;
  }, new Map());
  const totalCreditLimit = Array.from(bankCreditLimits.values()).reduce(
    (sum, limit) => sum + limit,
    0,
  );
  const creditUsagePercent =
    totalCreditLimit > 0 ? (selectedMonthCardSpent / totalCreditLimit) * 100 : 0;
  const clampedCreditUsage = Math.min(Math.max(creditUsagePercent, 0), 100);
  const syncLabel = {
    loading: '正在載入雲端資料...',
    syncing: '正在同步變更...',
    synced: lastSyncedAt
      ? `已同步 ${lastSyncedAt.toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      : '已同步至雲端',
    error: '同步失敗，資料尚未上傳',
  }[syncStatus];

  return (
    <div className="space-y-6 font-sans text-left">
      <section className="glass-panel p-5 rounded-xl shadow-[var(--shadow-glow)] border border-[var(--border-glow)] ">
        <h3 className="font-display text-base font-bold text-[var(--text-[var(--accent-primary)])] flex items-center gap-1.5 border-b border-[#75777d]/20 pb-2 mb-3">
          <User size={18} />
          <span>帳號資訊</span>
        </h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {authPictureUrl ? (
              <img
                src={authPictureUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover glass-panel"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#06c755] text-white glass-panel">
                <span className="text-lg font-bold">L</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                LINE 帳號與雲端同步
              </p>
              <p className="truncate text-base font-bold text-[var(--text-[var(--accent-primary)])]">
                {authUserName || 'LINE 使用者'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {syncLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="flex shrink-0 items-center gap-1 bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--accent-error)] glass-panel"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
        {(authError || syncError) && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[var(--accent-error)]/30 pt-2">
            <p className="text-xs font-bold text-[var(--accent-error)]">
              {syncError || authError}
            </p>
            {syncStatus === 'error' && (
              <button
                type="button"
                onClick={onRetrySync}
                className="flex shrink-0 items-center gap-1 bg-[var(--bg-card)] px-2 py-1 text-xs font-bold text-[var(--accent-error)] glass-panel"
              >
                <RefreshCw size={13} />
                重試
              </button>
            )}
          </div>
        )}
      </section>

      <section className="glass-panel p-5 rounded-xl shadow-[var(--shadow-glow)] border border-[var(--border-glow)] ">
        <h3 className="font-display text-base font-bold text-[var(--text-[var(--accent-primary)])] flex items-center gap-1.5 border-b border-[#75777d]/20 pb-2 mb-3">
          <Banknote size={18} />
          <span>現金餘額</span>
        </h3>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] hidden">現金餘額</p>
              {editingCash ? (
                <form onSubmit={handleSaveCash} className="mt-1 flex items-center gap-2">
                  <span className="text-base font-bold font-sans">{currencySymbol}</span>
                  <input
                    autoFocus
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="w-28 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-base font-bold font-sans focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                  <button type="submit" className="bg-[var(--accent-success)] text-white px-3 py-1 text-sm font-bold glass-panel">確認</button>
                  <button type="button" onClick={() => setEditingCash(false)} className="bg-[var(--bg-card)] px-3 py-1 text-sm font-bold glass-panel">取消</button>
                </form>
              ) : (
                <p className="text-xl font-bold text-[var(--text-[var(--accent-primary)])] font-sans">
                  {currencySymbol} {cashBalance.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          {!editingCash && (
            <button
              onClick={() => {
                setCashInput(String(cashBalance));
                setEditingCash(true);
              }}
              className="shrink-0 bg-[var(--bg-card)] px-3 py-1 text-sm font-bold glass-panel"
            >
              編輯
            </button>
          )}
        </div>
      </section>

      {/* Credit card limit summary */}
      <section className="glass-panel p-5 rounded-xl shadow-[var(--shadow-glow)] border border-[var(--border-glow)] space-y-4">
        <h3 className="font-display text-base font-bold text-[var(--text-[var(--accent-primary)])] flex items-center gap-1.5 border-b border-[#75777d]/20 pb-2 mb-3">
          <CreditCard size={18} />
          <span>信用卡</span>
        </h3>
        <div>
          <div className="mb-2 flex items-center justify-end gap-3">
            <span className="text-sm font-bold text-[var(--text-secondary)]">
              總額度：
              <span className="font-sans text-[var(--text-[var(--accent-primary)])]">
                {currencySymbol} {totalCreditLimit.toLocaleString()}
              </span>
            </span>
          </div>

          <div className="w-full h-5 rounded-full border-2 border-[var(--border-color)] bg-black/20 overflow-hidden relative p-0.5">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500 glass-panel"
              style={{ width: `${clampedCreditUsage}%` }}
            />
            <span className="absolute inset-0 text-xs font-sans font-bold flex items-center justify-center text-[var(--text-[var(--accent-primary)])]">
              {creditUsagePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-sm font-bold text-[var(--text-secondary)] border-t border-dashed border-[#75777d]/30">
          <div className="space-y-1">
            <p>本月刷卡：<span className="font-sans text-[var(--accent-error)] text-base">{currencySymbol} {selectedMonthCardSpent.toLocaleString()}</span></p>
            <p>剩餘額度：<span className="font-sans text-[var(--text-[var(--accent-primary)])] text-base">{currencySymbol} {Math.max(totalCreditLimit - selectedMonthCardSpent, 0).toLocaleString()}</span></p>
          </div>
          <div className="space-y-1">
            <p>持卡數量：<span className="font-sans text-[var(--text-[var(--accent-primary)])] text-base underline">{cards.length}</span> 張</p>
            <p>累積回饋點數：<span className="font-sans text-[var(--text-secondary)] text-base">{selectedMonthPoints.toLocaleString()}</span> pts</p>
          </div>
        </div>
      </section>
      <section className="glass-panel p-5 rounded-xl shadow-[var(--shadow-glow)] border border-[var(--border-glow)] space-y-5">
        <h3 className="font-display text-base font-bold text-[var(--text-[var(--accent-primary)])] flex items-center gap-1.5 border-b border-[var(--border-color)] pb-2 mb-3">
          <Palette size={18} />
          <span>個人化設定</span>
        </h3>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)] font-bold">
            日/夜間模式切換
          </p>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex items-center justify-center p-3 gap-2 rounded-md transition-all glass-panel bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
          >
            {isDarkMode ? (
              <span className="flex items-center gap-2"><Moon size={16} className="text-[var(--accent-primary)]" /> <span>深色模式</span></span>
            ) : (
              <span className="flex items-center gap-2"><Sun size={16} className="text-[var(--accent-gold)]" /> <span>淺色模式</span></span>
            )}
          </button>
        </div>
      </section>

      {/* Credits */}
      <footer className="text-center pt-4 text-xs text-[var(--text-muted)] font-sans font-bold">
        <p>Copyright © 2026 CCRA Inc</p>
      </footer>
    </div>
  );
}
