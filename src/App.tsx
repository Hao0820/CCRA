/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AccentColor, Card, Transaction } from './types';
import { ACCENT_COLORS } from './theme';
import { Edit3, Plus, CreditCard, User } from 'lucide-react';
import CardsView from './components/CardsView';
import ExpensesView from './components/ExpensesView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import {
  CreditCardCatalogItem,
  CreditCardCatalogIssuer,
  loadCreditCardCatalog,
} from './creditCardCatalog';
import {
  isSupabaseConfigured,
  LINE_LOGIN_URL,
  supabase,
} from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

type SyncStatus = 'loading' | 'syncing' | 'synced' | 'error';

function hydrateCardRewards(card: Card, catalog: CreditCardCatalogItem[]): Card {
  const catalogCard = catalog.find(
    (item) =>
      item.id === card.catalogCardId ||
      item.variants.some(
        (variant) =>
          variant.id === card.catalogVariantId ||
          variant.id === card.catalogCardId,
      ) ||
      (item.bankName === card.bankName &&
        (item.cardName === card.name ||
          card.name.includes(item.cardName) ||
          item.cardName.includes(card.name))),
  );
  if (!catalogCard) return card;
  const variant =
    catalogCard.variants.find(
      (item) =>
        item.id === card.catalogVariantId ||
        item.id === card.catalogCardId,
    ) ?? catalogCard.variants[0];
  return {
    ...card,
    catalogCardId: catalogCard.id,
    catalogVariantId: variant?.id,
    cardLevel: variant?.cardLevel,
    cardNetworks: variant?.cardNetworks,
    cardImage: variant?.imageUrl ?? card.cardImage ?? catalogCard.imageUrl,
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
  const [catalog, setCatalog] = useState<CreditCardCatalogItem[]>([]);
  const [catalogIssuers, setCatalogIssuers] = useState<CreditCardCatalogIssuer[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [catalogError, setCatalogError] = useState('');
  const [catalogRetryNonce, setCatalogRetryNonce] = useState(0);
  const [cloudRetryNonce, setCloudRetryNonce] = useState(0);
  const [syncRetryNonce, setSyncRetryNonce] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [syncError, setSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [uiTheme, setUiTheme] = useState<'sketch' | 'comic'>(() => {
    return (localStorage.getItem('ccra_ui_theme') as 'sketch' | 'comic') || 'sketch';
  });
  const lineDisplayName =
    authUser?.user_metadata?.display_name ??
    authUser?.user_metadata?.name ??
    'LINE 使用者';

  useEffect(() => {
    if (uiTheme === 'comic') {
      document.body.classList.add('theme-comic');
    } else {
      document.body.classList.remove('theme-comic');
    }
  }, [uiTheme]);

  useEffect(() => {
    [
      'my_ledger_cards',
      'my_ledger_txs',
      'my_ledger_name',
      'my_ledger_budget',
      'ccra_cash_balance',
      'ccra_accent_color',
    ].forEach((key) => localStorage.removeItem(key));
  }, []);

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
    if (!authUser) {
      setCatalogStatus('idle');
      return;
    }

    let cancelled = false;
    setCatalogStatus('loading');
    setCatalogError('');

    void loadCreditCardCatalog()
      .then((loadedCatalog) => {
        if (cancelled) return;
        setCatalog(loadedCatalog.cards);
        setCatalogIssuers(loadedCatalog.issuers);
        setCatalogStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalogStatus('error');
        setCatalogError(
          error instanceof Error ? error.message : '信用卡資料載入失敗',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authUser, catalogRetryNonce]);

  useEffect(() => {
    if (!supabase || !authUser || catalogStatus !== 'ready') {
      setCloudReadyUserId(null);
      return;
    }

    let cancelled = false;

    const loadCloudData = async () => {
      setAuthLoading(true);
      setAuthError('');
      setSyncStatus('loading');
      setSyncError('');

      const [profileResult, cardsResult, transactionsResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, cash_balance, accent_color')
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
          setSyncStatus('error');
          setSyncError(`雲端資料載入失敗：${error.message}`);
          setAuthLoading(false);
        }
        return;
      }

      const cloudCards = (cardsResult.data ?? [])
        .map((row) => row.card_data as Card)
        .filter((card) => card?.id)
        .map((card) => hydrateCardRewards(card, catalog));
      const cloudTransactions = (transactionsResult.data ?? [])
        .map((row) => row.transaction_data as Transaction)
        .filter((transaction) => transaction?.id);
      if (!cancelled) {
        setCards(cloudCards);
        setTransactions(cloudTransactions);

        const profile = profileResult.data;
        const cloudCash = Number(profile.cash_balance);
        const cloudAccent = profile.accent_color as AccentColor;
        setCashBalance(cloudCash);
        if (ACCENT_COLORS[cloudAccent]) setAccentColor(cloudAccent);
      }

      if (!cancelled) {
        setCloudReadyUserId(authUser.id);
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setAuthLoading(false);
      }
    };

    void loadCloudData();
    return () => {
      cancelled = true;
    };
  }, [authUser, catalog, catalogStatus, cloudRetryNonce]);

  useEffect(() => {
    if (!supabase || !authUser || cloudReadyUserId !== authUser.id) return;

    const timeout = window.setTimeout(() => {
      const syncCloudData = async () => {
        setSyncStatus('syncing');
        setSyncError('');
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authUser.id,
          display_name: lineDisplayName,
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

        setSyncStatus('synced');
        setLastSyncedAt(new Date());
      };

      void syncCloudData().catch((error: unknown) => {
        setSyncStatus('error');
        setSyncError(
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
    cards,
    cashBalance,
    cloudReadyUserId,
    lineDisplayName,
    syncRetryNonce,
    transactions,
  ]);

  // Sync utilities
  const saveCards = (newCards: Card[]) => {
    setCards(newCards);
  };

  const saveTransactions = (newTxs: Transaction[]) => {
    setTransactions(newTxs);
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
    }
    saveTransactions(transactions.map((tx) => tx.id === updatedTx.id ? updatedTx : tx));
  };

  // Delete transaction action
  const handleDeleteTransaction = (txId: string) => {
    const transaction = transactions.find((tx) => tx.id === txId);
    if (transaction?.cardId === 'cash') {
      const nextCash = cashBalance + transaction.amount;
      setCashBalance(nextCash);
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
  const handleLineLogin = () => {
    setAuthError('');
    const returnTo = `${window.location.origin}${window.location.pathname}`;
    window.location.assign(
      `${LINE_LOGIN_URL}?return_to=${encodeURIComponent(returnTo)}`,
    );
  };

  if (!authUser) {
    return (
      <LoginView
        loading={authLoading}
        error={authError}
        onLineLogin={handleLineLogin}
      />
    );
  }

  if (cloudReadyUserId !== authUser.id) {
    if (catalogStatus === 'error') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#fdf9e9] p-6 text-center sketch-border sketch-shadow">
            <p className="font-display text-lg font-bold text-primary">信用卡資料載入失敗</p>
            <p className="mt-2 text-xs text-[#ba1a1a]">{catalogError}</p>
            <button
              type="button"
              onClick={() => setCatalogRetryNonce((value) => value + 1)}
              className="mt-4 bg-white px-4 py-2 text-xs font-bold sketch-border-sm"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }

    if (syncStatus === 'error') {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-[#fdf9e9] p-6 text-center sketch-border sketch-shadow">
            <p className="font-display text-lg font-bold text-primary">雲端資料載入失敗</p>
            <p className="mt-2 text-xs text-[#ba1a1a]">{syncError}</p>
            <button
              type="button"
              onClick={() => setCloudRetryNonce((value) => value + 1)}
              className="mt-4 bg-white px-4 py-2 text-xs font-bold sketch-border-sm"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }

    return <LoginView loading error={authError} onLineLogin={handleLineLogin} />;
  }

  return (
    <div
      className="flex flex-col h-dvh w-full font-sans transition-colors duration-300 overflow-hidden bg-[var(--color-surface-bg)]"
      style={{
        '--accent-bg': accent.background,
        '--accent-text': accent.text,
      } as React.CSSProperties}
    >
      
      {/* TopAppBar */}
      <header className={`shrink-0 bg-[var(--color-surface-bg)] border-b-2 border-outline px-4 py-3 shadow-sm select-none ${uiTheme === 'comic' ? 'border-solid' : 'border-dashed'}`}>
        <div className="flex justify-between items-center w-full max-w-screen-md mx-auto">
          {/* Symmetrical Left Spacer to keep title centered */}
          <div className="w-9 h-9" />

          {/* Centered book branding */}
          <div className="text-center">
            <h1 className="font-display text-2xl font-black text-primary tracking-tight">
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
      <main className="app-scroll-area w-full max-w-screen-md mx-auto px-4 pb-4">
        {activeTab === 'cards' && (
          <CardsView
            cards={cards}
            transactions={transactions}
            catalog={catalog}
            catalogIssuers={catalogIssuers}
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
            onUpdateCard={handleUpdateCard}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            cards={cards}
            transactions={transactions}
            currencySymbol={getDisplayCurrencySymbol()}
            cashBalance={cashBalance}
            onUpdateCashBalance={(amount) => {
              setCashBalance(amount);
            }}
            accentColor={accentColor}
            onUpdateAccentColor={(color) => {
              setAccentColor(color);
            }}
            selectedMonth={selectedExpenseMonth}
            authUserName={lineDisplayName}
            authPictureUrl={authUser?.user_metadata?.picture_url}
            authError={authError}
            syncStatus={syncStatus}
            syncError={syncError}
            lastSyncedAt={lastSyncedAt}
            uiTheme={uiTheme}
            onUpdateUiTheme={(theme) => {
              setUiTheme(theme);
              localStorage.setItem('ccra_ui_theme', theme);
            }}
            onRetrySync={() => setSyncRetryNonce((value) => value + 1)}
            onSignOut={() => {
              if (!supabase) return;
              setAuthLoading(true);
              void supabase.auth.signOut().then(({ error }) => {
                setCards([]);
                setTransactions([]);
                setCloudReadyUserId(null);
                setSyncStatus('loading');
                setSyncError('');
                setAuthError(error?.message ?? '');
                setAuthLoading(false);
              });
            }}
          />
        )}
      </main>

      {/* Bottom Tab Navigator — outside the scroll area so it never scrolls away */}
      <nav className={`shrink-0 pb-safe bg-[var(--color-surface-bg)] border-t-2 border-outline select-none ${uiTheme === 'comic' ? 'border-solid' : 'border-dashed'}`}>
        <div className="flex justify-around items-center h-20 px-4 w-full max-w-screen-md mx-auto">
          
          {/* Tab 1: Expense */}
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-14 rounded-xl cursor-pointer ${
              activeTab === 'expense'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02] font-medium'
            }`}
          >
            <Edit3 size={18} className="mb-0.5" />
            <span className="text-[12px] uppercase tracking-wider">
              消費
            </span>
          </button>

          {/* Tab 2: Cards */}
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-14 rounded-xl cursor-pointer ${
              activeTab === 'cards'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02] font-medium'
            }`}
          >
            <CreditCard size={18} className="mb-0.5" />
            <span className="text-[12px] uppercase tracking-wider">
              信用卡
            </span>
          </button>

          {/* Tab 3: Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-14 rounded-xl cursor-pointer ${
              activeTab === 'profile'
                ? 'text-[var(--accent-text)] bg-[var(--accent-bg)] ring-1 ring-[#75777d] sketch-border-sm scale-105 font-bold font-handwriting'
                : 'text-on-surface-variant opacity-60 hover:opacity-100 hover:scale-[1.02] font-medium'
            }`}
          >
            <User size={18} className="mb-0.5" />
            <span className="text-[12px] uppercase tracking-wider">
              個人頁
            </span>
          </button>

        </div>
      </nav>

    </div>
  );
}
