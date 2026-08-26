import { monthKeyOf } from './dates.js'

/**
 * Reconciles monthly limits with expense transactions. Income and transfers do
 * not consume a budget. Totals only include categories that have a budget;
 * spending outside them is reported separately so it cannot disappear.
 */
export function budgetProgress (budgets, transactions, month) {
  const selected = budgets.filter((budget) => budget.month === month)
  const budgetedCategories = new Set(selected.map((budget) => budget.category))
  const spentByCategory = new Map()
  let unbudgetedSpent = 0

  for (const transaction of transactions) {
    if (transaction.type !== 'expense' || monthKeyOf(transaction.date) !== month) continue

    const amount = Math.max(0, Number(transaction.amount) || 0)
    if (budgetedCategories.has(transaction.category)) {
      spentByCategory.set(
        transaction.category,
        (spentByCategory.get(transaction.category) || 0) + amount
      )
    } else {
      unbudgetedSpent += amount
    }
  }

  const entries = selected.map((budget) => {
    const amount = Math.max(0, Number(budget.amount) || 0)
    const spent = spentByCategory.get(budget.category) || 0

    return {
      ...budget,
      amount,
      spent,
      remaining: amount - spent,
      ratio: amount > 0 ? spent / amount : 0,
      over: spent > amount
    }
  })

  const totalBudget = entries.reduce((sum, entry) => sum + entry.amount, 0)
  const totalSpent = entries.reduce((sum, entry) => sum + entry.spent, 0)

  return {
    entries,
    totalBudget,
    totalSpent,
    remaining: totalBudget - totalSpent,
    ratio: totalBudget > 0 ? totalSpent / totalBudget : 0,
    unbudgetedSpent
  }
}
