import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { LIMITS } from '../../lib/constants.js'
import { accountOptionLabel } from '../../lib/accountIcon.js'
import { isFutureDate, todayIso } from '../../lib/dates.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import Button from '../ui/Button.jsx'
import DatePicker from '../ui/DatePicker.jsx'
import Sheet from '../ui/Sheet.jsx'

export function emptyGoldLot () {
  return {
    date: todayIso(),
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

  const grams = parseAmount(draft.grams)
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

  const grams = parseAmount(draft.grams)
  const cost = parseAmount(draft.cost)
  const perGram = Number.isFinite(grams) && Number.isFinite(cost) && grams > 0 ? cost / grams : null

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await onSubmit({ ...draft, grams, cost, description: draft.description.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={initial.id ? 'Ubah pembelian emas' : 'Beli emas'} onClose={onClose}>
      <form className="space-y-gap-normal" onSubmit={handleSubmit} noValidate>
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
        {(errors.grams || errors.date) && (
          <p className="hint-error">{errors.grams || errors.date}</p>
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
            placeholder="Contoh: Antam 5gr, Pegadaian Bintaro"
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
