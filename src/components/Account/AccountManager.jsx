import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency } from '../../lib/format.js'
import { accountBalances } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/icons.jsx'
import AccountForm, { emptyAccount } from './AccountForm.jsx'

export default function AccountManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const { accounts, transactions, addAccount, editAccount, removeAccount } = useData()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const balances = useMemo(
    () => accountBalances(accounts, transactions),
    [accounts, transactions]
  )

  /** An account is in use if it is either side of any transaction. */
  const usage = useMemo(() => {
    const counts = new Map()
    for (const transaction of transactions) {
      for (const name of [transaction.account, transaction.toAccount]) {
        if (name) counts.set(name, (counts.get(name) || 0) + 1)
      }
    }
    return counts
  }, [transactions])

  const takenNames = useMemo(
    () =>
      accounts
        .filter((account) => account.id !== editing?.id)
        .map((account) => account.name.toLowerCase()),
    [accounts, editing]
  )

  const handleSubmit = async (values) => {
    try {
      if (values.id) {
        await editAccount(values)
        toast.success('Akun diperbarui!')
      } else {
        await addAccount({ ...values, sortOrder: accounts.length })
        toast.success('Akun ditambahkan!')
      }
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    try {
      await removeAccount(pendingDelete.id)
      toast.success('Akun dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const startEdit = (account) => {
    // The form keeps the balance as text so it can be typed freely.
    setEditing({ ...account, openingBalance: String(account.openingBalance ?? '') })
  }

  return (
    <div className="space-y-4">
      <Button className="w-full justify-center" onClick={() => setEditing(emptyAccount())}>
        <PlusIcon className="h-5 w-5" />
        Tambah akun
      </Button>

      {!accounts.length ? (
        <EmptyState
          icon="👛"
          title="Belum ada akun"
          description="Tambahkan akun seperti Cash, Bank Mandiri, atau Piutang."
        />
      ) : (
        <ul className="space-y-2">
          {balances.map(({ account, balance }) => {
            const inUse = usage.get(account.name) || 0
            const kind = ACCOUNT_KINDS.find((item) => item.value === account.kind)

            return (
              <li key={account.id} className="card flex items-center gap-3 p-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-slate-900/10 dark:ring-white/20"
                  style={{ backgroundColor: `${account.color}22` }}
                  aria-hidden="true"
                >
                  {account.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/20"
                      style={{ backgroundColor: account.color }}
                      aria-hidden="true"
                    />
                    {account.name}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {kind?.label}
                    {inUse > 0 && ` · ${inUse} transaksi`}
                    {account.description && ` · ${account.description}`}
                  </p>
                </div>

                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    balance < 0 ? 'text-expense dark:text-red-400' : ''
                  }`}
                >
                  {formatCurrency(balance, settings.currency)}
                </span>

                <button
                  type="button"
                  onClick={() => startEdit(account)}
                  aria-label={`Ubah ${account.name}`}
                  className="tap flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ ...account, inUse })}
                  aria-label={`Hapus ${account.name}`}
                  className="tap flex items-center justify-center rounded-xl text-expense hover:bg-expense/10"
                >
                  <TrashIcon />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <AccountForm
          open
          key={editing.id || 'new'}
          initial={editing}
          takenNames={takenNames}
          onSubmit={handleSubmit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete) && !pendingDelete?.inUse}
        title="Hapus akun?"
        message={`Akun "${pendingDelete?.name}" akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete?.inUse)}
        title="Akun masih dipakai"
        message={`"${pendingDelete?.name}" dipakai oleh ${pendingDelete?.inUse} transaksi. Pindahkan transaksi tersebut ke akun lain dulu sebelum menghapusnya. Kalau cuma mau ganti nama, pakai tombol ubah — transaksi lamanya ikut diperbarui otomatis.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
