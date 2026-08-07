import { ACCOUNT_KINDS } from '../lib/constants.js'
import { accountTransactionsPath } from '../lib/links.js'
import {
  accountBalances,
  categoryBreakdown,
  goldSummary,
  groupByDay,
  netWorth,
  summarize
} from '../lib/summary.js'
import DayGroupHeader from './Transaction/DayGroup.jsx'
import PeriodSummary from './Transaction/PeriodSummary.jsx'
import SelectionBar from './Transaction/SelectionBar.jsx'
import TransactionRow from './Transaction/TransactionRow.jsx'
import { GoldPortfolio } from './Gold/GoldManager.jsx'
import AccountBalances from './Dashboard/AccountBalances.jsx'
import NetWorthCard from './Dashboard/NetWorthCard.jsx'
import NetWorthTrend from './Dashboard/NetWorthTrend.jsx'
import TopExpenses from './Dashboard/TopExpenses.jsx'
import Button from './ui/Button.jsx'
import { Card, SectionHeader } from './ui/Card.jsx'
import KebabMenu from './ui/KebabMenu.jsx'
import ListRow, { RowIcon } from './ui/ListRow.jsx'
import MonthStepper from './ui/MonthStepper.jsx'
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
  { id: 'b', date: '2026-08-04', type: 'expense', amount: 105886, category: 'Household', account: 'Bank Mandiri', description: "Al Fath - Al Qur'an Hafalan", tags: ['hadiah', 'adik'], createdAt: '2' },
  { id: 'c', date: '2026-08-04', type: 'expense', amount: 17440, category: 'Food & Beverages', account: 'Bank Mandiri', description: 'FS Sei Sapi', createdAt: '1' },
  { id: 'd', date: '2026-08-04', type: 'expense', amount: 379964, category: 'Household', account: 'Bank Mandiri', description: 'Mahar Pernikahan Adik', createdAt: '0' },
  { id: 'e', date: '2026-08-03', type: 'income', amount: 8500000, category: 'Salary', account: 'Bank Jago', description: 'Gaji Agustus', createdAt: '5' },
  { id: 'f', date: '2026-08-03', type: 'transfer', amount: 2000000, category: '', account: 'Bank Jago', toAccount: 'Cash', description: 'Tarik tunai', createdAt: '4' },
  { id: 'g', date: '2026-08-02', type: 'expense', amount: 58000, category: 'Food & Beverages', account: 'Gopay', description: 'Kopi Kenangan Grand Indonesia', createdAt: '6' }
]

/** Eighteen months of salary in, spending out - enough for the trend to have a shape. */
const HISTORY = Array.from({ length: 18 }, (_, index) => {
  const offset = 3 + index
  const date = `${2025 + Math.floor((offset - 1) / 12)}-${String(((offset - 1) % 12) + 1).padStart(2, '0')}`

  return [
    { id: `h${index}i`, date: `${date}-25`, type: 'income', amount: 8500000, category: 'Salary', account: 'Bank Jago', description: '', createdAt: '' },
    { id: `h${index}e`, date: `${date}-15`, type: 'expense', amount: 5200000 + index * 80000, category: 'Household', account: 'Bank Mandiri', description: '', createdAt: '' }
  ]
}).flat()

/** 15.5g bought above today's buyback - the loss case, which is the wide one. */
const GOLD_LOTS = [
  { id: 'g1', date: '2026-07-21', grams: 1, cost: 2409000 },
  { id: 'g2', date: '2026-07-01', grams: 0.5, cost: 1300000 },
  { id: 'g3', date: '2026-06-11', grams: 14, cost: 39545000 }
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
          <MonthStepper value="2026-08" options={['2026-09', '2026-08', '2026-07']} onChange={() => {}} />
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
              className="flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 text-caption text-subtitle"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <PeriodSummary summary={summary} />

      <div className="flex items-center justify-between">
        <p className="text-caption text-subtitle">2 dipilih</p>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm">Pilih semua</Button>
          <Button variant="ghost" size="sm">Selesai</Button>
        </div>
      </div>

      <SelectionBar
        count={2}
        onMove={() => {}}
        onTag={() => {}}
        onCopy={() => {}}
        onDelete={() => {}}
      />

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
      <NetWorthCard worth={worth}>
        <NetWorthTrend accounts={ACCOUNTS} transactions={HISTORY} goldLots={[]} />
      </NetWorthCard>

      {/* The real components, not a copy of them: this harness exists to catch
          density and type-scale regressions, which a copy would not show. */}
      <AccountBalances balances={balances} gold={goldSummary([], null)} />

      <div className="space-y-gap-normal">
        <SectionHeader title="Pengeluaran terbesar" />
        <Card flush as="div">
          <TopExpenses breakdown={categoryBreakdown(TRANSACTIONS, 'expense')} categories={CATEGORIES} />
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
                to={accountTransactionsPath(account.name)}
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

      {/* The gold card is the widest thing in the app: a loss runs to a signed
          eight-figure rupiah amount and a percentage, and amounts never wrap. It
          belongs here so the next layout change has to survive it. */}
      <div className="space-y-gap-normal">
        <SectionHeader title="Emas" hint="12 catatan" />
        <GoldPortfolio
          summary={goldSummary(GOLD_LOTS, 2510000)}
          quote={{
            buybackPerGram: 2510000,
            sellPerGram: 2590000,
            source: 'Aneka Logam',
            recordedDate: '2026-08-05'
          }}
          loading={false}
          error={null}
          stale={false}
          onRefresh={() => {}}
          money={(value) =>
            new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0
            }).format(value)
          }
        />
      </div>
    </div>
  )
}
