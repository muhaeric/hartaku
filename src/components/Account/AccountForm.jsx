import { useRef, useState } from 'react'
import { ACCOUNT_KINDS, CATEGORY_COLORS, LIMITS } from '../../lib/constants.js'
import { fileToAccountIcon, isImageIcon } from '../../lib/accountIcon.js'
import { parseAmount } from '../../lib/format.js'
import Button from '../ui/Button.jsx'
import ColorPicker, { HEX_PATTERN } from '../ui/ColorPicker.jsx'
import Sheet from '../ui/Sheet.jsx'
import { ImageIcon } from '../ui/icons.jsx'

export function emptyAccount () {
  return {
    name: '',
    kind: 'cash',
    color: CATEGORY_COLORS[0],
    icon: '💵',
    openingBalance: '',
    description: '',
    archived: false
  }
}

function validate (draft, takenNames) {
  const errors = {}
  const name = draft.name.trim()

  if (!name) errors.name = 'Nama akun wajib diisi.'
  else if (name.length > LIMITS.accountName) {
    errors.name = `Maksimal ${LIMITS.accountName} karakter.`
  } else if (takenNames.includes(name.toLowerCase())) {
    errors.name = 'Nama akun sudah dipakai.'
  }

  // Empty means zero; anything typed has to be a real number. Negative is
  // allowed - that is how a debt or an overdrawn account starts.
  if (draft.openingBalance !== '' && !Number.isFinite(parseAmount(draft.openingBalance))) {
    errors.openingBalance = 'Saldo awal harus berupa angka.'
  }

  if (!HEX_PATTERN.test(draft.color)) errors.color = 'Warna harus berupa kode hex, misal #4361ee.'
  if (!draft.icon.trim()) errors.icon = 'Ikon wajib diisi.'

  return errors
}

export default function AccountForm ({ open, initial, takenNames, onSubmit, onClose }) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef(null)

  const patch = (changes) => setDraft((current) => ({ ...current, ...changes }))
  const uploaded = isImageIcon(draft.icon)

  /**
   * The picked file never leaves the browser: it is cropped, shrunk and encoded
   * into the icon cell itself. Nothing is uploaded anywhere, which is also why
   * there is nothing to clean up when an account is deleted.
   */
  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // Cleared straight away so picking the same file twice still fires.
    event.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      patch({ icon: await fileToAccountIcon(file) })
      setErrors((current) => ({ ...current, icon: undefined }))
    } catch (err) {
      setErrors((current) => ({ ...current, icon: err.message }))
    } finally {
      setUploading(false)
    }
  }

  /** Back to the emoji the account's kind suggests - never to an empty tile. */
  const clearImage = () =>
    patch({ icon: ACCOUNT_KINDS.find((kind) => kind.value === draft.kind)?.icon || '👛' })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate(draft, takenNames)
    setErrors(found)
    if (Object.keys(found).some((key) => found[key])) return

    setBusy(true)
    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        description: draft.description.trim(),
        openingBalance: draft.openingBalance === '' ? 0 : parseAmount(draft.openingBalance)
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={initial.id ? 'Ubah akun' : 'Akun baru'} onClose={onClose}>
      <form className="space-y-gap-normal" onSubmit={handleSubmit} noValidate>
        <div>
          <span className="label">Ikon</span>
          <div className="flex items-center gap-gap">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[14px] text-[24px] ring-1 ring-inset ring-black/[0.06] dark:ring-white/10"
              style={{ backgroundColor: `${HEX_PATTERN.test(draft.color) ? draft.color : '#6b7280'}1f` }}
              aria-hidden="true"
            >
              {uploaded ? (
                <img src={draft.icon} alt="" className="h-full w-full object-cover" />
              ) : (
                draft.icon
              )}
            </span>

            {uploaded ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-gap">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  Ganti gambar
                </Button>
                <Button variant="ghost" size="sm" onClick={clearImage}>
                  Pakai emoji
                </Button>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-gap">
                <label className="sr-only" htmlFor="account-icon">
                  Emoji ikon
                </label>
                <input
                  id="account-icon"
                  type="text"
                  maxLength={4}
                  className={`field w-16 shrink-0 text-center text-[19px] ${errors.icon ? 'field-error' : ''}`}
                  value={draft.icon}
                  onChange={(event) => patch({ icon: event.target.value })}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                  Unggah
                </Button>
              </div>
            )}

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>
          {errors.icon ? (
            <p className="hint-error">{errors.icon}</p>
          ) : (
            <p className="hint">
              Emoji, atau unggah logo bank / e-wallet. Gambarnya dipotong jadi kotak, dikecilkan,
              lalu disimpan langsung di spreadsheet.
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="account-name">
            Nama
          </label>
          <input
            id="account-name"
            type="text"
            maxLength={LIMITS.accountName}
            className={`field ${errors.name ? 'field-error' : ''}`}
            value={draft.name}
            placeholder="Contoh: Bank Mandiri"
            onChange={(event) => patch({ name: event.target.value })}
          />
          {errors.name && <p className="hint-error">{errors.name}</p>}
        </div>

        <div>
          <label className="label" htmlFor="account-kind">
            Jenis akun
          </label>
          <select
            id="account-kind"
            className="field"
            value={draft.kind}
            onChange={(event) => {
              const kind = ACCOUNT_KINDS.find((item) => item.value === event.target.value)
              // An uploaded picture was chosen deliberately; the kind's emoji
              // only fills in for an emoji.
              patch({
                kind: event.target.value,
                icon: uploaded ? draft.icon : kind?.icon || draft.icon
              })
            }}
          >
            {ACCOUNT_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.icon} {kind.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="account-opening">
            Saldo awal
          </label>
          <input
            id="account-opening"
            type="text"
            inputMode="decimal"
            className={`field ${errors.openingBalance ? 'field-error' : ''}`}
            value={draft.openingBalance}
            placeholder="0"
            onChange={(event) => patch({ openingBalance: event.target.value })}
          />
          {errors.openingBalance ? (
            <p className="hint-error">{errors.openingBalance}</p>
          ) : (
            <p className="hint">Saldo sebelum transaksi apa pun dicatat. Boleh minus untuk utang.</p>
          )}
        </div>

        <ColorPicker value={draft.color} error={errors.color} onChange={(color) => patch({ color })} />

        <div>
          <label className="label" htmlFor="account-description">
            Keterangan <span className="font-normal text-subtitle">(opsional)</span>
          </label>
          <input
            id="account-description"
            type="text"
            className="field"
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>

        <div className="flex gap-gap pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1 justify-center" loading={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
