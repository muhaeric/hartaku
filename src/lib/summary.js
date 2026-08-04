import { monthKeyOf } from './dates.js'

export function filterByMonth (transactions, monthKey) {
  return transactions.filter((transaction) => monthKeyOf(transaction.date) === monthKey)
}

export function summarize (transactions) {
  let income = 0
  let expense = 0

  for (const transaction of transactions) {
    if (transaction.type === 'income') income += transaction.amount
    else expense += transaction.amount
  }

  return { income, expense, net: income - expense, count: transactions.length }
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
