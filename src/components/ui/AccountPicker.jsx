import { useMemo, useState } from 'react'
import { sortByLabel } from '../../lib/sortOptions.js'
import ListRow, { RowIcon } from './ListRow.jsx'
import Sheet from './Sheet.jsx'
import { CheckIcon, ChevronDownIcon } from './icons.jsx'

/**
 * Account field that shows the account's own icon.
 *
 * A native `<select>` cannot: an `<option>` takes text and nothing else, so an
 * account carrying an uploaded picture had to fall back to the emoji for its
 * kind - a bank logo the user picked themselves showing up as 🏦 in the one
 * place they were choosing between accounts. This is the trade for keeping the
 * platform picker everywhere else in the app: where the icon is the thing being
 * recognised, the list has to be able to draw it.
 *
 * The sheet is the same one the bulk "Pindah ke akun" action opens, so the two
 * places you pick an account from a list look and behave alike.
 */
export default function AccountPicker ({
  id,
  value,
  accounts,
  invalid,
  onChange,
  label = 'Akun',
  placeholder = 'Pilih…',
  className = ''
}) {
  const [open, setOpen] = useState(false)

  /**
   * One row per name.
   *
   * What this control stores is the account's *name* - that is how every
   * transaction points at an account - so two records sharing one name are not
   * two choices. The second is a decoy: selecting it writes the same string as
   * the first, and the row it creates is indistinguishable from one filed under
   * the other. Duplicates do happen (an archived account and a new one taking
   * its name, a copy carried in by an import), and the honest thing for a
   * picker to show is the one that is actually in use.
   *
   * The live record wins; an archived twin only appears when no active account
   * claims the name, which is what keeps an old transaction's account visible
   * on the screen where it is being edited.
   */
  const options = useMemo(() => {
    const byName = new Map()

    for (const account of accounts) {
      const key = String(account.name || '').toLowerCase()
      const current = byName.get(key)

      if (!current || (current.archived && !account.archived)) byName.set(key, account)
    }

    return sortByLabel([...byName.values()], (account) => account.name)
  }, [accounts])

  const selected = options.find((account) => account.name === value)

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
          /* Matches the height of a row carrying a 32px tile, so choosing an
             account does not make the field - and the row it sits in - jump. */
          <span className="flex h-8 min-w-0 flex-1 items-center truncate text-body text-subtitle/70">
            {placeholder}
          </span>
        )}

        <ChevronDownIcon className="h-4 w-4 shrink-0 text-subtitle" />
      </button>

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        {options.length ? (
          <div className="-mx-page max-h-[480px] divide-hairline overflow-y-auto overscroll-contain">
            {options.map((account) => (
              <ListRow
                key={account.id}
                leading={<RowIcon icon={account.icon} color={account.color} />}
                title={account.name}
                subtitle={account.archived ? 'Arsip' : undefined}
                trailing={
                  account.name === value ? (
                    <CheckIcon className="h-4 w-4 text-brand" />
                  ) : undefined
                }
                onClick={() => {
                  onChange(account.name)
                  setOpen(false)
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-caption text-subtitle">
            Belum ada akun. Tambahkan dulu di menu Kelola.
          </p>
        )}
      </Sheet>
    </>
  )
}
