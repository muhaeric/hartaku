export const SPREADSHEET_NAME = 'Hartaku - Expense Tracker'

export const SHEET = {
  transactions: 'Transactions',
  categories: 'Categories'
}

export const TRANSACTION_HEADERS = [
  'id',
  'date',
  'merchant',
  'amount',
  'type',
  'category',
  'description',
  'created_at',
  'updated_at'
]

export const CATEGORY_HEADERS = [
  'id',
  'name',
  'type',
  'color',
  'icon',
  'description',
  'sort_order'
]

export const TYPE = {
  expense: 'expense',
  income: 'income'
}

/** Categories can be limited to one flow, or usable by both. */
export const CATEGORY_TYPES = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
  { value: 'both', label: 'Keduanya' }
]

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

export const PAGE_SIZE = 20
export const PAGINATION_THRESHOLD = 50

export const LIMITS = {
  merchant: 50,
  description: 200,
  categoryName: 30
}
