import { useMemo, useState } from 'react'
import { sortByLabel } from '../../lib/sortOptions.js'
import ListRow, { RowIcon } from './ListRow.jsx'
import Sheet from './Sheet.jsx'
import { CheckIcon, ChevronDownIcon } from './icons.jsx'

/**
 * Category picker that keeps the compact field in the form and moves the
 * actual list into the app's standard mobile bottom sheet.
 */
export default function CategoryPicker ({
  id,
  value,
  categories,
  invalid,
  onChange,
  label = 'Kategori',
  placeholder = 'Pilih…',
  className = ''
}) {
  const [open, setOpen] = useState(false)
  const options = useMemo(
    () => sortByLabel(categories, (category) => category.name),
    [categories]
  )
  const selected = options.find((category) => category.name === value)

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`field flex items-center gap-2 py-1.5 text-left ${invalid ? 'field-error' : ''} ${className}`}
      >
        {selected ? (
          <>
            <RowIcon icon={selected.icon} color={selected.color} />
            <span className="min-w-0 flex-1 truncate text-body">{selected.name}</span>
          </>
        ) : (
          <span className="flex h-8 min-w-0 flex-1 items-center truncate text-body text-subtitle/70">
            {placeholder}
          </span>
        )}

        <ChevronDownIcon className="h-4 w-4 shrink-0 text-subtitle" />
      </button>

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        {options.length ? (
          <div className="-mx-page divide-hairline">
            {options.map((category) => (
              <ListRow
                key={category.id}
                leading={<RowIcon icon={category.icon} color={category.color} />}
                title={category.name}
                subtitle={category.archived ? 'Arsip' : undefined}
                trailing={
                  category.name === value ? (
                    <CheckIcon className="h-4 w-4 text-brand" />
                  ) : undefined
                }
                onClick={() => {
                  onChange(category.name)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-caption text-subtitle">
            Belum ada kategori untuk jenis transaksi ini.
          </p>
        )}
      </Sheet>
    </>
  )
}
