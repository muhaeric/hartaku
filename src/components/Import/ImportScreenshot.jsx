import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { todayIso } from '../../lib/dates.js'
import { parseAmount } from '../../lib/format.js'
import { parseTransactions } from '../../lib/receiptParser.js'
import { readImageText, releaseOcr } from '../../services/ocr.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { EmptyState, ErrorState } from '../ui/Feedback.jsx'
import { CameraIcon, ImageIcon, ScanIcon } from '../ui/icons.jsx'
import ImportRow from './ImportRow.jsx'

/**
 * Reads a payment screenshot or a mutation list and turns it into transactions.
 *
 * The account is chosen before scanning rather than after: one screenshot always
 * comes from one account, so asking once beats repeating the choice on every
 * detected row - and it means nothing here has to guess which bank it is.
 */
export default function ImportScreenshot () {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const { categories, accounts, addTransactions } = useData()

  const [account, setAccount] = useState(settings.defaultAccount || '')
  const [stage, setStage] = useState('setup')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [rawText, setRawText] = useState('')
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)

  const cameraInput = useRef(null)
  const galleryInput = useRef(null)

  useEffect(() => () => releaseOcr(), [])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const selected = items.filter((item) => item.selected)
  const ready = useMemo(
    () =>
      selected.filter((item) => {
        const amount = parseAmount(item.amount)
        return Number.isFinite(amount) && amount > 0 && item.category && item.date
      }),
    [selected]
  )

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // Reset so picking the same file twice still fires a change event.
    event.target.value = ''
    if (!file) return

    setPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setError(null)
    setProgress(0)
    setStage('reading')

    try {
      const { text, confidence } = await readImageText(file, {
        onProgress: ({ progress: value }) => setProgress(value || 0)
      })

      const parsed = parseTransactions(text, { ocrConfidence: confidence })
      setRawText(text)
      setItems(
        parsed.map((entry, index) => ({
          key: `${index}-${entry.amount}`,
          selected: true,
          amount: entry.amount ? String(entry.amount) : '',
          date: entry.date || todayIso(),
          type: entry.type,
          category: settings.defaultCategory || '',
          description: entry.merchant || '',
          confidence: entry.confidence
        }))
      )
      setStage('review')
    } catch (err) {
      setError(err.message || 'Gagal membaca gambar.')
      setStage('setup')
    }
  }

  const patchItem = (key, changes) =>
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item))
    )

  const handleSave = async () => {
    setBusy(true)
    try {
      await addTransactions(
        ready.map((item) => ({
          date: item.date,
          account,
          toAccount: '',
          amount: parseAmount(item.amount),
          type: item.type,
          category: item.category,
          description: item.description.trim()
        }))
      )
      toast.success(
        ready.length > 1 ? `${ready.length} transaksi ditambahkan!` : 'Transaksi ditambahkan!'
      )
      navigate('/transactions')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const blocked = selected.length - ready.length

  return (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFile}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {stage === 'setup' && (
        <Card>
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <ScanIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-card-title font-semibold">Import dari screenshot</h2>
            <p className="mx-auto mt-1 max-w-sm text-caption text-subtitle dark:text-subtitle-dark">
              Bukti transfer atau daftar mutasi. Kalau ada beberapa transaksi dalam satu gambar,
              semuanya dibaca dan bisa kamu pilih.
            </p>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="import-account">
              Masuk ke akun
            </label>
            <select
              id="import-account"
              className="field"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
            >
              <option value="">Pilih akun…</option>
              {accounts.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.icon} {item.name}
                </option>
              ))}
            </select>
            <p className="hint">
              Satu screenshot berasal dari satu akun, jadi cukup dipilih sekali di sini.
            </p>
          </div>

          <div className="mt-4 flex gap-gap">
            <Button
              className="flex-1 justify-center"
              disabled={!account}
              onClick={() => cameraInput.current?.click()}
            >
              <CameraIcon className="h-[18px] w-[18px]" />
              Kamera
            </Button>
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              disabled={!account}
              onClick={() => galleryInput.current?.click()}
            >
              <ImageIcon className="h-[18px] w-[18px]" />
              Galeri
            </Button>
          </div>

          {!account && (
            <p className="mt-2 text-center text-caption text-subtitle dark:text-subtitle-dark">
              Pilih akun dulu untuk melanjutkan.
            </p>
          )}
        </Card>
      )}

      {stage === 'reading' && (
        <Card className="text-center">
          {preview && (
            <img
              src={preview}
              alt=""
              className="mx-auto mb-3 max-h-48 rounded-control object-contain"
            />
          )}
          <p className="text-body font-medium">Membaca gambar…</p>
          <p className="mt-1 text-caption text-subtitle dark:text-subtitle-dark">
            Pertama kali bisa agak lama karena model OCR-nya diunduh dulu.
          </p>

          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-hairline dark:bg-hairline-dark"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
        </Card>
      )}

      {stage === 'review' && (
        <>
          <ScanSummary
            items={items}
            account={account}
            preview={preview}
            rawText={rawText}
            onRescan={() => setStage('setup')}
          />

          {!items.length ? (
            <Card flush as="div">
              <EmptyState
                icon="🔍"
                title="Tidak ada transaksi terbaca"
                description="Coba screenshot yang lebih jelas, atau masukkan manual."
                actionLabel="Input manual"
                onAction={() => navigate('/add')}
              />
            </Card>
          ) : (
            <>
              <SectionHeader
                title={`${items.length} transaksi terbaca`}
                hint="Centang yang mau disimpan, perbaiki seperlunya"
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItems((current) => {
                        const turnOn = current.some((item) => !item.selected)
                        return current.map((item) => ({ ...item, selected: turnOn }))
                      })
                    }
                  >
                    {items.some((item) => !item.selected) ? 'Pilih semua' : 'Kosongkan'}
                  </Button>
                }
              />

              <ul className="space-y-gap">
                {items.map((item) => (
                  <ImportRow
                    key={item.key}
                    item={item}
                    categories={categories}
                    selected={item.selected}
                    onToggle={() => patchItem(item.key, { selected: !item.selected })}
                    onChange={(changes) => patchItem(item.key, changes)}
                  />
                ))}
              </ul>

              {blocked > 0 && (
                <p className="text-caption text-expense">
                  {blocked} transaksi belum bisa disimpan — lengkapi kategori dan jumlahnya.
                </p>
              )}

              <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4">
                <Button
                  size="lg"
                  className="w-full justify-center shadow-lg"
                  disabled={!ready.length}
                  loading={busy}
                  onClick={handleSave}
                >
                  Simpan {ready.length} transaksi
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </>
  )
}

function ScanSummary ({ items, account, preview, rawText, onRescan }) {
  const [showText, setShowText] = useState(false)

  const confidence = items.length
    ? items.reduce((sum, item) => sum + (item.confidence || 0), 0) / items.length
    : 0
  const percent = Math.round(confidence * 100)

  const tone =
    percent >= 75
      ? 'text-income dark:text-emerald-400'
      : percent >= 45
        ? 'text-warning'
        : 'text-expense'

  return (
    <Card>
      <div className="flex items-start gap-3">
        {preview && <img src={preview} alt="" className="h-16 w-16 rounded-control object-cover" />}

        <div className="min-w-0 flex-1">
          <p className="text-caption text-subtitle dark:text-subtitle-dark">
            Keyakinan hasil baca · masuk ke {account}
          </p>
          <p className={`text-amount font-semibold ${tone}`}>{percent}%</p>
          <p className="mt-0.5 text-caption text-subtitle dark:text-subtitle-dark">
            {percent >= 75
              ? 'Terbaca jelas, tapi tetap periksa nominalnya.'
              : 'Kurang yakin — periksa setiap kolom sebelum menyimpan.'}
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={onRescan}>
          Ganti
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setShowText((value) => !value)}
        className="mt-2 text-caption font-semibold text-brand-500"
      >
        {showText ? 'Sembunyikan teks hasil OCR' : 'Lihat teks hasil OCR'}
      </button>

      {showText && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-control bg-black/[0.04] p-2.5 text-caption text-subtitle dark:bg-white/[0.06] dark:text-subtitle-dark">
          {rawText || '(kosong)'}
        </pre>
      )}
    </Card>
  )
}
