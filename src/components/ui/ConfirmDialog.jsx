import { useState } from 'react'
import Button from './Button.jsx'
import Sheet from './Sheet.jsx'

export default function ConfirmDialog ({
  open,
  title = 'Yakin?',
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  destructive = true,
  onConfirm,
  onClose
}) {
  const [busy, setBusy] = useState(false)

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            className="flex-1 justify-center"
            onClick={handleConfirm}
            loading={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-body text-subtitle">{message}</p>
    </Sheet>
  )
}
