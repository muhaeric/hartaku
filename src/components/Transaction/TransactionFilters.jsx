import { SearchIcon } from '../ui/icons.jsx'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' }
]

export default function TransactionFilters ({ filters, categories, onChange }) {
  const toggleCategory = (name) => {
    const selected = new Set(filters.categories)
    if (selected.has(name)) selected.delete(name)
    else selected.add(name)
    onChange({ categories: [...selected] })
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <label className="sr-only" htmlFor="search">
          Cari merchant
        </label>
        <input
          id="search"
          type="search"
          className="field pl-11"
          placeholder="Cari merchant…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </div>

      <div
        className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Filter jenis"
      >
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.type === option.value}
            onClick={() => onChange({ type: option.value })}
            className={`min-h-[40px] rounded-lg px-2 text-sm font-semibold transition ${
              filters.type === option.value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1" role="group" aria-label="Filter kategori">
            {categories.map((category) => {
              const active = filters.categories.includes(category.name)
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCategory(category.name)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-500'
                      : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full ring-1 ring-slate-900/10 dark:ring-white/20"
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
