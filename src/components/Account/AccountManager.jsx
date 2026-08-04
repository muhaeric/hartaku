import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency } from '../../lib/format.js'
import { accountBalances } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/icons.jsx'
import AccountForm, { emptyAccount } from './AccountForm.jsx'

export default function AccountManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const { accounts, transactions, goldLots, addAccount, editAccount, removeAccount } = useData()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const balances = useMemo(
    () => accountBalances(accounts, transactions, goldLots),
    [accounts, transactions, goldLots]
  )

  /** In use = either side of a transaction, or the funding side of a gold purchase. */
  const usage = useMemo(() => {
    const counts = new Map()
    const bump = (name) => {
      if (name) counts.set(name, (counts.get(name) || 0) + 1)
    }

    for (const transaction of transactions) {
      bump(transaction.account)
      bump(transaction.toAccount)
    }
    for (const lot of goldLots) bump(lot.fromAccount)

    return counts
  }, [transactions, goldLots])

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

  // The form keeps the balance as text so it can be typed freely.
  const startEdit = (account) =>
    setEditing({ ...account, openingBalance: String(account.openingBalance ?? '') })

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Akun"
        hint={`${accounts.length} akun`}
        action={
          <Button size="sm" onClick={() => setEditing(emptyAccount())}>
            <PlusIcon className="h-4 w-4" />
            Tambah
          </Button>
        }
      />

      {!accounts.length ? (
        <Card flush as="div">
          <EmptyState
            icon="👛"
            title="Belum ada akun"
            description="Tambahkan akun seperti Cash, Bank Mandiri, atau Piutang."
            actionLabel="Tambah akun"
            onAction={() => setEditing(emptyAccount())}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {balances.map(({ account, balance }) => {
            const inUse = usage.get(account.name) || 0

            return (
              <li key={account.id}>
                <ListRow
                  leading={<RowIcon icon={account.icon} color={account.color} />}
                  title={account.name}
                  subtitle={ACCOUNT_KINDS.find((kind) => kind.value === account.kind)?.label}
                  meta={inUse > 0 ? `${inUse} transaksi` : null}
                  trailing={
                    <span className={balance < 0 ? 'text-expense dark:text-red-400' : ''}>
                      {formatCurrency(balance, settings.currency)}
                    </span>
                  }
                  action={
                    <KebabMenu
                      label={`Aksi untuk ${account.name}`}
                      items={[
                        {
                          label: 'Ubah',
                          icon: <PencilIcon className="h-4 w-4" />,
                          onSelect: () => startEdit(account)
                        },
                        {
                          label: 'Hapus',
                          icon: <TrashIcon className="h-4 w-4" />,
                          destructive: true,
                          onSelect: () => setPendingDelete({ ...account, inUse })
                        }
                      ]}
                    />
                  }
                />
              </li>
            )
          })}
        </Card>
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
        message={`"${pendingDelete?.name}" dipakai oleh ${pendingDelete?.inUse} transaksi. Pindahkan transaksi tersebut ke akun lain dulu sebelum menghapusnya. Kalau cuma mau ganti nama, pakai Ubah — transaksi lamanya ikut diperbarui otomatis.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
