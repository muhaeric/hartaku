import { useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { LIMITS, TRANSACTION_TYPES } from '../../lib/constants.js'
import { isFutureDate, todayIso } from '../../lib/dates.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import Button from '../ui/Button.jsx'

export function emptyDraft (settings) {
  return {
    date: todayIso(),
    account: settings.defaultAccount || '',
    toAccount: '',
    amount: '',
    type: settings.defaultType || 'expense',
    category: settings.defaultCategory || '',
    description: ''
  }
}

export function validate (draft) {
  const errors = {}
  const transfer = draft.type === 'transfer'

  if (!draft.date) errors.date = 'Tanggal wajib diisi.'
  else if (isFutureDate(draft.date)) errors.date = 'Tanggal tidak boleh di masa depan.'

  if (!draft.account) errors.account = transfer ? 'Akun asal wajib dipilih.' : 'Akun wajib dipilih.'

  if (transfer) {
    if (!draft.toAccount) errors.toAccount = 'Akun tujuan wajib dipilih.'
    else if (draft.toAccount === draft.account) {
      errors.toAccount = 'Akun tujuan harus berbeda dari akun asal.'
    }
  } else if (!draft.category) {
    errors.category = 'Kategori wajib dipilih.'
  }

  const amount = parseAmount(draft.amount)
  if (!draft.amount && draft.amount !== 0) errors.amount = 'Jumlah wajib diisi.'
  else if (!Number.isFinite(amount)) errors.amount = 'Jumlah harus berupa angka.'
  else if (amount <= 0) errors.amount = 'Jumlah harus lebih besar dari 0.'

  if (draft.description.length > LIMITS.description) {
    errors.description = `Maksimal ${LIMITS.description} karakter.`
  }

  return errors
}

export default function TransactionForm ({
  draft,
  setDraft,
  categories,
  accounts,
  onSubmit,
  onCancel,
  submitLabel = 'Simpan',
  busy = false
}) {
  const { settings } = useSettings()
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  const transfer = draft.type === 'transfer'

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
      account: draft.account,
      // A transfer carries no category, and only a transfer has a destination.
      toAccount: transfer ? draft.toAccount : '',
      amount: parseAmount(draft.amount),
      type: draft.type,
      category: transfer ? '' : draft.category,
      description: draft.description.trim()
    })
  }

  const parsedAmount = parseAmount(draft.amount)
  const amountPreview =
    draft.amount !== '' && Number.isFinite(parsedAmount)
      ? formatCurrency(parsedAmount, settings.currency)
      : null

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend className="label">Jenis</legend>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {TRANSACTION_TYPES.map((option) => (
            <label
              key={option.value}
              className={`tap flex cursor-pointer items-center justify-center rounded-lg px-2 text-center text-sm font-semibold transition ${
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
        <label className="label" htmlFor="account">
          {transfer ? 'Dari akun' : 'Akun'}
        </label>
        <AccountSelect
          id="account"
          value={draft.account}
          accounts={accounts}
          invalid={Boolean(errors.account)}
          onChange={(account) => patch({ account })}
        />
        {errors.account && <p className="hint-error">{errors.account}</p>}
      </div>

      {transfer && (
        <div>
          <label className="label" htmlFor="to-account">
            Ke akun
          </label>
          <AccountSelect
            id="to-account"
            value={draft.toAccount}
            accounts={accounts.filter((account) => account.name !== draft.account)}
            invalid={Boolean(errors.toAccount)}
            onChange={(toAccount) => patch({ toAccount })}
          />
          {errors.toAccount && <p className="hint-error">{errors.toAccount}</p>}
        </div>
      )}

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

      {!transfer && (
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
              Belum ada kategori untuk jenis ini. Tambahkan dulu di menu Kelola.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="label" htmlFor="description">
          Keterangan <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <textarea
          id="description"
          rows={2}
          maxLength={LIMITS.description}
          className={`field resize-none ${errors.description ? 'field-error' : ''}`}
          placeholder={transfer ? 'Contoh: tarik tunai' : 'Contoh: belanja mingguan di Indomaret'}
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

function AccountSelect ({ id, value, accounts, invalid, onChange }) {
  return (
    <>
      <select
        id={id}
        className={`field ${invalid ? 'field-error' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Pilih akun…</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.name}>
            {account.icon} {account.name}
          </option>
        ))}
      </select>
      {!accounts.length && (
        <p className="mt-1.5 text-sm text-slate-500">
          Belum ada akun. Tambahkan dulu di menu Kelola.
        </p>
      )}
    </>
  )
}
