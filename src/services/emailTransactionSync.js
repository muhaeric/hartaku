import { suggestCategory } from '../lib/categoryClassifier.js'
import { EMAIL_PROVIDERS, parseTransactionEmail } from '../lib/emailTransactionParser.js'
import { listRecentTransactionEmails } from './gmail.js'

let inflight = null

export function syncEmailTransactions (options) {
  if (inflight) return inflight
  inflight = runSync(options).finally(() => { inflight = null })
  return inflight
}

async function runSync ({ settings, accounts, categories, transactions, addTransactions }) {
  const mappings = settings.emailAccountMappings || {}
  const emails = await listRecentTransactionEmails({ after: settings.emailLastSyncAt })
  const knownSources = new Set(transactions.map((item) => item.sourceId).filter(Boolean))
  const inputs = []
  const result = {
    scanned: emails.length,
    imported: 0,
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

    inputs.push({
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

  if (inputs.length) await addTransactions(inputs)
  result.imported = inputs.length
  return result
}

export function mappedProviderCount (settings, accounts = null) {
  const mappings = settings.emailAccountMappings || {}
  return EMAIL_PROVIDERS.filter((provider) => {
    const account = mappings[provider.id]
    return account && (!accounts || accounts.some((item) => item.name === account && !item.archived))
  }).length
}
