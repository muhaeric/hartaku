/**
 * Backup file for the device-local mode.
 *
 * In Google mode the spreadsheet is the backup - it sits in Drive, it can be
 * opened anywhere, and losing the browser costs nothing. Local mode has no such
 * safety net: the data lives in one browser profile on one device, and clearing
 * site data takes it with it. So the export is not a nice-to-have here, it is
 * the other half of the feature.
 *
 * Plain JSON rather than .xlsx: the app's spreadsheet reader is deliberately
 * read-only, and a format this app can definitely read back matters more than
 * one Excel can open. Everything is stored as it is held in memory, so a
 * restore is a straight assignment rather than a re-parse.
 */

const FORMAT = 'hartaku.backup'
const VERSION = 2

export function buildBackup (snapshot) {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    transactions: snapshot.transactions || [],
    categories: snapshot.categories || [],
    accounts: snapshot.accounts || [],
    goldLots: snapshot.goldLots || [],
    budgets: snapshot.budgets || []
  }
}

export function backupFilename (date = new Date()) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-')

  return `hartaku-${stamp}.json`
}

/** Hands the file to the browser's own download machinery - no server involved. */
export function downloadBackup (snapshot) {
  const payload = JSON.stringify(buildBackup(snapshot), null, 2)
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))

  const link = document.createElement('a')
  link.href = url
  link.download = backupFilename()
  document.body.appendChild(link)
  link.click()
  link.remove()

  // Revoked on the next tick: Safari has not finished reading it synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class BackupError extends Error {}

/**
 * Reads a backup file back into the workbook lists.
 *
 * Validated rather than trusted: this file has been outside the app, possibly
 * through a text editor, and restoring is destructive. Anything that is not a
 * recognisable Hartaku backup is refused by name instead of being half-applied.
 */
export async function readBackup (file) {
  if (!file) throw new BackupError('Tidak ada file yang dipilih.')

  let parsed
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new BackupError('File itu bukan JSON yang bisa dibaca.')
  }

  if (parsed?.format !== FORMAT) {
    throw new BackupError('File itu bukan cadangan Hartaku.')
  }
  if (Number(parsed.version) > VERSION) {
    throw new BackupError(
      'Cadangan ini dibuat versi Hartaku yang lebih baru. Perbarui aplikasinya dulu.'
    )
  }

  const lists = ['transactions', 'categories', 'accounts', 'goldLots', 'budgets']
  for (const name of lists) {
    if (parsed[name] !== undefined && !Array.isArray(parsed[name])) {
      throw new BackupError(`Bagian "${name}" di file itu rusak.`)
    }
  }

  return {
    transactions: parsed.transactions || [],
    categories: parsed.categories || [],
    accounts: parsed.accounts || [],
    goldLots: parsed.goldLots || [],
    budgets: parsed.budgets || [],
    exportedAt: parsed.exportedAt || null
  }
}

export function summarizeBackup (snapshot) {
  return [
    `${snapshot.transactions.length} transaksi`,
    `${snapshot.accounts.length} akun`,
    `${snapshot.categories.length} kategori`,
    snapshot.goldLots.length ? `${snapshot.goldLots.length} catatan emas` : null,
    (snapshot.budgets || []).length ? `${snapshot.budgets.length} anggaran` : null
  ]
    .filter(Boolean)
    .join(' · ')
}
