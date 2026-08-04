import { SearchIcon } from '../ui/icons.jsx'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Keluar' },
  { value: 'income', label: 'Masuk' },
  { value: 'transfer', label: 'Transfer' }
]

export default function TransactionFilters ({ filters, categories, accounts, onChange }) {
  const toggleCategory = (name) => {
    const selected = new Set(filters.categories)
    if (selected.has(name)) selected.delete(name)
    else selected.add(name)
    onChange({ categories: [...selected] })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <label className="sr-only" htmlFor="search">
            Cari keterangan atau kategori
          </label>
          <input
            id="search"
            type="search"
            className="field pl-11"
            placeholder="Cari keterangan…"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </div>

        <label className="sr-only" htmlFor="account-filter">
          Filter akun
        </label>
        <select
          id="account-filter"
          className="field w-36 shrink-0"
          value={filters.account}
          onChange={(event) => onChange({ account: event.target.value })}
        >
          <option value="">Semua akun</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.name}>
              {account.icon} {account.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="grid grid-cols-4 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="group"
        aria-label="Filter jenis"
      >
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.type === option.value}
            onClick={() => onChange({ type: option.value })}
            className={`min-h-[40px] rounded-lg px-1 text-sm font-semibold transition ${
              filters.type === option.value
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Transfers carry no category, so the chips would filter them all out. */}
      {categories.length > 0 && filters.type !== 'transfer' && (
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
