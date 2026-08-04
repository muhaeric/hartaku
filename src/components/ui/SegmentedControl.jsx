/** iOS-style segmented control: the app's single pattern for switching between peers. */
export default function SegmentedControl ({ value, options, onChange, label, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex rounded-control bg-black/[0.05] p-1 dark:bg-white/[0.06] ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-9 flex-1 truncate rounded-[10px] px-2 text-caption font-semibold transition ${
            value === option.value
              ? 'bg-surface text-ink shadow-sm dark:bg-surface-dark dark:text-ink-dark'
              : 'text-subtitle dark:text-subtitle-dark'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
