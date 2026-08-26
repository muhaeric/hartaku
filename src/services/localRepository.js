import { newId } from '../lib/id.js'
import { mergeTags, normalizeTag, normalizeTags, parseTags, sameTags } from '../lib/tags.js'
import { mutate, readDoc } from './localStore.js'

/**
 * The device-local twin of the Sheets repository.
 *
 * Same function names, same arguments, same return shapes - `repository.js`
 * hands a call to whichever of the two the open workbook belongs to, and
 * everything above it goes on not knowing which one answered. Where the Sheets
 * version writes a range of cells, this one edits an array and saves the
 * document; the observable behaviour is meant to be indistinguishable, down to
 * the transfers `recategorizeTransactions` refuses to touch.
 *
 * `workbook` is accepted and ignored: there is only one local document, and the
 * argument is what keeps the two implementations swappable.
 */

const now = () => new Date().toISOString()

/* ----------------------------------------------------------- transactions */

export async function listTransactions () {
  const doc = await readDoc()
  return (doc?.transactions || []).filter((transaction) => transaction.id && transaction.date)
}

export async function createTransaction (workbook, input) {
  const stamp = now()
  const transaction = {
    ...input,
    id: newId(),
    tags: normalizeTags(input.tags),
    createdAt: stamp,
    updatedAt: stamp
  }

  return mutate((doc) => ({
    doc: { ...doc, transactions: [...doc.transactions, transaction] },
    result: transaction
  }))
}

export async function createTransactions (workbook, inputs) {
  if (!inputs.length) return []

  const stamp = now()
  const transactions = inputs.map((input) => ({
    ...input,
    id: newId(),
    tags: normalizeTags(input.tags),
    // An importer knows when the row was really written; without that, rows
    // brought in from another app would all share one timestamp.
    createdAt: input.createdAt || stamp,
    updatedAt: stamp
  }))

  return mutate((doc) => ({
    doc: { ...doc, transactions: [...doc.transactions, ...transactions] },
    result: transactions
  }))
}

export async function updateTransaction (workbook, input) {
  const transaction = {
    ...input,
    tags: normalizeTags(input.tags),
    updatedAt: now()
  }

  return mutate((doc) => {
    if (!doc.transactions.some((item) => item.id === input.id)) {
      throw new Error('Transaksi tidak ditemukan - mungkin sudah dihapus.')
    }

    return {
      doc: {
        ...doc,
        transactions: doc.transactions.map((item) =>
          item.id === input.id ? transaction : item
        )
      },
      result: transaction
    }
  })
}

/** A transfer already arriving at the target is left alone, as in the sheet. */
export async function moveTransactions (workbook, ids, account) {
  const wanted = new Set(ids)
  const updatedAt = now()

  return mutate((doc) => {
    const moved = []
    const transactions = doc.transactions.map((item) => {
      if (!wanted.has(item.id) || item.account === account) return item
      if (item.type === 'transfer' && item.toAccount === account) return item

      moved.push(item.id)
      return { ...item, account, updatedAt }
    })

    return { doc: { ...doc, transactions }, result: { moved, updatedAt } }
  })
}

/** Transfers carry no category, so they are counted and skipped, never written. */
export async function recategorizeTransactions (workbook, ids, category) {
  const wanted = new Set(ids)
  const updatedAt = now()

  return mutate((doc) => {
    const moved = []
    let transfers = 0

    const transactions = doc.transactions.map((item) => {
      if (!wanted.has(item.id)) return item
      if (item.type === 'transfer') {
        transfers += 1
        return item
      }
      if (item.category === category) return item

      moved.push(item.id)
      return { ...item, category, updatedAt }
    })

    return { doc: { ...doc, transactions }, result: { moved, transfers, updatedAt } }
  })
}

export async function tagTransactions (workbook, ids, tags, { replace = false } = {}) {
  const wanted = new Set(ids)
  const updatedAt = now()

  return mutate((doc) => {
    const tagged = []

    const transactions = doc.transactions.map((item) => {
      if (!wanted.has(item.id)) return item

      const current = parseTags(item.tags)
      const next = replace ? normalizeTags(tags) : mergeTags(current, tags)
      if (sameTags(current, next)) return item

      tagged.push({ id: item.id, tags: next })
      return { ...item, tags: next, updatedAt }
    })

    return { doc: { ...doc, transactions }, result: { tagged, updatedAt } }
  })
}

function rewriteTags (next) {
  const updatedAt = now()

  return mutate((doc) => {
    const changed = []

    const transactions = doc.transactions.map((item) => {
      const current = parseTags(item.tags)
      const updated = next(current)
      if (sameTags(current, updated)) return item

      changed.push({ id: item.id, tags: updated })
      return { ...item, tags: updated, updatedAt }
    })

    return { doc: { ...doc, transactions }, result: { changed, updatedAt } }
  })
}

export async function renameTag (workbook, from, to) {
  const before = normalizeTag(from).toLowerCase()
  const after = normalizeTag(to)
  if (!before || !after) return { changed: [], updatedAt: null }

  return rewriteTags((current) =>
    current.some((tag) => tag.toLowerCase() === before)
      ? normalizeTags(current.map((tag) => (tag.toLowerCase() === before ? after : tag)))
      : current
  )
}

export async function deleteTag (workbook, tag) {
  const wanted = normalizeTag(tag).toLowerCase()
  if (!wanted) return { changed: [], updatedAt: null }

  return rewriteTags((current) => current.filter((item) => item.toLowerCase() !== wanted))
}

export async function deleteTransactions (workbook, ids) {
  const wanted = new Set(ids)

  return mutate((doc) => {
    const transactions = doc.transactions.filter((item) => !wanted.has(item.id))
    const removed = doc.transactions.length - transactions.length

    return { doc: removed ? { ...doc, transactions } : null, result: removed }
  })
}

const REFERENCE_FIELDS = { account: 'account', category: 'category', toAccount: 'toAccount' }

export async function renameReferences (workbook, field, from, to) {
  const key = REFERENCE_FIELDS[field]
  if (!key || !from || from === to) return 0

  return mutate((doc) => {
    let count = 0
    const transactions = doc.transactions.map((item) => {
      if (item[key] !== from) return item

      count += 1
      return { ...item, [key]: to }
    })

    return { doc: count ? { ...doc, transactions } : null, result: count }
  })
}

/* ------------------------------------------------------------- categories */

/** Same ordering the sheet is read in, so the two backends list alike. */
function byOrder (a, b) {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
}

export async function listCategories () {
  const doc = await readDoc()
  return (doc?.categories || []).filter((item) => item.id && item.name).sort(byOrder)
}

export async function createCategory (workbook, input) {
  const category = { ...input, id: newId() }

  return mutate((doc) => ({
    doc: { ...doc, categories: [...doc.categories, category] },
    result: category
  }))
}

export async function createCategories (workbook, inputs) {
  if (!inputs.length) return []

  const categories = inputs.map((input) => ({ ...input, id: newId() }))

  return mutate((doc) => ({
    doc: { ...doc, categories: [...doc.categories, ...categories] },
    result: categories
  }))
}

export async function updateCategory (workbook, input) {
  return mutate((doc) => {
    if (!doc.categories.some((item) => item.id === input.id)) {
      throw new Error('Kategori tidak ditemukan - mungkin sudah dihapus.')
    }

    return {
      doc: {
        ...doc,
        categories: doc.categories.map((item) => (item.id === input.id ? input : item))
      },
      result: input
    }
  })
}

export async function deleteCategory (workbook, id) {
  return mutate((doc) => {
    const categories = doc.categories.filter((item) => item.id !== id)
    const removed = doc.categories.length - categories.length

    return { doc: removed ? { ...doc, categories } : null, result: removed }
  })
}

/* --------------------------------------------------------------- accounts */

export async function listAccounts () {
  const doc = await readDoc()
  return (doc?.accounts || []).filter((item) => item.id && item.name).sort(byOrder)
}

export async function createAccount (workbook, input) {
  const account = { ...input, id: newId() }

  return mutate((doc) => ({
    doc: { ...doc, accounts: [...doc.accounts, account] },
    result: account
  }))
}

export async function createAccounts (workbook, inputs) {
  if (!inputs.length) return []

  const accounts = inputs.map((input) => ({ ...input, id: newId() }))

  return mutate((doc) => ({
    doc: { ...doc, accounts: [...doc.accounts, ...accounts] },
    result: accounts
  }))
}

export async function updateAccount (workbook, input) {
  return mutate((doc) => {
    if (!doc.accounts.some((item) => item.id === input.id)) {
      throw new Error('Akun tidak ditemukan - mungkin sudah dihapus.')
    }

    return {
      doc: {
        ...doc,
        accounts: doc.accounts.map((item) => (item.id === input.id ? input : item))
      },
      result: input
    }
  })
}

export async function deleteAccount (workbook, id) {
  return mutate((doc) => {
    const accounts = doc.accounts.filter((item) => item.id !== id)
    const removed = doc.accounts.length - accounts.length

    return { doc: removed ? { ...doc, accounts } : null, result: removed }
  })
}

/* ------------------------------------------------------------------- gold */

const perGram = (lot) => (lot.grams ? lot.cost / lot.grams : 0)

export async function listGoldLots () {
  const doc = await readDoc()
  return (doc?.goldLots || [])
    .filter((lot) => lot.id && lot.grams > 0)
    .map((lot) => ({ ...lot, pricePerGram: perGram(lot) }))
}

export async function createGoldLot (workbook, input) {
  const stamp = now()
  const lot = {
    ...input,
    id: newId(),
    grams: Number(input.grams) || 0,
    cost: Number(input.cost) || 0,
    createdAt: stamp,
    updatedAt: stamp
  }

  return mutate((doc) => ({
    doc: { ...doc, goldLots: [...doc.goldLots, lot] },
    result: { ...lot, pricePerGram: perGram(lot) }
  }))
}

export async function updateGoldLot (workbook, input) {
  const lot = {
    ...input,
    grams: Number(input.grams) || 0,
    cost: Number(input.cost) || 0,
    updatedAt: now()
  }

  return mutate((doc) => {
    if (!doc.goldLots.some((item) => item.id === input.id)) {
      throw new Error('Catatan emas tidak ditemukan - mungkin sudah dihapus.')
    }

    return {
      doc: {
        ...doc,
        goldLots: doc.goldLots.map((item) => (item.id === input.id ? lot : item))
      },
      result: { ...lot, pricePerGram: perGram(lot) }
    }
  })
}

export async function deleteGoldLot (workbook, id) {
  return mutate((doc) => {
    const goldLots = doc.goldLots.filter((item) => item.id !== id)
    const removed = doc.goldLots.length - goldLots.length

    return { doc: removed ? { ...doc, goldLots } : null, result: removed }
  })
}

export async function renameGoldAccountReferences (workbook, from, to) {
  if (!from || from === to) return 0

  return mutate((doc) => {
    let count = 0
    const goldLots = doc.goldLots.map((lot) => {
      if (lot.fromAccount !== from) return lot

      count += 1
      return { ...lot, fromAccount: to }
    })

    return { doc: count ? { ...doc, goldLots } : null, result: count }
  })
}

/* ---------------------------------------------------------------- budgets */

export async function listBudgets () {
  const doc = await readDoc()
  return (doc?.budgets || []).filter(
    (budget) => budget.id && /^\d{4}-\d{2}$/.test(budget.month) && budget.category
  )
}

export async function createBudget (workbook, input) {
  const stamp = now()
  const budget = {
    ...input,
    id: newId(),
    amount: Number(input.amount) || 0,
    createdAt: input.createdAt || stamp,
    updatedAt: stamp
  }

  return mutate((doc) => ({
    doc: { ...doc, budgets: [...doc.budgets, budget] },
    result: budget
  }))
}

export async function createBudgets (workbook, inputs) {
  if (!inputs.length) return []

  const stamp = now()
  const budgets = inputs.map((input) => ({
    ...input,
    id: newId(),
    amount: Number(input.amount) || 0,
    createdAt: input.createdAt || stamp,
    updatedAt: stamp
  }))

  return mutate((doc) => ({
    doc: { ...doc, budgets: [...doc.budgets, ...budgets] },
    result: budgets
  }))
}

export async function updateBudget (workbook, input) {
  const budget = { ...input, amount: Number(input.amount) || 0, updatedAt: now() }

  return mutate((doc) => {
    if (!doc.budgets.some((item) => item.id === input.id)) {
      throw new Error('Anggaran tidak ditemukan - mungkin sudah dihapus.')
    }

    return {
      doc: {
        ...doc,
        budgets: doc.budgets.map((item) => (item.id === input.id ? budget : item))
      },
      result: budget
    }
  })
}

export async function deleteBudget (workbook, id) {
  return mutate((doc) => {
    const budgets = doc.budgets.filter((item) => item.id !== id)
    const removed = doc.budgets.length - budgets.length

    return { doc: removed ? { ...doc, budgets } : null, result: removed }
  })
}

export async function renameBudgetCategoryReferences (workbook, from, to) {
  if (!from || from === to) return 0

  return mutate((doc) => {
    let count = 0
    const budgets = doc.budgets.map((budget) => {
      if (budget.category !== from) return budget
      count += 1
      return { ...budget, category: to, updatedAt: now() }
    })

    return { doc: count ? { ...doc, budgets } : null, result: count }
  })
}
