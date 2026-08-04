import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CATEGORY_TYPES } from '../../lib/constants.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/icons.jsx'
import CategoryForm, { emptyCategory } from './CategoryForm.jsx'

export default function CategoryManager () {
  const toast = useToast()
  const { categories, transactions, addCategory, editCategory, removeCategory } = useData()

  const [editingCategory, setEditingCategory] = useState(null)
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
        .filter((category) => category.id !== editingCategory?.id)
        .map((category) => category.name.toLowerCase()),
    [categories, editingCategory]
  )

  const handleSubmit = async (values) => {
    try {
      if (values.id) {
        await editCategory({ ...values })
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
    <div className="space-y-4">
      <Button className="w-full justify-center" onClick={() => setEditingCategory(emptyCategory())}>
        <PlusIcon className="h-5 w-5" />
        Tambah kategori
      </Button>

      {!categories.length ? (
        <EmptyState icon="🏷️" title="Belum ada kategori" description="Tambahkan kategori pertama." />
      ) : (
        <ul className="space-y-2">
          {categories.map((category) => {
            const inUse = usage.get(category.name) || 0

            return (
              <li key={category.id} className="card flex items-center gap-3 p-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-slate-900/10 dark:ring-white/20"
                  style={{ backgroundColor: `${category.color}22` }}
                  aria-hidden="true"
                >
                  {category.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/20"
                      style={{ backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    {category.name}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {CATEGORY_TYPES.find((type) => type.value === category.type)?.label}
                    {inUse > 0 && ` · ${inUse} transaksi`}
                    {category.description && ` · ${category.description}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingCategory(category)}
                  aria-label={`Ubah ${category.name}`}
                  className="tap flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete({ ...category, inUse })}
                  aria-label={`Hapus ${category.name}`}
                  className="tap flex items-center justify-center rounded-xl text-expense hover:bg-expense/10"
                >
                  <TrashIcon />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {editingCategory && (
        <CategoryForm
          open
          // Remount per category so the draft state starts fresh.
          key={editingCategory.id || 'new'}
          initial={editingCategory}
          takenNames={takenNames}
          onSubmit={handleSubmit}
          onClose={() => setEditingCategory(null)}
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
        message={`"${pendingDelete?.name}" dipakai oleh ${pendingDelete?.inUse} transaksi. Pindahkan transaksi tersebut ke kategori lain dulu sebelum menghapusnya. Kalau cuma mau ganti nama, pakai tombol ubah — transaksi lamanya ikut diperbarui otomatis.`}
        confirmLabel="Mengerti"
        cancelLabel="Tutup"
        destructive={false}
        onConfirm={async () => {}}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
