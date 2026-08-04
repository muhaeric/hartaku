import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatAmountInput } from '../../lib/format.js'
import { Card } from '../ui/Card.jsx'
import { EmptyState, SkeletonRows } from '../ui/Feedback.jsx'
import { ScanIcon } from '../ui/icons.jsx'
import TransactionForm, { emptyDraft } from './TransactionForm.jsx'

/** Handles both `/add` and `/transactions/:id/edit`. */
export default function TransactionFormPage () {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const { transactions, categories, accounts, loading, addTransaction, editTransaction } = useData()

  const editing = Boolean(id)
  const existing = editing ? transactions.find((transaction) => transaction.id === id) : null

  const [draft, setDraft] = useState(() => emptyDraft(settings))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!existing) return

    setDraft({
      date: existing.date,
      account: existing.account,
      toAccount: existing.toAccount,
      amount: formatAmountInput(existing.amount, settings.currency),
      type: existing.type,
      category: existing.category,
      description: existing.description
    })
  }, [existing, settings.currency])

  if (editing && loading && !existing) return <SkeletonRows rows={3} />

  if (editing && !existing) {
    return (
      <EmptyState
        icon="🔍"
        title="Transaksi tidak ditemukan"
        description="Mungkin sudah dihapus dari spreadsheet."
        actionLabel="Kembali ke daftar"
        onAction={() => navigate('/transactions')}
      />
    )
  }

  const handleSubmit = async (values) => {
    setBusy(true)
    try {
      if (editing) {
        await editTransaction({ ...existing, ...values })
        toast.success('Transaksi diperbarui!')
        navigate('/transactions')
      } else {
        await addTransaction(values)
        toast.success('Transaksi ditambahkan!')
        // Reset so several entries can be logged in a row.
        setDraft(emptyDraft(settings))
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {!editing && (
        <Link
          to="/import"
          className="flex items-center gap-3 rounded-card border border-hairline bg-surface px-page py-2.5 transition hover:bg-black/[0.03] dark:border-hairline-dark dark:bg-surface-dark dark:hover:bg-white/[0.04]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <ScanIcon className="h-[19px] w-[19px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium">Import dari screenshot</span>
            <span className="block text-caption text-subtitle dark:text-subtitle-dark">
              Baca nominal dan tanggal dari bukti transfer
            </span>
          </span>
          <span aria-hidden="true" className="text-subtitle">
            ›
          </span>
        </Link>
      )}

      <Card>
        <TransactionForm
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          accounts={accounts}
          busy={busy}
          submitLabel={editing ? 'Simpan perubahan' : 'Tambah transaksi'}
          onSubmit={handleSubmit}
          onCancel={editing ? () => navigate(-1) : null}
        />
      </Card>
    </>
  )
}
