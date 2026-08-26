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
  createAccounts,
  createBudget,
  createBudgets,
  createCategories,
  createCategory,
  createGoldLot,
  createTransaction,
  createTransactions,
  deleteAccount,
  deleteBudget,
  deleteCategory,
  deleteGoldLot,
  deleteTag,
  deleteTransactions,
  listAccounts,
  listBudgets,
  listCategories,
  listGoldLots,
  listTransactions,
  moveTransactions,
  recategorizeTransactions,
  renameGoldAccountReferences,
  renameBudgetCategoryReferences,
  renameReferences,
  renameTag,
  tagTransactions,
  updateAccount,
  updateBudget,
  updateCategory,
  updateGoldLot,
  updateTransaction
} from '../services/repository.js'
import { ensureWorkbook, rememberSpreadsheetId } from '../services/workbook.js'
import { ensureLocalWorkbook } from '../services/storage.js'
import { clearCache, readCache, writeCache } from '../services/cache.js'
import WorkbookSetup from '../components/Setup/WorkbookSetup.jsx'
import { useAuth } from './AuthContext.jsx'
import { useStorage } from './StorageContext.jsx'

const DataContext = createContext(null)

const EMPTY = {
  workbook: null,
  transactions: [],
  categories: [],
  accounts: [],
  goldLots: [],
  budgets: [],
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
    goldLots: cached.goldLots,
    budgets: cached.budgets
  }
}

export function DataProvider ({ children }) {
  const { status } = useAuth()
  const { isLocal } = useStorage()
  const [state, setState] = useState(initialState)

  // Read inside `load` without making every mode flip a new callback identity.
  const local = useRef(isLocal)
  local.current = isLocal

  // Mutations need to read the current lists (to spot renames) without turning
  // every list change into a new callback identity.
  const latest = useRef(state)
  latest.current = state

  const load = useCallback(async ({ spreadsheetId, allowCreate = false } = {}) => {
    setState((current) => ({ ...current, loading: true, error: null, errorCode: null }))

    try {
      const workbook = local.current
        ? await ensureLocalWorkbook()
        : await ensureWorkbook({ spreadsheetId, allowCreate })
      const [transactions, categories, accounts, goldLots, budgets] = await Promise.all([
        listTransactions(workbook),
        listCategories(workbook),
        listAccounts(workbook),
        listGoldLots(workbook),
        listBudgets(workbook)
      ])
      setState({
        workbook,
        transactions,
        categories,
        accounts,
        goldLots,
        budgets,
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
    state.goldLots,
    state.budgets
  ])

  // Local mode has no session to wait for; the device is the credential.
  useEffect(() => {
    if (!isLocal && status !== 'authenticated') return
    load()
  }, [isLocal, status, load])

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

  const moveTransactionsToAccount = useCallback(
    withWorkbook(async (workbook, ids, account) => {
      const { moved, updatedAt } = await moveTransactions(workbook, ids, account)
      const changed = new Set(moved)

      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          changed.has(item.id) ? { ...item, account, updatedAt } : item
        )
      }))
      return moved
    }),
    [withWorkbook]
  )

  const moveTransactionsToCategory = useCallback(
    withWorkbook(async (workbook, ids, category) => {
      const { moved, transfers, updatedAt } = await recategorizeTransactions(workbook, ids, category)
      const changed = new Set(moved)

      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          changed.has(item.id) ? { ...item, category, updatedAt } : item
        )
      }))
      return { moved, transfers }
    }),
    [withWorkbook]
  )

  const tagTransactionsBatch = useCallback(
    withWorkbook(async (workbook, ids, tags, options) => {
      const { tagged, updatedAt } = await tagTransactions(workbook, ids, tags, options)
      const byId = new Map(tagged.map((entry) => [entry.id, entry.tags]))

      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          byId.has(item.id) ? { ...item, tags: byId.get(item.id), updatedAt } : item
        )
      }))
      return tagged
    }),
    [withWorkbook]
  )

  /*
   * Rename and delete share one shape: both come back with the rows they
   * rewrote, and both patch those rows in place rather than refetching. The
   * sheet is a network round trip away, and the manager is a list the user is
   * looking at while it changes.
   */
  const applyTagRewrite = useCallback(
    (changed, updatedAt) => {
      const byId = new Map(changed.map((entry) => [entry.id, entry.tags]))
      if (!byId.size) return

      setState((current) => ({
        ...current,
        transactions: current.transactions.map((item) =>
          byId.has(item.id) ? { ...item, tags: byId.get(item.id), updatedAt } : item
        )
      }))
    },
    []
  )

  const renameTagEverywhere = useCallback(
    withWorkbook(async (workbook, from, to) => {
      const { changed, updatedAt } = await renameTag(workbook, from, to)
      applyTagRewrite(changed, updatedAt)
      return changed
    }),
    [withWorkbook, applyTagRewrite]
  )

  const deleteTagEverywhere = useCallback(
    withWorkbook(async (workbook, tag) => {
      const { changed, updatedAt } = await deleteTag(workbook, tag)
      applyTagRewrite(changed, updatedAt)
      return changed
    }),
    [withWorkbook, applyTagRewrite]
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
      if (renamedFrom) {
        await renameReferences(workbook, 'category', renamedFrom, saved.name)
        await renameBudgetCategoryReferences(workbook, renamedFrom, saved.name)
      }

      setState((current) => ({
        ...current,
        categories: current.categories.map((item) => (item.id === saved.id ? saved : item)),
        transactions: renamedFrom
          ? current.transactions.map((item) =>
              item.category === renamedFrom ? { ...item, category: saved.name } : item
            )
          : current.transactions,
        budgets: renamedFrom
          ? current.budgets.map((item) =>
              item.category === renamedFrom ? { ...item, category: saved.name } : item
            )
          : current.budgets
      }))
      return saved
    }),
    [withWorkbook]
  )

  const addCategoriesBatch = useCallback(
    withWorkbook(async (workbook, inputs) => {
      const created = await createCategories(workbook, inputs)
      setState((current) => ({ ...current, categories: [...current.categories, ...created] }))
      return created
    }),
    [withWorkbook]
  )

  /**
   * Same entry point as `archiveAccount`, and for the same reason: the callers
   * that hide a category hold its id, and assembling a whole record around one
   * flag is how a stale copy of some other field gets written back over the
   * good one.
   */
  const archiveCategory = useCallback(
    withWorkbook(async (workbook, id, archived) => {
      const category = latest.current.categories.find((item) => item.id === id)
      if (!category) throw new Error('Kategori tidak ditemukan - mungkin sudah dihapus.')

      const saved = await updateCategory(workbook, { ...category, archived })
      setState((current) => ({
        ...current,
        categories: current.categories.map((item) => (item.id === saved.id ? saved : item))
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

  const addAccountsBatch = useCallback(
    withWorkbook(async (workbook, inputs) => {
      const created = await createAccounts(workbook, inputs)
      setState((current) => ({ ...current, accounts: [...current.accounts, ...created] }))
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

  /**
   * Archiving is an edit like any other, but it is worth its own entry point:
   * the callers that hide an account have the id and nothing else, and asking
   * them to assemble a whole account record just to flip one flag is how a
   * stale copy of some other field ends up written back over the good one.
   */
  const archiveAccount = useCallback(
    withWorkbook(async (workbook, id, archived) => {
      const account = latest.current.accounts.find((item) => item.id === id)
      if (!account) throw new Error('Akun tidak ditemukan - mungkin sudah dihapus.')

      const saved = await updateAccount(workbook, { ...account, archived })
      setState((current) => ({
        ...current,
        accounts: current.accounts.map((item) => (item.id === saved.id ? saved : item))
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

  const addBudget = useCallback(
    withWorkbook(async (workbook, input) => {
      const created = await createBudget(workbook, input)
      setState((current) => ({ ...current, budgets: [...current.budgets, created] }))
      return created
    }),
    [withWorkbook]
  )

  const addBudgetsBatch = useCallback(
    withWorkbook(async (workbook, inputs) => {
      const created = await createBudgets(workbook, inputs)
      setState((current) => ({ ...current, budgets: [...current.budgets, ...created] }))
      return created
    }),
    [withWorkbook]
  )

  const editBudget = useCallback(
    withWorkbook(async (workbook, input) => {
      const saved = await updateBudget(workbook, input)
      setState((current) => ({
        ...current,
        budgets: current.budgets.map((item) => (item.id === saved.id ? saved : item))
      }))
      return saved
    }),
    [withWorkbook]
  )

  const removeBudget = useCallback(
    withWorkbook(async (workbook, id) => {
      await deleteBudget(workbook, id)
      setState((current) => ({
        ...current,
        budgets: current.budgets.filter((item) => item.id !== id)
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

  /**
   * What every picker and account list should offer. `accounts` stays the full
   * set: names are how transactions point at accounts, so anything resolving a
   * name - balances, renames, the "this filter points at nothing" check - has to
   * keep seeing the archived ones.
   */
  const activeAccounts = useMemo(
    () => state.accounts.filter((account) => !account.archived),
    [state.accounts]
  )

  /**
   * The same split for categories. `categories` stays the full set for the same
   * reason: a transaction points at a category by name, so anything resolving
   * one - a breakdown's colours, a rename, the detail page - has to keep seeing
   * the archived ones.
   */
  const activeCategories = useMemo(
    () => state.categories.filter((category) => !category.archived),
    [state.categories]
  )

  const value = useMemo(
    () => ({
      ...state,
      activeAccounts,
      activeCategories,
      reload: load,
      addTransaction,
      addTransactions: addTransactionsBatch,
      editTransaction,
      moveTransactions: moveTransactionsToAccount,
      recategorizeTransactions: moveTransactionsToCategory,
      tagTransactions: tagTransactionsBatch,
      renameTag: renameTagEverywhere,
      removeTag: deleteTagEverywhere,
      removeTransactions,
      addCategory,
      addCategories: addCategoriesBatch,
      editCategory,
      archiveCategory,
      removeCategory,
      addAccount,
      addAccounts: addAccountsBatch,
      editAccount,
      archiveAccount,
      removeAccount,
      addGoldLot,
      editGoldLot,
      removeGoldLot,
      addBudget,
      addBudgets: addBudgetsBatch,
      editBudget,
      removeBudget,
      useSpreadsheet,
      createFreshWorkbook
    }),
    [
      state,
      activeAccounts,
      activeCategories,
      load,
      addTransaction,
      addTransactionsBatch,
      editTransaction,
      moveTransactionsToAccount,
      moveTransactionsToCategory,
      tagTransactionsBatch,
      renameTagEverywhere,
      deleteTagEverywhere,
      removeTransactions,
      addCategory,
      addCategoriesBatch,
      editCategory,
      archiveCategory,
      removeCategory,
      addAccount,
      addAccountsBatch,
      editAccount,
      archiveAccount,
      removeAccount,
      addGoldLot,
      editGoldLot,
      removeGoldLot,
      addBudget,
      addBudgetsBatch,
      editBudget,
      removeBudget,
      useSpreadsheet,
      createFreshWorkbook
    ]
  )

  return (
    <DataContext.Provider value={value}>
      {/* Without a workbook nothing in the app can render, so this takes over. */}
      {state.errorCode === 'workbook_lookup_failed' || state.errorCode === 'workbook_not_found' ? (
        <WorkbookSetup
          reason={state.errorCode}
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
