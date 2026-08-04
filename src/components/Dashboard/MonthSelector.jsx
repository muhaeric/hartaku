import { monthLabel } from '../../lib/dates.js'
import SelectPill from '../ui/SelectPill.jsx'

export default function MonthSelector ({ value, options, onChange, className = '' }) {
  return (
    <SelectPill
      label="Pilih bulan"
      className={className}
      value={value}
      onChange={onChange}
      options={options.map((monthKey) => ({ value: monthKey, label: monthLabel(monthKey) }))}
    />
  )
}
