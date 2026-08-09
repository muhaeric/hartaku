/**
 * The picture behind the glass theme.
 *
 * Kept in localStorage under its own key rather than inside `hartaku.settings`:
 * the settings object is rewritten on every preference change, and dragging a
 * few hundred kilobytes of base64 through a JSON round trip each time somebody
 * switches currency is a cost with nothing to show for it. It is also the one
 * piece of state here that is pure decoration, so losing it must never take a
 * real setting down with it - hence the separate key and the swallowed errors.
 *
 * It stays out of the spreadsheet entirely. Unlike an account icon this is not
 * data about money, it is wallpaper, and it would be the largest thing in the
 * workbook by an order of magnitude.
 */

const STORAGE_KEY = 'hartaku.themePhoto'

/** Long edge. Enough for a phone at 3x without storing a print-resolution file. */
const MAX_EDGE = 1440
const BUDGET = 900_000
const QUALITIES = [0.82, 0.7, 0.58, 0.45, 0.32]

export function readThemePhoto () {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function writeThemePhoto (dataUrl) {
  try {
    localStorage.setItem(STORAGE_KEY, dataUrl)
    return true
  } catch {
    // Quota, or storage blocked entirely. The caller reports it; the theme
    // still works, just without a picture behind it.
    return false
  }
}

export function clearThemePhoto () {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do - it is already unreachable.
  }
}

export async function fileToThemePhoto (file) {
  if (!file) throw new Error('Tidak ada gambar yang dipilih.')
  if (!file.type.startsWith('image/')) throw new Error('File itu bukan gambar.')

  const bitmap = await loadBitmap(file)

  // Aspect ratio is kept, unlike the account icon which is centre-cropped to a
  // square: this one is stretched across a whole screen, and a wallpaper
  // squeezed out of shape is obvious in a way a 32px tile never is.
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))

  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()

  for (const quality of QUALITIES) {
    const encoded = encode(canvas, quality)
    if (encoded.length <= BUDGET) return encoded
  }

  throw new Error('Fotonya terlalu besar untuk disimpan. Coba foto lain atau yang lebih kecil.')
}

/** WebP where it exists, JPEG where it does not - `toDataURL` says which it gave. */
function encode (canvas, quality) {
  const webp = canvas.toDataURL('image/webp', quality)
  if (webp.startsWith('data:image/webp')) return webp

  return canvas.toDataURL('image/jpeg', quality)
}

async function loadBitmap (file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Gambar tidak bisa dibaca.'))
    }
    image.src = url
  })
}
