import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CATEGORY_TYPES } from '../../lib/constants.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/icons.jsx'
import CategoryForm, { emptyCategory } from './CategoryForm.jsx'

export default function CategoryManager () {
  const toast = useToast()
  const { categories, transactions, addCategory, editCategory, removeCategory } = useData()

  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  /** How many transactions reference each category - blocks unsafe deletes. */
  const usage = useMemo(() => {
    const counts = new Map()
    for (const transaction of transactions) {
      counts.set(transaction.category, (counts.get(transaction.category) || 0) + 1)
    }
    return counts
  }, [transactions])

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
        await addCategory({ ...values, sortOrder: categories.length })
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

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Kategori"
        hint={`${categories.length} kategori`}
        action={
          <Button size="sm" onClick={() => setEditing(emptyCategory())}>
            <PlusIcon className="h-4 w-4" />
            Tambah
          </Button>
        }
      />

      {!categories.length ? (
        <Card flush as="div">
          <EmptyState
            icon="🏷️"
            title="Belum ada kategori"
            description="Tambahkan kategori pertama."
            actionLabel="Tambah kategori"
            onAction={() => setEditing(emptyCategory())}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {categories.map((category) => {
            const inUse = usage.get(category.name) || 0

            return (
              <li key={category.id}>
                <ListRow
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
                        {
                          label: 'Hapus',
                          icon: <TrashIcon className="h-4 w-4" />,
                          destructive: true,
                          onSelect: () => setPendingDelete({ ...category, inUse })
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
        open={Boolean(pendingDelete) && !pendingDelete?.inUse}
        title="Hapus kategori?"
        message={`Kategori "${pendingDelete?.name}" akan dihapus. Tindakan ini tidak bisa dibatalkan.`}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete?.inUse)}
        title="Kategori masih dipakai"
        message={`"${pendingDelete?.name}" dipakai oleh ${pendingDelete?.inUse} transaksi. Pindahkan transaksi tersebut ke kategori lain dulu sebelum menghapusnya. Kalau cuma mau ganti nama, pakai Ubah — transaksi lamanya ikut diperbarui otomatis.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
