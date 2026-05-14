import { Category } from '../constants/categories';

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'import';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO date string
  merchant: string;
  description: string;
  category: Category;
  source: TransactionSource;
  statementId?: string;
  notes?: string;
  confirmed: boolean;
}

export interface Statement {
  id: string;
  fileName: string;
  importedAt: string;
  monthLabel: string;
  transactionCount: number;
  status: 'imported' | 'pending' | 'error';
}

export interface CategoryBudget {
  category: Category;
  amount: number;
}

export interface Budget {
  monthlyIncome: number;
  savingsGoal: number;
  categoryBudgets: CategoryBudget[];
  fixedBills: number;
  monthStartDay: number;
  currency: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: Category;
  recurring: boolean;
  paidThisMonth: boolean;
}

export type SubscriptionFrequency = 'monthly' | 'yearly' | 'weekly';
export type SubscriptionStatus = 'active' | 'ignored' | 'bill' | 'subscription';

export interface Subscription {
  id: string;
  merchant: string;
  estimatedAmount: number;
  frequency: SubscriptionFrequency;
  detectedMonths: string[];
  yearlyCost: number;
  status: SubscriptionStatus;
}

export type InsightType =
  | 'anomaly'
  | 'subscription'
  | 'trend'
  | 'savings'
  | 'bill'
  | 'duplicate';

export type InsightSeverity = 'info' | 'warning' | 'danger' | 'success';

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  severity: InsightSeverity;
  amountImpact?: number;
  createdAt: string;
  category?: Category;
  merchant?: string;
}

export interface AppLockSettings {
  enabled: boolean;
  lockOnOpen: boolean;
  lockOnBackground: boolean;
  requireUnlockForImports: boolean;
  requireUnlockForExports: boolean;
}

export interface AppSettings {
  currency: string;
  monthStartDay: number;
  appLock: AppLockSettings;
  onboardingComplete: boolean;
  userCategoryCorrections: Record<string, Category>;
}

export interface PendingTransaction {
  date: string;
  merchant: string;
  amount: number;
  type: TransactionType;
  category: Category;
  confidence: ConfidenceLevel;
  description: string;
  ignored?: boolean;
}

export interface SavingsScenario {
  label: 'Conservative' | 'Balanced' | 'Aggressive';
  additionalSavings: number;
  description: string;
  tips: string[];
}
