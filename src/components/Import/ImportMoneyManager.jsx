import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS, CATEGORY_COLORS } from '../../lib/constants.js'
import { formatCurrency, formatDate } from '../../lib/format.js'
import { parseMoneyManager } from '../../lib/moneyManager.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import { readWorkbook } from '../../lib/xlsx.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { ErrorState } from '../ui/Feedback.jsx'
import { CheckIcon, ScanIcon } from '../ui/icons.jsx'

/**
 * Sheets is happy to take a few thousand rows in one append, but a single
 * request that large is also a single request to lose. Chunking keeps a failure
 * cheap and gives the progress bar something true to report.
 */
const CHUNK = 400

/**
 * Names are all Money Manager exports carry about an account, so the kind is
 * guessed from the name and then shown for correction. Order matters: "Mandiri
 * kredit" is a card, not a bank account, and "Piutang" is not "Utang".
 */
const KIND_HINTS = [
  [/piutang|tagihan/i, 'receivable'],
  [/\butang|\bhutang|kredit|paylater|pinjaman|credit card/i, 'debt'],
  [/\bcash\b|tunai|dompet/i, 'cash'],
  [/dana|ovo|gopay|shopee|linkaja|e[-\s]?money|e[-\s]?wallet|flazz|brizzi/i, 'ewallet'],
  [/bank|bca|mandiri|bri\b|bni\b|jago|jenius|seabank|superbank|permata|cimb|danamon|btn\b|ocbc|maybank|neo|blu\b/i, 'bank']
]

function guessKind (name) {
  return KIND_HINTS.find(([pattern]) => pattern.test(name))?.[1] || 'other'
}

/** Same date, same amount, same everything - it is already in the sheet. */
function signature (transaction) {
  return [
    transaction.date,
    transaction.type,
    transaction.amount,
    transaction.account,
    transaction.toAccount || '',
    transaction.category || '',
    transaction.description || ''
  ].join('|')
}

export default function ImportMoneyManager () {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const { transactions, accounts, categories, addAccounts, addCategories, addTransactions } =
    useData()

  const [stage, setStage] = useState('setup')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState(null)
  const [kinds, setKinds] = useState({})
  const [error, setError] = useState(null)
  /* Snapshotted when the import starts: every batch that lands makes the plan
     recompute one batch smaller, so the plan cannot also be the progress bar. */
  const [job, setJob] = useState({ done: 0, total: 0 })

  const picker = useRef(null)

  /**
   * What the import would actually do, recomputed from what is already in the
   * spreadsheet: an account the user already has keeps its own spelling, and a
   * row that is already there is not written twice.
   */
  const plan = useMemo(() => {
    if (!parsed) return null

    const accountNames = new Map(accounts.map((item) => [item.name.toLowerCase(), item.name]))
    const categoryNames = new Map(categories.map((item) => [item.name.toLowerCase(), item.name]))

    const newAccounts = parsed.accounts
      .filter((name) => !accountNames.has(name.toLowerCase()))
      .map((name) => ({ name, kind: kinds[name] || guessKind(name) }))

    const newCategories = parsed.categories.filter(
      (category) => !categoryNames.has(category.name.toLowerCase())
    )

    // Counted, not flagged: two identical coffees on one day are two
    // transactions, and re-importing the same file should still skip both.
    const existing = new Map()
    for (const transaction of transactions) {
      const key = signature(transaction)
      existing.set(key, (existing.get(key) || 0) + 1)
    }

    const fresh = []
    let duplicates = 0

    for (const transaction of parsed.transactions) {
      const mapped = {
        ...transaction,
        account: accountNames.get(transaction.account.toLowerCase()) || transaction.account,
        toAccount: transaction.toAccount
          ? accountNames.get(transaction.toAccount.toLowerCase()) || transaction.toAccount
          : '',
        category: transaction.category
          ? categoryNames.get(transaction.category.toLowerCase()) || transaction.category
          : ''
      }

      const key = signature(mapped)
      const seen = existing.get(key) || 0

      if (seen > 0) {
        existing.set(key, seen - 1)
        duplicates += 1
      } else {
        fresh.push(mapped)
      }
    }

    return { newAccounts, newCategories, fresh, duplicates }
  }, [parsed, accounts, categories, transactions, kinds])

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return

    setError(null)
    setStage('reading')
    setFileName(file.name)

    try {
      const workbook = await readWorkbook(file)
      const result = parseMoneyManager(workbook.sheets)

      setParsed(result)
      setKinds(Object.fromEntries(result.accounts.map((name) => [name, guessKind(name)])))
      setStage('review')
    } catch (err) {
      setError(err.message || 'File ini tidak bisa dibaca.')
      setStage('setup')
    }
  }

  const handleImport = async () => {
    const batch = plan.fresh

    setStage('saving')
    setJob({ done: 0, total: batch.length })

    let written = 0

    try {
      if (plan.newAccounts.length) {
        await addAccounts(
          plan.newAccounts.map((account, index) => ({
            name: account.name,
            kind: account.kind,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            icon: ACCOUNT_KINDS.find((kind) => kind.value === account.kind)?.icon || '👛',
            openingBalance: 0,
            description: 'Diimpor dari Money Manager',
            sortOrder: accounts.length + index,
            archived: false
          }))
        )
      }

      if (plan.newCategories.length) {
        await addCategories(
          plan.newCategories.map((category, index) => ({
            name: category.name,
            type: category.type,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
            icon: '🏷️',
            description: 'Diimpor dari Money Manager',
            sortOrder: categories.length + index
          }))
        )
      }

      for (let start = 0; start < batch.length; start += CHUNK) {
        await addTransactions(batch.slice(start, start + CHUNK))
        written = Math.min(start + CHUNK, batch.length)
        setJob({ done: written, total: batch.length })
      }

      toast.success(`${batch.length} transaksi diimpor.`)
      navigate('/transactions')
    } catch (err) {
      setStage('review')
      setError(
        written > 0
          ? `${written} dari ${batch.length} transaksi sempat tersimpan sebelum gagal: ${err.message} Sisanya bisa diimpor ulang dengan file yang sama — yang sudah masuk akan dilewati.`
          : err.message
      )
    }
  }

  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <>
      <input
        ref={picker}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="sr-only"
        onChange={handleFile}
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {stage === 'setup' && (
        <Card>
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-soft text-brand">
              <ScanIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-card-title font-semibold">Pindah dari Money Manager</h2>
            <p className="mx-auto mt-1 max-w-sm text-caption text-subtitle">
              Ambil file Excel hasil ekspor dari aplikasi Money Manager, lalu pilih di sini.
              Akun, kategori, dan seluruh transaksinya ikut terbawa.
            </p>
          </div>

          <ol className="mt-4 space-y-1.5 text-caption text-subtitle">
            <Step index={1}>Buka Money Manager → menu ⋮ → Backup/Restore atau Export.</Step>
            <Step index={2}>Pilih Export Excel File, rentang waktu All (semua data).</Step>
            <Step index={3}>Simpan filenya, lalu pilih di sini.</Step>
          </ol>

          <Button
            size="lg"
            className="mt-4 w-full justify-center"
            onClick={() => picker.current?.click()}
          >
            Pilih file .xlsx
          </Button>

          <p className="hint text-center">
            Filenya dibaca di perangkat ini saja — tidak diunggah ke mana pun.
          </p>
        </Card>
      )}

      {stage === 'reading' && (
        <Card className="text-center">
          <p className="text-body font-medium">Membaca {fileName}…</p>
          <p className="mt-1 text-caption text-subtitle">
            File dengan ribuan baris butuh beberapa detik.
          </p>
        </Card>
      )}

      {stage === 'review' && plan && (
        <>
          <Card>
            <p className="truncate text-caption text-subtitle">
              {fileName}
            </p>
            <p className="mt-0.5 text-hero font-bold tracking-tight amount">
              {plan.fresh.length}
            </p>
            <p className="text-caption text-subtitle">
              transaksi siap diimpor · {formatDate(parsed.range.from, settings.dateFormat)} –{' '}
              {formatDate(parsed.range.to, settings.dateFormat)}
            </p>

            <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-hairline pt-2.5">
              <Figure label="Pengeluaran" value={parsed.counts.expense} />
              <Figure label="Pemasukan" value={parsed.counts.income} />
              <Figure label="Transfer" value={parsed.counts.transfer} />
            </dl>

            <ul className="mt-3 space-y-1 text-caption text-subtitle">
              {parsed.counts.paired > 0 && (
                <li>
                  {parsed.counts.paired} baris transfer digabung — Money Manager mencatat satu
                  transfer sebagai dua baris, di sini cukup satu.
                </li>
              )}
              {plan.duplicates > 0 && (
                <li>
                  {plan.duplicates} transaksi dilewati karena sudah ada di spreadsheet-mu.
                </li>
              )}
              {parsed.warnings.map((warning) => (
                <li key={warning} className="text-warning">
                  {warning}
                </li>
              ))}
            </ul>
          </Card>

          {plan.newAccounts.length > 0 && (
            <div className="space-y-gap-normal">
              <SectionHeader
                title="Akun baru"
                hint={`${plan.newAccounts.length} akun akan dibuat — periksa jenisnya`}
              />
              <Card className="space-y-2">
                {plan.newAccounts.map((account) => (
                  <div key={account.name} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-body">{account.name}</span>
                    <select
                      aria-label={`Jenis akun ${account.name}`}
                      className="field h-9 w-[128px] shrink-0 py-0"
                      value={account.kind}
                      onChange={(event) =>
                        setKinds((current) => ({ ...current, [account.name]: event.target.value }))
                      }
                    >
                      {sortByLabel(ACCOUNT_KINDS).map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <p className="hint">
                  Saldo awal semua akun ini diisi {money(0)}. Kalau saldo di Money Manager
                  dimulai dari nol juga, saldo di sini akan cocok dengan sendirinya.
                </p>
              </Card>
            </div>
          )}

          {plan.newCategories.length > 0 && (
            <div className="space-y-gap-normal">
              <SectionHeader
                title="Kategori baru"
                hint={`${plan.newCategories.length} kategori akan dibuat`}
              />
              <Card>
                <div className="flex flex-wrap gap-1.5">
                  {plan.newCategories.map((category) => (
                    <span
                      key={category.name}
                      className="rounded-full border border-hairline px-2.5 py-1 text-caption"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {plan.fresh.length === 0 ? (
            <Card className="text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <CheckIcon className="h-5 w-5" />
              </span>
              <p className="mt-2 text-body font-medium">Semuanya sudah ada</p>
              <p className="mt-1 text-caption text-subtitle">
                Tidak ada transaksi baru di file ini.
              </p>
            </Card>
          ) : (
            <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex gap-gap lg:bottom-4">
              <Button
                variant="secondary"
                className="justify-center"
                onClick={() => {
                  setParsed(null)
                  setStage('setup')
                }}
              >
                Ganti file
              </Button>
              <Button
                size="lg"
                className="flex-1 justify-center shadow-lg"
                onClick={handleImport}
              >
                Import {plan.fresh.length} transaksi
              </Button>
            </div>
          )}
        </>
      )}

      {stage === 'saving' && (
        <Card className="text-center">
          <p className="text-body font-medium">Menyimpan ke spreadsheet…</p>
          <p className="mt-1 text-caption text-subtitle">
            {job.done} dari {job.total} transaksi. Jangan tutup halaman ini.
          </p>

          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hairline"
            role="progressbar"
            aria-valuenow={job.done}
            aria-valuemin={0}
            aria-valuemax={job.total}
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.max(4, (job.done / (job.total || 1)) * 100)}%` }}
            />
          </div>
        </Card>
      )}
    </>
  )
}

function Step ({ index, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand-onsoft"
      >
        {index}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function Figure ({ label, value }) {
  return (
    <div>
      <dt className="text-caption text-subtitle">{label}</dt>
      <dd className="text-amount font-semibold amount">{value}</dd>
    </div>
  )
}
