import { useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { LIMITS } from '../../lib/constants.js'
import { isFutureDate, todayIso } from '../../lib/dates.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import Button from '../ui/Button.jsx'
import MerchantInput from './MerchantInput.jsx'

export function emptyDraft (settings) {
  return {
    date: todayIso(),
    merchant: '',
    amount: '',
    type: settings.defaultType || 'expense',
    category: settings.defaultCategory || '',
    description: ''
  }
}

export function validate (draft) {
  const errors = {}

  if (!draft.date) errors.date = 'Tanggal wajib diisi.'
  else if (isFutureDate(draft.date)) errors.date = 'Tanggal tidak boleh di masa depan.'

  const merchant = draft.merchant.trim()
  if (!merchant) errors.merchant = 'Nama merchant wajib diisi.'
  else if (merchant.length > LIMITS.merchant) {
    errors.merchant = `Maksimal ${LIMITS.merchant} karakter.`
  }

  const amount = parseAmount(draft.amount)
  if (!draft.amount && draft.amount !== 0) errors.amount = 'Jumlah wajib diisi.'
  else if (!Number.isFinite(amount)) errors.amount = 'Jumlah harus berupa angka.'
  else if (amount <= 0) errors.amount = 'Jumlah harus lebih besar dari 0.'

  if (!draft.category) errors.category = 'Kategori wajib dipilih.'

  if (draft.description.length > LIMITS.description) {
    errors.description = `Maksimal ${LIMITS.description} karakter.`
  }

  return errors
}

export default function TransactionForm ({
  draft,
  setDraft,
  categories,
  merchants = [],
  onSubmit,
  onCancel,
  submitLabel = 'Simpan',
  busy = false
}) {
  const { settings } = useSettings()
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.type === draft.type || category.type === 'both'),
    [categories, draft.type]
  )

  const patch = (changes) => {
    const next = { ...draft, ...changes }
    setDraft(next)
    if (touched) setErrors(validate(next))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setTouched(true)

    const found = validate(draft)
    setErrors(found)
    if (Object.keys(found).length) return

    onSubmit({
      date: draft.date,
      merchant: draft.merchant.trim(),
      amount: parseAmount(draft.amount),
      type: draft.type,
      category: draft.category,
      description: draft.description.trim()
    })
  }

  const amountPreview = Number.isFinite(parseAmount(draft.amount)) && draft.amount !== ''
    ? formatCurrency(parseAmount(draft.amount), settings.currency)
    : null

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend className="label">Jenis</legend>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' }
          ].map((option) => (
            <label
              key={option.value}
              className={`tap flex cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                draft.type === option.value
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <input
                type="radio"
                name="type"
                className="sr-only"
                value={option.value}
                checked={draft.type === option.value}
                // Switching flow can invalidate the chosen category.
                onChange={() => patch({ type: option.value, category: '' })}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="amount">
          Jumlah
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          className={`field text-lg font-semibold ${errors.amount ? 'field-error' : ''}`}
          value={draft.amount}
          placeholder="0"
          onChange={(event) => patch({ amount: event.target.value })}
        />
        {errors.amount ? (
          <p className="hint-error">{errors.amount}</p>
        ) : (
          amountPreview && <p className="mt-1.5 text-sm text-slate-500">{amountPreview}</p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="date">
          Tanggal
        </label>
        <input
          id="date"
          type="date"
          max={todayIso()}
          className={`field ${errors.date ? 'field-error' : ''}`}
          value={draft.date}
          onChange={(event) => patch({ date: event.target.value })}
        />
        {errors.date && <p className="hint-error">{errors.date}</p>}
      </div>

      <div>
        <label className="label" htmlFor="merchant">
          Merchant
        </label>
        <MerchantInput
          value={draft.merchant}
          merchants={merchants}
          invalid={Boolean(errors.merchant)}
          onChange={(merchant) => patch({ merchant })}
          onPick={(merchant) =>
            patch({
              merchant: merchant.name,
              // Reuse the category last used for this merchant when it still fits.
              category:
                draft.category ||
                (visibleCategories.some((item) => item.name === merchant.category)
                  ? merchant.category
                  : '')
            })
          }
        />
        {errors.merchant && <p className="hint-error">{errors.merchant}</p>}
      </div>

      <div>
        <label className="label" htmlFor="category">
          Kategori
        </label>
        <select
          id="category"
          className={`field ${errors.category ? 'field-error' : ''}`}
          value={draft.category}
          onChange={(event) => patch({ category: event.target.value })}
        >
          <option value="">Pilih kategori…</option>
          {visibleCategories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
        {errors.category && <p className="hint-error">{errors.category}</p>}
        {!visibleCategories.length && (
          <p className="mt-1.5 text-sm text-slate-500">
            Belum ada kategori untuk jenis ini. Tambahkan dulu di menu Kategori.
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="description">
          Keterangan <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="description"
          rows={2}
          maxLength={LIMITS.description}
          className={`field resize-none ${errors.description ? 'field-error' : ''}`}
          value={draft.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
        <div className="mt-1.5 flex justify-between gap-3 text-sm">
          <span className="text-expense">{errors.description}</span>
          <span className="shrink-0 text-slate-400">
            {draft.description.length}/{LIMITS.description}
          </span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="secondary" className="flex-1 justify-center" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" className="flex-1 justify-center" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
