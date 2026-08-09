import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency, formatGrams, formatPercent } from '../../lib/format.js'
import { accountTransactionsPath } from '../../lib/links.js'
import { Card, GroupLabel, SectionHeader } from '../ui/Card.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'

/** Accounts grouped by kind, with gold listed alongside as an investment. */
export default function AccountBalances ({ balances, gold, archived = { count: 0, total: 0 } }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)

  const groups = ACCOUNT_KINDS.map((kind) => {
    const entries = balances.filter((entry) => entry.account.kind === kind.value)
    return {
      ...kind,
      entries,
      subtotal: entries.reduce((sum, entry) => sum + entry.balance, 0)
    }
  }).filter((group) => group.entries.length)

  const hasGold = gold.grams > 0

  if (!groups.length && !hasGold) {
    return (
      <Card className="text-center">
        <p className="text-body font-medium">Belum ada akun</p>
        <p className="mt-1 text-caption text-subtitle">
          Tambahkan akun seperti Cash atau Bank untuk mulai mencatat.
        </p>
        <Link
          to="/manage"
          className="mt-3 inline-flex h-9 items-center rounded-control bg-brand px-3 text-caption font-semibold text-brand-fg"
        >
          Tambah akun
        </Link>
      </Card>
    )
  }

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Akun"
        action={
          <Link to="/manage" className="text-caption font-semibold text-brand">
            Kelola
          </Link>
        }
      />

      <Card flush as="div" className="overflow-hidden">
        {groups.map((group) => (
          <div key={group.value}>
            <GroupLabel trailing={money(group.subtotal)}>{group.label}</GroupLabel>
            <div className="divide-hairline">
              {group.entries.map(({ account, balance }) => (
                <ListRow
                  key={account.id}
                  to={accountTransactionsPath(account.name)}
                  leading={<RowIcon icon={account.icon} color={account.color} />}
                  title={account.name}
                  /* No subtitle: the group heading already names the kind, and
                     repeating it on every row was noise competing with the
                     balance. Nothing else needs saying here now that archived
                     accounts do not reach this list at all. */
                  trailing={
                    <span className={balance < 0 ? 'text-expense' : ''}>
                      {money(balance)}
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {hasGold && (
          <div>
            <GroupLabel trailing={gold.value === null ? '—' : money(gold.value)}>
              Investasi
            </GroupLabel>
            <div className="divide-hairline">
              <ListRow
                to="/manage?tab=gold"
                leading={<RowIcon icon="🥇" color="#eda100" />}
                title="Emas"
                subtitle={formatGrams(gold.grams)}
                meta={`modal ${money(gold.invested)}`}
                trailing={gold.value === null ? '—' : money(gold.value)}
                trailingSub={
                  gold.profit === null ? null : (
                    <span
                      className={
                        gold.profit >= 0
                          ? 'text-income'
                          : 'text-expense'
                      }
                    >
                      {gold.profit >= 0 ? '+' : '−'}
                      {money(Math.abs(gold.profit))} ({formatPercent(gold.profitPct)})
                    </span>
                  )
                }
              />
            </div>
          </div>
        )}

        {/*
          The one thing the list cannot say by adding up: money sitting in an
          account that has been put away. It is still in the total at the top of
          the page, so without this line the two figures would differ by an
          amount with no explanation anywhere on screen. A line, not rows - the
          accounts stay archived.
        */}
        {archived.count > 0 && (
          <p className="border-t border-hairline px-page py-2 text-caption text-subtitle">
            Total aset termasuk {money(archived.total)} di {archived.count} akun arsip.
          </p>
        )}
      </Card>
    </div>
  )
}
