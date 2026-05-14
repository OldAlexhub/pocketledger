import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Transaction,
  Statement,
  Budget,
  Bill,
  Subscription,
  Insight,
  AppSettings,
} from '../models/types';
import { Category } from '../constants/categories';

const KEYS = {
  TRANSACTIONS: '@pl_transactions',
  STATEMENTS: '@pl_statements',
  BUDGET: '@pl_budget',
  BILLS: '@pl_bills',
  SUBSCRIPTIONS: '@pl_subscriptions',
  INSIGHTS: '@pl_insights',
  SETTINGS: '@pl_settings',
};

const DEFAULT_BUDGET: Budget = {
  monthlyIncome: 0,
  savingsGoal: 0,
  categoryBudgets: [],
  fixedBills: 0,
  monthStartDay: 1,
  currency: 'USD',
};

const DEFAULT_SETTINGS: AppSettings = {
  currency: 'USD',
  monthStartDay: 1,
  appLock: {
    enabled: false,
    lockOnOpen: true,
    lockOnBackground: false,
    requireUnlockForImports: false,
    requireUnlockForExports: false,
  },
  onboardingComplete: false,
  userCategoryCorrections: {},
};

async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// Transactions
export async function getTransactions(): Promise<Transaction[]> {
  return getItem<Transaction[]>(KEYS.TRANSACTIONS, []);
}

export async function saveTransactions(txns: Transaction[]): Promise<void> {
  await setItem(KEYS.TRANSACTIONS, txns);
}

export async function addTransactions(newTxns: Transaction[]): Promise<void> {
  const existing = await getTransactions();
  await setItem(KEYS.TRANSACTIONS, [...existing, ...newTxns]);
}

export async function updateTransaction(updated: Transaction): Promise<void> {
  const all = await getTransactions();
  const idx = all.findIndex(t => t.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    await setItem(KEYS.TRANSACTIONS, all);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const all = await getTransactions();
  await setItem(KEYS.TRANSACTIONS, all.filter(t => t.id !== id));
}

// Statements
export async function getStatements(): Promise<Statement[]> {
  return getItem<Statement[]>(KEYS.STATEMENTS, []);
}

export async function addStatement(stmt: Statement): Promise<void> {
  const existing = await getStatements();
  await setItem(KEYS.STATEMENTS, [...existing, stmt]);
}

export async function deleteStatement(id: string): Promise<void> {
  const all = await getStatements();
  await setItem(KEYS.STATEMENTS, all.filter(s => s.id !== id));
  const txns = await getTransactions();
  await setItem(KEYS.TRANSACTIONS, txns.filter(t => t.statementId !== id));
}

// Budget
export async function getBudget(): Promise<Budget> {
  return getItem<Budget>(KEYS.BUDGET, DEFAULT_BUDGET);
}

export async function saveBudget(budget: Budget): Promise<void> {
  await setItem(KEYS.BUDGET, budget);
}

// Bills
export async function getBills(): Promise<Bill[]> {
  return getItem<Bill[]>(KEYS.BILLS, []);
}

export async function saveBills(bills: Bill[]): Promise<void> {
  await setItem(KEYS.BILLS, bills);
}

export async function addBill(bill: Bill): Promise<void> {
  const existing = await getBills();
  await setItem(KEYS.BILLS, [...existing, bill]);
}

export async function updateBill(updated: Bill): Promise<void> {
  const all = await getBills();
  const idx = all.findIndex(b => b.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    await setItem(KEYS.BILLS, all);
  }
}

export async function deleteBill(id: string): Promise<void> {
  const all = await getBills();
  await setItem(KEYS.BILLS, all.filter(b => b.id !== id));
}

// Subscriptions
export async function getSubscriptions(): Promise<Subscription[]> {
  return getItem<Subscription[]>(KEYS.SUBSCRIPTIONS, []);
}

export async function saveSubscriptions(subs: Subscription[]): Promise<void> {
  await setItem(KEYS.SUBSCRIPTIONS, subs);
}

// Insights
export async function getInsights(): Promise<Insight[]> {
  return getItem<Insight[]>(KEYS.INSIGHTS, []);
}

export async function saveInsights(insights: Insight[]): Promise<void> {
  await setItem(KEYS.INSIGHTS, insights);
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  return getItem<AppSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await setItem(KEYS.SETTINGS, settings);
}

export async function saveCategoryCorrection(
  merchant: string,
  category: Category,
): Promise<void> {
  const settings = await getSettings();
  settings.userCategoryCorrections[merchant.toLowerCase()] = category;
  await saveSettings(settings);
}

export async function getCategoryCorrections(): Promise<Record<string, Category>> {
  const settings = await getSettings();
  return settings.userCategoryCorrections || {};
}

// Reset all data
export async function resetAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
