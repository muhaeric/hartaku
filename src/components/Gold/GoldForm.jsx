import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { LIMITS } from '../../lib/constants.js'
import { accountOptionLabel } from '../../lib/accountIcon.js'
import { isFutureDate, todayIso } from '../../lib/dates.js'
import { formatCurrency, formatGrams, parseAmount, parseDecimal } from '../../lib/format.js'
import {
  GOLD_KIND,
  GOLD_KIND_OPTIONS,
  KARAT_PRESETS,
  PURE_KARAT,
  formatKarat,
  formatPurity,
  isValidKarat
} from '../../lib/gold.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import Button from '../ui/Button.jsx'
import DatePicker from '../ui/DatePicker.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import Sheet from '../ui/Sheet.jsx'

export function emptyGoldLot () {
  return {
    date: todayIso(),
    kind: GOLD_KIND.bar,
    karat: '',
    grams: '',
    cost: '',
    fromAccount: '',
    description: ''
  }
}

function validate (draft) {
  const errors = {}

  if (!draft.date) errors.date = 'Tanggal wajib diisi.'
  else if (isFutureDate(draft.date)) errors.date = 'Tanggal tidak boleh di masa depan.'

  if (draft.kind === GOLD_KIND.jewelry) {
    const karat = parseDecimal(draft.karat)
    if (draft.karat === '') errors.karat = 'Kadar wajib diisi.'
    else if (!isValidKarat(karat)) errors.karat = `Kadar harus antara 0 dan ${PURE_KARAT} karat.`
  }

  const grams = parseDecimal(draft.grams)
  if (draft.grams === '') errors.grams = 'Gramasi wajib diisi.'
  else if (!Number.isFinite(grams)) errors.grams = 'Gramasi harus berupa angka.'
  else if (grams <= 0) errors.grams = 'Gramasi harus lebih besar dari 0.'

  const cost = parseAmount(draft.cost)
  if (draft.cost === '') errors.cost = 'Harga beli wajib diisi.'
  else if (!Number.isFinite(cost)) errors.cost = 'Harga beli harus berupa angka.'
  else if (cost <= 0) errors.cost = 'Harga beli harus lebih besar dari 0.'

  if (draft.description.length > LIMITS.description) {
    errors.description = `Maksimal ${LIMITS.description} karakter.`
  }

  return errors
}

export default function GoldForm ({ open, initial, accounts, onSubmit, onClose }) {
  const { settings } = useSettings()
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const patch = (changes) => setDraft((current) => ({ ...current, ...changes }))

  const jewelry = draft.kind === GOLD_KIND.jewelry
  const grams = parseDecimal(draft.grams)
  const cost = parseAmount(draft.cost)
  const karat = jewelry ? parseDecimal(draft.karat) : PURE_KARAT
  const perGram = Number.isFinite(grams) && Number.isFinite(cost) && grams > 0 ? cost / grams : null
  const fine = jewelry && isValidKarat(karat) && Number.isFinite(grams) && grams > 0
    ? (grams * karat) / PURE_KARAT
    : null

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await onSubmit({ ...draft, grams, cost, karat, description: draft.description.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={initial.id ? 'Ubah pembelian emas' : 'Beli emas'} onClose={onClose}>
      <form className="space-y-gap-normal" onSubmit={handleSubmit} noValidate>
        <SegmentedControl
          label="Jenis emas"
          size="md"
          value={draft.kind}
          options={GOLD_KIND_OPTIONS}
          onChange={(kind) => {
            // Bullion's 24K is not a choice anyone made, so it is not carried
            // over: a piece left at 24K by default would be valued as pure.
            patch(kind === draft.kind ? {} : { kind, karat: '' })
            setErrors((current) => ({ ...current, karat: undefined }))
          }}
        />

        {jewelry && (
          <div>
            <label className="label" htmlFor="gold-karat">
              Kadar (karat)
            </label>
            <div className="flex items-center gap-gap">
              <input
                id="gold-karat"
                type="text"
                inputMode="decimal"
                className={`field w-24 shrink-0 font-semibold ${errors.karat ? 'field-error' : ''}`}
                value={draft.karat}
                placeholder="17"
                aria-describedby="gold-karat-hint"
                onChange={(event) => patch({ karat: event.target.value })}
              />
              <p id="gold-karat-hint" className="min-w-0 text-caption text-subtitle">
                {draft.karat === ''
                  ? 'Pilih di bawah, atau ketik sendiri.'
                  : isValidKarat(karat)
                    ? `${formatKarat(karat)} · kadar emas ${formatPurity(karat)}`
                    : `Maksimal ${PURE_KARAT} karat (emas murni).`}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Pilihan kadar">
                {KARAT_PRESETS.map((preset) => {
                  const active = karat === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={active}
                      onClick={() => patch({ karat: String(preset) })}
                      className={`h-7 shrink-0 rounded-full border px-2.5 text-caption transition ${
                        active
                          ? 'border-brand bg-brand-soft font-semibold text-brand-onsoft'
                          : 'border-hairline text-subtitle'
                      }`}
                    >
                      {formatKarat(preset)}
                    </button>
                  )
                })}
            </div>
            {errors.karat && <p className="hint-error">{errors.karat}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-gap">
          <div>
            <label className="label" htmlFor="gold-grams">
              Gramasi
            </label>
            <input
              id="gold-grams"
              type="text"
              inputMode="decimal"
              className={`field font-semibold ${errors.grams ? 'field-error' : ''}`}
              value={draft.grams}
              placeholder="5"
              onChange={(event) => patch({ grams: event.target.value })}
            />
          </div>

          <div>
            <label className="label" htmlFor="gold-date">
              Tanggal beli
            </label>
            <DatePicker
              id="gold-date"
              max={todayIso()}
              value={draft.date}
              invalid={Boolean(errors.date)}
              label="Pilih tanggal beli"
              onChange={(date) => patch({ date })}
            />
          </div>
        </div>
        {errors.grams || errors.date ? (
          <p className="hint-error">{errors.grams || errors.date}</p>
        ) : (
          fine !== null && (
            <p className="hint">
              Setara {formatGrams(fine)} emas murni (24K). Nilainya hanya estimasi dari
              harga buyback 24K — harga jual kembali perhiasan bisa berbeda-beda di tiap toko.
            </p>
          )
        )}

        <div>
          <label className="label" htmlFor="gold-cost">
            Harga beli (total)
          </label>
          <input
            id="gold-cost"
            type="text"
            inputMode="decimal"
            className={`field font-semibold ${errors.cost ? 'field-error' : ''}`}
            value={draft.cost}
            placeholder="0"
            onChange={(event) => patch({ cost: event.target.value })}
          />
          {errors.cost ? (
            <p className="hint-error">{errors.cost}</p>
          ) : (
            perGram && (
              <p className="hint">
                {formatCurrency(cost, settings.currency)} ·{' '}
                {formatCurrency(perGram, settings.currency)} per gram
              </p>
            )
          )}
        </div>

        <div>
          <label className="label" htmlFor="gold-account">
            Dibayar dari akun <span className="font-normal text-subtitle">(opsional)</span>
          </label>
          <select
            id="gold-account"
            className="field"
            value={draft.fromAccount}
            onChange={(event) => patch({ fromAccount: event.target.value })}
          >
            <option value="">Tidak dipotong dari akun</option>
            {sortByLabel(accounts, (account) => account.name).map((account) => (
              <option key={account.id} value={account.name}>
                {accountOptionLabel(account)}
                {account.archived ? ' (arsip)' : ''}
              </option>
            ))}
          </select>
          <p className="hint">
            Kalau diisi, saldo akun itu berkurang sebesar harga beli — tidak perlu mencatat
            pengeluaran terpisah.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="gold-description">
            Keterangan <span className="font-normal text-subtitle">(opsional)</span>
          </label>
          <input
            id="gold-description"
            type="text"
            maxLength={LIMITS.description}
            className={`field ${errors.description ? 'field-error' : ''}`}
            placeholder={
              jewelry ? 'Contoh: Cincin kawin, Toko Emas Sinar' : 'Contoh: Antam 5gr, Pegadaian Bintaro'
            }
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
          {errors.description && <p className="hint-error">{errors.description}</p>}
        </div>

        <div className="flex gap-gap pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1 justify-center" loading={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
