/**
 * OCR engine boundary. Everything downstream only ever sees `{ text, confidence }`,
 * so swapping Tesseract for a hosted vision model later touches this file alone.
 *
 * Tesseract is imported lazily: its worker and language data are several MB and
 * nobody who never opens the import screen should pay for them.
 */

let workerPromise = null

async function getWorker (onProgress) {
  if (workerPromise) return workerPromise

  workerPromise = (async () => {
    const { createWorker } = await import('tesseract.js')

    // Indonesian only. Bank screenshots are Latin script either way, and the
    // Indonesian model recognises the labels that tell us what a line means.
    return createWorker('ind', 1, {
      logger: (message) => {
        if (message.status === 'recognizing text' && onProgress) {
          onProgress({ stage: 'recognize', progress: message.progress })
        } else if (onProgress) {
          onProgress({ stage: 'load', progress: message.progress ?? 0 })
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
  const worker = await getWorker(onProgress)
  const { data } = await worker.recognize(file)

  return {
    text: data.text || '',
    // Tesseract reports 0-100; the rest of the app works in 0-1.
    confidence: Math.max(0, Math.min(1, (data.confidence ?? 0) / 100))
  }
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
