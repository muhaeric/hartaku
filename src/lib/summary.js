import { monthKeyOf } from './dates.js'

export function filterByMonth (transactions, monthKey) {
  return transactions.filter((transaction) => monthKeyOf(transaction.date) === monthKey)
}

/** Transfers only move money between accounts, so they are not income or expense. */
export function summarize (transactions) {
  let income = 0
  let expense = 0
  let transfers = 0

  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount
    else if (transaction.type === 'transfer') transfers += 1
    else expense += transaction.amount
  }

  return {
    income,
    expense,
    net: income - expense,
    transfers,
    count: transactions.length
  }
}

/**
 * Running balance per account across all time: opening balance, plus what came
 * in, minus what went out, with transfers moving between the two sides.
 */
export function accountBalances (accounts, transactions) {
  const balances = new Map(
    accounts.map((account) => [account.name, { account, balance: account.openingBalance || 0 }])
  )

  for (const transaction of transactions) {
    const from = balances.get(transaction.account)

    if (transaction.type === 'income') {
      if (from) from.balance += transaction.amount
      continue
    }

    // Expenses and the outgoing leg of a transfer both leave the source account.
    if (from) from.balance -= transaction.amount

    if (transaction.type === 'transfer') {
      const to = balances.get(transaction.toAccount)
      if (to) to.balance += transaction.amount
    }
  }

  return [...balances.values()]
}

export function totalBalance (balances) {
  return balances.reduce((sum, entry) => sum + entry.balance, 0)
}

/** Totals per category for one flow, largest first. */
export function categoryBreakdown (transactions, type = 'expense') {
  const totals = new Map()

  for (const transaction of transactions) {
    if (transaction.type !== type) continue

    const name = transaction.category || 'Tanpa kategori'
    totals.set(name, (totals.get(name) || 0) + transaction.amount)
  }

  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

export function monthsWithData (transactions) {
  return [...new Set(transactions.map((transaction) => monthKeyOf(transaction.date)))]
}
