import { useState } from 'react'
import { ACCOUNT_KINDS, CATEGORY_COLORS, LIMITS } from '../../lib/constants.js'
import { parseAmount } from '../../lib/format.js'
import Button from '../ui/Button.jsx'
import ColorPicker, { HEX_PATTERN } from '../ui/ColorPicker.jsx'
import Sheet from '../ui/Sheet.jsx'

export function emptyAccount () {
  return {
    name: '',
    kind: 'cash',
    color: CATEGORY_COLORS[0],
    icon: '💵',
    openingBalance: '',
    description: ''
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

  const patch = (changes) => setDraft((current) => ({ ...current, ...changes }))

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate(draft, takenNames)
    setErrors(found)
    if (Object.keys(found).length) return

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
        <div className="flex gap-gap">
          <div className="w-20">
            <label className="label" htmlFor="account-icon">
              Ikon
            </label>
            <input
              id="account-icon"
              type="text"
              maxLength={4}
              className={`field text-center text-[19px] ${errors.icon ? 'field-error' : ''}`}
              value={draft.icon}
              onChange={(event) => patch({ icon: event.target.value })}
            />
          </div>

          <div className="flex-1">
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
          </div>
        </div>
        {(errors.icon || errors.name) && <p className="hint-error">{errors.icon || errors.name}</p>}

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
              patch({ kind: event.target.value, icon: kind?.icon || draft.icon })
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
