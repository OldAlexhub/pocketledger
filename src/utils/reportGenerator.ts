import { Transaction, Statement, Subscription, Insight } from '../models/types';
import { getCategoryTotals } from './insights';
import { formatDate, formatMonthYear, getMonthKey } from './dateUtils';

export function generateCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Merchant', 'Description', 'Category', 'Amount', 'Source'];
  const rows = transactions.map(t => [
    t.date,
    t.type,
    `"${t.merchant.replace(/"/g, '""')}"`,
    `"${t.description.replace(/"/g, '""')}"`,
    t.category,
    t.amount.toFixed(2),
    t.source,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateReportHTML(params: {
  transactions: Transaction[];
  statements: Statement[];
  subscriptions: Subscription[];
  insights: Insight[];
  monthKey: string;
  currencySymbol: string;
}): string {
  const { transactions, subscriptions, insights, monthKey, currencySymbol: sym } = params;

  const monthLabel = formatMonthYear(`${monthKey}-01`);
  const monthTxns = transactions.filter(t => getMonthKey(t.date) === monthKey);

  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expenses;

  const categoryTotals = getCategoryTotals(monthTxns);
  const topCats = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const anomalies = insights.filter(i => i.type === 'anomaly');

  const catRows = topCats
    .map(
      ([cat, amt]) =>
        `<tr><td>${cat}</td><td style="text-align:right">${sym}${amt.toFixed(2)}</td><td style="text-align:right">${income > 0 ? Math.round((amt / income) * 100) : 0}%</td></tr>`,
    )
    .join('');

  const subRows = activeSubs
    .map(
      s =>
        `<tr><td>${s.merchant}</td><td style="text-align:right">${sym}${s.estimatedAmount.toFixed(2)}/mo</td><td style="text-align:right">${sym}${s.yearlyCost.toFixed(2)}/yr</td></tr>`,
    )
    .join('');

  const anomalyItems = anomalies
    .map(a => `<li><strong>${a.title}</strong>: ${a.message}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #1A202C; padding: 20px; font-size: 13px; }
  h1 { color: #1B4F72; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #1B4F72; font-size: 15px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-top: 24px; }
  .subtitle { color: #718096; font-size: 12px; margin-bottom: 24px; }
  .summary-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .summary-box { flex: 1; background: #F0F4F8; border-radius: 8px; padding: 12px; }
  .summary-box .label { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; }
  .summary-box .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .income { color: #27AE60; }
  .expense { color: #E74C3C; }
  .balance { color: #1B4F72; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #F0F4F8; padding: 8px; text-align: left; font-size: 11px; color: #718096; text-transform: uppercase; }
  td { padding: 7px 8px; border-bottom: 1px solid #F0F4F8; }
  ul { padding-left: 16px; }
  li { margin-bottom: 6px; line-height: 1.5; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E8F0; color: #A0AEC0; font-size: 11px; text-align: center; }
  .disclaimer { background: #FEF9E7; border-radius: 6px; padding: 10px; font-size: 11px; color: #7D6608; margin-top: 20px; }
</style>
</head>
<body>
<h1>PocketLedger</h1>
<div class="subtitle">Budget Report — ${monthLabel}</div>

<h2>Summary</h2>
<div class="summary-row">
  <div class="summary-box">
    <div class="label">Income</div>
    <div class="value income">${sym}${income.toFixed(2)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Spending</div>
    <div class="value expense">${sym}${expenses.toFixed(2)}</div>
  </div>
  <div class="summary-box">
    <div class="label">Balance</div>
    <div class="value balance">${sym}${balance.toFixed(2)}</div>
  </div>
</div>

<h2>Category Breakdown</h2>
<table>
  <thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Income</th></tr></thead>
  <tbody>${catRows || '<tr><td colspan="3">No expenses this month</td></tr>'}</tbody>
</table>

${activeSubs.length > 0 ? `
<h2>Detected Subscriptions</h2>
<table>
  <thead><tr><th>Service</th><th style="text-align:right">Monthly</th><th style="text-align:right">Yearly</th></tr></thead>
  <tbody>${subRows}</tbody>
</table>` : ''}

${anomalies.length > 0 ? `
<h2>Anomalies Detected</h2>
<ul>${anomalyItems}</ul>` : ''}

<div class="disclaimer">
  PocketLedger is a personal budget organization tool. This report does not constitute financial, tax, credit, investment, or accounting advice. All calculations are estimates based on your imported and entered data.
</div>

<div class="footer">Generated by PocketLedger &bull; ${new Date().toLocaleDateString()} &bull; All data is stored locally on your device</div>
</body>
</html>`;
}
