import { CATEGORY_COLORS } from '../../lib/constants.js'

export const HEX_PATTERN = /^#[0-9a-f]{6}$/i

/** Swatches from the fixed theme, with a native picker for anything else. */
export default function ColorPicker ({ value, error, onChange }) {
  return (
    <fieldset>
      <legend className="label">Warna</legend>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Pilih warna ${color}`}
            aria-pressed={value.toLowerCase() === color}
            onClick={() => onChange(color)}
            className={`h-10 w-10 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900 ${
              value.toLowerCase() === color ? 'ring-2 ring-slate-900 dark:ring-white' : ''
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
          value={HEX_PATTERN.test(value) ? value : '#2a78d6'}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          type="text"
          aria-label="Kode hex warna"
          className={`field flex-1 font-mono ${error ? 'field-error' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>

      {error && <p className="hint-error">{error}</p>}
    </fieldset>
  )
}
