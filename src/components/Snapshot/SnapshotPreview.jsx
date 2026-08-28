import { buildFinancialSnapshot } from '../../lib/financialSnapshot.js'
import { FinancialSnapshotView } from './FinancialSnapshot.jsx'

const MONTHS = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']
const SAVED = [52, 58, 64, 68, 72, 76]

const TRANSACTIONS = MONTHS.flatMap((month, index) => {
  const income = 10_000
  const expense = income * (1 - SAVED[index] / 100)
  return [
    { id: `${month}-i`, date: `${month}-01`, type: 'income', amount: income, category: 'Gaji', account: 'Bank' },
    { id: `${month}-a`, date: `${month}-02`, type: 'expense', amount: expense * 0.36, category: 'Makanan', account: 'Bank' },
    { id: `${month}-b`, date: `${month}-03`, type: 'expense', amount: expense * 0.3, category: 'Tagihan', account: 'Bank' },
    { id: `${month}-c`, date: `${month}-04`, type: 'expense', amount: expense * 0.2, category: 'Transportasi', account: 'Dompet' },
    { id: `${month}-d`, date: `${month}-05`, type: 'expense', amount: expense * 0.14, category: 'Hiburan', account: 'Bank' }
  ]
})

const snapshot = buildFinancialSnapshot({
  month: '2026-08',
  transactions: TRANSACTIONS,
  categories: [
    { name: 'Makanan', icon: '🍔', color: '#ee754f' },
    { name: 'Tagihan', icon: '🏠', color: '#6277f2' },
    { name: 'Transportasi', icon: '🚗', color: '#25a785' },
    { name: 'Hiburan', icon: '🎮', color: '#a674e8' }
  ],
  accounts: [
    { name: 'Bank', kind: 'bank', openingBalance: 70_000 },
    { name: 'Dompet', kind: 'cash', openingBalance: 8_000 },
    { name: 'Investasi', kind: 'other', openingBalance: 28_000 }
  ],
  goldLots: [
    { date: '2026-01-12', grams: 8, cost: 16_000, fromAccount: 'Bank' },
    { date: '2026-05-14', grams: 2, cost: 4_000, fromAccount: 'Bank' },
    { date: '2026-08-06', grams: 1, cost: 2_000, fromAccount: 'Bank' }
  ],
  goldPrice: 2_100,
  budgets: [
    { month: '2026-08', category: 'Makanan', amount: 1_000 },
    { month: '2026-08', category: 'Tagihan', amount: 900 }
  ]
})

export default function SnapshotPreview () {
  return <FinancialSnapshotView snapshot={snapshot} month="2026-08" />
}
