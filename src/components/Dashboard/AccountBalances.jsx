import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency, formatGrams, formatPercent } from '../../lib/format.js'
import { accountBalances, goldSummary, netWorth } from '../../lib/summary.js'

/**
 * Net worth at a glance: assets against liabilities, then the accounts that make
 * it up, grouped by kind. Gold sits with the assets, valued at today's buyback
 * price. Balances can be negative, so they are listed as values, not bars.
 */
export default function AccountBalances ({ accounts, transactions, goldLots }) {
  const { settings } = useSettings()
  const { quote } = useGoldPrice()

  const balances = useMemo(
    () => accountBalances(accounts, transactions, goldLots),
    [accounts, transactions, goldLots]
  )

  const gold = useMemo(
    () => goldSummary(goldLots, quote?.buybackPerGram),
    [goldLots, quote]
  )

  const worth = useMemo(() => netWorth(balances, gold.value || 0), [balances, gold.value])

  const groups = useMemo(() => {
    const byKind = new Map()
    for (const entry of balances) {
      const list = byKind.get(entry.account.kind) || []
      list.push(entry)
      byKind.set(entry.account.kind, list)
    }

    // Kept in ACCOUNT_KINDS order so the sections never reshuffle.
    return ACCOUNT_KINDS.filter((kind) => byKind.has(kind.value)).map((kind) => ({
      ...kind,
      entries: byKind.get(kind.value),
      subtotal: byKind.get(kind.value).reduce((sum, entry) => sum + entry.balance, 0)
    }))
  }, [balances])

  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <section className="card" aria-labelledby="networth-heading">
      <h2 id="networth-heading" className="sr-only">
        Ringkasan kekayaan
      </h2>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Figure label="Aset" value={money(worth.assets)} tone="text-income dark:text-emerald-400" />
        <Figure
          label="Kewajiban"
          value={money(worth.liabilities)}
          tone={worth.liabilities > 0 ? 'text-expense dark:text-red-400' : ''}
        />
        <Figure
          label="Total"
          value={money(worth.total)}
          emphasis
          tone={worth.total < 0 ? 'text-expense dark:text-red-400' : ''}
        />
      </div>

      {!accounts.length && !goldLots.length ? (
        <p className="mt-4 text-sm text-slate-500">
          Belum ada akun.{' '}
          <Link to="/manage" className="font-semibold text-brand-600">
            Tambahkan akun
          </Link>{' '}
          untuk mulai mencatat.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.value}>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-1.5 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {group.label}
                </h3>
                <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {money(group.subtotal)}
                </span>
              </div>

              <ul>
                {group.entries.map(({ account, balance }) => (
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
            </div>
          ))}

          {gold.grams > 0 && (
            <div>
              <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-1.5 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Investasi
                </h3>
                <span className="text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {gold.value === null ? '—' : money(gold.value)}
                </span>
              </div>

              <Link to="/manage?tab=gold" className="flex items-center gap-3 py-2.5">
                <span className="text-lg" aria-hidden="true">
                  🥇
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">Emas</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {formatGrams(gold.grams)} · modal {money(gold.invested)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums">
                    {gold.value === null ? '—' : money(gold.value)}
                  </span>
                  {gold.profit !== null && (
                    <span
                      className={`block text-xs font-medium tabular-nums ${
                        gold.profit >= 0
                          ? 'text-income dark:text-emerald-400'
                          : 'text-expense dark:text-red-400'
                      }`}
                    >
                      {gold.profit >= 0 ? '+' : '−'}
                      {money(Math.abs(gold.profit))} ({formatPercent(gold.profitPct)})
                    </span>
                  )}
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function Figure ({ label, value, tone = '', emphasis = false }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={`mt-1 break-words font-semibold tabular-nums ${
          emphasis ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
        } ${tone}`}
      >
        {value}
      </p>
    </div>
  )
}
