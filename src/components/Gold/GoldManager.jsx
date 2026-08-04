import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import { formatCurrency, formatDate, formatGrams, formatPercent } from '../../lib/format.js'
import { goldSummary } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { PencilIcon, PlusIcon, RefreshIcon, TrashIcon } from '../ui/icons.jsx'
import GoldForm, { emptyGoldLot } from './GoldForm.jsx'

export default function GoldManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const { goldLots, accounts, addGoldLot, editGoldLot, removeGoldLot } = useData()
  const { quote, loading, error, stale, refresh } = useGoldPrice()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const summary = useMemo(
    () => goldSummary(goldLots, quote?.buybackPerGram),
    [goldLots, quote]
  )

  const money = (value) => formatCurrency(value, settings.currency)

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

  const startEdit = (lot) => {
    setEditing({ ...lot, grams: String(lot.grams), cost: String(lot.cost) })
  }

  return (
    <div className="space-y-4">
      <GoldPortfolio
        summary={summary}
        quote={quote}
        loading={loading}
        error={error}
        stale={stale}
        onRefresh={refresh}
        money={money}
      />

      <Button className="w-full justify-center" onClick={() => setEditing(emptyGoldLot())}>
        <PlusIcon className="h-5 w-5" />
        Catat pembelian emas
      </Button>

      {!goldLots.length ? (
        <EmptyState
          icon="🥇"
          title="Belum ada emas"
          description="Catat pembelian pertama: gramasi, harga beli, dan tanggalnya."
        />
      ) : (
        <ul className="space-y-2">
          {[...goldLots]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((lot) => {
              const value = quote ? lot.grams * quote.buybackPerGram : null
              const profit = value === null ? null : value - lot.cost

              return (
                <li key={lot.id} className="card p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{formatGrams(lot.grams)}</p>
                      <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(lot.date, settings.dateFormat)} · {money(lot.pricePerGram)}/gr
                        {lot.fromAccount && ` · ${lot.fromAccount}`}
                      </p>
                      {lot.description && (
                        <p className="mt-0.5 truncate text-sm text-slate-400">{lot.description}</p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{money(lot.cost)}</p>
                      {profit !== null && (
                        <p
                          className={`text-sm font-medium tabular-nums ${
                            profit >= 0
                              ? 'text-income dark:text-emerald-400'
                              : 'text-expense dark:text-red-400'
                          }`}
                        >
                          {profit >= 0 ? '+' : '−'}
                          {money(Math.abs(profit))}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(lot)}
                      className="tap flex items-center gap-1.5 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <PencilIcon className="h-4 w-4" /> Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(lot)}
                      className="tap flex items-center gap-1.5 rounded-lg px-2 text-sm text-expense hover:bg-expense/10"
                    >
                      <TrashIcon className="h-4 w-4" /> Hapus
                    </button>
                  </div>
                </li>
              )
            })}
        </ul>
      )}

      {editing && (
        <GoldForm
          open
          key={editing.id || 'new'}
          initial={editing}
          accounts={accounts}
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

function GoldPortfolio ({ summary, quote, loading, error, stale, onRefresh, money }) {
  const hasValue = summary.value !== null

  return (
    <section className="card" aria-labelledby="gold-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="gold-heading" className="text-sm text-slate-500 dark:text-slate-400">
            Nilai emas sekarang
          </h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {hasValue ? money(summary.value) : '—'}
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Perbarui harga emas"
          className="tap flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <RefreshIcon className={loading ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Stat label="Total gram" value={formatGrams(summary.grams)} />
        <Stat label="Total investasi" value={money(summary.invested)} />
        <Stat
          label="Untung / rugi"
          value={
            hasValue ? (
              <span
                className={
                  summary.profit >= 0
                    ? 'text-income dark:text-emerald-400'
                    : 'text-expense dark:text-red-400'
                }
              >
                {summary.profit >= 0 ? '+' : '−'}
                {money(Math.abs(summary.profit))} ({formatPercent(summary.profitPct)})
              </span>
            ) : (
              '—'
            )
          }
        />
        <Stat
          label="Rata-rata beli"
          value={summary.grams > 0 ? `${money(summary.averageCost)}/gr` : '—'}
        />
      </dl>

      <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        {quote ? (
          <>
            <p>
              Buyback <strong className="font-semibold">{money(quote.buybackPerGram)}/gr</strong> ·
              beli {money(quote.sellPerGram)}/gr
            </p>
            <p className="mt-0.5 text-xs">
              {quote.source}
              {quote.recordedDate && ` · ${quote.recordedDate}`}
              {stale && ' · harga tersimpan, gagal memperbarui'}
            </p>
          </>
        ) : (
          <p>{error || 'Mengambil harga emas…'}</p>
        )}

        {error && quote && <p className="mt-1 text-xs text-expense">{error}</p>}
      </div>
    </section>
  )
}

function Stat ({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
