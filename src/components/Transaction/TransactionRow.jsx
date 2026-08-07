import Amount from '../ui/Amount.jsx'

/**
 * Three columns: category, then what it was and which account paid, then the
 * amount. The category column is fixed width so the eye can scan straight down
 * it; the description gives up width first, and the amount column never shrinks
 * so a figure can neither wrap nor be ellipsised.
 *
 * `account` is the account the list is scoped to, if any. A transfer normally
 * gets no sign because nothing was earned or spent - but seen from one end of
 * it, money did leave or arrive, and the totals above the list say so. The row
 * has to agree with them or the column stops adding up in front of the reader.
 */
export default function TransactionRow ({
  transaction,
  account,
  selecting,
  selected,
  onSelect,
  onOpen
}) {
  const transfer = transaction.type === 'transfer'

  const direction =
    transfer && account
      ? transaction.account === account
        ? 'expense'
        : 'income'
      : transaction.type

  const label = transaction.description || (transfer ? 'Transfer' : transaction.category) || '—'
  const source = transfer
    ? `${transaction.account} → ${transaction.toAccount}`
    : transaction.account

  // Tags share the second line with the account rather than claiming a third:
  // the row has a height budget, and an unlabelled row is still readable while a
  // taller list is not. Overflow truncates - the full set is on the edit screen.
  const tags = transaction.tags || []

  return (
    <button
      type="button"
      onClick={selecting ? onSelect : onOpen}
      className={`flex w-full items-center gap-2 px-page py-1.5 text-left transition hover:bg-tint/[0.04] ${
        selected ? 'bg-brand-soft' : ''
      }`}
    >
      {selecting ? (
        <input
          type="checkbox"
          readOnly
          checked={selected}
          aria-label={`Pilih ${label}`}
          className="h-5 w-5 shrink-0 rounded border-hairline text-brand"
        />
      ) : (
        // Wraps to two lines rather than truncating - the row is two lines tall
        // anyway, so "Food & Beverages" can be read in full.
        <span className="line-clamp-2 w-[64px] shrink-0 text-[11px] leading-[14px] text-subtitle sm:w-20">
          {transfer ? 'Transfer' : transaction.category || 'Tanpa kategori'}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{label}</span>
        <span className="block truncate text-[11px] leading-4 text-subtitle">
          {source || '—'}
          {tags.map((tag) => (
            <span key={tag} className="ml-1.5 text-brand-onsoft">
              #{tag}
            </span>
          ))}
        </span>
      </span>

      {/* Signed as well as coloured: direction should not rest on hue alone. */}
      <Amount
        value={transaction.amount}
        type={direction}
        signed
        className="shrink-0 text-caption font-medium"
      />
    </button>
  )
}
