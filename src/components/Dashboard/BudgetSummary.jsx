import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { budgetProgress } from '../../lib/budgets.js'
import { formatCurrency } from '../../lib/format.js'
import { budgetTransactionsPath } from '../../lib/links.js'
import { Card, SectionHeader } from '../ui/Card.jsx'
import BudgetProgressBar from '../Budget/BudgetProgressBar.jsx'
import { ChevronDownIcon, ChevronRightIcon } from '../ui/icons.jsx'

export default function BudgetSummary ({ budgets, transactions, month }) {
  const { settings } = useSettings()
  const [expanded, setExpanded] = useState(false)
  const progress = budgetProgress(budgets, transactions, month)
  const money = (value) => formatCurrency(value, settings.currency, { compact: true, precise: true })
  const entries = [...progress.entries].sort((a, b) => a.category.localeCompare(b.category))

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Anggaran"
        action={<Link className="text-caption font-semibold text-brand" to="/manage?tab=budgets">Kelola</Link>}
      />
      <Card>
        {!progress.entries.length ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body font-medium">Belum ada batas bulan ini</p>
              <p className="mt-0.5 text-caption text-subtitle">Atur target pengeluaran per kategori.</p>
            </div>
            <Link className="shrink-0 text-caption font-semibold text-brand" to="/manage?tab=budgets">Atur</Link>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-caption text-subtitle">Terpakai</p>
                <p className={`amount text-card-title font-semibold ${progress.remaining < 0 ? 'text-expense' : ''}`}>
                  {money(progress.totalSpent)}
                </p>
              </div>
              <p className="amount text-right text-caption text-subtitle">
                dari {money(progress.totalBudget)}
              </p>
            </div>
            <BudgetProgressBar ratio={progress.ratio} over={progress.remaining < 0} className="mt-3" />
            <p className={`mt-2 text-caption ${progress.remaining < 0 ? 'text-expense' : 'text-subtitle'}`}>
              {progress.remaining < 0
                ? `Melebihi anggaran ${money(Math.abs(progress.remaining))}`
                : `Sisa ${money(progress.remaining)} di ${progress.entries.length} kategori`}
              {progress.unbudgetedSpent > 0 && ` · ${money(progress.unbudgetedSpent)} belum dianggarkan`}
            </p>

            <button
              type="button"
              className="mt-2.5 flex min-h-9 w-full items-center justify-between gap-2 border-t border-hairline pt-2 text-left text-caption font-semibold text-brand"
              aria-expanded={expanded}
              aria-controls="dashboard-budget-categories"
              onClick={() => setExpanded((current) => !current)}
            >
              <span>Progress per kategori</span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            {expanded && (
              <ul id="dashboard-budget-categories" className="divide-hairline">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <Link
                      to={budgetTransactionsPath(entry.category, month)}
                      className="group block py-2.5"
                      aria-label={`Lihat transaksi ${entry.category}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-caption font-medium">{entry.category}</p>
                          <p className="mt-0.5 text-[11px] leading-4 text-subtitle">
                            {money(entry.spent)} dari {money(entry.amount)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-right">
                          <span className={`text-[11px] leading-4 amount ${entry.over ? 'text-expense' : 'text-subtitle'}`}>
                            {entry.over
                              ? `Lebih ${money(Math.abs(entry.remaining))}`
                              : `Sisa ${money(entry.remaining)}`}
                          </span>
                          <ChevronRightIcon className="h-4 w-4 text-subtitle/70 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                      <BudgetProgressBar ratio={entry.ratio} over={entry.over} className="mt-2" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
