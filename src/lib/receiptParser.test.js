import assert from 'node:assert/strict'
import test from 'node:test'
import { parseTransactions } from './receiptParser.js'

test('pairs a date below an amount with the same statement row', () => {
  const text = [
    'Soto Seger Bintang -Rp16.500',
    '21 Agu 2026 Belanja',
    'WARUNG SAYUR BU NING -Rp101.000',
    '21 Agu 2026 Belanja',
    'APOTEK MANGESTI GENTAN -Rp48.500',
    '20 Agu 2026 Belanja'
  ].join('\n')

  const result = parseTransactions(text)

  assert.deepEqual(
    result.map(({ merchant, amount, date }) => ({ merchant, amount, date })),
    [
      { merchant: 'Soto Seger Bintang', amount: 16500, date: '2026-08-21' },
      { merchant: 'WARUNG SAYUR BU NING', amount: 101000, date: '2026-08-21' },
      { merchant: 'APOTEK MANGESTI GENTAN', amount: 48500, date: '2026-08-20' }
    ]
  )
})

test('keeps carrying a date heading down to following statement rows', () => {
  const text = [
    '21 Agu 2026',
    'Kopi Pagi -Rp25.000',
    'Makan Siang -Rp40.000'
  ].join('\n')

  const result = parseTransactions(text)

  assert.deepEqual(result.map(({ date }) => date), ['2026-08-21', '2026-08-21'])
})
