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
  const [selectedExpenseMonth, setSelectedExpenseMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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
