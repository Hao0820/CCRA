/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Transaction } from './types';

export const INITIAL_CARDS: Card[] = [
  {
    id: 'card-004-1',
    bankCode: '004',
    bankName: '臺灣銀行',
    name: '金采卡',
    lastFour: '1234',
    rewardDesc: '1% Cash Back everywhere',
    rewardRate: 1, // 1%
    colorType: 'pink',
    currency: 'NT$',
  },
  {
    id: 'card-012-1',
    bankCode: '012',
    bankName: '台北富邦',
    name: 'J卡',
    lastFour: '5678',
    rewardDesc: '3% Line Points on domestic spend',
    rewardRate: 3, // 3%
    colorType: 'mint',
    currency: 'NT$',
  },
  {
    id: 'card-012-2',
    bankCode: '012',
    bankName: '台北富邦',
    name: 'momo卡',
    lastFour: '9012',
    rewardDesc: '5% Momo Coins on platform',
    rewardRate: 5, // 5%
    colorType: 'sky',
    currency: 'NT$',
  },
  {
    id: 'card-822-1',
    bankCode: '822',
    bankName: '中國信託',
    name: 'Line Pay卡',
    lastFour: '3456',
    rewardDesc: '1% Line Points general',
    rewardRate: 1, // 1%
    colorType: 'beige',
    currency: 'NT$',
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    merchant: 'Grocery Store',
    date: '2026-05-15',
    amount: 8400,
    cardId: 'card-012-1', // J卡 (which does ¥ or NT$ spending)
    category: 'shopping',
    pointsOverride: 84, // matches screen (+84 pts)
  },
  {
    id: 'tx-2',
    merchant: 'Dinner with Friends',
    date: '2026-05-12',
    amount: 12000,
    cardId: 'card-012-2', // momo卡
    category: 'dining',
    pointsOverride: 120, // matches screen (+120)
  },
  {
    id: 'tx-3',
    merchant: 'Online Shopping Order',
    date: '2026-05-08',
    amount: 97100,
    cardId: 'card-822-1', // Line Pay卡
    category: 'shopping',
    pointsOverride: 786, // yields 786 points
  },
  {
    id: 'tx-4',
    merchant: 'Monthly Commute Pass',
    date: '2026-05-01',
    amount: 25000,
    cardId: 'card-004-1', // 金采卡
    category: 'transport',
    pointsOverride: 250, // matches screen (+250)
  },
];
