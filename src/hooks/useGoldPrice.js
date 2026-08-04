import { useCallback, useEffect, useState } from 'react'
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
