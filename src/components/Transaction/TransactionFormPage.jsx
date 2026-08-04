import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatAmountInput } from '../../lib/format.js'
import { EmptyState, LoadingBlock } from '../ui/Feedback.jsx'
import TransactionForm, { emptyDraft } from './TransactionForm.jsx'

/** Handles both `/add` and `/transactions/:id/edit`. */
export default function TransactionFormPage () {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const { transactions, categories, merchants, loading, addTransaction, editTransaction } = useData()

  const editing = Boolean(id)
  const existing = editing ? transactions.find((transaction) => transaction.id === id) : null

  const [draft, setDraft] = useState(() => emptyDraft(settings))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!existing) return

    setDraft({
      date: existing.date,
      merchant: existing.merchant,
      amount: formatAmountInput(existing.amount, settings.currency),
      type: existing.type,
      category: existing.category,
      description: existing.description
    })
  }, [existing, settings.currency])

  if (editing && loading && !existing) return <LoadingBlock />

  if (editing && !existing) {
    return (
      <EmptyState
        icon="🔍"
        title="Transaksi tidak ditemukan"
        description="Mungkin sudah dihapus dari spreadsheet."
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
    <div className="card">
      <TransactionForm
        draft={draft}
        setDraft={setDraft}
        categories={categories}
        merchants={merchants}
        busy={busy}
        submitLabel={editing ? 'Simpan perubahan' : 'Tambah transaksi'}
        onSubmit={handleSubmit}
        onCancel={editing ? () => navigate(-1) : null}
      />
    </div>
  )
}
