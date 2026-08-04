import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import {
  createAccount,
  createCategory,
  createGoldLot,
  createTransaction,
  createTransactions,
  deleteAccount,
  deleteCategory,
  deleteGoldLot,
  deleteTransactions,
  listAccounts,
  listCategories,
  listGoldLots,
  listTransactions,
  renameGoldAccountReferences,
  renameReferences,
  updateAccount,
  updateCategory,
  updateGoldLot,
  updateTransaction
} from '../services/repository.js'
import { ensureWorkbook, rememberSpreadsheetId } from '../services/workbook.js'
import { clearCache, readCache, writeCache } from '../services/cache.js'
import WorkbookSetup from '../components/Setup/WorkbookSetup.jsx'
import { useAuth } from './AuthContext.jsx'

const DataContext = createContext(null)

const EMPTY = {
  workbook: null,
  transactions: [],
  categories: [],
  accounts: [],
  goldLots: [],
  loading: true,
  error: null,
  errorCode: null,
  // Set when a background refresh failed but cached data is still on screen.
  staleSince: null
}

/** Cached contents render immediately; the network refresh then replaces them. */
function initialState () {
  const cached = readCache()
  if (!cached) return EMPTY

  return {
    ...EMPTY,
    workbook: cached.workbook,
    transactions: cached.transactions,
    categories: cached.categories,
    accounts: cached.accounts,
    goldLots: cached.goldLots
  }
}

export function DataProvider ({ children }) {
  const { status } = useAuth()
  const [state, setState] = useState(initialState)

  // Mutations need to read the current lists (to spot renames) without turning
  // every list change into a new callback identity.
  const latest = useRef(state)
  latest.current = state

  const load = useCallback(async ({ spreadsheetId, allowCreate = false } = {}) => {
    setState((current) => ({ ...current, loading: true, error: null, errorCode: null }))

    try {
      const workbook = await ensureWorkbook({ spreadsheetId, allowCreate })
      const [transactions, categories, accounts, goldLots] = await Promise.all([
        listTransactions(workbook),
        listCategories(workbook),
        listAccounts(workbook),
        listGoldLots(workbook)
      ])
      setState({
        workbook,
        transactions,
        categories,
        accounts,
        goldLots,
        loading: false,
        error: null,
        errorCode: null,
        staleSince: null
      })
    } catch (err) {
      setState((current) => {
        // With data already on screen a failed refresh is a warning, not a wall:
        // blanking a working view because one fetch failed helps nobody.
        const hasData = Boolean(current.workbook)

        return {
          ...current,
          loading: false,
          error: hasData ? null : err.message,
          errorCode: hasData ? null : err.code || null,
          staleSince: hasData ? err.message : null
        }
      })
    }
  }, [])

  /**
   * One writer for the cache rather than a call at every mutation site - the
   * kind of thing that silently rots the moment a new mutation is added.
   */
  useEffect(() => {
    if (!state.workbook) return
    writeCache(state)
  }, [
    state.workbook,
    state.transactions,
    state.categories,
    state.accounts,
    state.goldLots
  ])

  useEffect(() => {
    if (status !== 'authenticated') return
    load()
  }, [status, load])

  const withWorkbook = useCallback(
    (fn) =>
      async (...args) => {
        if (!state.workbook) throw new Error('Spreadsheet belum siap. Coba muat ulang halaman.')
        return fn(state.workbook, ...args)
      },
    [state.workbook]
  )

  const addTransaction = useCallback(
    withWorkbook(async (workbook, input) => {
      const created = await createTransaction(workbook, input)
      setState((current) => ({ ...current, transactions: [created, ...current.transactions] }))
      return created
    }),
    [withWorkbook]
  )

  const addTransactionsBatch = useCallback(
    withWorkbook(async (workbook, inputs) => {
      const created = await createTransactions(workbook, inputs)
      setState((current) => ({ ...current, transactions: [...created, ...current.transactions] }))
      return created
    }),
    [withWorkbook]
  )

  const editTransaction = useCallback(
    withWorkbook(async (workbook, input) => {
      const saved = await updateTransaction(workbook, input)
      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) => (item.id === saved.id ? saved : item))
      }))
      return saved
    }),
    [withWorkbook]
  )

  const removeTransactions = useCallback(
    withWorkbook(async (workbook, ids) => {
      const deleted = await deleteTransactions(workbook, ids)
      const removed = new Set(ids)
      setState((current) => ({
        ...current,
        transactions: current.transactions.filter((item) => !removed.has(item.id))
      }))
      return deleted
    }),
    [withWorkbook]
  )

  const addCategory = useCallback(
    withWorkbook(async (workbook, input) => {
      const created = await createCategory(workbook, input)
      setState((current) => ({ ...current, categories: [...current.categories, created] }))
      return created
    }),
    [withWorkbook]
  )

  const editCategory = useCallback(
    withWorkbook(async (workbook, input) => {
      const previous = latest.current.categories.find((item) => item.id === input.id)
      const saved = await updateCategory(workbook, input)

      const renamedFrom = previous && previous.name !== saved.name ? previous.name : null
      if (renamedFrom) await renameReferences(workbook, 'category', renamedFrom, saved.name)

      setState((current) => ({
        ...current,
        categories: current.categories.map((item) => (item.id === saved.id ? saved : item)),
        transactions: renamedFrom
          ? current.transactions.map((item) =>
              item.category === renamedFrom ? { ...item, category: saved.name } : item
            )
          : current.transactions
      }))
      return saved
    }),
    [withWorkbook]
  )

  const removeCategory = useCallback(
    withWorkbook(async (workbook, id) => {
      await deleteCategory(workbook, id)
      setState((current) => ({
        ...current,
        categories: current.categories.filter((item) => item.id !== id)
      }))
    }),
    [withWorkbook]
  )

  const addAccount = useCallback(
    withWorkbook(async (workbook, input) => {
      const created = await createAccount(workbook, input)
      setState((current) => ({ ...current, accounts: [...current.accounts, created] }))
      return created
    }),
    [withWorkbook]
  )

  const editAccount = useCallback(
    withWorkbook(async (workbook, input) => {
      const previous = latest.current.accounts.find((item) => item.id === input.id)
      const saved = await updateAccount(workbook, input)

      const renamedFrom = previous && previous.name !== saved.name ? previous.name : null
      if (renamedFrom) {
        // Both legs: an account can be the source or the destination of a
        // transfer, and it can also be what funded a gold purchase.
        await renameReferences(workbook, 'account', renamedFrom, saved.name)
        await renameReferences(workbook, 'toAccount', renamedFrom, saved.name)
        await renameGoldAccountReferences(workbook, renamedFrom, saved.name)
      }

      setState((current) => ({
        ...current,
        accounts: current.accounts.map((item) => (item.id === saved.id ? saved : item)),
        transactions: renamedFrom
          ? current.transactions.map((item) => ({
              ...item,
              account: item.account === renamedFrom ? saved.name : item.account,
              toAccount: item.toAccount === renamedFrom ? saved.name : item.toAccount
            }))
          : current.transactions,
        goldLots: renamedFrom
          ? current.goldLots.map((item) =>
              item.fromAccount === renamedFrom ? { ...item, fromAccount: saved.name } : item
            )
          : current.goldLots
      }))
      return saved
    }),
    [withWorkbook]
  )

  const removeAccount = useCallback(
    withWorkbook(async (workbook, id) => {
      await deleteAccount(workbook, id)
      setState((current) => ({
        ...current,
        accounts: current.accounts.filter((item) => item.id !== id)
      }))
    }),
    [withWorkbook]
  )

  const addGoldLot = useCallback(
    withWorkbook(async (workbook, input) => {
      const created = await createGoldLot(workbook, input)
      setState((current) => ({ ...current, goldLots: [created, ...current.goldLots] }))
      return created
    }),
    [withWorkbook]
  )

  const editGoldLot = useCallback(
    withWorkbook(async (workbook, input) => {
      const saved = await updateGoldLot(workbook, input)
      setState((current) => ({
        ...current,
        goldLots: current.goldLots.map((item) => (item.id === saved.id ? saved : item))
      }))
      return saved
    }),
    [withWorkbook]
  )

  const removeGoldLot = useCallback(
    withWorkbook(async (workbook, id) => {
      await deleteGoldLot(workbook, id)
      setState((current) => ({
        ...current,
        goldLots: current.goldLots.filter((item) => item.id !== id)
      }))
    }),
    [withWorkbook]
  )

  const useSpreadsheet = useCallback(
    async (spreadsheetId) => {
      // The cache belongs to the old workbook; keeping it would show the wrong
      // numbers for however long the first fetch takes.
      clearCache()
      setState(EMPTY)
      rememberSpreadsheetId(spreadsheetId || null)
      await load({ spreadsheetId })
    },
    [load]
  )

  /** Only reachable from the setup screen, where the user asked for a fresh one. */
  const createFreshWorkbook = useCallback(async () => {
    clearCache()
    setState(EMPTY)
    rememberSpreadsheetId(null)
    await load({ allowCreate: true })
  }, [load])

  const value = useMemo(
    () => ({
      ...state,
      reload: load,
      addTransaction,
      addTransactions: addTransactionsBatch,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
      addAccount,
      editAccount,
      removeAccount,
      addGoldLot,
      editGoldLot,
      removeGoldLot,
      useSpreadsheet,
      createFreshWorkbook
    }),
    [
      state,
      load,
      addTransaction,
      addTransactionsBatch,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
      addAccount,
      editAccount,
      removeAccount,
      addGoldLot,
      editGoldLot,
      removeGoldLot,
      useSpreadsheet,
      createFreshWorkbook
    ]
  )

  return (
    <DataContext.Provider value={value}>
      {/* Without a workbook nothing in the app can render, so this takes over. */}
      {state.errorCode === 'workbook_lookup_failed' ? (
        <WorkbookSetup
          message={state.error}
          busy={state.loading}
          onRetry={() => load()}
          onUseSpreadsheet={useSpreadsheet}
          onCreate={createFreshWorkbook}
        />
      ) : (
        children
      )}
    </DataContext.Provider>
  )
}

export function useData () {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
