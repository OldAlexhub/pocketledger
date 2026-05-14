import { PendingTransaction } from '../models/types';
import { classifyTransaction } from './classifier';
import { uuid } from './dateUtils';
import { Category } from '../constants/categories';

// Regex patterns to extract transaction lines from pasted statement text
const AMOUNT_PATTERN = /[-+]?\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  /(\d{4}-\d{2}-\d{2})/,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,?\s*\d{4})?/i,
];

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[$,]/g, '');
  return parseFloat(cleaned) || 0;
}

function parseDate(raw: string): string {
  // Try common date formats
  const cleaned = raw.trim();

  // MM/DD/YYYY or MM/DD/YY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const month = String(parseInt(slashMatch[1])).padStart(2, '0');
    const day = String(parseInt(slashMatch[2])).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Month name
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const monthMatch = cleaned.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
  if (monthMatch) {
    const month = monthNames[monthMatch[1].toLowerCase()];
    const day = String(parseInt(monthMatch[2])).padStart(2, '0');
    const year = monthMatch[3] || String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

interface ParsedLine {
  date: string;
  description: string;
  amount: number;
  isCredit: boolean;
}

function parseLine(line: string): ParsedLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return null;

  let dateStr = '';
  let rest = trimmed;

  // Try to find a date in the line
  for (const pattern of DATE_PATTERNS) {
    const match = rest.match(pattern);
    if (match) {
      dateStr = parseDate(match[0]);
      rest = rest.replace(match[0], '').trim();
      break;
    }
  }

  if (!dateStr) return null;

  // Find amount - look for last dollar figure in line
  const amountMatches = [...rest.matchAll(/[-+]?\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2}))/g)];
  if (!amountMatches.length) return null;

  const lastAmountMatch = amountMatches[amountMatches.length - 1];
  const rawAmount = lastAmountMatch[0];
  const amount = parseAmount(rawAmount);

  const descriptionRaw = rest.replace(rawAmount, '').trim();
  const description = descriptionRaw.replace(/\s{2,}/g, ' ').trim();

  // Credit indicators
  const isCredit =
    rawAmount.startsWith('+') ||
    rest.toLowerCase().includes('cr ') ||
    rest.toLowerCase().includes('credit') ||
    rest.toLowerCase().includes('deposit') ||
    rest.toLowerCase().includes('payroll');

  if (amount === 0 || !description) return null;

  return { date: dateStr, description, amount, isCredit };
}

export function parseStatementText(
  text: string,
  userCorrections: Record<string, Category> = {},
): PendingTransaction[] {
  const lines = text.split('\n');
  const results: PendingTransaction[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;

    const dedupeKey = `${parsed.date}-${parsed.amount}-${parsed.description.substring(0, 20)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const merchantRaw = parsed.description.split(/\s{2,}/)[0] || parsed.description;
    const merchant = merchantRaw.substring(0, 40).trim();

    const classification = classifyTransaction(merchant, parsed.description, userCorrections);

    // Determine type: income if it's a credit or classified as Income
    const isIncome =
      parsed.isCredit ||
      classification.category === 'Income' ||
      classification.type === 'income';

    results.push({
      date: parsed.date,
      merchant,
      amount: parsed.amount,
      type: isIncome ? 'income' : 'expense',
      category: classification.category,
      confidence: classification.confidence,
      description: parsed.description,
      ignored: false,
    });
  }

  return results;
}

// Generate sample/mock transactions for demo purposes when no text is provided
export function generateMockTransactions(): PendingTransaction[] {
  const baseDate = new Date();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  const year = baseDate.getFullYear();

  return [
    {
      date: `${year}-${month}-01`,
      merchant: 'Direct Deposit',
      amount: 4200,
      type: 'income',
      category: 'Income',
      confidence: 'high',
      description: 'PAYROLL DIRECT DEPOSIT EMPLOYER',
    },
    {
      date: `${year}-${month}-03`,
      merchant: 'Walmart',
      amount: 87.45,
      type: 'expense',
      category: 'Groceries',
      confidence: 'high',
      description: 'WALMART SUPERCENTER #4532',
    },
    {
      date: `${year}-${month}-05`,
      merchant: 'Netflix',
      amount: 15.99,
      type: 'expense',
      category: 'Subscriptions',
      confidence: 'high',
      description: 'NETFLIX.COM',
    },
    {
      date: `${year}-${month}-07`,
      merchant: 'Shell',
      amount: 52.00,
      type: 'expense',
      category: 'Gas',
      confidence: 'high',
      description: 'SHELL OIL GAS STATION',
    },
    {
      date: `${year}-${month}-10`,
      merchant: "McDonald's",
      amount: 14.32,
      type: 'expense',
      category: 'Eating Out',
      confidence: 'high',
      description: "MCDONALD'S #5120",
    },
    {
      date: `${year}-${month}-12`,
      merchant: 'Duke Energy',
      amount: 128.00,
      type: 'expense',
      category: 'Utilities',
      confidence: 'high',
      description: 'DUKE ENERGY ELECTRIC BILL',
    },
    {
      date: `${year}-${month}-15`,
      merchant: 'Spotify',
      amount: 9.99,
      type: 'expense',
      category: 'Subscriptions',
      confidence: 'high',
      description: 'SPOTIFY USA',
    },
    {
      date: `${year}-${month}-18`,
      merchant: 'Amazon',
      amount: 67.23,
      type: 'expense',
      category: 'Shopping',
      confidence: 'high',
      description: 'AMAZON.COM ORDER #111-2345',
    },
    {
      date: `${year}-${month}-20`,
      merchant: 'Starbucks',
      amount: 8.45,
      type: 'expense',
      category: 'Eating Out',
      confidence: 'high',
      description: 'STARBUCKS STORE #2841',
    },
    {
      date: `${year}-${month}-22`,
      merchant: 'Verizon',
      amount: 89.00,
      type: 'expense',
      category: 'Phone',
      confidence: 'high',
      description: 'VERIZON WIRELESS BILL',
    },
  ];
}
