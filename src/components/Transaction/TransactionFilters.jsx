import { useMemo } from 'react'
import MonthStepper from '../ui/MonthStepper.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import SelectPill from '../ui/SelectPill.jsx'
import CategoryFilterChips from '../ui/CategoryFilterChips.jsx'
import { CloseIcon, SearchIcon } from '../ui/icons.jsx'
import { sortByLabel, sortOptions } from '../../lib/sortOptions.js'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'expense', label: 'Keluar' },
  { value: 'income', label: 'Masuk' },
  { value: 'transfer', label: 'Transfer' }
]

/**
 * Search, two pills and one segmented row - about 150px total, so the list is
 * still visible above the fold on a phone.
 *
 * While a search is running the month control is replaced rather than disabled:
 * search covers every period, and a greyed-out "Agu 2026" sitting next to the
 * results would still read as the scope they came from.
 */
export default function TransactionFilters ({
  filters,
  month,
  monthOptions,
  categories,
  accounts,
  tags = [],
  searching = false,
  onChange,
  onMonthChange
}) {
  const toggleTag = (name) => {
    const selected = new Set(filters.tags)
    if (selected.has(name)) selected.delete(name)
    else selected.add(name)
    onChange({ tags: [...selected] })
  }

  /**
   * A-Z rather than the order the sheet stores them in. The strip scrolls, so a
   * chip past the third one is found by scrolling to where it ought to be, and
   * alphabetical is the only ordering a visitor can predict without opening the
   * category manager - which is why every picker in the app now shares it.
   * Sorting a copy leaves the stored `sort_order` alone; that one still drives
   * the manager screens, where rows are reordered by hand.
   *
   * Archived categories are not offered, with the same exception the account
   * filter makes: one that is already switched on stays on the strip, or the
   * list would sit filtered by something with no chip left to switch off.
   */
  const chips = useMemo(() => {
    const offered = categories.filter(
      (category) => !category.archived || filters.categories.includes(category.name)
    )

    return sortByLabel(offered, (category) => category.name)
  }, [categories, filters.categories])

  /**
   * Archived accounts are not offered, but one that is already selected stays in
   * the list: a native select whose value is missing from its options renders
   * blank, which would read as "no filter" while the list stayed filtered.
   */
  const accountOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Semua akun' },
      ...accounts.map((account) => ({ value: account.name, label: account.name }))
    ]

    if (filters.account && !options.some((option) => option.value === filters.account)) {
      options.push({ value: filters.account, label: `${filters.account} (arsip)` })
    }

    return sortOptions(options)
  }, [accounts, filters.account])

  return (
    <div className="space-y-gap">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtitle" />
        <label className="sr-only" htmlFor="search">
          Cari keterangan atau kategori
        </label>
        <input
          id="search"
          type="search"
          className="field h-9 py-0 pl-9 pr-9"
          placeholder="Cari keterangan…"
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ search: '' })}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-subtitle transition hover:bg-tint/5"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-gap">
        {searching ? (
          <div className="flex h-9 items-center justify-center gap-1.5 rounded-control border border-dashed border-hairline px-2 text-caption font-medium text-subtitle">
            <SearchIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Semua periode</span>
          </div>
        ) : (
          <MonthStepper value={month} options={monthOptions} onChange={onMonthChange} />
        )}
        <SelectPill
          label="Filter akun"
          value={filters.account}
          onChange={(account) => onChange({ account })}
          options={accountOptions}
        />
      </div>

      <SegmentedControl
        label="Filter jenis"
        value={filters.type}
        options={TYPE_OPTIONS}
        onChange={(type) => onChange({ type })}
      />

      {/* Transfers carry no category, so the chips would filter them all out. */}
      {chips.length > 0 && filters.type !== 'transfer' && (
        <CategoryFilterChips
          categories={chips}
          selected={filters.categories}
          onChange={(categories) => onChange({ categories })}
        />
      )}

      {/*
        Not hidden alongside the category chips: a transfer carries no category
        but can carry tags, so filtering a transfer by tag is the one way to
        find it.

        These narrow where the category chips widen. It reads like an
        inconsistency and is not one: a row has exactly one category, so
        stacking two of those could only ever mean "either" - there is no row
        that is both. A row carries up to eight tags, so "and also this" is a
        question that has answers, and it is the one worth asking.
      */}
      {tags.length > 0 && (
        <div className="-mx-page overflow-x-auto px-page">
          <div className="flex gap-1.5 pb-0.5" role="group" aria-label="Filter tag">
            {tags.map((tag) => {
              const active = filters.tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag)}
                  className={`h-7 shrink-0 rounded-full border px-2.5 text-caption transition ${
                    active
                      ? 'border-brand bg-brand-soft font-semibold text-brand-onsoft'
                      : 'border-hairline text-subtitle'
                  }`}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
