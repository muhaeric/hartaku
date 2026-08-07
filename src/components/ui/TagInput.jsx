import { useId, useMemo, useRef, useState } from 'react'
import { LIMITS } from '../../lib/constants.js'
import { normalizeTag } from '../../lib/tags.js'
import { ChevronDownIcon, CloseIcon, PlusIcon } from './icons.jsx'

/**
 * Chips plus a combobox: open it to pick a label that already exists, or type
 * one that does not and save it from the same field.
 *
 * A plain `<select>` would be wrong here - it can only offer what already
 * exists, which makes the first use of every new tag the awkward one. But pure
 * free text was wrong too: the real risk with tags is not that people cannot
 * type, it is that they type "kantor" today and "Kantor" tomorrow and end up
 * with two labels for one idea.
 *
 * So existing matches are listed first and the highlight starts on them, which
 * means Enter reuses rather than invents. Creating is still one row away, and
 * it says the word "Tambah" so nobody creates a near-duplicate by reflex.
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
  const listId = `${id}-list`
  const input = useRef(null)

  const [pending, setPending] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const full = value.length >= LIMITS.tagsPerTransaction
  const chosen = useMemo(() => new Set(value.map((tag) => tag.toLowerCase())), [value])

  const clean = normalizeTag(pending)
  const query = clean.toLowerCase()

  const options = useMemo(() => {
    const matches = suggestions
      .filter((tag) => !chosen.has(tag.toLowerCase()))
      .filter((tag) => !query || tag.toLowerCase().includes(query))
      .slice(0, 8)
      .map((tag) => ({ kind: 'existing', value: tag }))

    const known =
      chosen.has(query) || suggestions.some((tag) => tag.toLowerCase() === query)

    // The create row goes last on purpose: highlighting it first would make the
    // reflex Enter mint a second spelling of a tag already in the list.
    return clean && !known ? [...matches, { kind: 'new', value: clean }] : matches
  }, [suggestions, chosen, query, clean])

  const show = open && !full && options.length > 0
  const spot = Math.min(highlight, Math.max(0, options.length - 1))

  const add = (raw) => {
    const tag = normalizeTag(raw)
    setPending('')
    setHighlight(0)
    if (!tag || full || chosen.has(tag.toLowerCase())) return

    onChange([...value, tag])
  }

  const remove = (tag) => onChange(value.filter((item) => item !== tag))

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!options.length) return
      setOpen(true)
      setHighlight((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1
        return (next + options.length) % options.length
      })
      return
    }

    if (event.key === 'Enter' || event.key === ',') {
      // Enter inside a form would otherwise submit it half-typed.
      event.preventDefault()
      add(show && options[spot] ? options[spot].value : pending)
      return
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
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
              <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft pl-2.5 pr-1 text-caption font-medium text-brand-onsoft">
                {tag}
                <button
                  type="button"
                  onClick={() => remove(tag)}
                  aria-label={`Hapus tag ${tag}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-tint/10"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          id={id}
          ref={input}
          type="text"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show ? `${listId}-${spot}` : undefined}
          maxLength={LIMITS.tagName}
          disabled={full}
          className="field pr-9"
          placeholder={
            full ? `Maksimal ${LIMITS.tagsPerTransaction} tag` : 'Pilih tag atau ketik yang baru'
          }
          value={pending}
          onChange={(event) => {
            setPending(event.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          /* Committing on blur too: a tag typed and left in the box, then
             saved, should not silently disappear with the form. Options cancel
             their own mousedown, so picking one never trips this. */
          onBlur={() => {
            setOpen(false)
            add(pending)
          }}
        />

        <button
          type="button"
          tabIndex={-1}
          disabled={full}
          aria-label={show ? 'Tutup daftar tag' : 'Buka daftar tag'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setOpen((current) => !current)
            input.current?.focus()
          }}
          className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-subtitle disabled:opacity-40"
        >
          <ChevronDownIcon className={`h-4 w-4 transition ${show ? 'rotate-180' : ''}`} />
        </button>

        {show && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Tag yang tersedia"
            /* Keeps focus in the field, so choosing an option never fires the
               blur handler that would commit the half-typed text instead. */
            onMouseDown={(event) => event.preventDefault()}
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-control border border-hairline bg-surface py-1 shadow-lg"
          >
            {options.map((option, position) => (
              <li key={`${option.kind}-${option.value}`}>
                <button
                  type="button"
                  id={`${listId}-${position}`}
                  role="option"
                  aria-selected={position === spot}
                  onMouseEnter={() => setHighlight(position)}
                  onClick={() => add(option.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-caption transition ${
                    position === spot ? 'bg-brand-soft text-brand-onsoft' : 'text-ink'
                  }`}
                >
                  {option.kind === 'new' ? (
                    <>
                      <PlusIcon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">
                        Tambah <span className="font-semibold">{option.value}</span>
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 truncate">{option.value}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
