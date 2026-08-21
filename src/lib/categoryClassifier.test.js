import assert from 'node:assert/strict'
import test from 'node:test'
import { suggestCategory } from './categoryClassifier.js'

const categories = [
  { id: 'food', name: 'Food & Beverages', type: 'expense' },
  { id: 'transport', name: 'Transportation', type: 'expense' },
  { id: 'salary', name: 'Salary', type: 'income' },
  { id: 'other', name: 'Other', type: 'both' }
]

test('prefers the category previously used for the same merchant', () => {
  const result = suggestCategory({
    description: 'Kopi Kenangan Grand Indonesia',
    type: 'expense',
    categories,
    account: 'Bank',
    transactions: [{
      description: 'Kopi Kenangan Grand Indonesia',
      category: 'Food & Beverages',
      type: 'expense',
      account: 'Bank'
    }]
  })

  assert.equal(result.category, 'Food & Beverages')
  assert.equal(result.source, 'history')
})

test('uses conservative merchant keywords when history is empty', () => {
  const result = suggestCategory({
    description: 'Pembayaran QRIS STARBUCKS',
    type: 'expense',
    categories
  })

  assert.deepEqual(result, {
    category: 'Food & Beverages',
    confidence: 0.82,
    source: 'keywords'
  })
})

test('only considers categories compatible with the transaction type', () => {
  const result = suggestCategory({
    description: 'Payroll Agustus',
    type: 'expense',
    categories
  })

  assert.equal(result, null)
})

test('does not guess from weak or ambiguous text', () => {
  const result = suggestCategory({
    description: 'PT Contoh Nusantara',
    type: 'expense',
    categories
  })

  assert.equal(result, null)
})
