import { useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatAmountInput, parseAmount } from '../../lib/format.js'
import { monthLabel } from '../../lib/dates.js'
import Button from '../ui/Button.jsx'
import Sheet from '../ui/Sheet.jsx'

export default function BudgetForm ({ initial, categories, onSubmit, onClose }) {
  const { settings } = useSettings()
  const [draft, setDraft] = useState({
    ...initial,
    amount: initial.amount ? formatAmountInput(initial.amount, settings.currency) : ''
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const amount = parseAmount(draft.amount)
    const found = {}

    if (!draft.category) found.category = 'Pilih kategori pengeluaran.'
    if (!Number.isFinite(amount) || amount <= 0) found.amount = 'Nominal harus lebih dari nol.'

    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      await onSubmit({ ...initial, category: draft.category, amount })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open
      title={initial.id ? 'Ubah anggaran' : 'Anggaran baru'}
      description={`Berlaku untuk ${monthLabel(initial.month)}`}
      onClose={onClose}
    >
      <form className="space-y-gap-normal" onSubmit={submit} noValidate>
        <div>
          <label className="label" htmlFor="budget-category">Kategori</label>
          <select
            id="budget-category"
            className={`field ${errors.category ? 'field-error' : ''}`}
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>{category.icon} {category.name}</option>
            ))}
          </select>
          {errors.category && <p className="hint-error">{errors.category}</p>}
        </div>

        <div>
          <label className="label" htmlFor="budget-amount">Batas pengeluaran</label>
          <input
            id="budget-amount"
            inputMode="decimal"
            className={`field amount ${errors.amount ? 'field-error' : ''}`}
            value={draft.amount}
            placeholder="Contoh: 1.500.000"
            onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
          />
          {errors.amount && <p className="hint-error">{errors.amount}</p>}
        </div>

        <div className="flex gap-gap pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>Batal</Button>
          <Button type="submit" className="flex-1 justify-center" loading={busy}>Simpan</Button>
        </div>
      </form>
    </Sheet>
  )
}
