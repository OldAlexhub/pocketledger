export const CATEGORIES = [
  'Income',
  'Rent/Mortgage',
  'Groceries',
  'Gas',
  'Eating Out',
  'Utilities',
  'Phone',
  'Internet',
  'Insurance',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Healthcare',
  'Kids/Family',
  'Travel',
  'Cash Withdrawal',
  'Fees',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];

export const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c !== 'Income');

export const CATEGORY_ICONS: Record<string, string> = {
  Income: '💰',
  'Rent/Mortgage': '🏠',
  Groceries: '🛒',
  Gas: '⛽',
  'Eating Out': '🍽️',
  Utilities: '💡',
  Phone: '📱',
  Internet: '🌐',
  Insurance: '🛡️',
  Transportation: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Subscriptions: '📺',
  Healthcare: '🏥',
  'Kids/Family': '👨‍👩‍👧',
  Travel: '✈️',
  'Cash Withdrawal': '💵',
  Fees: '💳',
  Other: '📦',
};

export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican Peso' },
  { code: 'CHF', symbol: 'CHF', label: 'Swiss Franc' },
];
