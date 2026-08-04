import { useState } from 'react'
import { CATEGORY_COLORS, CATEGORY_TYPES, LIMITS } from '../../lib/constants.js'
import Button from '../ui/Button.jsx'
import ColorPicker, { HEX_PATTERN } from '../ui/ColorPicker.jsx'
import Sheet from '../ui/Sheet.jsx'

export function emptyCategory () {
  return {
    name: '',
    type: 'expense',
    color: CATEGORY_COLORS[0],
    icon: '🏷️',
    description: ''
  }
}

function validate (draft, existingNames) {
  const errors = {}
  const name = draft.name.trim()

  if (!name) errors.name = 'Nama kategori wajib diisi.'
  else if (name.length > LIMITS.categoryName) {
    errors.name = `Maksimal ${LIMITS.categoryName} karakter.`
  } else if (existingNames.includes(name.toLowerCase())) {
    errors.name = 'Nama kategori sudah dipakai.'
  }

  if (!HEX_PATTERN.test(draft.color)) errors.color = 'Warna harus berupa kode hex, misal #4361ee.'
  if (!draft.icon.trim()) errors.icon = 'Ikon wajib diisi.'

  return errors
}

export default function CategoryForm ({ open, initial, takenNames, onSubmit, onClose }) {
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
      await onSubmit({ ...draft, name: draft.name.trim(), description: draft.description.trim() })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} title={initial.id ? 'Ubah kategori' : 'Kategori baru'} onClose={onClose}>
      <form className="space-y-gap-normal" onSubmit={handleSubmit} noValidate>
        <div className="flex gap-gap">
          <div className="w-20">
            <label className="label" htmlFor="category-icon">
              Ikon
            </label>
            <input
              id="category-icon"
              type="text"
              maxLength={4}
              className={`field text-center text-[19px] ${errors.icon ? 'field-error' : ''}`}
              value={draft.icon}
              onChange={(event) => patch({ icon: event.target.value })}
            />
          </div>

          <div className="flex-1">
            <label className="label" htmlFor="category-name">
              Nama
            </label>
            <input
              id="category-name"
              type="text"
              maxLength={LIMITS.categoryName}
              className={`field ${errors.name ? 'field-error' : ''}`}
              value={draft.name}
              placeholder="Contoh: Langganan"
              onChange={(event) => patch({ name: event.target.value })}
            />
          </div>
        </div>
        {(errors.icon || errors.name) && <p className="hint-error">{errors.icon || errors.name}</p>}

        <div>
          <label className="label" htmlFor="category-type">
            Berlaku untuk
          </label>
          <select
            id="category-type"
            className="field"
            value={draft.type}
            onChange={(event) => patch({ type: event.target.value })}
          >
            {CATEGORY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ColorPicker value={draft.color} error={errors.color} onChange={(color) => patch({ color })} />

        <div>
          <label className="label" htmlFor="category-description">
            Keterangan <span className="font-normal text-subtitle">(opsional)</span>
          </label>
          <input
            id="category-description"
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
