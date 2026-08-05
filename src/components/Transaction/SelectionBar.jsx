import Button from '../ui/Button.jsx'
import { CopyIcon, SwapIcon, TrashIcon } from '../ui/icons.jsx'

/**
 * What can be done to the ticked transactions, pinned to the bottom of the
 * screen while a selection is live.
 *
 * Pinned rather than parked in the header: on a list this long the actions
 * would otherwise scroll away from whatever was just ticked. Every action keeps
 * its word next to its icon - "pindah" and "salin" are not glyphs anyone
 * recognises unseen, and the one destructive action should never be a shape the
 * eye has to decode.
 */
export default function SelectionBar ({ count, onMove, onCopy, onDelete }) {
  if (!count) return null

  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
      <div className="flex gap-1.5 rounded-control border border-hairline bg-surface p-1.5 shadow-lg dark:border-hairline-dark dark:bg-surface-dark">
        <Action label="Pindah" onClick={onMove}>
          <SwapIcon className="h-4 w-4" />
        </Action>
        <Action label="Salin" onClick={onCopy}>
          <CopyIcon className="h-4 w-4" />
        </Action>
        <Action label="Hapus" variant="danger" onClick={onDelete}>
          <TrashIcon className="h-4 w-4" />
        </Action>
      </div>
    </div>
  )
}

function Action ({ label, variant = 'secondary', onClick, children }) {
  return (
    <Button variant={variant} size="sm" className="flex-1 justify-center" onClick={onClick}>
      {children}
      {label}
    </Button>
  )
}
