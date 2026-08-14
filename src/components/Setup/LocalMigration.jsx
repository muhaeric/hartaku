import { useEffect, useState } from 'react'
import { useStorage } from '../../context/StorageContext.jsx'
import { summarizeBackup } from '../../lib/backup.js'
import {
  createAccounts,
  createCategories,
  createGoldLot,
  createTransactions,
  listAccounts,
  listCategories
} from '../../services/repository.js'
import { isEmptySnapshot, localSnapshot } from '../../services/storage.js'
import { ensureWorkbook } from '../../services/workbook.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { ErrorState, LoadingBlock } from '../ui/Feedback.jsx'

/**
 * Sits between signing in and the app, once - when someone who has been keeping
 * their books on the device asks to move them to Google.
 *
 * It copies rather than moves. The local document is left exactly as it was, so
 * a migration that half-succeeds - the network dropping between the accounts
 * and the transactions - costs nothing but a duplicate spreadsheet, and the
 * device still holds the only complete copy either way. Cleaning up the local
 * data afterwards is offered in Pengaturan, deliberately as a separate decision
 * made after the user has seen the spreadsheet with their own eyes.
 *
 * Order matters: accounts and categories first, because transactions point at
 * them by name, and a transaction landing before its account would leave a row
 * referring to something the pickers cannot show.
 */
export default function LocalMigration () {
  const { chooseGoogle, startMigration } = useStorage()

  const [snapshot, setSnapshot] = useState(null)
  const [stage, setStage] = useState('loading')
  const [step, setStep] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true

    localSnapshot()
      .then((found) => {
        if (!alive) return

        // Nothing on the device: there is nothing to decide, so do not ask.
        if (isEmptySnapshot(found)) {
          startMigration(false)
          chooseGoogle()
          return
        }

        setSnapshot(found)
        setStage('ready')
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message)
        setStage('ready')
      })

    return () => {
      alive = false
    }
  }, [chooseGoogle, startMigration])

  const skip = () => {
    startMigration(false)
    chooseGoogle()
  }

  const run = async () => {
    setStage('working')
    setError(null)

    try {
      setStep('Menyiapkan spreadsheet…')
      const workbook = await ensureWorkbook({ allowCreate: true })

      /*
       * A brand new spreadsheet is not empty: it arrives seeded with the same
       * starter accounts and categories the device was seeded with, so copying
       * the local set in wholesale produced two of every default - a "Cash" the
       * transactions point at, and a "Cash" that is a decoy, because a
       * transaction names its account rather than referencing it by id.
       *
       * Matching on name is therefore not a nicety, it is the same rule the
       * data itself uses. It also makes a second run of this screen harmless.
       */
      const [existingAccounts, existingCategories] = await Promise.all([
        listAccounts(workbook),
        listCategories(workbook)
      ])

      const newAccounts = missingByName(snapshot.accounts, existingAccounts)
      const newCategories = missingByName(snapshot.categories, existingCategories)

      if (newAccounts.length) {
        setStep('Menyalin akun…')
        await createAccounts(workbook, newAccounts.map(withoutId))
      }

      if (newCategories.length) {
        setStep('Menyalin kategori…')
        await createCategories(workbook, newCategories.map(withoutId))
      }

      if (snapshot.transactions.length) {
        setStep(`Menyalin ${snapshot.transactions.length} transaksi…`)
        await createTransactions(workbook, snapshot.transactions.map(withoutId))
      }

      // Gold has no batch create - a book carries a handful of lots, not
      // thousands, so one call each is the honest cost of not inventing one.
      for (const [index, lot] of snapshot.goldLots.entries()) {
        setStep(`Menyalin catatan emas ${index + 1}/${snapshot.goldLots.length}…`)
        await createGoldLot(workbook, withoutId(lot))
      }

      startMigration(false)
      chooseGoogle()
    } catch (err) {
      setError(err.message)
      setStage('ready')
    }
  }

  if (stage === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Membaca data di device…" />
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-lg space-y-section px-page py-8">
      <header>
        <h1 className="text-page-title font-bold tracking-tight">Pindahkan ke Google Sheets</h1>
        <p className="mt-1.5 text-body text-subtitle">
          Data yang selama ini tersimpan di device ini bisa disalin ke spreadsheet milikmu.
        </p>
      </header>

      {error && <ErrorState message={error} onRetry={run} />}

      <Card className="space-y-2">
        <p className="text-body font-medium">Yang akan disalin</p>
        <p className="text-caption text-subtitle">{snapshot ? summarizeBackup(snapshot) : '—'}</p>
        <p className="hint">
          Salinan di device tidak dihapus. Setelah spreadsheet-nya kamu lihat sendiri dan isinya
          cocok, hapus data lokalnya lewat Pengaturan.
        </p>
      </Card>

      <div className="flex flex-col gap-gap">
        <Button
          size="lg"
          className="justify-center"
          loading={stage === 'working'}
          onClick={run}
        >
          {stage === 'working' ? step || 'Menyalin…' : 'Salin ke spreadsheet'}
        </Button>
        <Button
          variant="secondary"
          className="justify-center"
          disabled={stage === 'working'}
          onClick={skip}
        >
          Lewati, mulai kosong di Google
        </Button>
      </div>
    </main>
  )
}

/**
 * Ids and row numbers belong to where a record used to live. The spreadsheet
 * mints its own, and carrying the old ones over would make two records claim
 * one identity the first time a device is restored from a backup.
 */
function withoutId ({ id, rowNumber, ...rest }) {
  return rest
}

/** Case-insensitive, matching how names are compared everywhere else. */
function missingByName (incoming, existing) {
  const taken = new Set(existing.map((item) => item.name.toLowerCase()))
  return incoming.filter((item) => !taken.has(String(item.name || '').toLowerCase()))
}
