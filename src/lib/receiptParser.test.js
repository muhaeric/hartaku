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

test('repairs letter-shaped digits in rupiah amounts', () => {
  const result = parseTransactions([
    'NM SNACK -Rp12.00O',
    '17 Agu 2026 Belanja',
    'GoPay -Rp12.500O',
    '16 Agu 2026 Uang keluar'
  ].join('\n'))

  assert.deepEqual(result.map(({ amount }) => amount), [12000, 12500])
})

test('does not turn a year from an incomplete date into a transaction', () => {
  const result = parseTransactions([
    "ROTI'O RSUP DR SOERADIJI -Rp15.000",
    'Agu 2026 Belanja',
    'MAMA BAKERY -Rp69.000',
    'Agu 2026 Belanja'
  ].join('\n'))

  assert.equal(result.length, 2)
  assert.deepEqual(result.map(({ amount }) => amount), [15000, 69000])
})
