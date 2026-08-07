import { PERIODS, monthKeyOf, todayIso } from './dates.js'
import { parseTags } from './tags.js'

export function filterByMonth (transactions, monthKey) {
  return transactions.filter((transaction) => monthKeyOf(transaction.date) === monthKey)
}

/**
 * Income, expense and their difference.
 *
 * Across all accounts a transfer creates nothing - it takes from one pocket and
 * puts it in another - so it is counted but never added. Narrow the view to a
 * single `account` and that stops being true: from where that account stands,
 * a transfer out is money gone and a transfer in is money arrived, and leaving
 * both out gives a "Selisih" that cannot be reconciled against the balance the
 * same account shows everywhere else in the app.
 */
export function summarize (transactions, account = '') {
  let income = 0
  let expense = 0
  let transfers = 0

  for (const transaction of transactions) {
    if (transaction.type === 'transfer') {
      transfers += 1

      if (account) {
        if (transaction.account === account) expense += transaction.amount
        else if (transaction.toAccount === account) income += transaction.amount
      }
      continue
    }

    if (transaction.type === 'income') income += transaction.amount
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

/**
 * What everything added up to at the close of each period, oldest first.
 *
 * Built from the same rules `accountBalances` uses, so the last point lands on
 * the figure shown above it - with one deliberate exception: **gold is held at
 * its purchase cost here**, not at today's buyback price. Applying today's
 * price to the grams held last March would invent growth that never happened,
 * so when there is gold the series runs below the headline by exactly the
 * unrealised profit, and the chart says so.
 *
 * Rows pointing at an account that no longer exists are ignored, again matching
 * the balance calculation - a transfer with one missing end therefore does move
 * the total, because as far as the app can see the money left.
 */
export function netWorthHistory (accounts, transactions, goldLots = [], period = 'month', limit = 12) {
  const bucket = PERIODS[period] || PERIODS.month
  const known = new Set(accounts.map((account) => account.name))

  const events = []

  for (const transaction of transactions) {
    if (!transaction.date) continue
    let delta = 0
    let income = 0
    let expense = 0

    if (transaction.type === 'income') {
      if (known.has(transaction.account)) {
        delta = transaction.amount
        income = transaction.amount
      }
    } else if (transaction.type === 'transfer') {
      // Money changing pockets is not earning or spending, so a transfer moves
      // the total only when one end is missing - and even then it is neither.
      if (known.has(transaction.account)) delta -= transaction.amount
      if (known.has(transaction.toAccount)) delta += transaction.amount
    } else if (known.has(transaction.account)) {
      delta = -transaction.amount
      expense = transaction.amount
    }

    if (delta) events.push({ date: transaction.date, delta, income, expense })
  }

  for (const lot of goldLots) {
    // Cash out, metal in, at the same number: a purchase moves nothing overall
    // unless the account it was paid from is gone. Not earning either, so it
    // lands in neither column.
    if (lot.date && !known.has(lot.fromAccount)) {
      events.push({ date: lot.date, delta: lot.cost, income: 0, expense: 0 })
    }
  }

  if (!events.length) return []
  events.sort((a, b) => a.date.localeCompare(b.date))

  const today = todayIso()
  const lastEvent = events[events.length - 1].date
  const finalKey = bucket.keyOf(lastEvent > today ? lastEvent : today)

  const series = []
  let running = accounts.reduce((sum, account) => sum + (account.openingBalance || 0), 0)
  let index = 0

  // The cap is a runaway guard, not a limit anyone should reach: 600 weeks is
  // eleven years of history.
  for (let key = bucket.keyOf(events[0].date); key <= finalKey && series.length < 600; ) {
    let income = 0
    let expense = 0

    while (index < events.length && bucket.keyOf(events[index].date) <= key) {
      running += events[index].delta
      income += events[index].income
      expense += events[index].expense
      index += 1
    }

    series.push({ key, total: running, income, expense, net: income - expense })
    key = bucket.next(key)
  }

  /*
   * The step against the previous period is measured before the window is
   * trimmed, so the oldest row on screen still has a real predecessor to compare
   * against rather than reporting no change because its neighbour got sliced off.
   *
   * `change` is the movement of the total and `net` is income minus spending;
   * they are related but not the same number, and a transfer with one end
   * pointing at a deleted account is exactly where they part company. Keeping
   * them separately labelled is why neither has to lie.
   */
  const stepped = series.map((point, position) => {
    const previous = position > 0 ? series[position - 1].total : null
    const change = previous === null ? null : point.total - previous

    return {
      ...point,
      change,
      // Divided by the magnitude, so a climb out of debt does not read as a fall.
      changePct: previous ? (change / Math.abs(previous)) * 100 : null
    }
  })

  return stepped.slice(-limit)
}

/** Totals per account for one flow, largest first. Transfers are not spending. */
export function accountBreakdown (transactions, type = 'expense') {
  const totals = new Map()

  for (const transaction of transactions) {
    if (transaction.type !== type) continue

    const name = transaction.account || 'Tanpa akun'
    totals.set(name, (totals.get(name) || 0) + transaction.amount)
  }

  return [...totals.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
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

/**
 * Totals per tag for one flow, largest first.
 *
 * Deliberately not shaped like `categoryBreakdown`, because tags are not a
 * partition. A transaction carries up to eight of them and counts in full under
 * every one, so the rows can add up to more than the period spent - drawing
 * these as a pie would be a lie about what the numbers mean. `tagged` and
 * `untagged` are the honest denominators: each transaction counted once.
 */
export function tagBreakdown (transactions, type = 'expense') {
  const totals = new Map()
  let tagged = 0
  let untagged = 0

  for (const transaction of transactions) {
    if (transaction.type !== type) continue

    const tags = parseTags(transaction.tags)
    if (!tags.length) {
      untagged += transaction.amount
      continue
    }

    tagged += transaction.amount
    for (const tag of tags) {
      const key = tag.toLowerCase()
      const entry = totals.get(key)
      if (entry) entry.total += transaction.amount
      else totals.set(key, { name: tag, total: transaction.amount })
    }
  }

  return {
    rows: [...totals.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    tagged,
    untagged
  }
}

/**
 * Transactions bucketed by day, newest first, each bucket carrying its own
 * income and expense totals for the day header.
 *
 * Takes the same `account` scope as `summarize` for the same reason, and so the
 * day headings still add up to the period figure above them.
 */
export function groupByDay (transactions, account = '') {
  const days = new Map()

  for (const transaction of transactions) {
    let day = days.get(transaction.date)
    if (!day) {
      day = { date: transaction.date, income: 0, expense: 0, items: [] }
      days.set(transaction.date, day)
    }

    day.items.push(transaction)

    if (transaction.type === 'transfer') {
      // Between accounts it is neither; from one account it is both directions.
      if (account && transaction.account === account) day.expense += transaction.amount
      else if (account && transaction.toAccount === account) day.income += transaction.amount
    } else if (transaction.type === 'income') {
      day.income += transaction.amount
    } else {
      day.expense += transaction.amount
    }
  }

  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function monthsWithData (transactions) {
  return [...new Set(transactions.map((transaction) => monthKeyOf(transaction.date)))]
}
