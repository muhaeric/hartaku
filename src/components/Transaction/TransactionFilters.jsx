import { useEffect, useMemo, useState } from 'react'
import AccountPicker from '../ui/AccountPicker.jsx'
import Button from '../ui/Button.jsx'
import CategoryFilterChips from '../ui/CategoryFilterChips.jsx'
import DatePicker from '../ui/DatePicker.jsx'
import MonthStepper from '../ui/MonthStepper.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import Sheet from '../ui/Sheet.jsx'
import { CalendarIcon, CloseIcon, SearchIcon } from '../ui/icons.jsx'
import { currentMonthKey } from '../../lib/dates.js'
import { sortByLabel } from '../../lib/sortOptions.js'

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
  range = null,
  onChange,
  onMonthChange,
  onRangeChange
}) {
  const [pickingRange, setPickingRange] = useState(false)

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
   * Archived accounts are not offered, but one that is already selected stays
   * in the sheet. Otherwise the trigger would read as "Semua akun" while the
   * list remained silently filtered by an account no longer offered.
   */
  const accountOptions = useMemo(
    () =>
      accounts.filter(
        (account) => !account.archived || account.name === filters.account
      ),
    [accounts, filters.account]
  )

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
        ) : range ? (
          <div className="flex h-9 min-w-0 items-center rounded-control border border-brand bg-brand-soft">
            <button
              type="button"
              onClick={() => setPickingRange(true)}
              aria-label="Ubah rentang tanggal"
              className="flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 px-2 text-[13px] font-medium text-brand-onsoft"
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{rangeLabel(range)}</span>
            </button>
            <button
              type="button"
              onClick={() => onRangeChange(null)}
              aria-label="Hapus rentang tanggal"
              className="flex h-full w-8 shrink-0 items-center justify-center text-brand-onsoft"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <MonthStepper
              className="min-w-0 flex-1"
              value={month}
              options={monthOptions}
              onChange={onMonthChange}
            />
            <button
              type="button"
              onClick={() => setPickingRange(true)}
              aria-label="Pilih rentang tanggal"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-subtitle transition hover:text-ink"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        <AccountPicker
          id="transaction-account-filter"
          label="Filter akun"
          value={filters.account}
          accounts={accountOptions}
          emptyLabel="Semua akun"
          iconSize="sm"
          className="h-9 px-2.5"
          onChange={(account) => onChange({ account })}
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

      <RangeSheet
        open={pickingRange}
        range={range}
        defaultMonth={month}
        onClose={() => setPickingRange(false)}
        onApply={(next) => {
          onRangeChange(next)
          setPickingRange(false)
        }}
      />
    </div>
  )
}

function rangeLabel ({ from, to }) {
  const format = (iso, withYear) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {})
    })
  const sameYear = from.slice(0, 4) === to.slice(0, 4)

  return `${format(from, !sameYear)} – ${format(to, true)}`
}

/**
 * Two date fields and an apply button. The end date follows the start when the
 * start is moved past it, so the pair can never describe an empty range.
 */
function RangeSheet ({ open, range, defaultMonth, onClose, onApply }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    if (!open) return
    const month = /^\d{4}-\d{2}$/.test(defaultMonth) ? defaultMonth : currentMonthKey()
    const last = `${month}-${String(new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()).padStart(2, '0')}`

    setFrom(range?.from || `${month}-01`)
    setTo(range?.to || last)
  }, [open, range, defaultMonth])

  return (
    <Sheet open={open} title="Rentang tanggal" onClose={onClose}>
      <div className="space-y-gap-normal">
        <div className="grid grid-cols-2 gap-gap">
          <div>
            <label className="label" htmlFor="range-from">Dari</label>
            <DatePicker
              id="range-from"
              label="Dari tanggal"
              value={from}
              onChange={(value) => {
                setFrom(value)
                if (to < value) setTo(value)
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="range-to">Sampai</label>
            <DatePicker
              id="range-to"
              label="Sampai tanggal"
              value={to}
              onChange={(value) => {
                setTo(value)
                if (from > value) setFrom(value)
              }}
            />
          </div>
        </div>

        <div className="flex gap-gap pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
            Batal
          </Button>
          <Button
            className="flex-1 justify-center"
            disabled={!from || !to}
            onClick={() => onApply({ from, to })}
          >
            Terapkan
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
