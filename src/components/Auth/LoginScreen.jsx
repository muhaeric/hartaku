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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-between px-page py-10">
      <div className="flex flex-1 flex-col justify-center text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-card bg-brand-500 text-[26px]">
          💸
        </div>

        <h1 className="text-page-title font-bold tracking-tight">Hartaku</h1>
        <p className="mt-2 text-body text-subtitle dark:text-subtitle-dark">
          Catat pemasukan dan pengeluaran harian. Datanya tersimpan di Google Spreadsheet milikmu
          sendiri — bukan di server kami.
        </p>

        {error && (
          <p className="mt-5 rounded-control bg-expense/10 px-3 py-2.5 text-caption text-expense">
            {error}
          </p>
        )}

        <Button
          size="lg"
          variant="secondary"
          className="mt-6 w-full justify-center"
          onClick={handleSignIn}
          loading={busy}
        >
          {!busy && <GoogleIcon />}
          Masuk dengan Google
        </Button>

        <p className="mt-3 text-caption leading-relaxed text-subtitle dark:text-subtitle-dark">
          Aplikasi hanya meminta izin untuk file spreadsheet yang dibuatnya sendiri. File lain di
          Google Drive kamu tidak bisa diakses.
        </p>
      </div>

      <ul className="grid gap-2 text-caption text-subtitle dark:text-subtitle-dark">
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true">📊</span> Ringkasan aset, pemasukan, dan pengeluaran
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true">🥇</span> Investasi emas dengan harga pasar terkini
        </li>
        <li className="flex items-start gap-2.5">
          <span aria-hidden="true">📱</span> Dirancang untuk dipakai dari HP
        </li>
      </ul>
    </main>
  )
}
