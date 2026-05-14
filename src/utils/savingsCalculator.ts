import { Transaction, SavingsScenario } from '../models/types';
import { getMonthKey } from './dateUtils';

interface MonthSummary {
  income: number;
  expenses: number;
  byCategory: Record<string, number>;
}

function averageMonthlyStats(transactions: Transaction[]): MonthSummary {
  const monthMap = new Map<string, MonthSummary>();

  for (const txn of transactions) {
    const key = getMonthKey(txn.date);
    if (!monthMap.has(key)) {
      monthMap.set(key, { income: 0, expenses: 0, byCategory: {} });
    }
    const s = monthMap.get(key)!;
    if (txn.type === 'income') {
      s.income += txn.amount;
    } else {
      s.expenses += txn.amount;
      s.byCategory[txn.category] = (s.byCategory[txn.category] || 0) + txn.amount;
    }
  }

  const months = Array.from(monthMap.values());
  if (months.length === 0) return { income: 0, expenses: 0, byCategory: {} };

  const avgIncome = months.reduce((s, m) => s + m.income, 0) / months.length;
  const avgExpenses = months.reduce((s, m) => s + m.expenses, 0) / months.length;

  // Average category spending
  const allCats = new Set(months.flatMap(m => Object.keys(m.byCategory)));
  const avgByCategory: Record<string, number> = {};
  for (const cat of allCats) {
    avgByCategory[cat] = months.reduce((s, m) => s + (m.byCategory[cat] || 0), 0) / months.length;
  }

  return { income: avgIncome, expenses: avgExpenses, byCategory: avgByCategory };
}

const FLEXIBLE_CATEGORIES = ['Eating Out', 'Shopping', 'Entertainment', 'Travel', 'Subscriptions'];

export function calculateSavingsPotential(transactions: Transaction[]): {
  avgIncome: number;
  avgSpending: number;
  avgLeftover: number;
  scenarios: SavingsScenario[];
} {
  const avg = averageMonthlyStats(transactions);

  const flexibleSpend = FLEXIBLE_CATEGORIES.reduce(
    (s, cat) => s + (avg.byCategory[cat] || 0),
    0,
  );

  const avgLeftover = avg.income - avg.expenses;

  // Conservative: reduce flexible spending by 10%
  const conservative = flexibleSpend * 0.1;
  // Balanced: reduce flexible spending by 25%
  const balanced = flexibleSpend * 0.25;
  // Aggressive: reduce flexible spending by 40%
  const aggressive = flexibleSpend * 0.4;

  const scenarios: SavingsScenario[] = [
    {
      label: 'Conservative',
      additionalSavings: Math.round(conservative * 100) / 100,
      description: 'Small reductions in flexible spending with minimal lifestyle change.',
      tips: [
        'Skip 1-2 restaurant visits per month',
        'Cancel one unused subscription',
        'Use store brands for groceries',
      ],
    },
    {
      label: 'Balanced',
      additionalSavings: Math.round(balanced * 100) / 100,
      description: 'Moderate adjustments to discretionary spending.',
      tips: [
        'Cook at home 3 more nights per week',
        'Review and cancel unused subscriptions',
        'Set a shopping budget and stick to it',
        'Plan meals to reduce food waste',
      ],
    },
    {
      label: 'Aggressive',
      additionalSavings: Math.round(aggressive * 100) / 100,
      description: 'Significant cuts to flexible categories for maximum savings.',
      tips: [
        'Meal prep for the week',
        'Cancel all non-essential subscriptions',
        'Use library and free entertainment options',
        'Apply a 48-hour rule before purchases',
        'Track every purchase for 30 days',
      ],
    },
  ];

  return {
    avgIncome: Math.round(avg.income * 100) / 100,
    avgSpending: Math.round(avg.expenses * 100) / 100,
    avgLeftover: Math.round(avgLeftover * 100) / 100,
    scenarios,
  };
}

export function getSpendingPace(
  transactions: Transaction[],
  monthKey: string,
  monthlyBudget: number,
): { pace: number; projection: number; status: 'on-track' | 'at-risk' | 'over' } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const monthSpend = transactions
    .filter(t => getMonthKey(t.date) === monthKey && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const dailyRate = monthSpend / dayOfMonth;
  const projection = dailyRate * daysInMonth;
  const pace = monthlyBudget > 0 ? projection / monthlyBudget : 0;

  return {
    pace: Math.round(pace * 100) / 100,
    projection: Math.round(projection * 100) / 100,
    status: pace > 1.1 ? 'over' : pace > 0.85 ? 'at-risk' : 'on-track',
  };
}
