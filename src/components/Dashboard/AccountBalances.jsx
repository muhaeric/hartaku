import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency, formatGrams, formatPercent } from '../../lib/format.js'
import { accountTransactionsPath } from '../../lib/links.js'
import { Card, GroupLabel, SectionHeader } from '../ui/Card.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'

/** Accounts grouped by kind, with gold listed alongside as an investment. */
export default function AccountBalances ({ balances, gold }) {
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
        <p className="mt-1 text-caption text-subtitle dark:text-subtitle-dark">
          Tambahkan akun seperti Cash atau Bank untuk mulai mencatat.
        </p>
        <Link
          to="/manage"
          className="mt-3 inline-flex h-9 items-center rounded-control bg-brand-500 px-3 text-caption font-semibold text-white"
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
          <Link to="/manage" className="text-caption font-semibold text-brand-500">
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
                  /* The group heading already names the kind - repeating it on
                     every row was noise competing with the balance. An archived
                     account only reaches this list while it still holds money,
                     and that needs saying or it reads as a stray. */
                  subtitle={account.archived ? 'Arsip' : null}
                  trailing={
                    <span className={balance < 0 ? 'text-expense dark:text-red-400' : ''}>
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
                          ? 'text-income dark:text-emerald-400'
                          : 'text-expense dark:text-red-400'
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
      </Card>
    </div>
  )
}
