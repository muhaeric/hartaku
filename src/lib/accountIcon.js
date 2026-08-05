import { ACCOUNT_KINDS } from './constants.js'

/**
 * An account's icon is either an emoji or an uploaded picture, and both live in
 * the same `icon` cell.
 *
 * The picture is a data URL rather than a link to a file: a Drive-hosted image
 * would need its own upload, its own sharing decision and its own cleanup when
 * the account is deleted, and it would break the promise that the spreadsheet is
 * the whole database. A Sheets cell holds 50k characters, so the picture is
 * squared off, downscaled and re-encoded until it fits well inside that with
 * room to spare for the rest of the row.
 */

const SIZE = 96
const BUDGET = 20_000
const QUALITIES = [0.82, 0.7, 0.55, 0.4]

export function isImageIcon (icon) {
  return typeof icon === 'string' && icon.startsWith('data:image/')
}

/**
 * What to show where markup is not allowed - a native `<option>`, a toast, the
 * document title. An uploaded picture has no textual form, so the account's kind
 * stands in for it.
 */
export function accountGlyph (account) {
  if (!account) return '👛'
  if (!isImageIcon(account.icon)) return account.icon || '👛'

  return ACCOUNT_KINDS.find((kind) => kind.value === account.kind)?.icon || '👛'
}

/** `"💵 Cash"`, with the emoji dropped when the account carries a picture. */
export function accountOptionLabel (account) {
  return `${accountGlyph(account)} ${account.name}`
}

export async function fileToAccountIcon (file) {
  if (!file) throw new Error('Tidak ada gambar yang dipilih.')
  if (!file.type.startsWith('image/')) throw new Error('File itu bukan gambar.')

  const bitmap = await loadBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE

  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  // Centre-crop to a square first: letterboxing a wide logo into a 32px tile
  // leaves it too small to recognise, and stretching it is worse.
  const side = Math.min(bitmap.width, bitmap.height)
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE
  )
  bitmap.close?.()

  for (const quality of QUALITIES) {
    const encoded = encode(canvas, quality)
    if (encoded.length <= BUDGET) return encoded
  }

  throw new Error('Gambarnya terlalu rumit untuk disimpan. Coba gambar yang lebih sederhana.')
}

/** WebP where it exists, PNG where it does not - `toDataURL` says which it gave. */
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
