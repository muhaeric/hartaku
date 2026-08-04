/** Single place that knows how the transaction page is addressed. */
export function accountTransactionsPath (accountName) {
  return `/transactions?account=${encodeURIComponent(accountName)}`
}
