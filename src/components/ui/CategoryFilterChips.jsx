import { useMemo } from 'react'
import { sortByLabel } from '../../lib/sortOptions.js'

/**
 * A compact multi-value category filter.
 *
 * An empty selection means every category. Once one or more category chips are
 * active, callers treat them as alternatives (A or B), which matches a
 * transaction's one-category data model.
 */
export default function CategoryFilterChips ({
  categories,
  selected = [],
  onChange,
  label = 'Filter kategori',
  layout = 'scroll',
  className = ''
}) {
  const options = useMemo(
    () => sortByLabel(categories, (category) => category.name),
    [categories]
  )

  if (!options.length) return null

  const selectedNames = new Set(selected)
  const toggle = (name) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange([...next])
  }

  const chipClass = (active) =>
    `flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-caption transition ${
      active
        ? 'border-brand bg-brand-soft font-semibold text-brand-onsoft'
        : 'border-hairline text-subtitle'
    }`

  return (
    <div
      className={`${
        layout === 'wrap' ? '' : '-mx-page overflow-x-auto px-page'
      } ${className}`}
    >
      <div
        className={`flex gap-1.5 pb-0.5 ${layout === 'wrap' ? 'flex-wrap' : ''}`}
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          aria-pressed={!selected.length}
          onClick={() => onChange([])}
          className={chipClass(!selected.length)}
        >
          Semua kategori
        </button>

        {options.map((category) => {
          const active = selectedNames.has(category.name)
          return (
            <button
              key={category.id || category.name}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(category.name)}
              className={chipClass(active)}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              {category.name}
              {category.archived && <span className="font-normal"> (arsip)</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
