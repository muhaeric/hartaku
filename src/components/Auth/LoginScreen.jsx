import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../ui/Button.jsx'
import { GoogleIcon } from '../ui/icons.jsx'

const FEATURES = [
  { icon: '📊', text: 'Ringkasan aset, kewajiban, pemasukan, dan pengeluaran per bulan' },
  { icon: '🏦', text: 'Banyak akun — tunai, bank, e-wallet, piutang — beserta transfer antar akun' },
  { icon: '🥇', text: 'Investasi emas dengan harga pasar harian dan hitungan untung/rugi' },
  { icon: '🧾', text: 'Import transaksi dari screenshot mutasi, dibaca langsung di perangkatmu' }
]

/**
 * Doubles as the app's public home page: the URL Google asks for when an OAuth
 * app is published needs to explain what the app does and what it touches, not
 * just show a sign-in button.
 */
export default function LoginScreen () {
  const { signIn, error } = useAuth()
  const [busy, setBusy] = useState(false)

  const handleSignIn = async () => {
    setBusy(true)
    await signIn()
    setBusy(false)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-page py-8">
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-brand-500 text-[26px]">
            💸
          </div>

          <h1 className="text-page-title font-bold tracking-tight">Hartaku</h1>
          <p className="mt-2 text-body text-subtitle dark:text-subtitle-dark">
            Pencatat keuangan pribadi yang menyimpan datamu di Google Spreadsheet milikmu
            sendiri — bukan di server kami.
          </p>

          {error && (
            <p className="mt-4 rounded-control bg-expense/10 px-3 py-2.5 text-caption text-expense">
              {error}
            </p>
          )}

          <Button
            size="lg"
            variant="secondary"
            className="mt-5 w-full justify-center"
            onClick={handleSignIn}
            loading={busy}
          >
            {!busy && <GoogleIcon />}
            Masuk dengan Google
          </Button>
        </div>

        <ul className="mt-7 space-y-2.5">
          {FEATURES.map((feature) => (
            <li key={feature.text} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="text-[15px] leading-5">
                {feature.icon}
              </span>
              <span className="text-caption text-subtitle dark:text-subtitle-dark">
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-card border border-hairline bg-surface p-3.5 dark:border-hairline-dark dark:bg-surface-dark">
          <h2 className="text-caption font-semibold">Data kamu tetap milik kamu</h2>
          <p className="mt-1 text-caption text-subtitle dark:text-subtitle-dark">
            Hartaku hanya meminta izin <code className="font-mono">drive.file</code> — akses
            terbatas pada spreadsheet yang dibuatnya sendiri. File lain di Google Drive-mu
            tidak bisa dilihat maupun disentuh. Tidak ada analytics dan tidak ada pelacakan.
          </p>
        </div>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-hairline pt-4 text-caption text-subtitle dark:border-hairline-dark dark:text-subtitle-dark">
        <a className="font-medium text-brand-500" href="/privacy">
          Kebijakan Privasi
        </a>
        <a className="font-medium text-brand-500" href="/terms">
          Syarat &amp; Ketentuan
        </a>
      </footer>
    </main>
  )
}
