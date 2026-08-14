import { useEffect, useRef, useState } from 'react'
import { RefreshIcon } from './icons.jsx'

/** How far the finger has to travel before letting go means "refresh". */
const THRESHOLD = 64
/** Where the page stops following the finger, so a long drag cannot tear it off. */
const MAX = 96
/** The page moves half as far as the finger - the drag has to feel resisted. */
const RESISTANCE = 0.5
/** Where the page rests while the refresh runs, just enough to show the spinner. */
const RESTING = 48

/**
 * Pull down at the top of the page to reload from the spreadsheet.
 *
 * Touch only. On a pointer device the same reload is a button in the bar, and
 * a mouse has no gesture to spend on it; wiring one up would only mean a page
 * that jumps when someone drags a selection near the top.
 *
 * The gesture starts only at `scrollY === 0` and only downwards, so it can
 * never steal a scroll: past a few pixels of clear downward travel the page is
 * held still and the drag becomes the pull, and anything else releases it back
 * to the browser.
 */
export default function PullToRefresh ({ onRefresh, children }) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)

  /*
   * The gesture lives in refs, not state: these are read inside listeners that
   * are registered once, and a re-render per touchmove would make the drag
   * stutter on exactly the phones this is for.
   */
  const startY = useRef(null)
  const startX = useRef(0)
  const distance = useRef(0)
  const running = useRef(false)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh

  useEffect(() => {
    const reset = () => {
      startY.current = null
      distance.current = 0
      setPull(0)
    }

    const atTop = () =>
      (window.scrollY || document.scrollingElement?.scrollTop || 0) <= 0

    const onTouchStart = (event) => {
      if (running.current || event.touches.length !== 1 || !atTop()) return
      // A sheet scrolls its own contents over the page; dragging inside one is
      // not a pull on what is behind it.
      if (event.target?.closest?.('[role="dialog"]')) return

      startY.current = event.touches[0].clientY
      startX.current = event.touches[0].clientX
      distance.current = 0
    }

    const onTouchMove = (event) => {
      if (startY.current === null) return

      const delta = event.touches[0].clientY - startY.current
      const sideways = Math.abs(event.touches[0].clientX - startX.current)

      // Scrolled away, or the finger turned upwards: this was a scroll after all.
      if (delta <= 0 || !atTop()) {
        reset()
        return
      }

      /*
       * Sideways wins ties. The dashboard's carousel and the filter strips are
       * swiped horizontally from the top of the page, and claiming those as a
       * pull because the thumb also drifted down a few pixels would break the
       * gesture people actually meant.
       */
      if (sideways >= delta) {
        reset()
        return
      }

      /*
       * Claimed as early as the direction is unambiguous, not after a
       * comfortable threshold. The browser decides on the first few moves
       * whether a downward drag at the top belongs to its own refresh or bounce,
       * and once it has taken the gesture `cancelable` goes false and every
       * later call here is ignored - which is exactly how this ended up doing
       * nothing on a real phone while passing a synthetic test.
       */
      if (delta > 2 && event.cancelable) event.preventDefault()

      distance.current = Math.min(MAX, delta * RESISTANCE)
      setPull(distance.current)
    }

    const onTouchEnd = async () => {
      if (startY.current === null) return

      const pulled = distance.current
      startY.current = null

      if (pulled < THRESHOLD) {
        reset()
        return
      }

      running.current = true
      distance.current = RESTING
      setPull(RESTING)
      setBusy(true)

      try {
        await refresh.current?.()
      } finally {
        running.current = false
        setBusy(false)
        reset()
      }
    }

    /*
     * On the window rather than on the frame: the frame is only as tall as the
     * page it wraps, so on a short screen - an empty month, the setup screen -
     * a pull that starts below the content would land on nothing at all.
     */
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  const ready = pull >= THRESHOLD

  return (
    <div className="relative flex min-w-0 flex-1 flex-col">
      {/* Behind the page rather than above it: the content slides down to
          uncover the spinner, which is what makes the page feel dragged. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ height: pull, opacity: pull ? Math.min(1, pull / THRESHOLD) : 0 }}
        aria-hidden="true"
      >
        <span
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface text-subtitle shadow-sm"
          style={{ transform: busy ? undefined : `rotate(${(pull / THRESHOLD) * 270}deg)` }}
        >
          <RefreshIcon
            className={`h-4 w-4 ${busy ? 'animate-spin' : ''} ${ready && !busy ? 'text-brand' : ''}`}
          />
        </span>
      </div>

      {/*
        The transform is set only while the page is actually being pulled. A
        standing one would make this element the containing block for every
        `position: fixed` descendant - which is what a sheet is - and park the
        next dialog somewhere other than the viewport.
      */}
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{
          transform: pull ? `translateY(${pull}px)` : undefined,
          // Following the finger has to be instant; springing back should not be.
          transition: startY.current === null ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : undefined
        }}
      >
        {children}
      </div>

      {/* The gesture is silent, so the outcome is announced instead. */}
      <span className="sr-only" role="status">
        {busy ? 'Memuat ulang data…' : ''}
      </span>
    </div>
  )
}
