/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AccentColor, Card, Transaction } from '../types';
import { ACCENT_COLORS } from '../theme';
import {
  Banknote,
  CreditCard,
  LogOut,
  Palette,
  RefreshCw,
} from 'lucide-react';
import { calculateTransactionReward } from '../rewardUtils';

interface ProfileViewProps {
  cards: Card[];
  transactions: Transaction[];
  currencySymbol: string;
  cashBalance: number;
  onUpdateCashBalance: (amount: number) => void;
  accentColor: AccentColor;
  onUpdateAccentColor: (color: AccentColor) => void;
  selectedMonth: string;
  authUserName?: string;
  authPictureUrl?: string;
  authError?: string;
  syncStatus: 'loading' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  lastSyncedAt?: Date | null;
  onRetrySync: () => void;
  onSignOut: () => void;
}

export default function ProfileView({
  cards,
  transactions,
  currencySymbol,
  cashBalance,
  onUpdateCashBalance,
  accentColor,
  onUpdateAccentColor,
  selectedMonth,
  authUserName,
  authPictureUrl,
  authError,
  syncStatus,
  syncError,
  lastSyncedAt,
  onRetrySync,
  onSignOut,
}: ProfileViewProps) {
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashBalance));

  const selectedMonthTransactions = transactions.filter(
    (transaction) =>
      transaction.date.slice(0, 7).replace('-', '/') === selectedMonth,
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
    <div className="space-y-6 font-handwriting text-left">
      <section className="bg-[#c3ecd7]/35 p-4 sketch-border pencil-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {authPictureUrl ? (
              <img
                src={authPictureUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-full object-cover sketch-border-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#06c755] text-white sketch-border-sm">
                <span className="text-lg font-bold">L</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface-variant">
                LINE 帳號與雲端同步
              </p>
              <p className="truncate text-sm font-bold text-primary">
                {authUserName || 'LINE 使用者'}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {syncLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="flex shrink-0 items-center gap-1 bg-white px-3 py-2 text-xs font-bold text-[#ba1a1a] sketch-border-sm"
          >
            <LogOut size={14} />
            登出
          </button>
        </div>
        {(authError || syncError) && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[#ba1a1a]/30 pt-2">
            <p className="text-xs font-bold text-[#ba1a1a]">
              {syncError || authError}
            </p>
            {syncStatus === 'error' && (
              <button
                type="button"
                onClick={onRetrySync}
                className="flex shrink-0 items-center gap-1 bg-white px-2 py-1 text-xs font-bold text-[#ba1a1a] sketch-border-sm"
              >
                <RefreshCw size={13} />
                重試
              </button>
            )}
          </div>
        )}
      </section>

      <section className="bg-white/60 p-4 sketch-border pencil-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fcf5c7] sketch-border-sm">
              <Banknote size={20} className="text-[#846b12]" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant">現金餘額</p>
              {editingCash ? (
                <form onSubmit={handleSaveCash} className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-bold font-sans">{currencySymbol}</span>
                  <input
                    autoFocus
                    type="number"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    className="w-28 border-b-2 border-outline bg-transparent py-0.5 text-sm font-bold font-sans focus:border-primary focus:outline-none"
                  />
                  <button type="submit" className="bg-[#c3ecd7] px-2 py-0.5 text-xs font-bold sketch-border-sm">確認</button>
                  <button type="button" onClick={() => setEditingCash(false)} className="bg-white px-2 py-0.5 text-xs font-bold sketch-border-sm">取消</button>
                </form>
              ) : (
                <p className="text-lg font-bold text-primary font-sans">
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
              className="shrink-0 bg-white px-2 py-0.5 text-xs font-bold sketch-border-sm"
            >
              編輯
            </button>
          )}
        </div>
      </section>

      {/* Credit card limit summary */}
      <section className="bg-surface-container-low p-5 sketch-border pencil-shadow space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <CreditCard size={17} />
              信用卡
            </p>
            <span className="text-xs font-bold text-on-surface-variant">
              總額度：
              <span className="font-sans text-primary">
                {currencySymbol} {totalCreditLimit.toLocaleString()}
              </span>
            </span>
          </div>

          <div className="w-full h-5 rounded-full border-2 border-outline bg-white overflow-hidden relative p-0.5">
            <div
              className="h-full rounded-full bg-[var(--accent-bg)] transition-all duration-500 sketch-border-sm"
              style={{ width: `${clampedCreditUsage}%` }}
            />
            <span className="absolute inset-0 text-[10px] font-sans font-bold flex items-center justify-center text-primary">
              {creditUsagePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold text-on-surface-variant border-t border-dashed border-[#75777d]/30">
          <div>
            <p>本月刷卡：<span className="font-sans text-[#ba1a1a] text-sm">{currencySymbol} {selectedMonthCardSpent.toLocaleString()}</span></p>
            <p>剩餘額度：<span className="font-sans text-primary text-sm">{currencySymbol} {Math.max(totalCreditLimit - selectedMonthCardSpent, 0).toLocaleString()}</span></p>
          </div>
          <div>
            <p>持卡數量：<span className="font-sans text-primary text-sm underline">{cards.length}</span> 張</p>
            <p>累積回饋點數：<span className="font-sans text-secondary text-sm">{selectedMonthPoints.toLocaleString()}</span> pts</p>
          </div>
        </div>
      </section>

      <section className="bg-white/50 p-5 sketch-border pencil-shadow space-y-3">
        <h3 className="font-display text-md font-bold text-primary flex items-center gap-1.5 border-b border-[#75777d]/20 pb-2">
          <Palette size={16} />
          <span>輔色選擇</span>
        </h3>
        <p className="text-xs text-on-surface-variant">
          套用於目前選中的 TAB、主要操作按鈕與重點資訊。
        </p>
        <div className="grid grid-cols-5 gap-3">
          {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => {
            const palette = ACCENT_COLORS[color];
            return (
              <button
                key={color}
                type="button"
                onClick={() => onUpdateAccentColor(color)}
                aria-label={`選擇${color}輔色`}
                className="flex h-14 items-center justify-center rounded-sm border border-black/10 shadow-sm transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: palette.background }}
              >
                {accentColor === color && (
                  <span
                    className="h-3 w-3 rounded-full border border-black/20"
                    style={{ backgroundColor: palette.text }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Credits */}
      <footer className="text-center pt-4 text-[10px] text-outline font-handwriting">
        <p>Copyright © 2026 CCRA Inc</p>
      </footer>
    </div>
  );
}
