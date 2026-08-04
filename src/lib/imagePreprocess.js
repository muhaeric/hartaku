/**
 * Gets a phone screenshot into the shape Tesseract was trained on.
 *
 * Three things wreck accuracy on untouched screenshots, in order of severity:
 * dark mode (Tesseract expects dark text on light, and inverted input is close
 * to unreadable), small text, and the low contrast that UI greys give once the
 * image is flattened to grayscale. All three are fixed here rather than being
 * left for the recognition step to cope with.
 */

// Below this the glyphs are too few pixels tall for reliable recognition.
const TARGET_WIDTH = 1600
const MAX_WIDTH = 2600

export async function preprocessImage (file) {
  const bitmap = await loadBitmap(file)

  const scale = Math.min(Math.max(TARGET_WIDTH / bitmap.width, 1), MAX_WIDTH / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const image = context.getImageData(0, 0, width, height)
  const stats = toGrayscale(image.data)

  // A mean well below mid-grey means light text on a dark background.
  const inverted = stats.mean < 110
  stretchContrast(image.data, stats, inverted)

  context.putImageData(image, 0, 0)

  return { canvas, inverted, width, height }
}

async function loadBitmap (file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file)

  // Safari versions without createImageBitmap for File input.
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

/** Flattens to grayscale in place and reports the spread for the stretch step. */
function toGrayscale (data) {
  const histogram = new Uint32Array(256)
  let total = 0

  for (let i = 0; i < data.length; i += 4) {
    // Rec. 601 luma - closer to perceived brightness than a plain average.
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
    const value = luma | 0

    data[i] = value
    data[i + 1] = value
    data[i + 2] = value

    histogram[value] += 1
    total += value
  }

  const pixels = data.length / 4
  return { histogram, pixels, mean: total / pixels }
}

/**
 * Maps the 2nd and 98th percentile to black and white, inverting on the way when
 * the source was dark. Percentiles rather than min/max so one stray bright pixel
 * cannot flatten the whole image.
 */
function stretchContrast (data, { histogram, pixels }, inverted) {
  const low = percentile(histogram, pixels, 0.02)
  const high = percentile(histogram, pixels, 0.98)
  const span = Math.max(1, high - low)

  const lookup = new Uint8Array(256)
  for (let value = 0; value < 256; value += 1) {
    const normalised = Math.min(255, Math.max(0, ((value - low) / span) * 255))
    lookup[value] = inverted ? 255 - normalised : normalised
  }

  for (let i = 0; i < data.length; i += 4) {
    const value = lookup[data[i]]
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
}

function percentile (histogram, pixels, fraction) {
  const target = pixels * fraction
  let seen = 0

  for (let value = 0; value < 256; value += 1) {
    seen += histogram[value]
    if (seen >= target) return value
  }
  return 255
}
