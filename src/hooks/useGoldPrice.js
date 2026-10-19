import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSettings } from '../context/SettingsContext.jsx'
import { GOLD_REFERENCE, resolveBuyback } from '../lib/gold.js'
import { fetchGoldPrice, readCachedQuote } from '../services/goldPrice.js'

/**
 * Current gold quote. Starts from the cached one so the portfolio renders a
 * number immediately, then refreshes in the background. `stale` says whether
 * what is on screen came from cache after a failed refresh.
 */
export function useGoldPrice () {
  const [quote, setQuote] = useState(readCachedQuote)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setQuote(await fetchGoldPrice())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { quote, loading, error, stale: Boolean(error && quote), refresh }
}

/**
 * The quote plus the one buyback price gold is valued at, from the reference
 * chosen on the gold card. Every screen that shows a gold value goes through
 * here, so the dashboard and the gold page never disagree.
 */
export function useGoldBuyback () {
  const gold = useGoldPrice()
  const { settings } = useSettings()
  const reference = settings.goldReference || GOLD_REFERENCE.market
  const manualPrice = Number(settings.goldManualPrice) || 0

  const buyback = useMemo(
    () => resolveBuyback(gold.quote, reference, manualPrice),
    [gold.quote, reference, manualPrice]
  )

  return { ...gold, reference, manualPrice, buyback }
}
