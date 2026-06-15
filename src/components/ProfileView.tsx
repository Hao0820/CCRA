/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AccentColor, Card, Transaction } from '../types';
import { ACCENT_COLORS } from '../theme';
import {
  Banknote,
  Cloud,
  LogIn,
  LogOut,
  Palette,
  UserRound,
  Wallet,
} from 'lucide-react';
import { calculateTransactionReward } from '../rewardUtils';

interface ProfileViewProps {
  cards: Card[];
  transactions: Transaction[];
  budgetLimit: number;
  onUpdateBudget: (limit: number) => void;
  ledgerName: string;
  onUpdateLedgerName: (name: string) => void;
  currencySymbol: string;
  cashBalance: number;
  onUpdateCashBalance: (amount: number) => void;
  accentColor: AccentColor;
  onUpdateAccentColor: (color: AccentColor) => void;
  authUserName?: string;
  authPictureUrl?: string;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError?: string;
  onLineLogin: () => void;
  onSignOut: () => void;
}

export default function ProfileView({
  cards,
  transactions,
  budgetLimit,
  onUpdateBudget,
  ledgerName,
  onUpdateLedgerName,
  currencySymbol,
  cashBalance,
  onUpdateCashBalance,
  accentColor,
  onUpdateAccentColor,
  authUserName,
  authPictureUrl,
  isAuthenticated,
  authLoading,
  authError,
  onLineLogin,
  onSignOut,
}: ProfileViewProps) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(budgetLimit));
  
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(ledgerName);
  const [editingCash, setEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState(String(cashBalance));

  const totalSpentAllTime = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPointsAllTime = transactions.reduce((sum, tx) => {
    const card = cards.find((item) => item.id === tx.cardId);
    return sum + calculateTransactionReward(tx, card);
  }, 0);

  // Group spends by category
  const categorySpends: { [key: string]: number } = {
    shopping: 0,
    dining: 0,
    transport: 0,
    entertainment: 0,
    medical: 0,
    social: 0,
    home: 0,
    other: 0,
  };
  transactions.forEach((tx) => {
    if (categorySpends[tx.category] !== undefined) {
      categorySpends[tx.category] += tx.amount;
    } else {
      categorySpends['other'] += tx.amount;
    }
  });

  const categoryLabels: { [key: string]: string } = {
    shopping: '🛒 購物明細',
    dining: '🍴 美食饗宴',
    transport: '🚇 交通通勤',
    entertainment: '✨ 娛樂休閒',
    medical: '🩺 醫療保健',
    social: '🤝 人情往來',
    home: '🏠 居家生活',
    other: '❤️ 日常雜支',
  };

  // Pre-selected category color themes for layout bars
  const categoryColors: { [key: string]: string } = {
    shopping: 'bg-[#c3ecd7]',
    dining: 'bg-[#d9e3f7]',
    transport: 'bg-[#ece8d9]',
    entertainment: 'bg-[#fdd0ea]',
    medical: 'bg-[#ffdad6]',
    social: 'bg-[#ffe2b8]',
    home: 'bg-[#d5e3ff]',
    other: 'bg-[#fcf5c7]',
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Number(budgetInput);
    if (!isNaN(limit) && limit >= 0) {
      onUpdateBudget(limit);
      setEditingBudget(false);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateLedgerName(nameInput.trim());
      setEditingName(false);
    }
  };

  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(cashInput);
    if (Number.isFinite(amount)) {
      onUpdateCashBalance(amount);
      setEditingCash(false);
    }
  };

  // Determine budget percentage
  const budgetPercent = budgetLimit > 0 ? (totalSpentAllTime / budgetLimit) * 100 : 0;
  const clampedPercent = Math.min(Math.max(budgetPercent, 0), 100);

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
                <Cloud size={21} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface-variant">
                LINE 帳號與雲端同步
              </p>
              <p className="truncate text-sm font-bold text-primary">
                {isAuthenticated
                  ? `${authUserName || 'LINE 使用者'}，資料已連結 Supabase`
                  : '登入後可跨裝置保存信用卡與消費資料'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={authLoading}
            onClick={isAuthenticated ? onSignOut : onLineLogin}
            className={`flex shrink-0 items-center gap-1 px-3 py-2 text-xs font-bold sketch-border-sm transition-opacity ${
              isAuthenticated
                ? 'bg-white text-[#ba1a1a]'
                : 'bg-[#06c755] text-white'
            } disabled:cursor-wait disabled:opacity-50`}
          >
            {isAuthenticated ? <LogOut size={14} /> : <LogIn size={14} />}
            {authLoading ? '處理中' : isAuthenticated ? '登出' : 'LINE 登入'}
          </button>
        </div>
        {authError && (
          <p className="mt-3 border-t border-dashed border-[#ba1a1a]/30 pt-2 text-xs font-bold text-[#ba1a1a]">
            {authError}
          </p>
        )}
      </section>

      <section className="bg-white/60 p-4 sketch-border pencil-shadow">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e1e2e5] sketch-border-sm">
              <UserRound size={20} className="text-[#5f6368]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface-variant">用戶名稱</p>
              {editingName ? (
                <form onSubmit={handleSaveName} className="mt-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="min-w-0 flex-1 border-b-2 border-outline bg-transparent py-0.5 text-sm font-bold focus:border-primary focus:outline-none"
                  />
                  <button type="submit" className="text-xs font-bold text-[#294e3f]">儲存</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-xs text-[#ba1a1a]">取消</button>
                </form>
              ) : (
                <p className="truncate text-lg font-bold text-primary font-display">{ledgerName}</p>
              )}
            </div>
          </div>
          {!editingName && (
            <button
              onClick={() => {
                setNameInput(ledgerName);
                setEditingName(true);
              }}
              className="shrink-0 text-xs font-bold text-secondary underline"
            >
              編輯
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-[#75777d]/30 pt-4">
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
                  <button type="submit" className="text-xs font-bold text-[#294e3f]">儲存</button>
                  <button type="button" onClick={() => setEditingCash(false)} className="text-xs text-[#ba1a1a]">取消</button>
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
              className="shrink-0 text-xs font-bold text-secondary underline"
            >
              編輯
            </button>
          )}
        </div>
      </section>

      {/* Ledger Profile Details */}
      <section className="bg-surface-container-low p-5 sketch-border pencil-shadow space-y-4">
        {/* Budget Manager */}
        <div>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            當月消費預算警示線
          </p>

          {editingBudget ? (
            <form onSubmit={handleSaveBudget} className="flex gap-2 items-center mb-2">
              <span className="font-sans font-bold text-sm">{currencySymbol}</span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="border-b-2 border-outline focus:outline-none bg-transparent font-sans py-0.5 font-bold w-24 text-sm"
              />
              <button type="submit" className="text-xs bg-[#c3ecd7] sketch-border-sm px-2 py-0.5 font-bold">確認</button>
              <button type="button" onClick={() => setEditingBudget(false)} className="text-xs text-[#ba1a1a]">取消</button>
            </form>
          ) : (
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-md font-bold text-on-surface">
                預算上限: <span className="font-sans font-bold">{currencySymbol} {budgetLimit.toLocaleString()}</span>
              </span>
              <button onClick={() => setEditingBudget(true)} className="text-xs underline text-secondary cursor-pointer hover:font-bold">設定預算</button>
            </div>
          )}

          {/* Sketchy progress-bar */}
          <div className="w-full h-5 rounded-full border-2 border-outline bg-white overflow-hidden relative p-0.5">
            <div
              className="h-full rounded-full bg-[var(--accent-bg)] transition-all duration-500 sketch-border-sm"
              style={{ width: `${clampedPercent}%` }}
            />
            <span className="absolute inset-0 text-[10px] font-sans font-bold flex items-center justify-center text-primary">
              目前已支配 {budgetPercent.toFixed(1)}% 的預算
            </span>
          </div>
        </div>

        {/* Ledger general Stats */}
        <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold text-on-surface-variant border-t border-dashed border-[#75777d]/30">
          <div>
            <p>歷史記帳筆數：<span className="font-sans text-primary text-sm underline">{transactions.length}</span> 筆</p>
            <p>歷史消費額累加：<span className="font-sans text-[#ba1a1a] text-sm">{currencySymbol} {totalSpentAllTime.toLocaleString()}</span></p>
          </div>
          <div>
            <p>持卡數量：<span className="font-sans text-primary text-sm underline">{cards.length}</span> 張</p>
            <p>總累積點數：<span className="font-sans text-secondary text-sm">{totalPointsAllTime.toLocaleString()}</span> pts</p>
          </div>
        </div>
      </section>

      {/* Spend breakdown by Category card */}
      <section className="bg-[#fcf5c7]/20 p-5 sketch-border pencil-shadow space-y-4">
        <h3 className="font-display text-md font-bold text-primary flex items-center gap-1.5 border-b border-[#75777d]/20 pb-2">
          <Wallet size={16} />
          <span>支出類別占比 (All Time Breakdown)</span>
        </h3>

        {totalSpentAllTime === 0 ? (
          <p className="text-xs text-outline italic text-center py-2">目前尚無足夠的交易紀錄可統計占比。</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(categorySpends).map(([catKey, total]) => {
              const share = totalSpentAllTime > 0 ? (total / totalSpentAllTime) * 100 : 0;
              const barBg = categoryColors[catKey] || 'bg-[#fcf5c7]';
              if (total === 0) return null;

              return (
                <div key={catKey} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold font-sans">
                    <span>{categoryLabels[catKey]}</span>
                    <span>
                      {currencySymbol} {total.toLocaleString()} ({share.toFixed(0)}%)
                    </span>
                  </div>

                  {/* Sketched Bar component */}
                  <div className="w-full h-3 border border-outline bg-white rounded-md overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-sm ${barBg} transition-all duration-500`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
