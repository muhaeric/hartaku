import { useId, useMemo, useState } from 'react'
import { LIMITS } from '../../lib/constants.js'
import { normalizeTag } from '../../lib/tags.js'
import { CloseIcon } from './icons.jsx'

const SUGGESTION_LIMIT = 8

/**
 * Chips plus one text field: type a label, press Enter or comma, it becomes a
 * chip.
 *
 * The field is not a `<select>`, and deliberately so - tags are made up as you
 * go, and a picker that only offers what already exists makes the first use of
 * every new tag the awkward one. What already exists is offered underneath
 * instead, most-used first, because the real risk with free text is not that
 * people cannot type but that they type "kantor" today and "Kantor" tomorrow.
 */
export default function TagInput ({
  value = [],
  suggestions = [],
  onChange,
  label = 'Tag',
  hint,
  autoFocus = false
}) {
  const id = useId()
  const [pending, setPending] = useState('')

  const full = value.length >= LIMITS.tagsPerTransaction
  const chosen = useMemo(
    () => new Set(value.map((tag) => tag.toLowerCase())),
    [value]
  )

  const offered = useMemo(
    () =>
      suggestions
        .filter((tag) => !chosen.has(tag.toLowerCase()))
        .slice(0, SUGGESTION_LIMIT),
    [suggestions, chosen]
  )

  const add = (raw) => {
    const tag = normalizeTag(raw)
    setPending('')
    if (!tag || full || chosen.has(tag.toLowerCase())) return

    onChange([...value, tag])
  }

  const remove = (tag) => onChange(value.filter((item) => item !== tag))

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter inside a form would otherwise submit it half-typed.
      event.preventDefault()
      add(pending)
      return
    }

    if (event.key === 'Backspace' && !pending && value.length) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label} <span className="font-normal text-subtitle">(opsional)</span>
      </label>

      {value.length > 0 && (
        <ul className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 text-caption font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                {tag}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={`Hapus tag ${tag}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <input
        id={id}
        type="text"
        autoComplete="off"
        autoFocus={autoFocus}
        maxLength={LIMITS.tagName}
        disabled={full}
        className="field"
        placeholder={full ? `Maksimal ${LIMITS.tagsPerTransaction} tag` : 'Contoh: kantor, reimburse'}
        value={pending}
        onChange={(event) => setPending(event.target.value)}
        onKeyDown={handleKeyDown}
        /* Committing on blur too: a tag typed and left in the box, then saved,
           should not silently disappear with the form. */
        onBlur={() => add(pending)}
      />

      {offered.length > 0 && !full && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {offered.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => add(tag)}
              className="h-7 rounded-full border border-hairline px-2.5 text-caption text-subtitle transition hover:border-brand-500 hover:text-brand-700 dark:border-hairline-dark dark:text-subtitle-dark dark:hover:text-brand-200"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
