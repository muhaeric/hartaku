import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'
import { accountBalances, totalBalance } from '../../lib/summary.js'

/**
 * The hero figure for the whole app: what you actually have right now, across
 * every account. Balances can be negative (debt), so they are listed as values
 * rather than drawn as bars.
 */
export default function AccountBalances ({ accounts, transactions }) {
  const { settings } = useSettings()

  const balances = useMemo(
    () => accountBalances(accounts, transactions),
    [accounts, transactions]
  )

  const total = totalBalance(balances)
  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <section className="card" aria-labelledby="balance-heading">
      <h2 id="balance-heading" className="text-sm text-slate-500 dark:text-slate-400">
        Total saldo
      </h2>
      <p
        className={`mt-1 text-3xl font-semibold tracking-tight sm:text-4xl ${
          total < 0 ? 'text-expense dark:text-red-400' : ''
        }`}
      >
        {money(total)}
      </p>

      {balances.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Belum ada akun.{' '}
          <Link to="/manage" className="font-semibold text-brand-600">
            Tambahkan akun
          </Link>{' '}
          untuk mulai mencatat.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {balances.map(({ account, balance }) => (
            <li key={account.id} className="flex items-center gap-3 py-2.5">
              <span className="text-lg" aria-hidden="true">
                {account.icon}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/20"
                  style={{ backgroundColor: account.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-medium">{account.name}</span>
              </span>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  balance < 0 ? 'text-expense dark:text-red-400' : ''
                }`}
              >
                {money(balance)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
