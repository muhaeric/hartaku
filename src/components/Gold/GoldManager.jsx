import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import { formatCurrency, formatDate, formatGrams, formatPercent } from '../../lib/format.js'
import { goldSummary } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import { PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from '../ui/icons.jsx'
import GoldForm, { emptyGoldLot } from './GoldForm.jsx'

export default function GoldManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const { goldLots, accounts, activeAccounts, addGoldLot, editGoldLot, removeGoldLot } = useData()
  const { quote, loading, error, stale, refresh } = useGoldPrice()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const summary = useMemo(() => goldSummary(goldLots, quote?.buybackPerGram), [goldLots, quote])
  const money = (value) => formatCurrency(value, settings.currency)

  /** As in the transaction form: an archived account already on the lot stays offered. */
  const formAccounts = useMemo(() => {
    const kept = accounts.filter(
      (account) => account.archived && account.name === editing?.fromAccount
    )
    return kept.length ? [...activeAccounts, ...kept] : activeAccounts
  }, [accounts, activeAccounts, editing?.fromAccount])

  const handleSubmit = async (values) => {
    try {
      if (values.id) {
        await editGoldLot(values)
        toast.success('Pembelian emas diperbarui!')
      } else {
        await addGoldLot(values)
        toast.success('Pembelian emas dicatat!')
      }
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    try {
      await removeGoldLot(pendingDelete.id)
      toast.success('Catatan emas dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const startEdit = (lot) =>
    setEditing({ ...lot, grams: String(lot.grams), cost: String(lot.cost) })

  return (
    <div className="space-y-gap-normal">
      <GoldPortfolio
        summary={summary}
        quote={quote}
        loading={loading}
        error={error}
        stale={stale}
        onRefresh={refresh}
        money={money}
      />

      <SectionHeader
        title="Pembelian"
        hint={`${goldLots.length} catatan`}
        action={
          <Button size="sm" onClick={() => setEditing(emptyGoldLot())}>
            <PlusIcon className="h-4 w-4" />
            Catat
          </Button>
        }
      />

      {!goldLots.length ? (
        <Card flush as="div">
          <EmptyState
            icon="🥇"
            title="Belum ada emas"
            description="Catat pembelian pertama: gramasi, harga beli, dan tanggalnya."
            actionLabel="Catat pembelian"
            onAction={() => setEditing(emptyGoldLot())}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {[...goldLots]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((lot) => {
              const value = quote ? lot.grams * quote.buybackPerGram : null
              const profit = value === null ? null : value - lot.cost

              return (
                <li key={lot.id}>
                  <ListRow
                    leading={<RowIcon icon="🥇" color="#eda100" />}
                    title={formatGrams(lot.grams)}
                    subtitle={formatDate(lot.date, settings.dateFormat)}
                    meta={`${money(lot.pricePerGram)}/gr${lot.fromAccount ? ` · ${lot.fromAccount}` : ''}`}
                    trailing={money(lot.cost)}
                    trailingSub={
                      profit === null ? null : (
                        <span
                          className={
                            profit >= 0
                              ? 'text-income'
                              : 'text-expense'
                          }
                        >
                          {profit >= 0 ? '+' : '−'}
                          {money(Math.abs(profit))}
                        </span>
                      )
                    }
                    action={
                      <KebabMenu
                        label={`Aksi untuk pembelian ${formatGrams(lot.grams)}`}
                        items={[
                          {
                            label: 'Ubah',
                            icon: <PencilIcon className="h-4 w-4" />,
                            onSelect: () => startEdit(lot)
                          },
                          {
                            label: 'Hapus',
                            icon: <TrashIcon className="h-4 w-4" />,
                            destructive: true,
                            onSelect: () => setPendingDelete(lot)
                          }
                        ]}
                      />
                    }
                  />
                </li>
              )
            })}
        </Card>
      )}

      {editing && (
        <GoldForm
          open
          key={editing.id || 'new'}
          initial={editing}
          accounts={formAccounts}
          onSubmit={handleSubmit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus catatan emas?"
        message={`Pembelian ${formatGrams(pendingDelete?.grams || 0)} akan dihapus. Kalau pembelian ini memotong saldo akun, saldonya ikut kembali.`}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

/**
 * Value, then profit, then the four figures behind them.
 *
 * Profit gets a full-width row of its own rather than a cell in the grid.
 * Amounts never wrap - a rupiah figure that reflows mid-number is unreadable -
 * so "−Rp4.349.000 (−10,1%)" in a half-width cell had nowhere to go but over the
 * top of the column next to it. It is also the one figure here that people come
 * to the screen for, so the space is not spent on it grudgingly.
 *
 * Everything else is a two-column grid of plain figures, each free to truncate
 * rather than overflow, with the price the whole card is derived from as the
 * last line.
 */
export function GoldPortfolio ({ summary, quote, loading, error, stale, onRefresh, money }) {
  const hasValue = summary.value !== null
  const up = summary.profit >= 0

  return (
    <Card aria-labelledby="gold-label">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="gold-label" className="text-caption text-subtitle">
            Nilai emas sekarang
          </p>
          <p className="mt-0.5 truncate text-hero font-bold tracking-tight amount">
            {hasValue ? money(summary.value) : '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Perbarui harga emas"
          className="tap -mr-1 -mt-1 flex shrink-0 items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5 disabled:opacity-40"
        >
          <RefreshIcon className={loading ? 'h-[19px] w-[19px] animate-spin' : 'h-[19px] w-[19px]'} />
        </button>
      </div>

      {hasValue && (
        <div
          className={`mt-2 inline-flex max-w-full items-baseline gap-1.5 overflow-hidden rounded-full px-2.5 py-1 text-caption font-semibold ${
            up
              ? 'bg-income/10 text-income'
              : 'bg-expense/10 text-expense'
          }`}
        >
          <span className="truncate amount">
            {up ? '+' : '−'}
            {money(Math.abs(summary.profit))}
          </span>
          <span className="shrink-0 amount opacity-80">{formatPercent(summary.profitPct)}</span>
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-hairline pt-2.5">
        <Stat label="Total gram" value={formatGrams(summary.grams)} />
        <Stat label="Total investasi" value={money(summary.invested)} />
        <Stat
          label="Rata-rata beli"
          value={summary.grams > 0 ? `${money(summary.averageCost)}/gr` : '—'}
        />
        <Stat
          label="Harga buyback"
          value={quote ? `${money(quote.buybackPerGram)}/gr` : '—'}
        />
      </dl>

      <p className="mt-2.5 border-t border-hairline pt-2 text-caption text-subtitle">
        {quote ? (
          <>
            {quote.source}
            {quote.recordedDate && ` · ${quote.recordedDate}`} · harga beli{' '}
            <span className="amount">{money(quote.sellPerGram)}/gr</span>
            {stale && ' · harga tersimpan, gagal memperbarui'}
          </>
        ) : (
          error || 'Mengambil harga emas…'
        )}
      </p>
    </Card>
  )
}

function Stat ({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-caption text-subtitle">{label}</dt>
      {/* `truncate` rather than wrap: `.amount` forbids wrapping anyway, so
          without it a long figure escapes its column instead of ending in an
          ellipsis the eye can act on. */}
      <dd className="mt-0.5 truncate text-body font-semibold amount">{value}</dd>
    </div>
  )
}
