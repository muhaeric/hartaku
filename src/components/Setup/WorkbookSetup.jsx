import { useState } from 'react'
import { extractSpreadsheetId } from '../../lib/spreadsheetId.js'
import Button from '../ui/Button.jsx'

/**
 * Shown whenever the app cannot be certain which spreadsheet to open.
 *
 * Two situations lead here and they need different framing: the Drive search
 * failed outright, or it ran cleanly and found nothing. Neither is proof that
 * the user is new, so neither creates anything on its own - guessing wrong
 * leaves someone with their records split across two spreadsheets.
 */
export default function WorkbookSetup ({
  reason,
  message,
  busy,
  onRetry,
  onUseSpreadsheet,
  onCreate
}) {
  const [sheetId, setSheetId] = useState('')
  const [confirmingCreate, setConfirmingCreate] = useState(false)

  const id = extractSpreadsheetId(sheetId)
  const lookupFailed = reason === 'workbook_lookup_failed'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-page py-8">
      <div className="card space-y-5">
        <div>
          <h1 className="text-section-title font-semibold">
            {lookupFailed ? 'Spreadsheet belum bisa dibuka' : 'Belum ada spreadsheet di akun ini'}
          </h1>
          <p className="mt-1.5 text-body text-subtitle dark:text-subtitle-dark">{message}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-caption font-semibold">
            Sudah punya catatan di perangkat lain? Tempel ID spreadsheet-nya
          </h2>
          <p className="text-body text-subtitle dark:text-subtitle-dark">
            Ambil dari halaman <strong>Pengaturan → Sumber data</strong> di perangkat yang sudah
            berisi data, atau salin URL Google Sheets-nya. Boleh tempel URL lengkapnya.
          </p>
          <input
            type="text"
            aria-label="ID atau URL spreadsheet"
            className="field font-mono text-caption"
            placeholder="1AbC…xyz atau https://docs.google.com/spreadsheets/d/…"
            value={sheetId}
            onChange={(event) => setSheetId(event.target.value)}
          />
          <Button disabled={!id || busy} onClick={() => onUseSpreadsheet(id)} loading={busy}>
            Pakai spreadsheet ini
          </Button>
        </section>

        {lookupFailed && (
          <section className="space-y-2 border-t border-hairline pt-4 dark:border-hairline-dark">
            <h2 className="text-caption font-semibold">Atau aktifkan Google Drive API</h2>
            <p className="text-body text-subtitle dark:text-subtitle-dark">
              Google Cloud Console → APIs &amp; Services → Library → cari{' '}
              <strong>Google Drive API</strong> → Enable. Setelah itu aplikasi bisa menemukan
              sendiri spreadsheet lamamu di perangkat mana pun.
            </p>
            <Button variant="secondary" onClick={onRetry} loading={busy}>
              Sudah, coba lagi
            </Button>
          </section>
        )}

        <section className="space-y-2 border-t border-hairline pt-4 dark:border-hairline-dark">
          <h2 className="text-caption font-semibold">Atau mulai dari nol</h2>
          {confirmingCreate ? (
            <>
              <p className="text-body text-expense">
                Kalau kamu sudah punya data di perangkat lain, spreadsheet baru ini akan kosong dan
                terpisah dari data itu. Lanjutkan?
              </p>
              <div className="flex gap-gap">
                <Button variant="secondary" onClick={() => setConfirmingCreate(false)}>
                  Batal
                </Button>
                <Button variant="danger" onClick={onCreate} loading={busy}>
                  Ya, buat baru
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-body text-subtitle dark:text-subtitle-dark">
                Pilih ini kalau kamu memang belum pernah pakai Hartaku sebelumnya.
              </p>
              <Button variant="secondary" onClick={() => setConfirmingCreate(true)}>
                Buat spreadsheet baru
              </Button>
            </>
          )}
        </section>

        {!lookupFailed && (
          <p className="border-t border-hairline pt-4 text-caption text-subtitle dark:border-hairline-dark dark:text-subtitle-dark">
            Pencariannya sudah mencakup seluruh spreadsheet yang pernah dibuat Hartaku di akun ini,
            apa pun namanya sekarang — dan hasilnya kosong. Periksa email yang tampil di layar
            login: paling sering penyebabnya akun Google yang berbeda.
          </p>
        )}
      </div>
    </main>
  )
}
