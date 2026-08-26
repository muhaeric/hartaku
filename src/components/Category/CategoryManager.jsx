import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CATEGORY_TYPES } from '../../lib/constants.js'
import { categoryTransactionsPath } from '../../lib/links.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import { ArchiveIcon, PencilIcon, PlusIcon, TrashIcon, UnarchiveIcon } from '../ui/icons.jsx'
import CategoryForm, { emptyCategory } from './CategoryForm.jsx'

export default function CategoryManager () {
  const toast = useToast()
  const {
    categories,
    transactions,
    budgets,
    addCategory,
    editCategory,
    archiveCategory,
    removeCategory
  } = useData()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingArchive, setPendingArchive] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  // Archived categories keep every transaction filed under them; they are only
  // taken off the lists where something new would be filed.
  const live = sortByLabel(
    categories.filter((category) => !category.archived),
    (category) => category.name
  )
  const archived = sortByLabel(
    categories.filter((category) => category.archived),
    (category) => category.name
  )

  /** How many transactions reference each category - blocks unsafe deletes. */
  const usage = useMemo(() => {
    const counts = new Map()
    for (const transaction of transactions) {
      counts.set(transaction.category, (counts.get(transaction.category) || 0) + 1)
    }
    return counts
  }, [transactions])

  const budgetUsage = useMemo(() => {
    const counts = new Map()
    for (const budget of budgets) {
      counts.set(budget.category, (counts.get(budget.category) || 0) + 1)
    }
    return counts
  }, [budgets])

  const takenNames = useMemo(
    () =>
      categories
        .filter((category) => category.id !== editing?.id)
        .map((category) => category.name.toLowerCase()),
    [categories, editing]
  )

  const handleSubmit = async (values) => {
    try {
      if (values.id) {
        await editCategory(values)
        toast.success('Kategori diperbarui!')
      } else {
        await addCategory({ ...values, sortOrder: categories.length, archived: false })
        toast.success('Kategori ditambahkan!')
      }
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    try {
      await removeCategory(pendingDelete.id)
      toast.success('Kategori dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleArchive = async (category, archive) => {
    try {
      await archiveCategory(category.id, archive)
      // The row has just left the archive, so leaving that section open would
      // leave it on screen in a list it is no longer in.
      if (!archive) setShowArchived(false)
      toast.success(
        archive ? `"${category.name}" diarsipkan.` : `"${category.name}" ditampilkan lagi.`
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPendingArchive(null)
    }
  }

  const renderRow = (category) => {
    const inUse = usage.get(category.name) || 0
    const inBudgets = budgetUsage.get(category.name) || 0

    return (
      <li key={category.id}>
        <ListRow
          /* The row leads to its transactions; editing stays on the
             kebab, matching how account rows already behave. */
          to={categoryTransactionsPath(category.name)}
          leading={<RowIcon icon={category.icon} color={category.color} />}
          title={category.name}
          subtitle={CATEGORY_TYPES.find((type) => type.value === category.type)?.label}
          meta={inUse > 0 ? `${inUse} transaksi` : null}
          action={
            <KebabMenu
              label={`Aksi untuk ${category.name}`}
              items={[
                {
                  label: 'Ubah',
                  icon: <PencilIcon className="h-4 w-4" />,
                  onSelect: () => setEditing(category)
                },
                category.archived
                  ? {
                      label: 'Tampilkan lagi',
                      icon: <UnarchiveIcon className="h-4 w-4" />,
                      onSelect: () => handleArchive(category, false)
                    }
                  : {
                      label: 'Arsipkan',
                      icon: <ArchiveIcon className="h-4 w-4" />,
                      onSelect: () => setPendingArchive({ ...category, inUse })
                    },
                {
                  label: 'Hapus',
                  icon: <TrashIcon className="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setPendingDelete({ ...category, inUse, inBudgets })
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
        title="Kategori"
        hint={`${live.length} kategori${archived.length ? ` · ${archived.length} diarsipkan` : ''}`}
        action={
          <Button size="sm" onClick={() => setEditing(emptyCategory())}>
            <PlusIcon className="h-4 w-4" />
            Tambah
          </Button>
        }
      />

      {!live.length ? (
        <Card flush as="div">
          <EmptyState
            icon="🏷️"
            title={archived.length ? 'Semua kategori diarsipkan' : 'Belum ada kategori'}
            description={
              archived.length
                ? 'Tampilkan salah satu dari arsip di bawah, atau tambahkan yang baru.'
                : 'Tambahkan kategori pertama.'
            }
            actionLabel="Tambah kategori"
            onAction={() => setEditing(emptyCategory())}
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
                Kategori yang diarsipkan tidak muncul saat mencatat transaksi, tapi transaksi
                lamanya tetap ada dan tetap dihitung di laporan.
              </p>
            </>
          )}
        </div>
      )}

      {editing && (
        <CategoryForm
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
        title="Arsipkan kategori?"
        message={
          pendingArchive?.inUse
            ? `"${pendingArchive?.name}" tidak akan muncul lagi saat mencatat transaksi. ${pendingArchive?.inUse} transaksi yang sudah memakainya tetap utuh dan tetap dihitung di laporan.`
            : `"${pendingArchive?.name}" tidak akan muncul lagi saat mencatat transaksi, dan kamu bisa menampilkannya lagi kapan saja.`
        }
        confirmLabel="Arsipkan"
        destructive={false}
        onConfirm={() => handleArchive(pendingArchive, true)}
        onClose={() => setPendingArchive(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete) && !pendingDelete?.inUse && !pendingDelete?.inBudgets}
        title="Hapus kategori?"
        message={`Kategori "${pendingDelete?.name}" akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete?.inUse || pendingDelete?.inBudgets)}
        title="Kategori masih dipakai"
        message={`"${pendingDelete?.name}" masih dipakai oleh ${[
          pendingDelete?.inUse ? `${pendingDelete.inUse} transaksi` : null,
          pendingDelete?.inBudgets ? `${pendingDelete.inBudgets} anggaran` : null
        ].filter(Boolean).join(' dan ')}, jadi tidak bisa dihapus. Pakai Arsipkan untuk menyembunyikannya, atau Ubah agar referensi lama ikut diperbarui otomatis.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
