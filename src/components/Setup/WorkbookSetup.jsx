import { useState } from 'react'
import { extractSpreadsheetId } from '../../lib/spreadsheetId.js'
import Button from '../ui/Button.jsx'

/**
 * Shown when we cannot tell whether a workbook already exists. Creating one
 * anyway would quietly give this device its own empty copy of the data, so the
 * choice is handed to the user instead.
 */
export default function WorkbookSetup ({ message, busy, onRetry, onUseSpreadsheet, onCreate }) {
  const [sheetId, setSheetId] = useState('')
  const [confirmingCreate, setConfirmingCreate] = useState(false)

  const id = extractSpreadsheetId(sheetId)

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="card space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Spreadsheet belum bisa dibuka</h1>
          <p className="mt-1.5 text-body text-subtitle dark:text-subtitle-dark">{message}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Cara terbaik: aktifkan Google Drive API</h2>
          <p className="text-body text-subtitle dark:text-subtitle-dark">
            Buka Google Cloud Console → APIs &amp; Services → Library → cari{' '}
            <strong>Google Drive API</strong> → Enable. Setelah itu aplikasi bisa menemukan
            sendiri spreadsheet lamamu di perangkat mana pun.
          </p>
          <Button variant="secondary" onClick={onRetry} loading={busy}>
            Sudah, coba lagi
          </Button>
        </section>

        <section className="space-y-2 border-t border-hairline pt-4 dark:border-hairline-dark">
          <h2 className="text-sm font-semibold">Atau tempel ID spreadsheet-nya</h2>
          <p className="text-body text-subtitle dark:text-subtitle-dark">
            Ambil dari halaman Pengaturan di perangkat yang sudah berisi data, atau dari URL
            Google Sheets-nya. Boleh tempel URL lengkapnya.
          </p>
          <input
            type="text"
            aria-label="ID atau URL spreadsheet"
            className="field font-mono text-sm"
            placeholder="1AbC…xyz atau https://docs.google.com/spreadsheets/d/…"
            value={sheetId}
            onChange={(event) => setSheetId(event.target.value)}
          />
          <Button disabled={!id || busy} onClick={() => onUseSpreadsheet(id)} loading={busy}>
            Pakai spreadsheet ini
          </Button>
        </section>

        <section className="space-y-2 border-t border-hairline pt-4 dark:border-hairline-dark">
          <h2 className="text-sm font-semibold">Atau mulai dari nol</h2>
          {confirmingCreate ? (
            <>
              <p className="text-sm text-expense">
                Kalau kamu sudah punya data di perangkat lain, spreadsheet baru ini akan kosong
                dan terpisah dari data itu. Lanjutkan?
              </p>
              <div className="flex gap-2">
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
                Pilih ini hanya kalau kamu memang belum pernah pakai Hartaku sebelumnya.
              </p>
              <Button variant="secondary" onClick={() => setConfirmingCreate(true)}>
                Buat spreadsheet baru
              </Button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
