import { suggestCategory } from '../lib/categoryClassifier.js'
import { EMAIL_PROVIDERS, parseTransactionEmail } from '../lib/emailTransactionParser.js'
import { listRecentTransactionEmails } from './gmail.js'

let inflight = null

export function scanEmailTransactions (options) {
  if (inflight) return inflight
  inflight = runScan(options).finally(() => { inflight = null })
  return inflight
}

async function runScan (options) {
  const emails = await listRecentTransactionEmails({ after: options.settings.emailLastSyncAt })
  return prepareEmailTransactions({ ...options, emails })
}

export function prepareEmailTransactions ({
  emails,
  settings,
  accounts,
  categories,
  transactions,
  pendingTransactions = settings.emailPendingTransactions || [],
  dismissedSourceIds = settings.emailDismissedSourceIds || []
}) {
  const mappings = settings.emailAccountMappings || {}
  const knownSources = new Set([
    ...transactions.map((item) => item.sourceId),
    ...pendingTransactions.map((item) => item.sourceId),
    ...dismissedSourceIds
  ].filter(Boolean))
  const candidates = []
  const result = {
    scanned: emails.length,
    found: 0,
    duplicates: 0,
    unmapped: 0,
    unrecognized: 0,
    uncategorized: 0
  }

  for (const email of emails) {
    const sourceId = `gmail:${email.id}`
    if (knownSources.has(sourceId)) {
      result.duplicates += 1
      continue
    }

    const parsed = parseTransactionEmail(email)
    if (!parsed) {
      result.unrecognized += 1
      continue
    }

    const account = mappings[parsed.provider]
    if (!account || !accounts.some((item) => item.name === account && !item.archived)) {
      result.unmapped += 1
      continue
    }

    const eligible = categories.filter(
      (category) => !category.archived &&
        (category.type === parsed.type || category.type === 'both')
    )
    const suggested = suggestCategory({
      description: parsed.description,
      type: parsed.type,
      account,
      categories: eligible,
      transactions
    })?.category
    const fallback = eligible.find((item) => /^(other|lainnya?)$/i.test(item.name))?.name || ''
    const category = suggested || fallback

    if (!category) {
      result.uncategorized += 1
      continue
    }

    candidates.push({
      date: parsed.date,
      account,
      toAccount: '',
      amount: parsed.amount,
      type: parsed.type,
      category,
      description: parsed.description,
      tags: [],
      sourceId
    })
    knownSources.add(sourceId)
  }

  result.found = candidates.length
  return { candidates, result }
}

export function mergeEmailCandidates (existing = [], incoming = []) {
  const merged = []
  const seen = new Set()
  for (const candidate of [...existing, ...incoming]) {
    if (!candidate?.sourceId || seen.has(candidate.sourceId)) continue
    seen.add(candidate.sourceId)
    merged.push(candidate)
  }
  return merged
}

export function mappedProviderCount (settings, accounts = null) {
  const mappings = settings.emailAccountMappings || {}
  return EMAIL_PROVIDERS.filter((provider) => {
    const account = mappings[provider.id]
    return account && (!accounts || accounts.some((item) => item.name === account && !item.archived))
  }).length
}
