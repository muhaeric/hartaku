/**
 * OCR engine boundary. Everything downstream only ever sees `{ text, confidence }`,
 * so swapping Tesseract for a hosted vision model later touches this file alone.
 *
 * Tesseract is imported lazily: its worker and language data are several MB and
 * nobody who never opens the import screen should pay for them.
 */

let workerPromise = null
let progressListener = null

async function getWorker () {
  if (workerPromise) return workerPromise

  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js')

    // Indonesian only. Bank screenshots are Latin script either way, and the
    // Indonesian model recognises the labels that tell us what a line means.
    return createWorker('ind', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text' && progressListener) {
          progressListener({ stage: 'recognize', progress: message.progress })
        } else if (progressListener) {
          progressListener({ stage: 'load', progress: message.progress ?? 0 })
        }
      }
    })
  })()

  try {
    return await workerPromise
  } catch (err) {
    workerPromise = null
    throw err
  }
}

export async function readImageText (file, { onProgress } = {}) {
  progressListener = onProgress || null
  const worker = await getWorker()
  const results = []

  try {
    const images = await prepareImages(file)
    for (let index = 0; index < images.length; index += 1) {
      progressListener = onProgress
        ? (message) => onProgress({
            ...message,
            progress: (index + (message.progress || 0)) / images.length
          })
        : null
      results.push((await worker.recognize(images[index])).data)
    }
  } finally {
    progressListener = null
  }

  const totalWeight = results.reduce((sum, result) => sum + (result.text?.length || 1), 0)
  const confidence = results.reduce(
    (sum, result) => sum + (result.confidence ?? 0) * (result.text?.length || 1),
    0
  ) / totalWeight

  return {
    text: results.map((result) => result.text?.trim()).filter(Boolean).join('\n'),
    // Tesseract reports 0-100; the rest of the app works in 0-1.
    confidence: Math.max(0, Math.min(1, confidence / 100))
  }
}

/**
 * Long transaction-history screenshots are difficult for automatic page
 * segmentation: faint dates disappear and the left-hand account icons add
 * noise. Crop the icon rail, turn all text into high-contrast monochrome, then
 * split only on visually empty rows so no transaction is cut in half.
 */
async function prepareImages (file) {
  const image = await loadImage(file)

  try {
    if (image.height < image.width * 1.2) return [file]

    const cropX = Math.round(image.width * 0.14)
    const width = image.width - cropX
    const height = image.height
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(image.source, cropX, 0, width, height, 0, 0, width, height)

    const pixels = context.getImageData(0, 0, width, height)
    const rowInk = Array(height).fill(0)

    for (let index = 0; index < pixels.data.length; index += 4) {
      const luminance =
        pixels.data[index] * 0.299 +
        pixels.data[index + 1] * 0.587 +
        pixels.data[index + 2] * 0.114
      const value = luminance < 225 ? 0 : 255
      pixels.data[index] = value
      pixels.data[index + 1] = value
      pixels.data[index + 2] = value
      pixels.data[index + 3] = 255
      if (value === 0) rowInk[Math.floor(index / 4 / width)] += 1
    }
    context.putImageData(pixels, 0, 0)

    const chunkCount = Math.ceil(height / (width * 0.9))
    if (chunkCount <= 1) return [canvas]

    const boundaries = [0]
    const targetHeight = height / chunkCount
    const searchRadius = Math.round(targetHeight * 0.22)

    for (let chunk = 1; chunk < chunkCount; chunk += 1) {
      const target = Math.round(targetHeight * chunk)
      boundaries.push(findBlankRow(rowInk, target, searchRadius))
    }
    boundaries.push(height)

    return boundaries.slice(0, -1).map((start, index) => {
      const end = boundaries[index + 1]
      const chunk = document.createElement('canvas')
      chunk.width = width
      chunk.height = end - start
      chunk.getContext('2d').drawImage(canvas, 0, start, width, end - start, 0, 0, width, end - start)
      return chunk
    })
  } finally {
    image.release()
  }
}

async function loadImage (file) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url

  try {
    await image.decode()
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url)
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function findBlankRow (rowInk, target, radius) {
  const from = Math.max(1, target - radius)
  const to = Math.min(rowInk.length - 2, target + radius)
  let best = target
  let bestScore = Number.POSITIVE_INFINITY

  for (let row = from; row <= to; row += 1) {
    const score = rowInk.slice(Math.max(0, row - 4), row + 5).reduce((sum, ink) => sum + ink, 0)
    if (score < bestScore || (score === bestScore && Math.abs(row - target) < Math.abs(best - target))) {
      best = row
      bestScore = score
    }
  }

  return best
}

/** Frees the worker and its language data. Called when the import screen closes. */
export async function releaseOcr () {
  if (!workerPromise) return

  const pending = workerPromise
  workerPromise = null

  try {
    const worker = await pending
    await worker.terminate()
  } catch {
    // Already gone.
  }
}
