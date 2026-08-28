import { accountBalances, categoryBreakdown, filterByMonth, netWorthHistory, summarize } from './summary.js'
import { currentMonthKey, shiftMonth, todayIso } from './dates.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))
const round = (value) => Math.round(value)

export function savingRate (transactions) {
  const { income, expense } = summarize(transactions)
  if (income <= 0) return null
  return clamp(((income - expense) / income) * 100)
}

function budgetControl (transactions, budgets, month) {
  const monthBudgets = budgets.filter((budget) => budget.month === month && budget.amount > 0)
  if (!monthBudgets.length) return null

  const limits = new Map(monthBudgets.map((budget) => [budget.category, Number(budget.amount)]))
  let planned = 0
  let spent = 0

  for (const [category, limit] of limits) {
    planned += limit
    spent += transactions
      .filter((item) => item.type === 'expense' && item.category === category)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }

  if (!planned) return null
  return clamp(100 - Math.max(0, ((spent - planned) / planned) * 100))
}

function spendingControl (transactions, budgets, month, history) {
  const fromBudget = budgetControl(transactions, budgets, month)
  if (fromBudget !== null) return fromBudget

  const { income, expense } = summarize(transactions)
  if (income > 0) return clamp(100 - (expense / income) * 35)

  const previousExpenses = history
    .map((items) => summarize(items).expense)
    .filter((value) => value > 0)

  if (!expense || !previousExpenses.length) return null
  const average = previousExpenses.reduce((sum, value) => sum + value, 0) / previousExpenses.length
  return clamp(expense <= average ? 100 : (average / expense) * 100)
}

function weekKey (isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const value = new Date(year, month - 1, day)
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7))
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function recordingConsistency (transactions, month) {
  const sixMonthsAgo = shiftMonth(month, -5)
  const recent = transactions.filter((item) => item.date?.slice(0, 7) >= sixMonthsAgo && item.date?.slice(0, 7) <= month)
  if (!recent.length) return null

  const complete = recent.filter((item) => {
    if (!item.date || !item.type || !item.account || !(Number(item.amount) > 0)) return false
    return item.type === 'transfer' ? Boolean(item.toAccount) : Boolean(item.category)
  }).length / recent.length

  const activeWeeks = new Set(recent.map((item) => weekKey(item.date))).size
  const firstDate = recent.reduce((oldest, item) => item.date < oldest ? item.date : oldest, recent[0].date)
  const lastDate = month === currentMonthKey() ? todayIso() : `${month}-28`
  const spanDays = Math.max(1, Math.round((new Date(lastDate) - new Date(firstDate)) / 86400000) + 1)
  const expectedWeeks = Math.min(26, Math.max(1, Math.ceil(spanDays / 7)))
  const rhythm = clamp((activeWeeks / expectedWeeks) * 100) / 100

  return clamp((complete * 0.65 + rhythm * 0.35) * 100)
}

function assetComposition (accounts, transactions, goldLots, goldPrice) {
  const buckets = new Map()
  const add = (key, label, icon, color, value, featured = false) => {
    if (!(value > 0)) return
    const existing = buckets.get(key)
    if (existing) existing.value += value
    else buckets.set(key, { key, label, icon, color, value, featured })
  }

  for (const { account, balance } of accountBalances(accounts, transactions, goldLots)) {
    if (!(balance > 0)) continue
    if (['cash', 'bank', 'ewallet'].includes(account.kind)) {
      add('liquid', 'Kas & Bank', '🏦', '#6277f2', balance)
    } else if (account.kind === 'receivable') {
      add('receivable', 'Piutang', '🤝', '#25a785', balance)
    } else {
      add('other', 'Aset lainnya', '📈', '#9875e5', balance)
    }
  }

  const goldValue = goldLots.reduce((sum, lot) => sum + Number(lot.grams || 0) * Number(goldPrice || 0), 0) ||
    goldLots.reduce((sum, lot) => sum + Number(lot.cost || 0), 0)
  add('gold', 'Emas', '🪙', '#d89b28', goldValue, true)

  const values = [...buckets.values()]
  const total = values.reduce((sum, item) => sum + item.value, 0)
  if (!total) return []

  return values
    .map(({ value, ...item }) => ({ ...item, percentage: round((value / total) * 100) }))
    .sort((a, b) => b.percentage - a.percentage)
}

function diversification (assets) {
  if (!assets.length) return null
  const countScore = [0, 45, 68, 84, 94][Math.min(4, assets.length)]
  const concentrationBonus = clamp(100 - assets[0].percentage, 0, 40) / 4
  return clamp(countScore + concentrationBonus)
}

function scoreLabel (score) {
  if (score >= 80) return 'Keuanganmu Sehat'
  if (score >= 65) return 'Keuanganmu Cukup Sehat'
  if (score >= 50) return 'Keuanganmu Sedang Bertumbuh'
  return 'Fondasi Keuanganmu Mulai Terbentuk'
}

function diversityLabel (score) {
  if (score === null) return null
  if (score >= 80) return 'Sangat baik'
  if (score >= 65) return 'Baik'
  if (score >= 45) return 'Cukup'
  return 'Mulai terbentuk'
}

function consecutiveActiveDays (transactions) {
  const dates = [...new Set(transactions.map((item) => item.date).filter(Boolean))].sort().reverse()
  if (!dates.length) return 0

  let streak = 1
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00`)
    const current = new Date(`${dates[index]}T00:00:00`)
    if ((previous - current) / 86400000 !== 1) break
    streak += 1
  }
  return streak
}

function personalInsight ({ monthItems, previousItems, rate, previousRate, consistency }) {
  if (rate !== null && previousRate !== null && rate >= previousRate + 3) {
    return `Tingkat menabungmu meningkat ${round(rate - previousRate)} poin dibanding bulan lalu.`
  }
  if (monthItems.length > previousItems.length && previousItems.length > 0) {
    return `Kamu lebih konsisten mencatat transaksi dibanding bulan lalu.`
  }
  if (consistency >= 80) {
    return 'Catatan keuanganmu rapi dan konsisten dalam beberapa bulan terakhir.'
  }
  if (monthItems.length) {
    return 'Kebiasaan mencatatmu terus terbentuk, satu transaksi pada satu waktu.'
  }
  return null
}

function joinNatural (values) {
  if (values.length <= 1) return values[0] || ''
  if (values.length === 2) return `${values[0]} dan ${values[1]}`
  return `${values.slice(0, -1).join(', ')}, dan ${values[values.length - 1]}`
}

function transactionDescription (transaction) {
  return String(transaction.description || '').trim()
}

function spendingSummary (items, transactions) {
  if (!items.length) return null

  const expenses = transactions.filter((item) => item.type === 'expense' && item.amount > 0)
  const top = items.slice(0, 3)
  const topShare = top.reduce((sum, item) => sum + item.percentage, 0)
  const ranked = top.map((item) => `${item.name} (${item.percentage < 1 ? '<1' : Math.round(item.percentage)}%)`)
  const lead = top.length === 1
    ? `${ranked[0]} menjadi tujuan utama pengeluaranmu bulan ini.`
    : `Pengeluaranmu paling banyak mengarah ke ${joinNatural(ranked)}; ${top.length === 2 ? 'keduanya' : 'ketiganya'} mencakup ${Math.round(topShare)}%.`

  const topCategory = top[0].name
  const topTransactions = expenses.filter(
    (item) => (item.category || 'Tanpa kategori') === topCategory
  )
  const descriptions = new Map()

  for (const transaction of topTransactions) {
    const description = transactionDescription(transaction)
    if (!description) continue
    const key = description.toLocaleLowerCase('id-ID')
    const current = descriptions.get(key)
    if (current) {
      current.count += 1
      current.total += transaction.amount
    } else {
      descriptions.set(key, { description, count: 1, total: transaction.amount })
    }
  }

  const rankedDescriptions = [...descriptions.values()].sort(
    (a, b) => b.count - a.count || b.total - a.total || a.description.localeCompare(b.description)
  )
  const frequent = rankedDescriptions[0]

  let pattern
  if (frequent?.count >= 2) {
    pattern = `Di kategori ${topCategory}, “${frequent.description}” paling sering muncul dengan ${frequent.count} transaksi.`
  } else if (topTransactions.length > 0 && rankedDescriptions.length > 0) {
    const examples = rankedDescriptions.slice(0, 2).map((item) => `“${item.description}”`)
    pattern = `Kategori ${topCategory} terdiri dari ${topTransactions.length} transaksi, termasuk ${joinNatural(examples)}.`
  } else if (topTransactions.length > 0) {
    pattern = `Kategori ${topCategory} terdiri dari ${topTransactions.length} transaksi yang tercatat.`
  }

  const largest = [...expenses].sort((a, b) => b.amount - a.amount)[0]
  let largestSentence
  if (largest) {
    const description = transactionDescription(largest)
    const category = largest.category || 'Tanpa kategori'
    largestSentence = description
      ? `Transaksi terbesar bulan ini tercatat sebagai “${description}” di kategori ${category}.`
      : `Transaksi terbesar bulan ini berada di kategori ${category}.`
  }

  return [lead, pattern, largestSentence].filter(Boolean).slice(0, 3).join(' ')
}

export function buildFinancialSnapshot ({
  transactions = [],
  categories = [],
  accounts = [],
  goldLots = [],
  budgets = [],
  goldPrice = null,
  month = currentMonthKey()
} = {}) {
  const monthKeys = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5))
  const monthGroups = monthKeys.map((key) => filterByMonth(transactions, key))
  const monthItems = monthGroups[5]
  const previousItems = monthGroups[4]
  const rates = monthGroups.map((items, index) => ({ month: monthKeys[index], value: savingRate(items) }))
  const rate = rates[5].value
  const previousRate = rates[4].value
  const control = spendingControl(monthItems, budgets, month, monthGroups.slice(1, 5))
  const consistency = recordingConsistency(transactions, month)
  const assets = assetComposition(accounts, transactions, goldLots, goldPrice)
  const diversity = diversification(assets)

  const components = [
    { value: rate, weight: 0.3 },
    { value: control, weight: 0.25 },
    { value: consistency, weight: 0.3 },
    { value: diversity, weight: 0.15 }
  ].filter((item) => item.value !== null)
  const weight = components.reduce((sum, item) => sum + item.weight, 0)
  const score = components.length >= 2
    ? round(components.reduce((sum, item) => sum + item.value * item.weight, 0) / weight)
    : null

  const categoryByName = new Map(categories.map((category) => [category.name, category]))
  const expenses = categoryBreakdown(monthItems, 'expense').filter((item) => item.total > 0)
  const expenseTotal = expenses.reduce((sum, item) => sum + item.total, 0)
  const spending = expenseTotal
    ? expenses.map((item) => ({
      name: item.name,
      icon: categoryByName.get(item.name)?.icon || '•',
      color: categoryByName.get(item.name)?.color || '#8490a8',
      percentage: (item.total / expenseTotal) * 100
    }))
    : []

  const validRates = rates.filter((item) => item.value !== null)
  const progressChange = validRates.length >= 2
    ? round(validRates[validRates.length - 1].value - validRates[0].value)
    : null

  const activeMonths = new Set(transactions.map((item) => item.date?.slice(0, 7)).filter(Boolean)).size
  const goldMonths = new Set(goldLots.map((item) => item.date?.slice(0, 7)).filter(Boolean)).size
  const worthTrend = netWorthHistory(accounts, transactions, goldLots, 'month', 6)
  const firstWorth = worthTrend[0]?.total
  const lastWorth = worthTrend[worthTrend.length - 1]?.total
  const assetGrowth = worthTrend.length >= 2 && firstWorth
    ? round(((lastWorth - firstWorth) / Math.abs(firstWorth)) * 100)
    : null
  const achievements = [
    consecutiveActiveDays(transactions) > 0 && { icon: '🔥', value: consecutiveActiveDays(transactions), unit: 'hari', label: 'Streak mencatat' },
    transactions.length > 0 && { icon: '📊', value: transactions.length, unit: 'transaksi', label: 'Berhasil dicatat' },
    goldMonths > 0 && { icon: '🪙', value: goldMonths, unit: 'bulan', label: 'Melacak emas' },
    activeMonths > 0 && { icon: '📅', value: activeMonths, unit: 'bulan', label: 'Aktif mencatat' }
  ].filter(Boolean)

  return {
    month,
    hasAnyData: transactions.length > 0 || assets.length > 0,
    score,
    scoreLabel: score === null ? null : scoreLabel(score),
    indicators: {
      saving: rate === null ? null : round(rate),
      control: control === null ? null : round(control),
      consistency: consistency === null ? null : round(consistency),
      diversity: diversityLabel(diversity)
    },
    encouragement: score !== null
      ? (consistency >= 75 ? 'Kamu semakin konsisten mengelola keuangan.' : 'Setiap catatan membantu kamu memahami keuanganmu.')
      : null,
    spending,
    spendingSummary: spendingSummary(spending, monthItems),
    savingTrend: rates,
    progressChange,
    assets,
    achievements,
    insight: personalInsight({ monthItems, previousItems, rate, previousRate, consistency }),
    share: {
      score,
      saving: rate === null ? null : round(rate),
      streak: consecutiveActiveDays(transactions),
      transactions: transactions.length,
      gold: assets.find((item) => item.key === 'gold')?.percentage ?? null,
      consistency: consistency === null ? null : round(consistency),
      assetTypes: assets.length,
      assetGrowth,
      activeMonths,
      largestAsset: assets[0]
        ? { label: assets[0].label, percentage: assets[0].percentage }
        : null
    }
  }
}
