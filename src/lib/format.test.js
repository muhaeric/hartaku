import test from 'node:test'
import assert from 'node:assert/strict'
import { formatGrams, parseAmount, parseDecimal } from './format.js'

test('grams keep every decimal whichever separator is typed', () => {
  assert.equal(parseDecimal('0.4016'), 0.4016)
  assert.equal(parseDecimal('0,4016'), 0.4016)
  assert.equal(parseDecimal('5'), 5)
  assert.equal(parseDecimal('17,5'), 17.5)
  assert.equal(parseDecimal('1.250,5'), 1250.5)
  assert.equal(parseDecimal('1,250.5'), 1250.5)
  assert.ok(Number.isNaN(parseDecimal('')))
})

test('money still reads three trailing digits as thousands', () => {
  assert.equal(parseAmount('50.000'), 50000)
  assert.equal(parseAmount('10000000'), 10000000)
})

test('a four-decimal weight is shown in full', () => {
  assert.equal(formatGrams(0.4016), '0,4016 gr')
})
