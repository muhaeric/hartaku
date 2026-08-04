import { useSettings } from '../../context/SettingsContext.jsx'
import { TRANSACTION_TYPES } from '../../lib/constants.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import { Card } from '../ui/Card.jsx'

const TYPES = TRANSACTION_TYPES.filter((type) => type.value !== 'transfer')

/**
 * One detected transaction, editable in place. Everything OCR guessed is a
 * starting point - the row is built so correcting it is faster than retyping.
 */
export default function ImportRow ({ item, categories, selected, onToggle, onChange }) {
  const { settings } = useSettings()

  const amount = parseAmount(item.amount)
  const validAmount = Number.isFinite(amount) && amount > 0

  const visibleCategories = categories.filter(
    (category) => category.type === item.type || category.type === 'both'
  )

  return (
    <Card
      as="li"
      flush
      className={`p-3 transition ${selected ? 'ring-1 ring-brand-500' : 'opacity-60'}`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Sertakan ${item.description || 'transaksi ini'}`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-hairline text-brand-500"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            aria-label="Keterangan"
            className="field h-9 py-0 text-body"
            placeholder="Keterangan"
            value={item.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Jumlah"
                className={`field h-9 py-0 text-body font-semibold ${
                  validAmount ? '' : 'field-error'
                }`}
                value={item.amount}
                onChange={(event) => onChange({ amount: event.target.value })}
              />
              {validAmount && (
                <p className="mt-0.5 truncate text-caption text-subtitle dark:text-subtitle-dark">
                  {formatCurrency(amount, settings.currency)}
                </p>
              )}
            </div>

            <input
              type="date"
              aria-label="Tanggal"
              className="field h-9 py-0 text-body"
              value={item.date}
              onChange={(event) => onChange({ date: event.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Jenis"
              className="field h-9 py-0 text-body"
              value={item.type}
              // Switching flow can invalidate the chosen category.
              onChange={(event) => onChange({ type: event.target.value, category: '' })}
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Kategori"
              className={`field h-9 py-0 text-body ${item.category ? '' : 'field-error'}`}
              value={item.category}
              onChange={(event) => onChange({ category: event.target.value })}
            >
              <option value="">Kategori…</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Card>
  )
}
