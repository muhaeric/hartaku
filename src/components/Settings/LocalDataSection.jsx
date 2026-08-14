import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { downloadBackup, readBackup, summarizeBackup } from '../../lib/backup.js'
import { clearDoc } from '../../services/localStore.js'
import { isEmptySnapshot, localSnapshot, restoreLocalSnapshot } from '../../services/storage.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'

/**
 * Everything about the device-local copy: what is in it, how to get a file out
 * of it, how to put one back, and the two exits - to Google, or to nothing.
 *
 * It also shows in Google mode whenever a local document is still lying around,
 * because a migration copies rather than moves, and the leftover deserves an
 * honest way to be dealt with instead of quietly outliving the app that made
 * it.
 */
export default function LocalDataSection () {
  const toast = useToast()
  const { signIn } = useAuth()
  const { isLocal, startMigration } = useStorage()
  const { reload } = useData()

  const fileInput = useRef(null)
  const [snapshot, setSnapshot] = useState(null)
  const [pending, setPending] = useState(null)

  const refresh = useCallback(() => {
    localSnapshot()
      .then(setSnapshot)
      .catch(() => setSnapshot(null))
  }, [])

  useEffect(refresh, [refresh])

  const handleBackup = () => {
    if (!snapshot) return

    downloadBackup(snapshot)
    toast.success('Cadangan diunduh.')
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // Cleared straight away so choosing the same file twice still fires.
    event.target.value = ''
    if (!file) return

    try {
      const restored = await readBackup(file)
      setPending({ kind: 'restore', data: restored })
    } catch (err) {
      toast.error(err.message)
    }
  }

  const runRestore = async () => {
    try {
      await restoreLocalSnapshot(pending.data)
      await reload()
      refresh()
      toast.success('Data dipulihkan dari cadangan.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const runDelete = async () => {
    try {
      await clearDoc()
      refresh()
      // In local mode the app is looking at what was just deleted, so it has to
      // be told; in Google mode nothing on screen came from here.
      if (isLocal) await reload()
      toast.success('Data lokal dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleMigrate = async () => {
    startMigration(true)
    await signIn()
  }

  const empty = isEmptySnapshot(snapshot)
  if (!isLocal && empty) return null

  return (
    <>
      <div className="space-y-1">
        <p className="text-body">{isLocal ? 'Penyimpanan device' : 'Sisa data lokal'}</p>
        <p className="text-caption text-subtitle">
          {snapshot ? summarizeBackup(snapshot) : 'Belum ada data.'}
        </p>
        <p className="hint">
          {isLocal
            ? 'Data ini hanya ada di browser ini. Membersihkan data browsing, mode penyamaran, ' +
              'atau ganti perangkat berarti data ini tidak ikut. Cadangkan ke file secara berkala.'
            : 'Ini salinan dari sebelum kamu pindah ke Google Sheets. Aplikasi sekarang membaca ' +
              'spreadsheet, bukan ini.'}
        </p>
      </div>

      <div className="flex flex-col gap-gap sm:flex-row">
        <Button variant="secondary" className="justify-center" onClick={handleBackup} disabled={empty}>
          Cadangkan ke file
        </Button>

        {isLocal && (
          <Button
            variant="secondary"
            className="justify-center"
            onClick={() => fileInput.current?.click()}
          >
            Pulihkan dari file
          </Button>
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={handleFile}
      />

      {isLocal && (
        <div>
          <Button className="w-full justify-center sm:w-auto" onClick={handleMigrate}>
            Pindah ke Google Sheets
          </Button>
          <p className="hint">
            Data di device ini disalin ke spreadsheet milikmu, lalu aplikasi membaca dari sana —
            bisa dibuka dari perangkat lain dan aman kalau browser ini hilang.
          </p>
        </div>
      )}

      <div>
        <Button
          variant="danger"
          className="w-full justify-center sm:w-auto"
          disabled={empty}
          onClick={() => setPending({ kind: 'delete' })}
        >
          Hapus data lokal
        </Button>
      </div>

      <ConfirmDialog
        open={pending?.kind === 'restore'}
        title="Pulihkan dari cadangan?"
        message={`Isi cadangan (${
          pending?.kind === 'restore' ? summarizeBackup(pending.data) : ''
        }) akan menggantikan seluruh data lokal yang sekarang. Yang sekarang tidak bisa dikembalikan lagi.`}
        confirmLabel="Pulihkan"
        onConfirm={runRestore}
        onClose={() => setPending(null)}
      />

      <ConfirmDialog
        open={pending?.kind === 'delete'}
        title="Hapus data lokal?"
        message={
          isLocal
            ? 'Semua transaksi, akun, dan kategori di device ini akan hilang permanen. Cadangkan dulu kalau belum.'
            : 'Salinan lama di device ini akan hilang permanen. Data di spreadsheet tidak tersentuh.'
        }
        confirmLabel="Hapus"
        onConfirm={runDelete}
        onClose={() => setPending(null)}
      />
    </>
  )
}
