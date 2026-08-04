import { monthLabel } from '../../lib/dates.js'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import SelectPill from '../ui/SelectPill.jsx'
import { SearchIcon } from '../ui/icons.jsx'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Keluar' },
  { value: 'income', label: 'Masuk' },
  { value: 'transfer', label: 'Transfer' }
]

/**
 * Search, two pills and one segmented row - about 150px total, so the list is
 * still visible above the fold on a phone.
 */
export default function TransactionFilters ({
  filters,
  month,
  monthOptions,
  categories,
  accounts,
  onChange,
  onMonthChange
}) {
  const toggleCategory = (name) => {
    const selected = new Set(filters.categories)
    if (selected.has(name)) selected.delete(name)
    else selected.add(name)
    onChange({ categories: [...selected] })
  }

  return (
    <div className="space-y-gap">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-subtitle" />
        <label className="sr-only" htmlFor="search">
          Cari keterangan atau kategori
        </label>
        <input
          id="search"
          type="search"
          className="field h-10 py-0 pl-10"
          placeholder="Cari keterangan…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-gap">
        <SelectPill
          label="Pilih bulan"
          value={month}
          onChange={onMonthChange}
          options={monthOptions.map((key) => ({ value: key, label: monthLabel(key) }))}
        />
        <SelectPill
          label="Filter akun"
          value={filters.account}
          onChange={(account) => onChange({ account })}
          options={[
            { value: '', label: 'Semua akun' },
            ...accounts.map((account) => ({ value: account.name, label: account.name }))
          ]}
        />
      </div>

      <SegmentedControl
        label="Filter jenis"
        value={filters.type}
        options={TYPE_OPTIONS}
        onChange={(type) => onChange({ type })}
      />

      {/* Transfers carry no category, so the chips would filter them all out. */}
      {categories.length > 0 && filters.type !== 'transfer' && (
        <div className="-mx-page overflow-x-auto px-page">
          <div className="flex gap-1.5 pb-0.5" role="group" aria-label="Filter kategori">
            {categories.map((category) => {
              const active = filters.categories.includes(category.name)
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(category.name)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-caption transition ${
                    active
                      ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'border-hairline text-subtitle dark:border-hairline-dark dark:text-subtitle-dark'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
