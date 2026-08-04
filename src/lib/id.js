export function newId () {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  // Fallback for browsers without randomUUID (non-secure contexts).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8
    return value.toString(16)
  })
}
