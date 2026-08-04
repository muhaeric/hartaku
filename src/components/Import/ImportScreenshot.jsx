import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { todayIso } from '../../lib/dates.js'
import { parseReceipt } from '../../lib/receiptParser.js'
import { readImageText, releaseOcr } from '../../services/ocr.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { ErrorState } from '../ui/Feedback.jsx'
import TransactionForm from '../Transaction/TransactionForm.jsx'
import { CameraIcon, ImageIcon, ScanIcon } from '../ui/icons.jsx'

/**
 * Reads a payment screenshot and hands the result to the normal transaction
 * form. Account and category are picked by hand - guessing them from a merchant
 * name is exactly the kind of confident-but-wrong behaviour that erodes trust in
 * the numbers.
 */
export default function ImportScreenshot () {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const { categories, accounts, addTransaction } = useData()

  const [stage, setStage] = useState('pick')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)

  const cameraInput = useRef(null)
  const galleryInput = useRef(null)

  useEffect(() => () => releaseOcr(), [])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

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

      const parsed = parseReceipt(text, { ocrConfidence: confidence })
      setResult(parsed)
      setDraft({
        date: parsed.date || todayIso(),
        account: settings.defaultAccount || '',
        toAccount: '',
        amount: parsed.amount ? String(parsed.amount) : '',
        type: parsed.type,
        category: settings.defaultCategory || '',
        description: parsed.merchant || ''
      })
      setStage('review')
    } catch (err) {
      setError(err.message || 'Gagal membaca gambar.')
      setStage('pick')
    }
  }

  const handleSubmit = async (values) => {
    setBusy(true)
    try {
      await addTransaction(values)
      toast.success('Transaksi ditambahkan!')
      navigate('/transactions')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

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

      {stage === 'pick' && (
        <Card className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <ScanIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 text-card-title font-semibold">Import dari screenshot</h2>
          <p className="mx-auto mt-1 max-w-sm text-caption text-subtitle dark:text-subtitle-dark">
            Ambil bukti transfer atau notifikasi pembayaran. Nominal, tanggal, dan nama merchant
            dibaca otomatis — akun dan kategori tetap kamu pilih sendiri.
          </p>

          <div className="mt-4 flex gap-gap">
            <Button className="flex-1 justify-center" onClick={() => cameraInput.current?.click()}>
              <CameraIcon className="h-[18px] w-[18px]" />
              Kamera
            </Button>
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              onClick={() => galleryInput.current?.click()}
            >
              <ImageIcon className="h-[18px] w-[18px]" />
              Galeri
            </Button>
          </div>
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

      {stage === 'review' && draft && (
        <>
          <ExtractionSummary result={result} preview={preview} />

          <SectionHeader
            title="Periksa & simpan"
            hint="Semua kolom masih bisa diubah"
            action={
              <Button variant="ghost" size="sm" onClick={() => setStage('pick')}>
                Ganti gambar
              </Button>
            }
          />

          <Card>
            <TransactionForm
              draft={draft}
              setDraft={setDraft}
              categories={categories}
              accounts={accounts}
              busy={busy}
              submitLabel="Simpan transaksi"
              onSubmit={handleSubmit}
              onCancel={() => navigate('/add')}
            />
          </Card>
        </>
      )}
    </>
  )
}

function ExtractionSummary ({ result, preview }) {
  const [showText, setShowText] = useState(false)
  const percent = Math.round((result?.confidence ?? 0) * 100)

  const tone =
    percent >= 75
      ? 'text-income dark:text-emerald-400'
      : percent >= 45
        ? 'text-warning'
        : 'text-expense'

  return (
    <Card>
      <div className="flex items-start gap-3">
        {preview && (
          <img src={preview} alt="" className="h-16 w-16 rounded-control object-cover" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-caption text-subtitle dark:text-subtitle-dark">Keyakinan hasil baca</p>
          <p className={`text-amount font-semibold ${tone}`}>{percent}%</p>
          <p className="mt-0.5 text-caption text-subtitle dark:text-subtitle-dark">
            {percent >= 75
              ? 'Terbaca jelas, tapi tetap periksa nominalnya.'
              : 'Kurang yakin — periksa setiap kolom sebelum menyimpan.'}
          </p>
        </div>
      </div>

      {result?.reference && (
        <p className="mt-2 truncate border-t border-hairline pt-2 text-caption text-subtitle dark:border-hairline-dark dark:text-subtitle-dark">
          Ref: <span className="font-mono">{result.reference}</span>
          {result.time && ` · ${result.time}`}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowText((value) => !value)}
        className="mt-2 text-caption font-semibold text-brand-500"
      >
        {showText ? 'Sembunyikan teks hasil OCR' : 'Lihat teks hasil OCR'}
      </button>

      {showText && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-control bg-black/[0.04] p-2.5 text-caption text-subtitle dark:bg-white/[0.06] dark:text-subtitle-dark">
          {result?.rawText || '(kosong)'}
        </pre>
      )}
    </Card>
  )
}
