import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

const TONES = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-subtitle',
  neutral: ''
}

/**
 * Money, rendered the same way everywhere: never wrapping, tabular figures, and
 * a sign that says which way it moved. Transfers get no sign - nothing was
 * earned or spent.
 */
export default function Amount ({
  value,
  type = 'neutral',
  signed = false,
  compact = false,
  className = ''
}) {
  const { settings } = useSettings()

  const sign = !signed ? '' : type === 'income' ? '+' : type === 'expense' ? '−' : ''
  const magnitude = signed ? Math.abs(value) : value

  return (
    <span className={`amount ${TONES[type] || ''} ${className}`}>
      {sign}
      {formatCurrency(magnitude, settings.currency, { compact })}
    </span>
  )
}
