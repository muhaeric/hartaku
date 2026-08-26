import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetTransactionsPath } from './links.js'

test('budget transaction links carry category, month and expense filters', () => {
  const path = budgetTransactionsPath('Food & Beverages', '2026-08')
  const url = new URL(path, 'https://hartaku.test')

  assert.equal(url.pathname, '/transactions')
  assert.equal(url.searchParams.get('category'), 'Food & Beverages')
  assert.equal(url.searchParams.get('month'), '2026-08')
  assert.equal(url.searchParams.get('type'), 'expense')
})
