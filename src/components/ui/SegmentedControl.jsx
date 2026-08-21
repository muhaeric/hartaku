/** iOS-style segmented control: the app's single pattern for switching between peers. */
export default function SegmentedControl ({
  value,
  options,
  onChange,
  label,
  size = 'sm',
  className = ''
}) {
  const comfortable = size === 'md'

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex rounded-control bg-tint/[0.06] ${comfortable ? 'p-1' : 'p-0.5'} ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`${comfortable ? 'h-10' : 'h-8'} flex-1 truncate rounded-[11px] px-2 text-caption font-semibold transition ${
            value === option.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-subtitle'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
