import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * The single hero figure of the app. The total is shown in full because it is
 * the number people come for; the two supporting figures use compact notation
 * so three amounts fit one line on a 375px screen without any of them wrapping.
 */
export default function NetWorthCard ({ worth }) {
  const { settings } = useSettings()
  const money = (value, compact = false) => formatCurrency(value, settings.currency, { compact })

  return (
    <section className="card" aria-labelledby="networth-label">
      <p id="networth-label" className="text-caption text-subtitle dark:text-subtitle-dark">
        Total aset
      </p>
      <p
        className={`mt-0.5 overflow-hidden text-[30px] font-bold leading-9 tracking-tight amount ${
          worth.total < 0 ? 'text-expense dark:text-red-400' : ''
        }`}
      >
        {money(worth.total)}
      </p>

      <div className="mt-3 flex items-end gap-6 border-t border-hairline pt-2.5 dark:border-hairline-dark">
        <Figure label="Aset" value={money(worth.assets, true)} />
        <Figure
          label="Kewajiban"
          value={money(worth.liabilities, true)}
          tone={worth.liabilities > 0 ? 'text-expense dark:text-red-400' : ''}
        />
      </div>
    </section>
  )
}

function Figure ({ label, value, tone = '' }) {
  return (
    <div>
      <p className="text-caption text-subtitle dark:text-subtitle-dark">{label}</p>
      <p className={`text-amount font-semibold amount ${tone}`}>{value}</p>
    </div>
  )
}
