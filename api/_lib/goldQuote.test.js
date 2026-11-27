import test from 'node:test'
import assert from 'node:assert/strict'
import { buildQuote, readSource } from './goldQuote.js'

const row = (materialType, weight, sellPrice, buybackPrice, extra = {}) => ({
  material: 'gold',
  materialType,
  weight,
  weightUnit: 'gr',
  sellPrice,
  buybackPrice,
  recordedDate: '2026-10-19',
  displayName: 'Dealer',
  ...extra
})

test('a zero 1 gram row falls back to the other weights of the same brand', () => {
  const read = readSource(
    [row('ANTAM', 1, 0, 0), row('ANTAM', 10, 25_614_000, 23_546_000), row('UBS', 1, 2_551_000, 2_354_000)],
    /^antam$/i
  )
  assert.equal(read.buybackPerGram, 2_354_600)
})

test('rows with a swapped or implausible spread are rejected', () => {
  assert.equal(readSource([row('Laku Emas', 1, 2_410_000, 2_483_000)], /./), null)
  assert.equal(readSource([row('Emas', 1, 2_500_000, 1_500_000)], /./), null)
})

test('a source quoting only below a gram is still read, per gram', () => {
  const read = readSource([row('unknown', 0.01, 24_560, 23_700, { weightUnit: 'gram' })], /./)
  assert.equal(read.buybackPerGram, 2_370_000)
})

test('each brand is the median of its dealers, the market the median of brands', () => {
  const quote = buildQuote({
    anekalogam: [row('LM Antam produksi tahun 2026', 1, 2_564_000, 2_460_000)],
    indogold: [
      row('Antam', 1, 2_572_000, 2_446_000),
      row('UBS', 1, 2_476_000, 2_330_000),
      row('IndoGold', 1, 2_458_000, 2_335_000)
    ],
    'hargaemas-com': [row('Emas Antam', 1, 2_572_000, 2_387_000)],
    emasku: [row('Gold', 1, 2_476_000, 2_346_000)],
    galeri24: null
  })

  assert.equal(quote.brands.antam.buybackPerGram, 2_446_000)
  assert.deepEqual(quote.brands.antam.sources, ['Dealer', 'Dealer', 'Dealer'])
  assert.equal(quote.brands.emasku.buybackPerGram, 2_346_000)
  assert.equal(quote.brands.galeri24, undefined)
  assert.equal(quote.buybackPerGram, 2_340_500)
  assert.equal(quote.sellPerGram, 2_572_000)
})

test('a brand far off the rest of the market is dropped as a bad read', () => {
  const quote = buildQuote({
    anekalogam: [row('Antam', 1, 2_564_000, 2_460_000)],
    emasku: [row('Gold', 1, 2_476_000, 2_346_000)],
    indogold: [row('IndoGold', 1, 2_458_000, 2_335_000)],
    pegadaian: [row('unknown', 1, 990_000, 950_000)]
  })
  assert.equal(quote.brands.pegadaian, undefined)
  assert.ok(quote.brands.antam)
})

test('nothing readable is null, not a zero price', () => {
  assert.equal(buildQuote({ anekalogam: null, emasku: [] }), null)
})
