/** Single place that knows how the transaction page is addressed. */
export function accountTransactionsPath (accountName) {
  return `/transactions?account=${encodeURIComponent(accountName)}`
}

export function categoryTransactionsPath (categoryName) {
  return `/transactions?category=${encodeURIComponent(categoryName)}`
}

export function tagTransactionsPath (tagName) {
  return `/transactions?tag=${encodeURIComponent(tagName)}`
}
