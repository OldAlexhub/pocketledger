import { Category } from '../constants/categories';
import { ConfidenceLevel, TransactionType } from '../models/types';

interface ClassifierRule {
  keywords: string[];
  category: Category;
}

const RULES: ClassifierRule[] = [
  {
    keywords: ['payroll', 'direct deposit', 'salary', 'paycheck', 'deposit', 'income', 'wages', 'employer', 'refund tax', 'tax refund'],
    category: 'Income',
  },
  {
    keywords: ['rent', 'mortgage', 'hoa', 'lease', 'apartment', 'housing'],
    category: 'Rent/Mortgage',
  },
  {
    keywords: ['walmart', 'publix', 'aldi', 'kroger', 'costco', "sam's club", "trader joe's", 'trader joes', 'whole foods', 'safeway', 'albertsons', 'meijer', 'food lion', 'hy-vee', 'hyvee', 'winco', 'stop & shop', 'stop and shop', 'giant food', 'ingles', 'wegmans', 'grocery', 'supermarket'],
    category: 'Groceries',
  },
  {
    keywords: ['shell', 'bp', 'exxon', 'chevron', 'racetrac', 'wawa', '7-eleven', '7eleven', 'speedway', 'pilot', 'flying j', 'loves', 'circle k', 'quiktrip', 'marathon', 'sunoco', 'gas station', 'fuel', 'gasoline'],
    category: 'Gas',
  },
  {
    keywords: ["mcdonald's", 'mcdonalds', "chick-fil-a", 'chick fil a', 'starbucks', 'dunkin', 'chipotle', 'taco bell', 'burger king', "wendy's", 'wendys', 'subway', 'dominos', "domino's", 'pizza hut', 'papa johns', 'olive garden', 'applebees', 'ihop', 'denny', 'panera', 'five guys', 'popeyes', 'raising cane', 'raising canes', 'sonic drive', 'arby', 'jack in the box', 'dairy queen', 'restaurant', 'cafe', 'bistro', 'grill', 'kitchen', 'eatery', 'sushi', 'diner', 'doordash', 'grubhub', 'ubereats', 'uber eats', 'postmates', 'delivery'],
    category: 'Eating Out',
  },
  {
    keywords: ['duke energy', 'electric', 'water bill', 'utility', 'utilities', 'gas bill', 'power company', 'pge', 'con ed', 'coned', 'national grid', 'dominion energy', 'xcel energy', 'sewage', 'trash', 'waste management'],
    category: 'Utilities',
  },
  {
    keywords: ['verizon', 't-mobile', 'tmobile', 'at&t', 'att', 'mint mobile', 'metro by t-mobile', 'metro pcs', 'cricket wireless', 'boost mobile', 'sprint', 'consumer cellular', 'us cellular', 'phone bill', 'wireless plan'],
    category: 'Phone',
  },
  {
    keywords: ['comcast', 'xfinity', 'spectrum', 'cox', 'att internet', 'at&t internet', 'frontier', 'century link', 'centurylink', 'earthlink', 'windstream', 'internet service', 'broadband', 'cable bill'],
    category: 'Internet',
  },
  {
    keywords: ['geico', 'progressive', 'state farm', 'allstate', 'farmers', 'liberty mutual', 'nationwide', 'usaa', 'travelers', 'aaa insurance', 'insurance premium', 'auto insurance', 'home insurance', 'health insurance', 'life insurance', 'insurance payment'],
    category: 'Insurance',
  },
  {
    keywords: ['uber', 'lyft', 'toll', 'sunpass', 'e-z pass', 'ezpass', 'parking', 'transit', 'bus pass', 'metro card', 'train ticket', 'amtrak', 'greyhound', 'zipcar', 'enterprise rent', 'hertz', 'avis', 'budget car'],
    category: 'Transportation',
  },
  {
    keywords: ['amazon', 'target', 'best buy', 'ebay', 'temu', 'shein', 'etsy', 'wayfair', 'ikea', 'home depot', 'lowes', "lowe's", 'macys', "macy's", 'nordstrom', 'tj maxx', 'tjmaxx', 'marshalls', 'ross', 'old navy', 'gap', 'h&m', 'zara', 'forever 21', 'dsw', 'nike', 'adidas', 'online shopping'],
    category: 'Shopping',
  },
  {
    keywords: ['netflix', 'spotify', 'hulu', 'disney', 'apple music', 'apple tv', 'google play', 'youtube premium', 'amazon prime', 'peacock', 'paramount', 'hbo', 'hbo max', 'max', 'showtime', 'starz', 'crunchyroll', 'tidal', 'deezer', 'pandora', 'sirius', 'siriusxm', 'audible', 'kindle unlimited'],
    category: 'Subscriptions',
  },
  {
    keywords: ['cinema', 'movie', 'amc', 'regal', 'cinemark', 'theater', 'theatre', 'concert', 'ticketmaster', 'stubhub', 'bowling', 'golf', 'fitness', 'gym', 'planet fitness', 'la fitness', 'ymca', 'gaming', 'xbox', 'playstation', 'steam', 'nintendo', 'twitch', 'onlyfans', 'patreon'],
    category: 'Entertainment',
  },
  {
    keywords: ['cvs', 'walgreens', 'rite aid', 'pharmacy', 'prescription', 'doctor', 'hospital', 'clinic', 'medical', 'dental', 'vision', 'urgent care', 'emergency room', 'lab corp', 'quest diagnostics', 'health'],
    category: 'Healthcare',
  },
  {
    keywords: ['daycare', 'school', 'tuition', 'education', 'kids', 'children', 'baby', 'diapers', 'toys r us', 'learning', 'tutoring', 'after school'],
    category: 'Kids/Family',
  },
  {
    keywords: ['airline', 'delta', 'united', 'american airlines', 'southwest', 'spirit airlines', 'frontier airlines', 'jetblue', 'flight', 'hotel', 'marriott', 'hilton', 'hyatt', 'airbnb', 'vrbo', 'expedia', 'booking.com', 'hotels.com', 'priceline', 'vacation', 'travel'],
    category: 'Travel',
  },
  {
    keywords: ['atm', 'cash withdrawal', 'cash advance', 'atm withdrawal'],
    category: 'Cash Withdrawal',
  },
  {
    keywords: ['late fee', 'overdraft', 'nsf fee', 'service charge', 'monthly fee', 'annual fee', 'bank fee', 'wire transfer fee', 'foreign transaction'],
    category: 'Fees',
  },
];

export interface ClassificationResult {
  category: Category;
  confidence: ConfidenceLevel;
  type: TransactionType;
}

export function classifyTransaction(
  merchant: string,
  description: string,
  userCorrections: Record<string, Category> = {},
): ClassificationResult {
  const normalized = (merchant + ' ' + description).toLowerCase();
  const merchantKey = merchant.toLowerCase().trim();

  // Check user corrections first (highest priority)
  for (const [key, cat] of Object.entries(userCorrections)) {
    if (merchantKey.includes(key) || key.includes(merchantKey)) {
      return {
        category: cat,
        confidence: 'high',
        type: cat === 'Income' ? 'income' : 'expense',
      };
    }
  }

  // Match against rules
  let bestMatch: { category: Category; matchCount: number } | null = null;

  for (const rule of RULES) {
    let matchCount = 0;
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      if (!bestMatch || matchCount > bestMatch.matchCount) {
        bestMatch = { category: rule.category, matchCount };
      }
    }
  }

  if (bestMatch) {
    const confidence: ConfidenceLevel = bestMatch.matchCount >= 2 ? 'high' : 'medium';
    return {
      category: bestMatch.category,
      confidence,
      type: bestMatch.category === 'Income' ? 'income' : 'expense',
    };
  }

  return { category: 'Other', confidence: 'low', type: 'expense' };
}

export function detectTransactionType(amount: number, description: string): TransactionType {
  const lower = description.toLowerCase();
  if (
    lower.includes('deposit') ||
    lower.includes('payroll') ||
    lower.includes('direct dep') ||
    lower.includes('credit') ||
    lower.includes('refund') ||
    amount > 0
  ) {
    return 'income';
  }
  return 'expense';
}
