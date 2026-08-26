export default function BudgetProgressBar ({ ratio, over = false, className = '' }) {
  const percentage = Math.min(100, Math.max(0, Math.round(ratio * 100)))
  const width = `${percentage}%`

  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-tint/[0.08] ${className}`}
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={percentage}
    >
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-expense' : ratio >= 0.8 ? 'bg-warning' : 'bg-brand'}`}
        style={{ width }}
      />
    </div>
  )
}
