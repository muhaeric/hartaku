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
export function accountBalances (accounts, transactions, goldLots = []) {
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

  // Buying gold moves money out of the funding account and into the metal.
  for (const lot of goldLots) {
    const from = balances.get(lot.fromAccount)
    if (from) from.balance -= lot.cost
  }

  return [...balances.values()]
}

export function totalBalance (balances) {
  return balances.reduce((sum, entry) => sum + entry.balance, 0)
}

/**
 * Gold position. `value` uses the dealer's buyback price - what the metal would
 * actually fetch today - so the profit shown is the profit you could realise,
 * not the paper figure the higher retail price would suggest.
 */
export function goldSummary (goldLots, buybackPerGram) {
  let grams = 0
  let invested = 0

  for (const lot of goldLots) {
    grams += lot.grams
    invested += lot.cost
  }

  const priced = Number(buybackPerGram) > 0
  const value = priced ? grams * buybackPerGram : null
  const profit = priced ? value - invested : null

  return {
    grams,
    invested,
    value,
    profit,
    profitPct: priced && invested > 0 ? (profit / invested) * 100 : null,
    averageCost: grams > 0 ? invested / grams : 0,
    lots: goldLots.length
  }
}

/**
 * Split by sign rather than by account kind: an overdrawn wallet is a liability
 * whatever it was labelled, and a debt account that has been paid off is not.
 */
export function netWorth (balances, goldValue = 0) {
  let assets = goldValue || 0
  let liabilities = 0

  for (const { balance } of balances) {
    if (balance >= 0) assets += balance
    else liabilities += Math.abs(balance)
  }

  return { assets, liabilities, total: assets - liabilities }
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
