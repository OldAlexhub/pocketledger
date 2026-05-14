import { Transaction, Insight, Subscription, InsightType } from '../models/types';
import { Category } from '../constants/categories';
import { getMonthKey, uuid } from './dateUtils';

interface MonthlyStats {
  monthKey: string;
  income: number;
  expenses: number;
  byCategory: Record<string, number>;
  byMerchant: Record<string, number>;
}

function buildMonthlyStats(transactions: Transaction[]): MonthlyStats[] {
  const monthMap = new Map<string, MonthlyStats>();

  for (const txn of transactions) {
    const key = getMonthKey(txn.date);
    if (!monthMap.has(key)) {
      monthMap.set(key, {
        monthKey: key,
        income: 0,
        expenses: 0,
        byCategory: {},
        byMerchant: {},
      });
    }
    const stats = monthMap.get(key)!;
    if (txn.type === 'income') {
      stats.income += txn.amount;
    } else {
      stats.expenses += txn.amount;
      stats.byCategory[txn.category] = (stats.byCategory[txn.category] || 0) + txn.amount;
      const key2 = txn.merchant.toLowerCase().trim();
      stats.byMerchant[key2] = (stats.byMerchant[key2] || 0) + txn.amount;
    }
  }

  return Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function detectSubscriptions(transactions: Transaction[]): Subscription[] {
  const merchantMonths = new Map<string, { amounts: number[]; months: string[] }>();

  for (const txn of transactions) {
    if (txn.type !== 'expense') continue;
    const merchantKey = txn.merchant.toLowerCase().trim();
    const monthKey = getMonthKey(txn.date);
    if (!merchantMonths.has(merchantKey)) {
      merchantMonths.set(merchantKey, { amounts: [], months: [] });
    }
    const data = merchantMonths.get(merchantKey)!;
    if (!data.months.includes(monthKey)) {
      data.months.push(monthKey);
      data.amounts.push(txn.amount);
    }
  }

  const subscriptions: Subscription[] = [];

  for (const [merchantKey, data] of merchantMonths.entries()) {
    if (data.months.length < 2) continue;

    const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
    const variance = Math.max(...data.amounts) - Math.min(...data.amounts);

    // Consider it a subscription if amount is consistent (< 10% variance)
    if (variance / avgAmount > 0.15) continue;

    // Find the original merchant name
    const origTxn = transactions.find(
      t => t.merchant.toLowerCase().trim() === merchantKey,
    );
    const merchant = origTxn?.merchant || merchantKey;

    subscriptions.push({
      id: uuid(),
      merchant,
      estimatedAmount: Math.round(avgAmount * 100) / 100,
      frequency: 'monthly',
      detectedMonths: data.months.sort(),
      yearlyCost: Math.round(avgAmount * 12 * 100) / 100,
      status: 'active',
    });
  }

  return subscriptions.sort((a, b) => b.yearlyCost - a.yearlyCost);
}

export function generateInsights(transactions: Transaction[]): Insight[] {
  if (transactions.length === 0) return [];

  const insights: Insight[] = [];
  const monthlyStats = buildMonthlyStats(transactions);

  if (monthlyStats.length === 0) return [];

  // --- Anomaly: category spikes ---
  if (monthlyStats.length >= 2) {
    const lastMonth = monthlyStats[monthlyStats.length - 1];
    const prevMonth = monthlyStats[monthlyStats.length - 2];

    for (const [cat, amount] of Object.entries(lastMonth.byCategory)) {
      const prev = prevMonth.byCategory[cat] || 0;
      if (prev > 0 && amount > prev * 1.5 && amount - prev > 50) {
        insights.push({
          id: uuid(),
          type: 'anomaly',
          title: `${cat} spending up ${Math.round(((amount - prev) / prev) * 100)}%`,
          message: `Your ${cat} spending increased from $${prev.toFixed(2)} to $${amount.toFixed(2)} compared to last month.`,
          severity: 'warning',
          amountImpact: amount - prev,
          createdAt: new Date().toISOString(),
          category: cat as Category,
        });
      }
    }
  }

  // --- Anomaly: large single transactions ---
  const expenseValues = transactions
    .filter(t => t.type === 'expense')
    .map(t => t.amount);
  if (expenseValues.length > 5) {
    const avg = expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length;
    const threshold = avg * 3;
    const large = transactions.filter(
      t => t.type === 'expense' && t.amount > threshold && t.amount > 200,
    );
    for (const txn of large.slice(0, 3)) {
      insights.push({
        id: uuid(),
        type: 'anomaly',
        title: `Large transaction: ${txn.merchant}`,
        message: `A $${txn.amount.toFixed(2)} charge from ${txn.merchant} is ${Math.round(txn.amount / avg)}x your average transaction.`,
        severity: 'warning',
        amountImpact: txn.amount,
        createdAt: new Date().toISOString(),
        merchant: txn.merchant,
      });
    }
  }

  // --- Income drops ---
  if (monthlyStats.length >= 2) {
    const last = monthlyStats[monthlyStats.length - 1];
    const prev = monthlyStats[monthlyStats.length - 2];
    if (prev.income > 0 && last.income < prev.income * 0.8) {
      insights.push({
        id: uuid(),
        type: 'anomaly',
        title: 'Income dropped this month',
        message: `Income fell from $${prev.income.toFixed(2)} to $${last.income.toFixed(2)}, a ${Math.round(((prev.income - last.income) / prev.income) * 100)}% decrease.`,
        severity: 'danger',
        amountImpact: prev.income - last.income,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // --- Eating out insight ---
  const lastStats = monthlyStats[monthlyStats.length - 1];
  const eatingOut = lastStats.byCategory['Eating Out'] || 0;
  if (eatingOut > 300) {
    insights.push({
      id: uuid(),
      type: 'savings',
      title: 'Dining out is a top expense',
      message: `You spent $${eatingOut.toFixed(2)} on dining out this month. Cooking at home more often could reduce this significantly.`,
      severity: 'info',
      amountImpact: eatingOut * 0.4,
      createdAt: new Date().toISOString(),
      category: 'Eating Out',
    });
  }

  // --- Subscriptions insight ---
  const subSpend = lastStats.byCategory['Subscriptions'] || 0;
  if (subSpend > 50) {
    insights.push({
      id: uuid(),
      type: 'subscription',
      title: 'Monthly subscriptions detected',
      message: `You are spending ~$${subSpend.toFixed(2)}/month on subscriptions ($${(subSpend * 12).toFixed(0)}/year). Review your active subscriptions.`,
      severity: 'info',
      amountImpact: subSpend,
      createdAt: new Date().toISOString(),
      category: 'Subscriptions',
    });
  }

  // --- Spending trend: consistent overspending ---
  if (monthlyStats.length >= 2) {
    const overMonths = monthlyStats.filter(s => s.income > 0 && s.expenses > s.income).length;
    if (overMonths >= 2) {
      insights.push({
        id: uuid(),
        type: 'trend',
        title: 'Spending exceeds income in multiple months',
        message: `In ${overMonths} imported months, expenses exceeded income. Review your budget to find areas to reduce.`,
        severity: 'danger',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // --- Positive: good savings ---
  if (monthlyStats.length >= 1) {
    const last = monthlyStats[monthlyStats.length - 1];
    const leftover = last.income - last.expenses;
    if (last.income > 0 && leftover / last.income > 0.2) {
      insights.push({
        id: uuid(),
        type: 'savings',
        title: "You're saving well this month",
        message: `Your leftover after expenses is $${leftover.toFixed(2)} (${Math.round((leftover / last.income) * 100)}% of income). Keep it up!`,
        severity: 'success',
        amountImpact: leftover,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}

export function getCategoryTotals(
  transactions: Transaction[],
  monthKey?: string,
): Record<string, number> {
  const filtered = monthKey
    ? transactions.filter(t => getMonthKey(t.date) === monthKey && t.type === 'expense')
    : transactions.filter(t => t.type === 'expense');

  const totals: Record<string, number> = {};
  for (const txn of filtered) {
    totals[txn.category] = (totals[txn.category] || 0) + txn.amount;
  }
  return totals;
}

export function getMonthlyTotals(transactions: Transaction[], monthKey: string) {
  const filtered = transactions.filter(t => getMonthKey(t.date) === monthKey);
  const income = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expenses, balance: income - expenses };
}
