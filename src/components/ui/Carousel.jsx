import { useCallback, useRef, useState } from 'react'

/**
 * Horizontal slides with snap points and a row of dots.
 *
 * The scrolling is the browser's own - `snap-x` plus `overflow-x-auto` - rather
 * than a transform driven by pointer events. That buys momentum, rubber-banding
 * at the ends, trackpad and shift-wheel support, and keyboard scrolling for
 * free, all of which a hand-rolled swipe handler would have to reimplement
 * badly. Position is read back out of `scrollLeft` instead of being the source
 * of truth, so a swipe and a dot press can never disagree about which slide is
 * showing.
 *
 * Each slide keeps its own heading: dots say how many there are and which one
 * this is, never what it contains.
 */
export default function Carousel ({ slides, label, onSlideChange }) {
  const track = useRef(null)
  const activeRef = useRef(0)
  const [active, setActive] = useState(0)

  const onScroll = useCallback(() => {
    const node = track.current
    if (!node) return

    const width = node.clientWidth || 1
    const next = Math.max(0, Math.min(slides.length - 1, Math.round(node.scrollLeft / width)))
    if (next === activeRef.current) return

    activeRef.current = next
    setActive(next)
    onSlideChange?.(next)
  }, [slides.length, onSlideChange])

  const go = (index) => {
    const node = track.current
    if (!node) return

    node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' })
  }

  if (!slides.length) return null

  return (
    <div>
      <div
        ref={track}
        onScroll={onScroll}
        role="group"
        aria-label={label}
        /* No negative margin bleed here: the card this sits in is flush, so
           there is no padding to escape and pulling wider would overflow its
           rounded border. Each slide brings its own padding instead. */
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.key}
            className="w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${slide.title} — ${index + 1} dari ${slides.length}`}
          >
            <p className="px-page pt-3 text-caption font-medium text-subtitle">{slide.title}</p>
            {slide.content}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-2.5">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => go(index)}
              aria-label={`Lihat ${slide.title}`}
              aria-current={index === active}
              /* The dot is 6px but the button is not: a 6px tap target is a
                 miss waiting to happen, so the padding carries the hit area. */
              className="-m-1 flex h-6 w-6 items-center justify-center p-1"
            >
              <span
                className={`h-1.5 rounded-full transition-all ${
                  index === active ? 'w-4 bg-brand' : 'w-1.5 bg-tint/25'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
