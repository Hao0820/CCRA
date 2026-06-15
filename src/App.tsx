/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AccentColor, Card, Transaction } from './types';
import { ACCENT_COLORS } from './theme';
import { INITIAL_CARDS, INITIAL_TRANSACTIONS } from './initialData';
import { Edit3, Plus, CreditCard, User } from 'lucide-react';
import CardsView from './components/CardsView';
import ExpensesView from './components/ExpensesView';
import ProfileView from './components/ProfileView';
import { CREDIT_CARD_CATALOG } from './creditCardCatalog';
import { isSupabaseConfigured, supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

function hydrateCardRewards(card: Card): Card {
  const catalogCard = CREDIT_CARD_CATALOG.find(
    (item) =>
      item.id === card.catalogCardId ||
      (item.bankName === card.bankName &&
        (item.cardName === card.name ||
          card.name.includes(item.cardName) ||
          item.cardName.includes(card.name))),
  );
  if (!catalogCard) return card;
  return {
    ...card,
    rewardRate: catalogCard.rewardRate,
    rewardDesc: catalogCard.rewardDescription,
    rewardLimitSummary: catalogCard.rewardLimitSummary,
    rewardTargetSpend: catalogCard.rewardTargetSpend,
    rewardScenarios: catalogCard.rewardScenarios,
  };
}

export default function App() {
  // Navigation State: 'expense' | 'cards' | 'profile'
  const [activeTab, setActiveTab] = useState<'expense' | 'cards' | 'profile'>('cards');

  // Ledger configuration
  const [ledgerName, setLedgerName] = useState('My Ledger');
  const [budgetLimit, setBudgetLimit] = useState(150000);
  const [cashBalance, setCashBalance] = useState(0);
  const [accentColor, setAccentColor] = useState<AccentColor>('pink');
  
  // Database States
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [preselectedExpenseCardId, setPreselectedExpenseCardId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState('');
  const [cloudReadyUserId, setCloudReadyUserId] = useState<string | null>(null);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    const finishLineLogin = async () => {
      const url = new URL(window.location.href);
      const tokenHash = url.searchParams.get('line_token_hash');
      const lineError = url.searchParams.get('line_error');

      if (lineError) setAuthError(lineError);
      if (tokenHash) {
        setAuthLoading(true);
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        if (error) setAuthError(error.message);
      }

      if (tokenHash || lineError) {
        url.searchParams.delete('line_token_hash');
        url.searchParams.delete('line_error');
        window.history.replaceState({}, '', url.toString());
      }

      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setAuthUser(data.session?.user ?? null);
        setAuthLoading(false);
      }
    };

    void finishLineLogin();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) setAuthUser(session?.user ?? null);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !authUser) {
      setCloudReadyUserId(null);
      return;
    }

    let cancelled = false;

    const loadCloudData = async () => {
      setAuthLoading(true);
      setAuthError('');

      const [profileResult, cardsResult, transactionsResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, monthly_budget, cash_balance, accent_color')
            .eq('id', authUser.id)
            .single(),
          supabase
            .from('user_cards')
            .select('card_data')
            .eq('user_id', authUser.id)
            .order('created_at'),
          supabase
            .from('transactions')
            .select('transaction_data')
            .eq('user_id', authUser.id)
            .order('transaction_date'),
        ]);

      const error =
        profileResult.error ?? cardsResult.error ?? transactionsResult.error;
      if (error) {
        if (!cancelled) {
          setAuthError(`雲端資料載入失敗：${error.message}`);
          setAuthLoading(false);
        }
        return;
      }

      const cloudCards = (cardsResult.data ?? [])
        .map((row) => row.card_data as Card)
        .filter((card) => card?.id)
        .map(hydrateCardRewards);
      const cloudTransactions = (transactionsResult.data ?? [])
        .map((row) => row.transaction_data as Transaction)
        .filter((transaction) => transaction?.id);
      const hasCloudLedger =
        cloudCards.length > 0 || cloudTransactions.length > 0;

      if (!cancelled && hasCloudLedger) {
        setCards(cloudCards);
        setTransactions(cloudTransactions);
        localStorage.setItem('my_ledger_cards', JSON.stringify(cloudCards));
        localStorage.setItem(
          'my_ledger_txs',
          JSON.stringify(cloudTransactions),
        );

        const profile = profileResult.data;
        const cloudName = profile.display_name || 'My Ledger';
        const cloudBudget = Number(profile.monthly_budget);
        const cloudCash = Number(profile.cash_balance);
        const cloudAccent = profile.accent_color as AccentColor;
        setLedgerName(cloudName);
        setBudgetLimit(cloudBudget);
        setCashBalance(cloudCash);
        if (ACCENT_COLORS[cloudAccent]) setAccentColor(cloudAccent);
        localStorage.setItem('my_ledger_name', cloudName);
        localStorage.setItem('my_ledger_budget', String(cloudBudget));
        localStorage.setItem('ccra_cash_balance', String(cloudCash));
        if (ACCENT_COLORS[cloudAccent]) {
          localStorage.setItem('ccra_accent_color', cloudAccent);
        }
      }

      if (!cancelled) {
        setCloudReadyUserId(authUser.id);
        setAuthLoading(false);
      }
    };

    void loadCloudData();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  useEffect(() => {
    if (!supabase || !authUser || cloudReadyUserId !== authUser.id) return;

    const timeout = window.setTimeout(() => {
      const syncCloudData = async () => {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authUser.id,
          display_name: ledgerName,
          monthly_budget: budgetLimit,
          cash_balance: cashBalance,
          accent_color: accentColor,
        }, { onConflict: 'id' });
        if (profileError) throw profileError;

        if (cards.length > 0) {
          const { error } = await supabase.from('user_cards').upsert(
            cards.map((card) => ({
              user_id: authUser.id,
              client_id: card.id,
              catalog_card_id: card.catalogCardId ?? card.id,
              last_four: card.lastFour,
              is_favorite: Boolean(card.isFavorite),
              card_data: card,
            })),
            { onConflict: 'user_id,client_id' },
          );
          if (error) throw error;
        }

        const { data: remoteCards, error: remoteCardsError } = await supabase
          .from('user_cards')
          .select('id, client_id')
          .eq('user_id', authUser.id);
        if (remoteCardsError) throw remoteCardsError;
        const cardDatabaseIds = new Map(
          (remoteCards ?? []).map((card) => [card.client_id, card.id]),
        );

        if (transactions.length > 0) {
          const { error } = await supabase.from('transactions').upsert(
            transactions.map((transaction) => {
              const card = cards.find(
                (item) => item.id === transaction.cardId,
              );
              const scenario = card?.rewardScenarios?.find(
                (item) => item.id === transaction.rewardScenarioId,
              );
              const isCash = transaction.cardId === 'cash';
              return {
                user_id: authUser.id,
                client_id: transaction.id,
                user_card_id: isCash
                  ? null
                  : cardDatabaseIds.get(transaction.cardId),
                payment_type: isCash ? 'cash' : 'card',
                merchant: transaction.merchant,
                transaction_date: transaction.date,
                amount: transaction.amount,
                category: transaction.category,
                reward_scenario_id: transaction.rewardScenarioId ?? null,
                reward_scenario_label: scenario?.label ?? null,
                reward_rate: scenario?.rate ?? card?.rewardRate ?? 0,
                reward_amount: transaction.pointsOverride ?? 0,
                transaction_data: transaction,
              };
            }),
            { onConflict: 'user_id,client_id' },
          );
          if (error) throw error;
        }

        const localTransactionIds = transactions.map((item) => item.id);
        let deleteTransactions = supabase
          .from('transactions')
          .delete()
          .eq('user_id', authUser.id);
        if (localTransactionIds.length > 0) {
          deleteTransactions = deleteTransactions.not(
            'client_id',
            'in',
            `(${localTransactionIds
              .map((id) => `"${id.replaceAll('"', '\\"')}"`)
              .join(',')})`,
          );
        }
        const { error: deleteTransactionsError } = await deleteTransactions;
        if (deleteTransactionsError) throw deleteTransactionsError;

        const localCardIds = cards.map((item) => item.id);
        let deleteCards = supabase
          .from('user_cards')
          .delete()
          .eq('user_id', authUser.id);
        if (localCardIds.length > 0) {
          deleteCards = deleteCards.not(
            'client_id',
            'in',
            `(${localCardIds
              .map((id) => `"${id.replaceAll('"', '\\"')}"`)
              .join(',')})`,
          );
        }
        const { error: deleteCardsError } = await deleteCards;
        if (deleteCardsError) throw deleteCardsError;
      };

      void syncCloudData().catch((error: unknown) => {
        setAuthError(
          `雲端同步失敗：${
            error instanceof Error ? error.message : '未知錯誤'
          }`,
        );
      });
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [
    accentColor,
    authUser,
    budgetLimit,
    cards,
    cashBalance,
    cloudReadyUserId,
    ledgerName,
    transactions,
  ]);

  // Load from LocalStorage or pre-fill
  useEffect(() => {
    const cachedCards = localStorage.getItem('my_ledger_cards');
    const cachedTransactions = localStorage.getItem('my_ledger_txs');
    const cachedName = localStorage.getItem('my_ledger_name');
    const cachedBudget = localStorage.getItem('my_ledger_budget');
    const cachedCash = localStorage.getItem('ccra_cash_balance');
    const cachedAccent = localStorage.getItem('ccra_accent_color') as AccentColor | null;

    if (cachedCards) {
      const hydratedCards = (JSON.parse(cachedCards) as Card[]).map(hydrateCardRewards);
      setCards(hydratedCards);
      localStorage.setItem('my_ledger_cards', JSON.stringify(hydratedCards));
    } else {
      setCards(INITIAL_CARDS);
      localStorage.setItem('my_ledger_cards', JSON.stringify(INITIAL_CARDS));
    }

    if (cachedTransactions) {
      setTransactions(JSON.parse(cachedTransactions));
    } else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem('my_ledger_txs', JSON.stringify(INITIAL_TRANSACTIONS));
    }

    if (cachedName) {
      setLedgerName(cachedName);
    }

    if (cachedBudget) {
      setBudgetLimit(Number(cachedBudget));
    }
    if (cachedCash) {
      setCashBalance(Number(cachedCash));
    }
    if (cachedAccent && ACCENT_COLORS[cachedAccent]) {
      setAccentColor(cachedAccent);
    }
  }, []);

  // Sync utilities
  const saveCards = (newCards: Card[]) => {
    setCards(newCards);
    localStorage.setItem('my_ledger_cards', JSON.stringify(newCards));
  };

  const saveTransactions = (newTxs: Transaction[]) => {
    setTransactions(newTxs);
    localStorage.setItem('my_ledger_txs', JSON.stringify(newTxs));
  };

  // Add Card action
  const handleAddCard = (newCard: Card) => {
    saveCards([...cards, newCard]);
  };

  const handleUpdateCard = (updatedCard: Card) => {
    saveCards(cards.map((card) => card.id === updatedCard.id ? updatedCard : card));
  };

  // Cascade Delete Card action
  const handleDeleteCard = (cardId: string) => {
    const updatedCards = cards.filter((c) => c.id !== cardId);
    saveCards(updatedCards);

    // Cascade delete any transactions bound to this card
    const updatedTxs = transactions.filter((tx) => tx.cardId !== cardId);
    saveTransactions(updatedTxs);
  };

  // Add Transaction action
  const handleAddTransaction = (newTx: Transaction) => {
    if (newTx.cardId === 'cash') {
      const nextCash = cashBalance - newTx.amount;
      setCashBalance(nextCash);
      localStorage.setItem('ccra_cash_balance', String(nextCash));
    }
    saveTransactions([...transactions, newTx]);
  };

  // Update Transaction action
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const previousTx = transactions.find((tx) => tx.id === updatedTx.id);
    let nextCash = cashBalance;
    if (previousTx?.cardId === 'cash') nextCash += previousTx.amount;
    if (updatedTx.cardId === 'cash') nextCash -= updatedTx.amount;
    if (nextCash !== cashBalance) {
      setCashBalance(nextCash);
      localStorage.setItem('ccra_cash_balance', String(nextCash));
    }
    saveTransactions(transactions.map((tx) => tx.id === updatedTx.id ? updatedTx : tx));
  };

  // Delete transaction action
  const handleDeleteTransaction = (txId: string) => {
    const transaction = transactions.find((tx) => tx.id === txId);
    if (transaction?.cardId === 'cash') {
      const nextCash = cashBalance + transaction.amount;
      setCashBalance(nextCash);
      localStorage.setItem('ccra_cash_balance', String(nextCash));
    }
    saveTransactions(transactions.filter((tx) => tx.id !== txId));
  };

  // Handle header title text depending on active tab
  const getHeaderTitleText = () => {
    switch (activeTab) {
      case 'expense':
        return '消費明細';
      case 'cards':
        return '信用卡';
      case 'profile':
        return '個人頁';
    }
  };

  // Determine dynamic top symbol behavior matching screens
  const handleQuickAddClick = () => {
    if (activeTab === 'expense') {
      setIsAddingExpense(true);
    } else if (activeTab === 'cards') {
      setIsAddingCard(true);
    }
  };

  // Get first currency symbol matching loaded setup or JPY/NTD
  const getDisplayCurrencySymbol = () => {
    if (cards.length > 0) {
      return cards[0].currency;
    }
    return 'NT$';
  };

  const accent = ACCENT_COLORS[accentColor];

  return (
    <div
      className="min-h-screen flex flex-col pt-20 pb-24 md:pb-8 max-w-screen-md mx-auto relative px-4"
      style={{
        '--accent-bg': accent.background,
        '--accent-text': accent.text,
      } as React.CSSProperties}
    >
      
      {/* TopAppBar - Notebook Head Line */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#fdf9e9] border-b-2 border-[#75777d] border-dashed px-4 py-3 shadow-sm select-none">
        <div className="flex justify-between items-center w-full max-w-screen-md mx-auto">
          {/* Symmetrical Left Spacer to keep title centered */}
          <div className="w-9 h-9" />

          {/* Centered book branding */}
          <div className="text-center">
            <h1 className="font-display text-[18px] font-bold text-primary tracking-tight">
              {getHeaderTitleText()}
            </h1>
          </div>

          {/* Quick Add button - Hide on profile tab */}
          {activeTab !== 'profile' ? (
            <button 
              onClick={handleQuickAddClick}
              className="text-on-surface-variant hover:bg-[var(--accent-bg)] transition-colors p-2 rounded-full active:scale-95 transition-transform cursor-pointer w-9 h-9 flex items-center justify-center"
              title={activeTab === 'expense' ? "新增消費" : "新增信用卡"}
            >
              <Plus size={20} className="text-[#75777d]" />
            </button>
          ) : (
            <div className="w-9 h-9" />
          )}
        </div>
      </header>

      {/* Main Pages Content Area */}
      <main className="flex-grow mt-4 w-full">
        {activeTab === 'cards' && (
          <CardsView
            cards={cards}
            transactions={transactions}
            onAddCard={handleAddCard}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            currencySymbol={getDisplayCurrencySymbol()}
            isAddingCard={isAddingCard}
            setIsAddingCard={setIsAddingCard}
            onAddExpenseForCard={(cardId) => {
              setPreselectedExpenseCardId(cardId);
              setActiveTab('expense');
              setIsAddingExpense(true);
            }}
          />
        )}

        {activeTab === 'expense' && (
          <ExpensesView
            cards={cards}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            currencySymbol={getDisplayCurrencySymbol()}
            isAddingExpense={isAddingExpense}
            setIsAddingExpense={setIsAddingExpense}
            selectedMonth={selectedExpenseMonth}
            setSelectedMonth={setSelectedExpenseMonth}
            cashBalance={cashBalance}
            initialCardId={preselectedExpenseCardId}
            onClearInitialCard={() => setPreselectedExpenseCardId(null)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            cards={cards}
            transactions={transactions}
            budgetLimit={budgetLimit}
            onUpdateBudget={(num) => {
              setBudgetLimit(num);
              localStorage.setItem('my_ledger_budget', String(num));
            }}
            ledgerName={ledgerName}
            onUpdateLedgerName={(name) => {
              setLedgerName(name);
              localStorage.setItem('my_ledger_name', name);
            }}
            currencySymbol={getDisplayCurrencySymbol()}
            cashBalance={cashBalance}
            onUpdateCashBalance={(amount) => {
              setCashBalance(amount);
              localStorage.setItem('ccra_cash_balance', String(amount));
            }}
            accentColor={accentColor}
            onUpdateAccentColor={(color) => {
              setAccentColor(color);
              localStorage.setItem('ccra_accent_color', color);
            }}
            authUserName={
              authUser?.user_metadata?.display_name ??
              authUser?.user_metadata?.name
            }
            authPictureUrl={authUser?.user_metadata?.picture_url}
            isAuthenticated={Boolean(authUser)}
            authLoading={authLoading}
            authError={authError}
            onLineLogin={() => {
              const loginUrl = import.meta.env.VITE_LINE_LOGIN_URL;
              if (!loginUrl) {
                setAuthError('尚未設定 LINE Login URL');
                return;
              }
              setAuthError('');
              const returnTo = `${window.location.origin}${window.location.pathname}`;
              window.location.assign(
                `${loginUrl}?return_to=${encodeURIComponent(returnTo)}`,
              );
            }}
            onSignOut={() => {
              if (!supabase) return;
              setAuthLoading(true);
              void supabase.auth.signOut().then(({ error }) => {
                setAuthError(error?.message ?? '');
                setAuthLoading(false);
              });
            }}
          />
        )}
      </main>

      {/* Bottom Sticky Tablet Navigator */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe bg-[#fdf9e9] border-t-2 border-[#75777d] border-dashed select-none">
        <div className="flex justify-around items-center h-20 px-4 w-full max-w-screen-md mx-auto">
          
          {/* Tab 1: Expense */}
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-15 cursor-pointer ${
              activeTab === 'expense'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] rounded-xl px-4 py-1.5 ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02]'
            }`}
          >
            <Edit3 size={18} className={activeTab === 'expense' ? 'mb-0.5' : 'mb-1'} />
            <span className="text-[12px] uppercase font-bold tracking-wider">
              消費
            </span>
          </button>

          {/* Tab 2: Cards */}
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-15 cursor-pointer ${
              activeTab === 'cards'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] rounded-xl px-4 py-1.5 ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02]'
            }`}
          >
            <CreditCard size={18} className={activeTab === 'cards' ? 'mb-0.5' : 'mb-1'} />
            <span className="text-[12px] uppercase font-bold tracking-wider">
              信用卡
            </span>
          </button>

          {/* Tab 3: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-15 cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] rounded-xl px-4 py-1.5 ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02]'
            }`}
          >
            <User size={18} className={activeTab === 'profile' ? 'mb-0.5' : 'mb-1'} />
            <span className="text-[12px] uppercase font-bold tracking-wider">
              個人頁
            </span>
          </button>

        </div>
      </nav>

    </div>
  );
}
