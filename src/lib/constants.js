export const SPREADSHEET_NAME = 'Hartaku - Expense Tracker'

export const SHEET = {
  transactions: 'Transactions',
  categories: 'Categories',
  accounts: 'Accounts',
  gold: 'Gold',
  budgets: 'Budgets'
}

/**
 * `to_account`, `tags`, and `source_id` are appended rather than slotted next to the fields
 * they belong with: columns are positional, so inserting one in the middle would
 * shift every existing row's data one cell to the right.
 */
export const TRANSACTION_HEADERS = [
  'id',
  'date',
  'account',
  'amount',
  'type',
  'category',
  'description',
  'created_at',
  'updated_at',
  'to_account',
  'tags',
  // Stable external identifier, currently `gmail:<message id>`, for deduplication.
  'source_id'
]

/** `archived` is appended for the same reason `to_account` is: columns are positional. */
export const CATEGORY_HEADERS = [
  'id',
  'name',
  'type',
  'color',
  'icon',
  'description',
  'sort_order',
  'archived'
]

/** One row per gold purchase. `price_per_gram` is derived, stored for readability. */
export const GOLD_HEADERS = [
  'id',
  'date',
  'grams',
  'cost',
  'price_per_gram',
  'from_account',
  'description',
  'created_at',
  'updated_at'
]

export const ACCOUNT_HEADERS = [
  'id',
  'name',
  'kind',
  'color',
  'icon',
  'opening_balance',
  'description',
  'sort_order',
  'archived'
]

/** One spending limit for one category in one calendar month. */
export const BUDGET_HEADERS = [
  'id',
  'month',
  'category',
  'amount',
  'created_at',
  'updated_at'
]

export const TYPE = {
  expense: 'expense',
  income: 'income',
  transfer: 'transfer'
}

export const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'transfer', label: 'Transfer' }
]

/** Categories can be limited to one flow, or usable by both. */
export const CATEGORY_TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'both', label: 'Keduanya' }
]

/**
 * Themes, in the order they appear in settings. No colours here on purpose: the
 * palettes live in src/styles/index.css keyed by these same ids, and the picker
 * renders each preview by carrying its own `data-theme`, so the list and the
 * palettes cannot drift apart. `decorated` only tells the copy which ones have
 * an ornament behind the page - ThemeBackdrop owns the art itself.
 */
export const THEMES = [
  { value: 'auto', label: 'Ikut sistem' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'ocean', label: 'Laut', decorated: true },
  { value: 'space', label: 'Luar Angkasa', decorated: true },
  { value: 'flower', label: 'Bunga', decorated: true },
  { value: 'animal', label: 'Hewan', decorated: true },
  /** The only themes that take a picture from the user rather than shipping one. */
  { value: 'glass', label: 'Kaca Gelap', decorated: true, photo: true },
  { value: 'glass-light', label: 'Kaca Terang', decorated: true, photo: true }
]

/**
 * Both glass cuts share every rule except their palette, so the checks that ask
 * "is a photo relevant here" go through this rather than comparing against one
 * id and quietly missing the other. The stylesheet matches them the same way,
 * with `[data-theme^='glass']`.
 */
export function isGlassTheme (theme) {
  return String(theme || '').startsWith('glass')
}

/**
 * Category hues come from a fixed categorical theme, assigned in order and never
 * cycled. This ordering clears the colour-blind separation and normal-vision
 * floors on the adjacent pairlist (validated, light surface); a few sit under 3:1
 * against the surface, which is why every swatch always ships with its text label.
 */
export const CATEGORY_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948' // red
]

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Beverages', type: 'expense', color: '#eb6834', icon: '🍔' },
  { name: 'Transportation', type: 'expense', color: '#2a78d6', icon: '🚗' },
  { name: 'Utilities', type: 'expense', color: '#eda100', icon: '💡' },
  { name: 'Entertainment', type: 'expense', color: '#e87ba4', icon: '🎮' },
  { name: 'Salary', type: 'income', color: '#008300', icon: '💰' },
  { name: 'Investment', type: 'income', color: '#1baf7a', icon: '📈' },
  { name: 'Other', type: 'both', color: '#4a3aa7', icon: '📝' }
]

/** Where the money physically sits. `receivable`/`debt` can go negative. */
export const ACCOUNT_KINDS = [
  { value: 'cash', label: 'Tunai', icon: '💵' },
  { value: 'bank', label: 'Bank', icon: '🏦' },
  { value: 'ewallet', label: 'E-wallet', icon: '📱' },
  { value: 'receivable', label: 'Piutang', icon: '🤝' },
  { value: 'debt', label: 'Utang', icon: '📉' },
  { value: 'other', label: 'Lainnya', icon: '👛' }
]

export const DEFAULT_ACCOUNTS = [
  { name: 'Cash', kind: 'cash', color: '#008300', icon: '💵', openingBalance: 0 },
  { name: 'Bank', kind: 'bank', color: '#2a78d6', icon: '🏦', openingBalance: 0 },
  { name: 'Piutang', kind: 'receivable', color: '#eda100', icon: '🤝', openingBalance: 0 }
]

export const CURRENCIES = [
  { code: 'IDR', label: 'Rupiah (Rp)', locale: 'id-ID', fractionDigits: 0 },
  { code: 'USD', label: 'US Dollar ($)', locale: 'en-US', fractionDigits: 2 },
  { code: 'SGD', label: 'Singapore Dollar (S$)', locale: 'en-SG', fractionDigits: 2 },
  { code: 'MYR', label: 'Ringgit (RM)', locale: 'ms-MY', fractionDigits: 2 },
  { code: 'EUR', label: 'Euro (€)', locale: 'de-DE', fractionDigits: 2 }
]

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: '31/12/2026' },
  { value: 'MM/DD/YYYY', label: '12/31/2026' },
  { value: 'YYYY-MM-DD', label: '2026-12-31' }
]

/** How many rows the transaction list adds each time the scroll reaches the end. */
export const PAGE_SIZE = 25

export const LIMITS = {
  description: 200,
  categoryName: 30,
  accountName: 30,
  tagName: 24,
  // A row that carries more labels than this is describing itself, not filing.
  tagsPerTransaction: 8
}

/** Gold is quoted per gram; three decimals covers the smallest bars sold. */
export const GRAM_DECIMALS = 3
