import { useState } from 'react'
import { useInstallApp } from '../../hooks/useInstallApp.js'
import { useToast } from '../../context/ToastContext.jsx'
import Button from '../ui/Button.jsx'
import { InstallIcon } from '../ui/icons.jsx'

export default function InstallAppBanner () {
  const toast = useToast()
  const { status, requestInstall } = useInstallApp()
  const [installing, setInstalling] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  if (status === 'installed' || status === 'checking') return null

  const handleInstall = async () => {
    if (status !== 'available') {
      setShowHelp(true)
      return
    }

    setInstalling(true)
    try {
      const choice = await requestInstall()
      if (choice.outcome === 'accepted') {
        toast.success('Hartaku berhasil ditambahkan ke perangkat.')
      }
    } catch {
      setShowHelp(true)
      toast.error('Dialog instalasi tidak bisa dibuka. Ikuti petunjuk manual di bawah.')
    } finally {
      setInstalling(false)
    }
  }

  return (
    <aside className="rounded-card border border-brand/20 bg-brand-soft p-page text-brand-onsoft" aria-label="Tambahkan Hartaku ke layar utama">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-surface/80 text-brand">
          <InstallIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-body font-semibold">Tambahkan Hartaku ke layar utama</h2>
          <p className="text-caption opacity-80">Buka lebih cepat dan gunakan Hartaku tanpa bilah browser.</p>
        </div>
        <Button className="justify-center" size="sm" onClick={handleInstall} loading={installing}>
          Tambahkan ke layar
        </Button>
      </div>

      {showHelp && status === 'ios-safari' && (
        <p className="mt-3 rounded-control bg-surface/70 p-3 text-caption">
          Ketuk <strong>Bagikan</strong>, geser pilihan ke bawah, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
        </p>
      )}

      {showHelp && status === 'ios-other' && (
        <p className="mt-3 rounded-control bg-surface/70 p-3 text-caption">
          Buka Hartaku di <strong>Safari</strong>, ketuk <strong>Bagikan</strong>, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.
        </p>
      )}

      {showHelp && status === 'manual' && (
        <p className="mt-3 rounded-control bg-surface/70 p-3 text-caption">
          Buka menu browser (⋮ atau …), lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.
        </p>
      )}
    </aside>
  )
}
