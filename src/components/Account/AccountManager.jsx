import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS } from '../../lib/constants.js'
import { formatCurrency } from '../../lib/format.js'
import { accountTransactionsPath } from '../../lib/links.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import { accountBalances } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import { ArchiveIcon, PencilIcon, PlusIcon, TrashIcon, UnarchiveIcon } from '../ui/icons.jsx'
import AccountForm, { emptyAccount } from './AccountForm.jsx'

export default function AccountManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const {
    accounts,
    transactions,
    goldLots,
    addAccount,
    editAccount,
    archiveAccount,
    removeAccount
  } = useData()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingArchive, setPendingArchive] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const balances = useMemo(
    () => accountBalances(accounts, transactions, goldLots),
    [accounts, transactions, goldLots]
  )

  // Archived accounts keep their balance and their history; they are simply not
  // offered anywhere new money can be recorded.
  const live = sortByLabel(
    balances.filter((entry) => !entry.account.archived),
    (entry) => entry.account.name
  )
  const archived = sortByLabel(
    balances.filter((entry) => entry.account.archived),
    (entry) => entry.account.name
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
        await addAccount({ ...values, sortOrder: accounts.length, archived: false })
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

  const handleArchive = async (account, archive) => {
    try {
      await archiveAccount(account.id, archive)
      // Reopening the archive section after an unarchive would leave the row
      // sitting in a list it has just left, so the view follows the account.
      if (!archive) setShowArchived(false)
      toast.success(archive ? `"${account.name}" diarsipkan.` : `"${account.name}" ditampilkan lagi.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingArchive(null)
    }
  }

  // The form keeps the balance as text so it can be typed freely.
  const startEdit = (account) =>
    setEditing({ ...account, openingBalance: String(account.openingBalance ?? '') })

  const renderRow = ({ account, balance }) => {
    const inUse = usage.get(account.name) || 0

    return (
      <li key={account.id}>
        <ListRow
          to={accountTransactionsPath(account.name)}
          leading={<RowIcon icon={account.icon} color={account.color} />}
          title={account.name}
          subtitle={ACCOUNT_KINDS.find((kind) => kind.value === account.kind)?.label}
          meta={inUse > 0 ? `${inUse} transaksi` : null}
          trailing={
            <span className={balance < 0 ? 'text-expense' : ''}>
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
                account.archived
                  ? {
                      label: 'Tampilkan lagi',
                      icon: <UnarchiveIcon className="h-4 w-4" />,
                      onSelect: () => handleArchive(account, false)
                    }
                  : {
                      label: 'Arsipkan',
                      icon: <ArchiveIcon className="h-4 w-4" />,
                      onSelect: () => setPendingArchive({ ...account, balance })
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
  }

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Akun"
        hint={`${live.length} akun${archived.length ? ` · ${archived.length} diarsipkan` : ''}`}
        action={
          <Button size="sm" onClick={() => setEditing(emptyAccount())}>
            <PlusIcon className="h-4 w-4" />
            Tambah
          </Button>
        }
      />

      {!live.length ? (
        <Card flush as="div">
          <EmptyState
            icon="👛"
            title={archived.length ? 'Semua akun diarsipkan' : 'Belum ada akun'}
            description={
              archived.length
                ? 'Tampilkan salah satu dari arsip di bawah, atau tambahkan yang baru.'
                : 'Tambahkan akun seperti Cash, Bank Mandiri, atau Piutang.'
            }
            actionLabel="Tambah akun"
            onAction={() => setEditing(emptyAccount())}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {live.map(renderRow)}
        </Card>
      )}

      {archived.length > 0 && (
        <div className="space-y-gap">
          <button
            type="button"
            onClick={() => setShowArchived((current) => !current)}
            aria-expanded={showArchived}
            className="flex w-full items-center justify-between gap-3 text-caption font-semibold text-subtitle transition hover:text-ink"
          >
            <span>Arsip ({archived.length})</span>
            <span>{showArchived ? 'Sembunyikan' : 'Lihat'}</span>
          </button>

          {showArchived && (
            <>
              <Card flush as="ul" className="divide-hairline overflow-hidden opacity-75">
                {archived.map(renderRow)}
              </Card>
              <p className="hint">
                Akun yang diarsipkan tidak muncul saat mencatat transaksi, tapi transaksi lamanya
                tetap ada dan saldonya tetap dihitung.
              </p>
            </>
          )}
        </div>
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
        open={Boolean(pendingArchive)}
        title="Arsipkan akun?"
        message={
          pendingArchive?.balance
            ? `"${pendingArchive?.name}" tidak akan muncul lagi saat mencatat transaksi. Transaksi lamanya tetap ada, dan saldonya (${formatCurrency(pendingArchive.balance, settings.currency)}) tetap dihitung di kekayaan bersih.`
            : `"${pendingArchive?.name}" tidak akan muncul lagi saat mencatat transaksi. Transaksi lamanya tetap ada, dan kamu bisa menampilkannya lagi kapan saja.`
        }
        confirmLabel="Arsipkan"
        destructive={false}
        onConfirm={() => handleArchive(pendingArchive, true)}
        onClose={() => setPendingArchive(null)}
      />

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
        message={`"${pendingDelete?.name}" dipakai oleh ${pendingDelete?.inUse} transaksi, jadi tidak bisa dihapus. Kalau cuma ingin menyembunyikannya, pakai Arsipkan — transaksinya tetap utuh. Kalau cuma mau ganti nama, pakai Ubah.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
