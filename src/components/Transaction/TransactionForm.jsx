import { useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { LIMITS, TRANSACTION_TYPES } from '../../lib/constants.js'
import { isFutureDate, todayIso } from '../../lib/dates.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import { normalizeTags } from '../../lib/tags.js'
import AccountPicker from '../ui/AccountPicker.jsx'
import Button from '../ui/Button.jsx'
import CategoryPicker from '../ui/CategoryPicker.jsx'
import DatePicker from '../ui/DatePicker.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import TagInput from '../ui/TagInput.jsx'

export function emptyDraft (settings) {
  return {
    date: todayIso(),
    account: settings.defaultAccount || '',
    toAccount: '',
    amount: '',
    type: settings.defaultType || 'expense',
    category: settings.defaultCategory || '',
    description: '',
    tags: []
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
  tagSuggestions = [],
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
      description: draft.description.trim(),
      tags: normalizeTags(draft.tags)
    })
  }

  const parsedAmount = parseAmount(draft.amount)
  const amountPreview =
    draft.amount !== '' && Number.isFinite(parsedAmount)
      ? formatCurrency(parsedAmount, settings.currency)
      : null

  return (
    <form className="space-y-gap [&_.label]:mb-1" onSubmit={handleSubmit} noValidate>
      <SegmentedControl
        label="Jenis transaksi"
        value={draft.type}
        options={TRANSACTION_TYPES}
        onChange={(type) => patch({ type, category: '' })}
      />

      <div>
        <label className="label" htmlFor="amount">
          Jumlah
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={`field h-9 px-2.5 py-0 text-[18px] font-bold tracking-tight ${errors.amount ? 'field-error' : ''}`}
          value={draft.amount}
          placeholder="0"
          onChange={(event) => patch({ amount: event.target.value })}
        />
        {errors.amount ? (
          <p className="hint-error">{errors.amount}</p>
        ) : (
          amountPreview && <p className="hint">{amountPreview}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-gap">
        <div className="min-w-0">
          <label className="label" htmlFor="account">
            {transfer ? 'Dari akun' : 'Akun'}
          </label>
          <AccountPicker
            id="account"
            label={transfer ? 'Dari akun' : 'Akun'}
            value={draft.account}
            accounts={accounts}
            invalid={Boolean(errors.account)}
            iconSize="sm"
            className="h-9 px-2.5"
            onChange={(account) => patch({ account })}
          />
        </div>

        {transfer ? (
          <div className="min-w-0">
            <label className="label" htmlFor="to-account">
              Ke akun
            </label>
            <AccountPicker
              id="to-account"
              label="Ke akun"
              value={draft.toAccount}
              accounts={accounts.filter((account) => account.name !== draft.account)}
              invalid={Boolean(errors.toAccount)}
              iconSize="sm"
              className="h-9 px-2.5"
              onChange={(toAccount) => patch({ toAccount })}
            />
          </div>
        ) : (
          <div className="min-w-0">
            <label className="label" htmlFor="category">
              Kategori
            </label>
            <CategoryPicker
              id="category"
              value={draft.category}
              categories={visibleCategories}
              invalid={Boolean(errors.category)}
              iconSize="sm"
              className="h-9 px-2.5"
              onChange={(category) => patch({ category })}
            />
          </div>
        )}
      </div>
      {(errors.account || errors.toAccount || errors.category) && (
        <p className="hint-error -mt-1">
          {errors.account || errors.toAccount || errors.category}
        </p>
      )}
      {!transfer && !visibleCategories.length && (
        <p className="hint -mt-1">
          Belum ada kategori untuk jenis ini. Tambahkan dulu di menu Kelola.
        </p>
      )}

      <div>
        <label className="label" htmlFor="date">
          Tanggal
        </label>
        <DatePicker
          id="date"
          max={todayIso()}
          value={draft.date}
          invalid={Boolean(errors.date)}
          className="h-9"
          onChange={(date) => patch({ date })}
        />
        {errors.date && <p className="hint-error">{errors.date}</p>}
      </div>

      <div>
        <label className="label" htmlFor="description">
          Keterangan <span className="font-normal text-subtitle">(opsional)</span>
        </label>
        <textarea
          id="description"
          rows={2}
          maxLength={LIMITS.description}
          className={`field h-[60px] resize-none px-2.5 py-2 ${errors.description ? 'field-error' : ''}`}
          placeholder={transfer ? 'Contoh: tarik tunai' : 'Contoh: McDonald’s'}
          value={draft.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
        <div className="mt-1 flex justify-between gap-3 text-caption">
          <span className="text-expense">{errors.description}</span>
          <span className="shrink-0 text-subtitle">
            {draft.description.length}/{LIMITS.description}
          </span>
        </div>
      </div>

      <TagInput
        value={draft.tags || []}
        suggestions={tagSuggestions}
        onChange={(tags) => patch({ tags })}
        fieldClassName="h-9 px-2.5 py-0"
        hint="Label bebas untuk mengelompokkan transaksi lintas kategori — misalnya proyek, orang, atau perjalanan."
      />

      <div className="flex gap-gap pt-1">
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
