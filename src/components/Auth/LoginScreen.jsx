import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../ui/Button.jsx'
import { GoogleIcon } from '../ui/icons.jsx'

export default function LoginScreen () {
  const { signIn, error } = useAuth()
  const [busy, setBusy] = useState(false)

  const handleSignIn = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }

  return (
    <main className="flex min-h-dvh flex-col justify-between px-6 py-10">
      <div className="flex flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
            💸
          </div>

          <h1 className="text-3xl font-bold tracking-tight">Hartaku</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Catat pemasukan dan pengeluaran harian. Datanya tersimpan di Google Spreadsheet milikmu
            sendiri — bukan di server kami.
          </p>

          {error && (
            <p className="mt-6 rounded-xl bg-expense/10 px-4 py-3 text-sm text-expense">{error}</p>
          )}

          <Button
            className="mt-8 w-full justify-center"
            variant="secondary"
            onClick={handleSignIn}
            loading={busy}
          >
            {!busy && <GoogleIcon />}
            Masuk dengan Google
          </Button>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Aplikasi hanya meminta izin untuk file spreadsheet yang dibuatnya sendiri. File lain di
            Google Drive kamu tidak bisa diakses.
          </p>
        </div>
      </div>

      <ul className="mx-auto grid w-full max-w-sm gap-3 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-3">
          <span aria-hidden="true">📊</span> Ringkasan pemasukan, pengeluaran, dan saldo per bulan
        </li>
        <li className="flex items-start gap-3">
          <span aria-hidden="true">🏷️</span> Kategori bisa diatur sendiri
        </li>
        <li className="flex items-start gap-3">
          <span aria-hidden="true">📱</span> Dirancang untuk dipakai dari HP
        </li>
      </ul>
    </main>
  )
}
