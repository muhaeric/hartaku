import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFinancialSnapshot, savingRate } from './financialSnapshot.js'

const transactions = [
  { id: '1', date: '2026-08-01', type: 'income', amount: 1000, category: 'Gaji', account: 'Bank' },
  { id: '2', date: '2026-08-02', type: 'expense', amount: 400, category: 'Makan', account: 'Bank', description: 'Makan siang' },
  { id: '3', date: '2026-07-02', type: 'income', amount: 1000, category: 'Gaji', account: 'Bank' },
  { id: '4', date: '2026-07-03', type: 'expense', amount: 500, category: 'Makan', account: 'Bank' }
]

test('savingRate is relative and never exposes an amount', () => {
  assert.equal(savingRate(transactions.slice(0, 2)), 60)
  assert.equal(savingRate([{ type: 'expense', amount: 10 }]), null)
})

test('snapshot derives visible percentages from actual rows', () => {
  const result = buildFinancialSnapshot({
    transactions,
    month: '2026-08',
    categories: [{ name: 'Makan', icon: '🍔', color: '#f00' }],
    accounts: [{ name: 'Bank', kind: 'bank', openingBalance: 2000 }],
    goldLots: [{ date: '2026-08-01', grams: 1, cost: 1000, fromAccount: 'Bank' }],
    goldPrice: 1000
  })

  assert.equal(result.indicators.saving, 60)
  assert.deepEqual(result.spending, [{ name: 'Makan', icon: '🍔', color: '#f00', percentage: 100 }])
  assert.equal(result.spendingSummary, 'Makan (100%) menjadi tujuan utama pengeluaranmu bulan ini. Kategori Makan terdiri dari 1 transaksi, termasuk “Makan siang”. Transaksi terbesar bulan ini tercatat sebagai “Makan siang” di kategori Makan.')
  assert.equal(result.progressChange, 10)
  assert.equal(result.assets.reduce((sum, item) => sum + item.percentage, 0), 100)
  assert.equal(result.share.assetTypes, 2)
  assert.equal(result.share.largestAsset.label, 'Kas & Bank')
  assert.equal(result.insight, 'Tingkat menabungmu meningkat 10 poin dibanding bulan lalu.')
})

test('snapshot hides unsupported sections instead of inventing values', () => {
  const result = buildFinancialSnapshot({ month: '2026-08' })
  assert.equal(result.hasAnyData, false)
  assert.equal(result.score, null)
  assert.deepEqual(result.spending, [])
  assert.equal(result.spendingSummary, null)
  assert.deepEqual(result.assets, [])
  assert.equal(result.insight, null)
})
