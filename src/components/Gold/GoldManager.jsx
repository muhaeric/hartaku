import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useGoldBuyback } from '../../hooks/useGoldPrice.js'
import { formatCurrency, formatDate, formatGrams, formatPercent, parseAmount } from '../../lib/format.js'
import {
  GOLD_REFERENCE,
  GOLD_REFERENCE_OPTIONS,
  formatKarat,
  goldReferenceLabel,
  isJewelry,
  manualPriceProblem,
  resolveBuyback
} from '../../lib/gold.js'
import { goldLotValue, goldSummary } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import Sheet from '../ui/Sheet.jsx'
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon
} from '../ui/icons.jsx'
import GoldForm, { emptyGoldLot } from './GoldForm.jsx'

export default function GoldManager () {
  const toast = useToast()
  const { settings, updateSettings } = useSettings()
  const { goldLots, accounts, activeAccounts, addGoldLot, editGoldLot, removeGoldLot } = useData()
  const { quote, buyback, reference, manualPrice, loading, error, stale, refresh } = useGoldBuyback()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const summary = useMemo(() => goldSummary(goldLots, buyback?.perGram), [goldLots, buyback])
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
    setEditing({
      ...lot,
      grams: String(lot.grams),
      cost: String(lot.cost),
      karat: String(lot.karat)
    })

  return (
    <div className="space-y-gap-normal">
      <GoldPortfolio
        summary={summary}
        quote={quote}
        buyback={buyback}
        reference={reference}
        manualPrice={manualPrice}
        onReferenceChange={(goldReference) => updateSettings({ goldReference })}
        onManualPriceChange={(goldManualPrice) => updateSettings({ goldManualPrice })}
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
            description="Catat pembelian pertama - logam mulia atau perhiasan: gramasi, harga beli, dan tanggalnya."
            actionLabel="Catat pembelian"
            onAction={() => setEditing(emptyGoldLot())}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {[...goldLots]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((lot) => {
              const value = goldLotValue(lot, buyback?.perGram)
              const profit = value === null ? null : value - lot.cost
              const jewelry = isJewelry(lot)

              return (
                <li key={lot.id}>
                  <ListRow
                    leading={<RowIcon icon={jewelry ? '💍' : '🥇'} color="#eda100" />}
                    title={
                      jewelry
                        ? `${formatGrams(lot.grams)} · perhiasan ${formatKarat(lot.karat)}`
                        : formatGrams(lot.grams)
                    }
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
        message={`Pembelian ${formatGrams(pendingDelete?.grams || 0)}${pendingDelete && isJewelry(pendingDelete) ? ` perhiasan ${formatKarat(pendingDelete.karat)}` : ''} akan dihapus. Kalau pembelian ini memotong saldo akun, saldonya ikut kembali.`}
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
export function GoldPortfolio ({
  summary,
  quote,
  buyback,
  reference = GOLD_REFERENCE.market,
  manualPrice = 0,
  onReferenceChange,
  onManualPriceChange,
  loading,
  error,
  stale,
  onRefresh,
  money
}) {
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

      {/* With jewellery in the pile the scale weight and the gold content part
          ways, so both are shown and every per-gram figure says it is per gram
          of 24K - the only unit the quote and a mixed average agree on. */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-hairline pt-2.5">
        <Stat label="Total gram" value={formatGrams(summary.grams)} />
        {summary.hasJewelry && (
          <Stat label="Setara emas 24K" value={formatGrams(summary.fineGrams)} />
        )}
        <Stat label="Total investasi" value={money(summary.invested)} />
        <Stat
          label={summary.hasJewelry ? 'Rata-rata beli (24K)' : 'Rata-rata beli'}
          value={summary.fineGrams > 0 ? `${money(summary.averageCost)}/gr` : '—'}
        />
      </dl>

      <BuybackReference
        quote={quote}
        buyback={buyback}
        reference={reference}
        manualPrice={manualPrice}
        jewelry={summary.hasJewelry}
        onReferenceChange={onReferenceChange}
        onManualPriceChange={onManualPriceChange}
        money={money}
      />

      {/* Only said when there is something to say: today's price needs no caption. */}
      {(!quote || stale) && (
        <p className="mt-2.5 border-t border-hairline pt-2 text-caption text-subtitle">
          {!quote
            ? error || 'Mengambil harga emas…'
            : `Harga tersimpan${quote.recordedDate ? ` dari ${quote.recordedDate}` : ''} — gagal memperbarui.`}
        </p>
      )}

      {/* The quote is for bullion; what a jeweller pays back for a piece
          depends on the shop, so the figure above is only ever a guide. */}
      {summary.hasJewelry && (
        <p className="mt-1.5 text-caption text-subtitle">
          Nilai perhiasan merupakan estimasi dari kadar × harga buyback 24K. Untuk harga yang
          lebih tepat, tanyakan ke toko — tiap toko bisa berbeda-beda.
        </p>
      )}
    </Card>
  )
}

function Stat ({ label, value, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="truncate text-caption text-subtitle">{label}</dt>
      {/* `truncate` rather than wrap: `.amount` forbids wrapping anyway, so
          without it a long figure escapes its column instead of ending in an
          ellipsis the eye can act on. */}
      <dd className="mt-0.5 truncate text-body font-semibold amount">{value}</dd>
    </div>
  )
}

/**
 * Which buyback price the card above is computed with. Buyback differs by
 * brand far more than by day, so the owner picks the brand they would sell.
 *
 * A compact row rather than a native select: an `<option>` is one line of
 * text, so name and price ran together into "Galeri 24 (Pegadaian) · Rp …"
 * and truncated. The sheet lines the prices up in their own column, so the
 * brands can be compared at a glance, and hosts the own-price form too.
 */
function BuybackReference ({
  quote,
  buyback,
  reference,
  manualPrice,
  jewelry,
  onReferenceChange,
  onManualPriceChange,
  money
}) {
  const [open, setOpen] = useState(false)
  const [editingManual, setEditingManual] = useState(false)

  const close = () => {
    setOpen(false)
    setEditingManual(false)
  }

  return (
    <div className="mt-3 border-t border-hairline pt-2.5">
      <p className="text-caption text-subtitle">
        Dihitung dengan harga buyback{jewelry ? ' (24K)' : ''}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Acuan harga buyback: ${goldReferenceLabel(reference)}`}
          onClick={() => setOpen(true)}
          className="flex h-9 min-w-0 items-center gap-1.5 rounded-control border border-hairline bg-surface pl-2.5 pr-2 text-[14px] font-medium leading-5 text-ink"
        >
          <span className="truncate">{goldReferenceLabel(reference)}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-subtitle" />
        </button>
        <p className="shrink-0 text-body font-semibold amount">
          {buyback ? `${money(buyback.perGram)}/gr` : '—'}
        </p>
      </div>
      {buyback && <p className="mt-1 text-caption text-subtitle">{referenceNote(buyback, quote)}</p>}

      <Sheet
        open={open}
        title="Acuan harga buyback"
        description="Pilih merek emas yang kamu punya, atau isi harga dari toko langgananmu."
        onClose={close}
      >
        <div className="-mx-page divide-hairline">
          {GOLD_REFERENCE_OPTIONS.map((option) => {
            const manual = option.value === GOLD_REFERENCE.manual
            const price = manual
              ? resolveBuyback(null, option.value, manualPrice)
              : resolveBuyback(quote, option.value)
            const missing = price?.basis === 'fallback'

            return (
              <ListRow
                key={option.value}
                leading={
                  <CheckIcon
                    className={`h-4 w-4 text-brand ${reference === option.value ? '' : 'invisible'}`}
                  />
                }
                title={option.label}
                subtitle={optionNote(option, price)}
                trailing={
                  price && !missing ? (
                    <span className="amount">{money(price.perGram)}</span>
                  ) : (
                    <span className="text-subtitle">{manual ? 'Isi' : '—'}</span>
                  )
                }
                onClick={() => {
                  if (manual) {
                    setEditingManual(true)
                    return
                  }
                  onReferenceChange(option.value)
                  close()
                }}
              />
            )
          })}
        </div>

        {editingManual && (
          <ManualPriceForm
            saved={manualPrice}
            market={Number(quote?.buybackPerGram) || 0}
            onSave={(price) => {
              onManualPriceChange(price)
              onReferenceChange(GOLD_REFERENCE.manual)
              close()
            }}
            money={money}
          />
        )}
      </Sheet>
    </div>
  )
}

/** Under the picker on the card: where today's figure came from, in a line. */
function referenceNote ({ basis, reference, sources, stale, recordedDate }, quote) {
  if (basis === 'manual') return 'Harga isian sendiri — perbarui sesekali.'
  if (basis === 'market') {
    const brands = Object.keys(quote?.brands || {}).length
    return brands > 1 ? `Median buyback ${brands} merek.` : 'Harga buyback pasar.'
  }
  if (basis === 'fallback') {
    return reference === GOLD_REFERENCE.manual
      ? 'Harga belum diisi — sementara pakai rata-rata pasar.'
      : 'Tidak tersedia hari ini — sementara pakai rata-rata pasar.'
  }
  return stale ? `${dealerNote(sources)} · harga ${recordedDate}` : `${dealerNote(sources)}.`
}

/** Under each brand in the sheet: what it is, then where its price came from. */
function optionNote (option, price) {
  let source
  if (option.value === GOLD_REFERENCE.manual) source = 'Dari toko langgananmu'
  else if (!price || price.basis === 'fallback') source = 'Tidak tersedia hari ini'
  else if (price.basis === 'market') source = 'Median semua merek'
  else source = dealerNote(price.sources)

  return option.hint ? `${option.hint} · ${source}` : source
}

function dealerNote (sources = []) {
  return sources.length > 1 ? `Median ${sources.length} dealer` : `Dari ${sources[0] || 'dealer'}`
}

function ManualPriceForm ({ saved, market, onSave, money }) {
  const [draft, setDraft] = useState(saved > 0 ? String(saved) : '')
  const [problem, setProblem] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    const price = parseAmount(draft)
    const found = draft === '' ? 'Harga wajib diisi.' : manualPriceProblem(price, market)

    if (found === 'too_high' || found === 'too_low') {
      setProblem(
        `Terlalu ${found === 'too_high' ? 'tinggi' : 'rendah'} — rata-rata pasar hari ini ${money(market)}/gr. Periksa lagi angkanya.`
      )
      return
    }
    setProblem(found)
    if (!found) onSave(price)
  }

  return (
    <form className="mt-3 border-t border-hairline pt-3" onSubmit={handleSubmit} noValidate>
      <label className="label" htmlFor="gold-manual-price">
        Harga buyback per gram (24K)
      </label>
      <div className="flex gap-gap">
        <input
          id="gold-manual-price"
          type="text"
          inputMode="decimal"
          autoFocus
          className={`field min-w-0 flex-1 font-semibold ${problem ? 'field-error' : ''}`}
          value={draft}
          placeholder={market > 0 ? String(market) : '0'}
          onChange={(event) => {
            setDraft(event.target.value)
            setProblem(null)
          }}
        />
        <Button type="submit" className="shrink-0">
          Pakai
        </Button>
      </div>
      {problem ? (
        <p className="hint-error">{problem}</p>
      ) : (
        <p className="hint">Tanyakan ke toko tempat kamu biasa menjual emas.</p>
      )}
    </form>
  )
}
