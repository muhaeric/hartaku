import { ChevronDownIcon } from './icons.jsx'

/**
 * Native select dressed as a compact pill. Native is deliberate: it gives the
 * platform picker on mobile, which beats any custom dropdown for one-handed use.
 */
export default function SelectPill ({ value, onChange, options, label, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <label className="sr-only" htmlFor={`pill-${label}`}>
        {label}
      </label>
      <select
        id={`pill-${label}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none truncate rounded-control border border-hairline bg-surface pl-3 pr-7 text-body font-medium text-ink dark:border-hairline-dark dark:bg-surface-dark dark:text-ink-dark"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtitle" />
    </div>
  )
}
