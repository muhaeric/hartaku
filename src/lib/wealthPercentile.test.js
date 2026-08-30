import test from 'node:test'
import assert from 'node:assert/strict'
import { indonesiaWealthStanding } from './wealthPercentile.js'

test('places wealth at the completed Indonesian percentile threshold', () => {
  assert.equal(indonesiaWealthStanding(0).percentile, 11)
  assert.equal(indonesiaWealthStanding(112479769).percentile, 50)
  assert.equal(indonesiaWealthStanding(930000000).percentile, 89)
  assert.equal(indonesiaWealthStanding(931098560).percentile, 90)
  assert.equal(indonesiaWealthStanding(3483401216).percentile, 99)
})

test('maps WID distribution groups to understandable wealth classes', () => {
  assert.equal(indonesiaWealthStanding(100000000).label, 'Kelompok kekayaan bawah')
  assert.equal(indonesiaWealthStanding(200000000).label, 'Kelas kekayaan menengah')
  assert.equal(indonesiaWealthStanding(1000000000).label, 'Kelas kekayaan atas')
  assert.equal(indonesiaWealthStanding(4000000000).label, 'Kelas kekayaan sangat atas')
})

test('returns null for an unavailable figure', () => {
  assert.equal(indonesiaWealthStanding(null), null)
  assert.equal(indonesiaWealthStanding(undefined), null)
})
