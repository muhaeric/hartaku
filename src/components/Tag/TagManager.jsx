import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { LIMITS } from '../../lib/constants.js'
import { sortByLabel } from '../../lib/sortOptions.js'
import { normalizeTag, tagUsage } from '../../lib/tags.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow from '../ui/ListRow.jsx'
import Sheet from '../ui/Sheet.jsx'
import { PencilIcon, TrashIcon } from '../ui/icons.jsx'

/**
 * Tags have no rows of their own to manage - they are words inside the
 * transactions that carry them, so this list is derived and there is nothing
 * here to create. A tag comes into existence by being typed on a transaction.
 *
 * That also makes both actions here bulk rewrites of the sheet rather than
 * edits to one record, which is why each row leads with how many transactions
 * it would touch.
 */
export default function TagManager () {
  const toast = useToast()
  const { transactions, renameTag, removeTag } = useData()

  const [renaming, setRenaming] = useState(null)
  const [draft, setDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)

  const usage = useMemo(
    () => sortByLabel(tagUsage(transactions), (entry) => entry.tag),
    [transactions]
  )

  const clean = normalizeTag(draft)
  const unchanged = clean.toLowerCase() === (renaming?.tag || '').toLowerCase()
  /* Renaming onto a name already in use is a merge, not a mistake - worth
     saying out loud, because the two tags become one and that is not undoable. */
  const mergeInto = useMemo(() => {
    if (!clean || unchanged) return null
    return usage.find((entry) => entry.tag.toLowerCase() === clean.toLowerCase()) || null
  }, [usage, clean, unchanged])

  const openRename = (entry) => {
    setRenaming(entry)
    setDraft(entry.tag)
  }

  const closeRename = () => {
    setRenaming(null)
    setDraft('')
  }

  const handleRename = async () => {
    if (!clean || unchanged) return

    setBusy(true)
    try {
      const changed = await renameTag(renaming.tag, clean)
      toast.success(
        mergeInto
          ? `Digabung ke "${mergeInto.tag}" di ${changed.length} transaksi.`
          : `Tag diganti di ${changed.length} transaksi.`
      )
      closeRename()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    try {
      const changed = await removeTag(pendingDelete.tag)
      toast.success(`Tag dilepas dari ${changed.length} transaksi.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Tag"
        hint={usage.length ? `${usage.length} tag dipakai` : null}
      />

      {!usage.length ? (
        <Card flush as="div">
          <EmptyState
            icon="🏷️"
            title="Belum ada tag"
            description="Tag dibuat saat kamu mengetiknya di form transaksi, bukan di sini."
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {usage.map((entry) => (
            <li key={entry.tag.toLowerCase()}>
              <ListRow
                title={`#${entry.tag}`}
                meta={`${entry.count} transaksi`}
                action={
                  <KebabMenu
                    label={`Aksi untuk tag ${entry.tag}`}
                    items={[
                      {
                        label: 'Ganti nama',
                        icon: <PencilIcon className="h-4 w-4" />,
                        onSelect: () => openRename(entry)
                      },
                      {
                        label: 'Hapus',
                        icon: <TrashIcon className="h-4 w-4" />,
                        destructive: true,
                        onSelect: () => setPendingDelete(entry)
                      }
                    ]}
                  />
                }
              />
            </li>
          ))}
        </Card>
      )}

      <Sheet
        open={Boolean(renaming)}
        title="Ganti nama tag"
        description={`Akan diperbarui di ${renaming?.count || 0} transaksi.`}
        onClose={() => !busy && closeRename()}
      >
        <div className="space-y-gap-normal">
          <div>
            <label className="label" htmlFor="tag-rename">
              Nama baru
            </label>
            <input
              id="tag-rename"
              autoFocus
              type="text"
              className="field"
              maxLength={LIMITS.tagName}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleRename()}
            />
            {mergeInto ? (
              <p className="hint">
                &quot;{mergeInto.tag}&quot; sudah dipakai {mergeInto.count} transaksi. Keduanya
                akan digabung jadi satu tag, dan itu tidak bisa dibatalkan.
              </p>
            ) : (
              <p className="hint">
                Transaksi lamanya ikut diperbarui. Huruf besar-kecil tidak dianggap tag berbeda.
              </p>
            )}
          </div>

          <div className="flex gap-gap pt-1">
            <Button
              variant="secondary"
              className="flex-1 justify-center"
              disabled={busy}
              onClick={closeRename}
            >
              Batal
            </Button>
            <Button
              className="flex-1 justify-center"
              loading={busy}
              disabled={!clean || unchanged}
              onClick={handleRename}
            >
              {mergeInto ? 'Gabungkan' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus tag?"
        message={`Tag "${pendingDelete?.tag}" akan dilepas dari ${pendingDelete?.count || 0} transaksi. Transaksinya sendiri tetap ada — hanya labelnya yang hilang.`}
        confirmLabel="Hapus tag"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
