import { useState } from 'react'
import { CATEGORY_COLORS, CATEGORY_TYPES, LIMITS } from '../../lib/constants.js'
import Button from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

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

  if (!HEX_PATTERN.test(draft.color)) errors.color = 'Warna harus berupa kode hex, misal #2a78d6.'
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
    <Modal open={open} title={initial.id ? 'Ubah kategori' : 'Kategori baru'} onClose={onClose}>
      <form id="category-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="flex gap-3">
          <div className="w-24">
            <label className="label" htmlFor="category-icon">
              Ikon
            </label>
            <input
              id="category-icon"
              type="text"
              maxLength={4}
              className={`field text-center text-xl ${errors.icon ? 'field-error' : ''}`}
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

        <fieldset>
          <legend className="label">Warna</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Pilih warna ${color}`}
                aria-pressed={draft.color.toLowerCase() === color}
                onClick={() => patch({ color })}
                className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900 ${
                  draft.color.toLowerCase() === color ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="color"
              aria-label="Warna khusus"
              className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
              value={HEX_PATTERN.test(draft.color) ? draft.color : '#2a78d6'}
              onChange={(event) => patch({ color: event.target.value })}
            />
            <input
              type="text"
              aria-label="Kode hex warna"
              className={`field flex-1 font-mono ${errors.color ? 'field-error' : ''}`}
              value={draft.color}
              onChange={(event) => patch({ color: event.target.value })}
            />
          </div>
          {errors.color && <p className="hint-error">{errors.color}</p>}
        </fieldset>

        <div>
          <label className="label" htmlFor="category-description">
            Keterangan <span className="font-normal text-slate-400">(opsional)</span>
          </label>
          <input
            id="category-description"
            type="text"
            className="field"
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="flex-1 justify-center" loading={busy}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  )
}
