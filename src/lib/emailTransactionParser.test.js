import assert from 'node:assert/strict'
import test from 'node:test'
import { detectEmailProvider, parseTransactionEmail } from './emailTransactionParser.js'

test('detects provider from a verified-looking sender domain', () => {
  assert.equal(detectEmailProvider({ from: 'notification@klikbca.com' }), 'bca')
  assert.equal(detectEmailProvider({ from: 'info@dana.id' }), 'dana')
})

test('parses a successful rupiah debit notification', () => {
  const parsed = parseTransactionEmail({
    from: 'notification@bankmandiri.co.id',
    subject: 'Transaksi Livin berhasil',
    text: 'Pembayaran berhasil\nNominal: Rp150.000\nMerchant: TOKO MAJU\nTanggal: 5 September 2026',
    internalDate: String(new Date(2026, 8, 5).getTime())
  })

  assert.deepEqual(parsed, {
    provider: 'mandiri',
    type: 'expense',
    amount: 150000,
    date: '2026-09-05',
    description: 'TOKO MAJU',
    confidence: 0.9
  })
})

test('rejects failed and ambiguous notifications', () => {
  assert.equal(parseTransactionEmail({
    from: 'notification@bca.co.id',
    subject: 'Transaksi gagal',
    text: 'Pembayaran gagal. Nominal: Rp50.000'
  }), null)

  assert.equal(parseTransactionEmail({
    from: 'notification@bca.co.id',
    subject: 'Informasi akun',
    text: 'Saldo Rp1.000.000'
  }), null)
})

test('parses incoming funds as income', () => {
  const parsed = parseTransactionEmail({
    from: 'noreply@jago.com',
    subject: 'Dana masuk berhasil',
    text: 'Penerimaan berhasil\nJumlah: IDR 250,000\nDari: PT CONTOH',
    internalDate: String(new Date(2026, 8, 4).getTime())
  })

  assert.equal(parsed.type, 'income')
  assert.equal(parsed.amount, 250000)
})
