import { useSettings } from '../../context/SettingsContext.jsx'

/*
 * Ornament for the themed palettes. Everything here is inert and sits behind the
 * page: `-z-10` paints above the canvas background but below every block in the
 * document, so the decoration can never come between a reader and a number.
 * That is the whole constraint on decorating a money app, and it is why the
 * shapes are washes at 4-8% rather than illustrations.
 *
 * Colour comes from `--decor` via `currentColor` on the wrapper, so each theme
 * tints its own art without any of these components knowing which theme is on.
 */

/** Swells stacked toward the bottom, so the top of the page stays quiet. */
function OceanWaves () {
  return (
    <svg
      className="absolute inset-x-0 bottom-0 h-[45vh] w-full"
      viewBox="0 0 1440 420"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <path opacity="0.07" d="M0 210c240-56 380 62 720 14s480-70 720-24v220H0z" />
      <path opacity="0.05" d="M0 288c260-48 520 62 780 8s420-38 660 6v118H0z" />
      <path opacity="0.04" d="M0 352c300-38 560 44 860 6s400-22 580 10v52H0z" />
    </svg>
  )
}

/** A tiled field rather than a fixed constellation, so it covers any viewport. */
function SpaceStars () {
  return (
    <svg className="absolute inset-0 h-full w-full" fill="currentColor">
      <defs>
        <pattern id="hartaku-stars" width="200" height="200" patternUnits="userSpaceOnUse">
          <circle cx="24" cy="36" r="1.4" opacity="0.55" />
          <circle cx="92" cy="18" r="0.9" opacity="0.35" />
          <circle cx="158" cy="62" r="1.7" opacity="0.6" />
          <circle cx="46" cy="104" r="1" opacity="0.4" />
          <circle cx="122" cy="132" r="1.3" opacity="0.5" />
          <circle cx="180" cy="168" r="0.9" opacity="0.3" />
          <circle cx="70" cy="182" r="1.5" opacity="0.45" />
          <circle cx="8" cy="150" r="0.8" opacity="0.3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hartaku-stars)" opacity="0.5" />
    </svg>
  )
}

/** Petals drifting on a diagonal - the tile is rotated so the grid never reads. */
function FlowerPetals () {
  return (
    <svg className="absolute inset-0 h-full w-full" fill="currentColor">
      <defs>
        <pattern
          id="hartaku-petals"
          width="180"
          height="180"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(18)"
        >
          <ellipse cx="34" cy="40" rx="15" ry="7" opacity="0.5" transform="rotate(24 34 40)" />
          <ellipse cx="118" cy="26" rx="11" ry="5.5" opacity="0.38" transform="rotate(-38 118 26)" />
          <ellipse cx="150" cy="108" rx="16" ry="7.5" opacity="0.45" transform="rotate(12 150 108)" />
          <ellipse cx="66" cy="132" rx="12" ry="6" opacity="0.4" transform="rotate(-16 66 132)" />
          <ellipse cx="8" cy="96" rx="10" ry="5" opacity="0.32" transform="rotate(48 8 96)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hartaku-petals)" opacity="0.28" />
    </svg>
  )
}

/** One pad and four toes, walked across the tile on a slight diagonal. */
function AnimalTracks () {
  return (
    <svg className="absolute inset-0 h-full w-full" fill="currentColor">
      <defs>
        <g id="hartaku-paw">
          <ellipse cx="0" cy="6" rx="9" ry="7.5" />
          <circle cx="-9" cy="-6" r="3.4" />
          <circle cx="-3" cy="-10" r="3.6" />
          <circle cx="3.4" cy="-10" r="3.6" />
          <circle cx="9.4" cy="-5.4" r="3.4" />
        </g>
        <pattern
          id="hartaku-tracks"
          width="200"
          height="200"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-12)"
        >
          <use href="#hartaku-paw" transform="translate(34 40) rotate(14)" opacity="0.5" />
          <use href="#hartaku-paw" transform="translate(96 82) rotate(14)" opacity="0.42" />
          <use href="#hartaku-paw" transform="translate(58 128) rotate(-8)" opacity="0.46" />
          <use href="#hartaku-paw" transform="translate(160 24) rotate(-8)" opacity="0.34" />
          <use href="#hartaku-paw" transform="translate(150 158) rotate(22)" opacity="0.38" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hartaku-tracks)" opacity="0.3" />
    </svg>
  )
}

/** Terang and Gelap are deliberately absent - they render nothing. */
const BACKDROPS = {
  ocean: OceanWaves,
  space: SpaceStars,
  flower: FlowerPetals,
  animal: AnimalTracks
}

export default function ThemeBackdrop () {
  const { resolvedTheme } = useSettings()
  const Art = BACKDROPS[resolvedTheme]

  if (!Art) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden text-decor"
    >
      <Art />
    </div>
  )
}
