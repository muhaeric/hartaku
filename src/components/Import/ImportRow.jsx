import { useSettings } from '../../context/SettingsContext.jsx'
import { TRANSACTION_TYPES } from '../../lib/constants.js'
import { todayIso } from '../../lib/dates.js'
import { formatCurrency, parseAmount } from '../../lib/format.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import { Card } from '../ui/Card.jsx'
import DatePicker from '../ui/DatePicker.jsx'

const TYPES = sortByLabel(TRANSACTION_TYPES.filter((type) => type.value !== 'transfer'))

/**
 * One detected transaction, editable in place. Everything OCR guessed is a
 * starting point - the row is built so correcting it is faster than retyping.
 */
export default function ImportRow ({ item, categories, selected, onToggle, onChange }) {
  const { settings } = useSettings()

  const amount = parseAmount(item.amount)
  const validAmount = Number.isFinite(amount) && amount > 0

  const visibleCategories = sortByLabel(
    categories.filter((category) => category.type === item.type || category.type === 'both'),
    (category) => category.name
  )

  return (
    <Card
      as="li"
      flush
      className={`p-3 transition ${selected ? 'ring-1 ring-brand' : 'opacity-60'}`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Sertakan ${item.description || 'transaksi ini'}`}
          className="mt-1 h-5 w-5 shrink-0 rounded border-hairline text-brand"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <input
            type="text"
            aria-label="Keterangan"
            className="field h-9 py-0"
            placeholder="Keterangan"
            value={item.description}
            onChange={(event) => onChange({
              description: event.target.value,
              categorySuggested: false,
              categorySuggestionSource: ''
            })}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Jumlah"
                className={`field h-9 py-0 font-semibold ${
                  validAmount ? '' : 'field-error'
                }`}
                value={item.amount}
                onChange={(event) => onChange({ amount: event.target.value })}
              />
              {validAmount && (
                <p className="mt-0.5 truncate text-caption text-subtitle">
                  {formatCurrency(amount, settings.currency)}
                </p>
              )}
            </div>

            <DatePicker
              value={item.date}
              max={todayIso()}
              invalid={!item.date}
              label="Pilih tanggal transaksi"
              className="h-9"
              onChange={(date) => onChange({ date })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Jenis"
              className="field h-9 py-0"
              value={item.type}
              // Switching flow can invalidate the chosen category.
              onChange={(event) => onChange({
                type: event.target.value,
                category: '',
                categorySuggested: false,
                categorySuggestionSource: ''
              })}
            >
              {TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Kategori"
              className={`field h-9 py-0 ${item.category ? '' : 'field-error'}`}
              value={item.category}
              onChange={(event) => onChange({
                category: event.target.value,
                categorySuggested: false,
                categorySuggestionSource: ''
              })}
            >
              <option value="">Kategori…</option>
              {visibleCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {item.categorySuggested && (
            <p className="text-caption text-brand">
              ✨ Kategori dipilih otomatis dari{' '}
              {item.categorySuggestionSource === 'history' ? 'riwayat transaksi' : 'keterangan'}.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
