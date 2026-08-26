import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetProgress } from './budgets.js'

test('budgetProgress counts only expenses in the selected month', () => {
  const result = budgetProgress(
    [{ id: 'b1', month: '2026-08', category: 'Makan', amount: 1_000_000 }],
    [
      { date: '2026-08-01', type: 'expense', category: 'Makan', amount: 250_000 },
      { date: '2026-07-31', type: 'expense', category: 'Makan', amount: 100_000 },
      { date: '2026-08-02', type: 'income', category: 'Makan', amount: 500_000 },
      { date: '2026-08-03', type: 'transfer', category: 'Makan', amount: 50_000 }
    ],
    '2026-08'
  )

  assert.equal(result.totalSpent, 250_000)
  assert.equal(result.remaining, 750_000)
  assert.equal(result.ratio, 0.25)
})

test('budgetProgress reports overspending and expenses without a budget', () => {
  const result = budgetProgress(
    [{ id: 'b1', month: '2026-08', category: 'Makan', amount: 100_000 }],
    [
      { date: '2026-08-01', type: 'expense', category: 'Makan', amount: 125_000 },
      { date: '2026-08-02', type: 'expense', category: 'Transport', amount: 40_000 }
    ],
    '2026-08'
  )

  assert.equal(result.entries[0].over, true)
  assert.equal(result.entries[0].remaining, -25_000)
  assert.equal(result.unbudgetedSpent, 40_000)
})
