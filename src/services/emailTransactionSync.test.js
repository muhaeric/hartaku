import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeEmailCandidates, prepareEmailTransactions } from './emailTransactionSync.js'

const settings = {
  emailAccountMappings: { jago: 'Bank Jago' },
  emailPendingTransactions: [{ sourceId: 'gmail:pending' }],
  emailDismissedSourceIds: ['gmail:dismissed']
}

const accounts = [{ name: 'Bank Jago', archived: false }]
const categories = [{ name: 'Other', type: 'both', archived: false }]

function jagoEmail (id) {
  return {
    id,
    from: 'Jago <noreply@jago.com>',
    subject: 'Kamu telah melakukan transfer 💸',
    text: 'Transfer berhasil\nKe\nTOKO CONTOH\nJumlah\nRp10.000\nTanggal transaksi\n05 September 2026 18:26 WIB',
    internalDate: String(new Date(2026, 8, 5, 18, 26).getTime())
  }
}

test('prepares email transactions without writing them and deduplicates every handled state', () => {
  const { candidates, result } = prepareEmailTransactions({
    emails: [
      jagoEmail('new'),
      jagoEmail('pending'),
      jagoEmail('dismissed'),
      jagoEmail('recorded')
    ],
    settings,
    accounts,
    categories,
    transactions: [{ sourceId: 'gmail:recorded' }]
  })

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].sourceId, 'gmail:new')
  assert.equal(candidates[0].account, 'Bank Jago')
  assert.equal(candidates[0].amount, 10000)
  assert.equal(result.found, 1)
  assert.equal(result.duplicates, 3)
  assert.equal('imported' in result, false)
})

test('merges pending candidates by Gmail source id', () => {
  const existing = [{ sourceId: 'gmail:a', amount: 1 }]
  const incoming = [
    { sourceId: 'gmail:a', amount: 99 },
    { sourceId: 'gmail:b', amount: 2 },
    { amount: 3 }
  ]

  assert.deepEqual(mergeEmailCandidates(existing, incoming), [
    { sourceId: 'gmail:a', amount: 1 },
    { sourceId: 'gmail:b', amount: 2 }
  ])
})
