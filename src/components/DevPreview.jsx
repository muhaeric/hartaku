import { ACCOUNT_KINDS } from '../lib/constants.js'
import { accountBalances, groupByDay, netWorth, summarize } from '../lib/summary.js'
import DayGroupHeader from './Transaction/DayGroup.jsx'
import PeriodSummary from './Transaction/PeriodSummary.jsx'
import TransactionRow from './Transaction/TransactionRow.jsx'
import NetWorthCard from './Dashboard/NetWorthCard.jsx'
import Button from './ui/Button.jsx'
import { Card, GroupLabel, SectionHeader } from './ui/Card.jsx'
import KebabMenu from './ui/KebabMenu.jsx'
import ListRow, { RowIcon } from './ui/ListRow.jsx'
import SegmentedControl from './ui/SegmentedControl.jsx'
import SelectPill from './ui/SelectPill.jsx'
import { PencilIcon, PlusIcon, SearchIcon, TrashIcon } from './ui/icons.jsx'

/**
 * Dev-only harness for eyeballing density and type scale without a Google
 * session. Mounted behind `import.meta.env.DEV`, so it never reaches a build.
 */

const ACCOUNTS = [
  { id: '1', name: 'Cash', kind: 'cash', icon: '💵', color: '#008300', openingBalance: 0 },
  { id: '2', name: 'Bank Jago', kind: 'bank', icon: '🏦', color: '#eda100', openingBalance: 49961000 },
  { id: '3', name: 'Bank Mandiri', kind: 'bank', icon: '🏦', color: '#2a78d6', openingBalance: 68718000 },
  { id: '4', name: 'Piutang Bapak', kind: 'receivable', icon: '🤝', color: '#eb6834', openingBalance: 6349000 },
  { id: '5', name: 'Gopay', kind: 'ewallet', icon: '📱', color: '#1baf7a', openingBalance: 0 }
]

const TRANSACTIONS = [
  { id: 'a', date: '2026-08-04', type: 'expense', amount: 2500, category: 'Other', account: 'Bank Mandiri', description: 'admin', createdAt: '3' },
  { id: 'b', date: '2026-08-04', type: 'expense', amount: 105886, category: 'Household', account: 'Bank Mandiri', description: "Al Fath - Al Qur'an Hafalan", createdAt: '2' },
  { id: 'c', date: '2026-08-04', type: 'expense', amount: 17440, category: 'Food & Beverages', account: 'Bank Mandiri', description: 'FS Sei Sapi', createdAt: '1' },
  { id: 'd', date: '2026-08-04', type: 'expense', amount: 379964, category: 'Household', account: 'Bank Mandiri', description: 'Mahar Pernikahan Adik', createdAt: '0' },
  { id: 'e', date: '2026-08-03', type: 'income', amount: 8500000, category: 'Salary', account: 'Bank Jago', description: 'Gaji Agustus', createdAt: '5' },
  { id: 'f', date: '2026-08-03', type: 'transfer', amount: 2000000, category: '', account: 'Bank Jago', toAccount: 'Cash', description: 'Tarik tunai', createdAt: '4' },
  { id: 'g', date: '2026-08-02', type: 'expense', amount: 58000, category: 'Food & Beverages', account: 'Gopay', description: 'Kopi Kenangan Grand Indonesia', createdAt: '6' }
]

const CATEGORIES = [
  { id: 'c1', name: 'Food & Beverages', color: '#eb6834' },
  { id: 'c2', name: 'Transportation', color: '#2a78d6' },
  { id: 'c3', name: 'Utilities', color: '#eda100' },
  { id: 'c4', name: 'Household', color: '#e87ba4' }
]

export default function DevPreview () {
  const balances = accountBalances(ACCOUNTS, TRANSACTIONS, [])
  const worth = netWorth(balances, 0)
  const days = groupByDay(TRANSACTIONS)
  const summary = summarize(TRANSACTIONS)

  const groups = ACCOUNT_KINDS.map((kind) => ({
    ...kind,
    entries: balances.filter((entry) => entry.account.kind === kind.value)
  })).filter((group) => group.entries.length)

  return (
    <div className="mx-auto w-full max-w-2xl space-y-section px-page py-3">
      <p className="rounded-control bg-warning/15 px-3 py-2 text-caption text-warning">
        Pratinjau khusus pengembangan — data contoh, tidak ada di build produksi.
      </p>

      <h1 className="text-page-title font-bold tracking-tight">Transaksi</h1>

      <div className="space-y-gap">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtitle" />
          <input className="field h-9 py-0 pl-9" placeholder="Cari keterangan…" readOnly />
        </div>
        <div className="grid grid-cols-2 gap-gap">
          <SelectPill label="Bulan" value="a" onChange={() => {}} options={[{ value: 'a', label: 'Agustus 2026' }]} />
          <SelectPill label="Akun" value="a" onChange={() => {}} options={[{ value: 'a', label: 'Semua akun' }]} />
        </div>
        <SegmentedControl
          label="Jenis"
          value="all"
          onChange={() => {}}
          options={[
            { value: 'all', label: 'Semua' },
            { value: 'expense', label: 'Keluar' },
            { value: 'income', label: 'Masuk' },
            { value: 'transfer', label: 'Transfer' }
          ]}
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 text-caption text-subtitle dark:border-hairline-dark dark:text-subtitle-dark"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <PeriodSummary summary={summary} filtered />

      <div className="flex items-center justify-between">
        <p className="text-caption text-subtitle dark:text-subtitle-dark">7 transaksi</p>
        <Button variant="ghost" size="sm">Pilih</Button>
      </div>

      <Card flush as="div" className="overflow-hidden">
        {days.map((day) => (
          <section key={day.date}>
            <DayGroupHeader day={day} />
            <ul className="divide-hairline">
              {day.items.map((transaction) => (
                <li key={transaction.id}>
                  <TransactionRow transaction={transaction} onOpen={() => {}} onSelect={() => {}} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Card>

      <h1 className="pt-4 text-page-title font-bold tracking-tight">Beranda</h1>
      <NetWorthCard worth={worth} />

      <div className="space-y-gap-normal">
        <SectionHeader title="Akun" action={<span className="text-caption font-semibold text-brand-500">Kelola</span>} />
        <Card flush as="div" className="overflow-hidden">
          {groups.map((group) => (
            <div key={group.value}>
              <GroupLabel trailing={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(group.entries.reduce((sum, e) => sum + e.balance, 0))}>
                {group.label}
              </GroupLabel>
              <div className="divide-hairline">
                {group.entries.map(({ account, balance }) => (
                  <ListRow
                    key={account.id}
                    leading={<RowIcon icon={account.icon} color={account.color} />}
                    title={account.name}
                    subtitle={group.label}
                    trailing={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(balance)}
                  />
                ))}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <h1 className="pt-4 text-page-title font-bold tracking-tight">Akun &amp; Kategori</h1>
      <SegmentedControl
        label="Kelola"
        value="accounts"
        onChange={() => {}}
        options={[
          { value: 'accounts', label: 'Akun' },
          { value: 'gold', label: 'Emas' },
          { value: 'categories', label: 'Kategori' }
        ]}
      />
      <div className="space-y-gap-normal">
        <SectionHeader
          title="Akun"
          hint="5 akun"
          action={<Button size="sm"><PlusIcon className="h-4 w-4" />Tambah</Button>}
        />
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {balances.map(({ account, balance }) => (
            <li key={account.id}>
              <ListRow
                leading={<RowIcon icon={account.icon} color={account.color} />}
                title={account.name}
                subtitle={ACCOUNT_KINDS.find((k) => k.value === account.kind)?.label}
                meta={account.name === 'Bank Mandiri' ? '15 transaksi' : null}
                trailing={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(balance)}
                action={
                  <KebabMenu
                    label={`Aksi ${account.name}`}
                    items={[
                      { label: 'Ubah', icon: <PencilIcon className="h-4 w-4" />, onSelect: () => {} },
                      { label: 'Hapus', icon: <TrashIcon className="h-4 w-4" />, destructive: true, onSelect: () => {} }
                    ]}
                  />
                }
              />
            </li>
          ))}
        </Card>
      </div>
    </div>
  )
}
