import test from 'node:test'
import assert from 'node:assert/strict'
import { fineGrams, normalizeGoldLot } from './gold.js'
import { goldLotValue, goldSummary } from './summary.js'

test('lots saved before jewellery existed read as 24K bullion', () => {
  assert.deepEqual(normalizeGoldLot({ grams: 5, kind: '', karat: '' }), {
    grams: 5,
    kind: 'bar',
    karat: 24
  })
})

test('bullion is always 24K whatever the karat cell says', () => {
  assert.equal(normalizeGoldLot({ kind: 'bar', karat: 17 }).karat, 24)
})

test('jewellery keeps its karat, and an unreadable one falls back to pure', () => {
  assert.equal(normalizeGoldLot({ kind: 'jewelry', karat: '17' }).karat, 17)
  assert.equal(normalizeGoldLot({ kind: 'jewelry', karat: 30 }).karat, 24)
  assert.equal(normalizeGoldLot({ kind: 'jewelry', karat: 'x' }).karat, 24)
})

test('fine grams scale the weight by karat / 24', () => {
  assert.equal(fineGrams({ kind: 'jewelry', karat: 18, grams: 4 }), 3)
  assert.equal(fineGrams({ kind: 'bar', grams: 4 }), 4)
})

test('a mixed pile is valued and averaged on its pure gold content', () => {
  const lots = [
    { kind: 'bar', karat: 24, grams: 2, cost: 2000 },
    { kind: 'jewelry', karat: 18, grams: 4, cost: 2500 }
  ]
  const summary = goldSummary(lots, 1000)

  assert.equal(summary.grams, 6)
  assert.equal(summary.fineGrams, 5)
  assert.equal(summary.hasJewelry, true)
  assert.equal(summary.value, 5000)
  assert.equal(summary.profit, 500)
  assert.equal(summary.averageCost, 900)
  assert.equal(goldLotValue(lots[1], 1000), 3000)
  assert.equal(goldLotValue(lots[1], null), null)
})
