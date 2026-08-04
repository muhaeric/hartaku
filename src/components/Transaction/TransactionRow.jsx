import Amount from '../ui/Amount.jsx'

/**
 * Three columns: category, then what it was and which account paid, then the
 * amount. The category column is fixed width so the eye can scan straight down
 * it; the description gives up width first, and the amount column never shrinks
 * so a figure can neither wrap nor be ellipsised.
 */
export default function TransactionRow ({ transaction, selecting, selected, onSelect, onOpen }) {
  const transfer = transaction.type === 'transfer'

  const label = transaction.description || (transfer ? 'Transfer' : transaction.category) || '—'
  const source = transfer
    ? `${transaction.account} → ${transaction.toAccount}`
    : transaction.account

  return (
    <button
      type="button"
      onClick={selecting ? onSelect : onOpen}
      className={`flex w-full items-center gap-2 px-page py-1.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
        selected ? 'bg-brand-50 dark:bg-brand-500/10' : ''
      }`}
    >
      {selecting ? (
        <input
          type="checkbox"
          readOnly
          checked={selected}
          aria-label={`Pilih ${label}`}
          className="h-5 w-5 shrink-0 rounded border-hairline text-brand-500"
        />
      ) : (
        // Wraps to two lines rather than truncating - the row is two lines tall
        // anyway, so "Food & Beverages" can be read in full.
        <span className="line-clamp-2 w-[64px] shrink-0 text-[11px] leading-[14px] text-subtitle dark:text-subtitle-dark sm:w-20">
          {transfer ? 'Transfer' : transaction.category || 'Tanpa kategori'}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{label}</span>
        <span className="block truncate text-[11px] leading-4 text-subtitle dark:text-subtitle-dark">
          {source || '—'}
        </span>
      </span>

      {/* Signed as well as coloured: direction should not rest on hue alone. */}
      <Amount
        value={transaction.amount}
        type={transaction.type}
        signed
        className="shrink-0 text-caption font-semibold"
      />
    </button>
  )
}
