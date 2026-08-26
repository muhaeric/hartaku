/** Single place that knows how the transaction page is addressed. */
export function accountTransactionsPath (accountName) {
  return `/transactions?account=${encodeURIComponent(accountName)}`
}

export function categoryTransactionsPath (categoryName) {
  return `/transactions?category=${encodeURIComponent(categoryName)}`
}

/** Budget realization is always one expense category in one month. */
export function budgetTransactionsPath (categoryName, month) {
  const params = new URLSearchParams({
    category: categoryName,
    month,
    type: 'expense'
  })
  return `/transactions?${params.toString()}`
}

export function tagTransactionsPath (tagName) {
  return `/transactions?tag=${encodeURIComponent(tagName)}`
}
