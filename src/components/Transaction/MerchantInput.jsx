import { useMemo, useRef, useState } from 'react'
import { LIMITS } from '../../lib/constants.js'

/** Text input with suggestions drawn from merchants already in the sheet. */
export default function MerchantInput ({ value, merchants, invalid, onChange, onPick }) {
  const [open, setOpen] = useState(false)
  const blurTimer = useRef(null)

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return []

    return merchants
      .filter((merchant) => merchant.name.toLowerCase().includes(query))
      .filter((merchant) => merchant.name.toLowerCase() !== query)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [value, merchants])

  const choose = (merchant) => {
    clearTimeout(blurTimer.current)
    setOpen(false)
    onPick(merchant)
  }

  return (
    <div className="relative">
      <input
        id="merchant"
        type="text"
        className={`field ${invalid ? 'field-error' : ''}`}
        value={value}
        maxLength={LIMITS.merchant}
        autoComplete="off"
        placeholder="Contoh: Indomaret"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        // Delayed so a click on a suggestion lands before the list closes.
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150)
        }}
      />

      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {matches.map((merchant) => (
            <li key={merchant.name}>
              <button
                type="button"
                onClick={() => choose(merchant)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="truncate font-medium">{merchant.name}</span>
                {merchant.category && (
                  <span className="shrink-0 text-xs text-slate-500">{merchant.category}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
