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
  createTransaction,
  deleteAccount,
  deleteCategory,
  deleteTransactions,
  listAccounts,
  listCategories,
  listTransactions,
  renameReferences,
  updateAccount,
  updateCategory,
  updateTransaction
} from '../services/repository.js'
import { ensureWorkbook, rememberSpreadsheetId } from '../services/workbook.js'
import { useAuth } from './AuthContext.jsx'

const DataContext = createContext(null)

const EMPTY = {
  workbook: null,
  transactions: [],
  categories: [],
  accounts: [],
  loading: true,
  error: null
}

export function DataProvider ({ children }) {
  const { status } = useAuth()
  const [state, setState] = useState(EMPTY)

  // Mutations need to read the current lists (to spot renames) without turning
  // every list change into a new callback identity.
  const latest = useRef(state)
  latest.current = state

  const load = useCallback(async ({ spreadsheetId } = {}) => {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const workbook = await ensureWorkbook({ spreadsheetId })
      const [transactions, categories, accounts] = await Promise.all([
        listTransactions(workbook),
        listCategories(workbook),
        listAccounts(workbook)
      ])
      setState({ workbook, transactions, categories, accounts, loading: false, error: null })
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: err.message }))
    }
  }, [])

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
        // Both legs: an account can be the source or the destination of a transfer.
        await renameReferences(workbook, 'account', renamedFrom, saved.name)
        await renameReferences(workbook, 'toAccount', renamedFrom, saved.name)
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
          : current.transactions
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

  const useSpreadsheet = useCallback(
    async (spreadsheetId) => {
      rememberSpreadsheetId(spreadsheetId || null)
      await load({ spreadsheetId })
    },
    [load]
  )

  const value = useMemo(
    () => ({
      ...state,
      reload: load,
      addTransaction,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
      addAccount,
      editAccount,
      removeAccount,
      useSpreadsheet
    }),
    [
      state,
      load,
      addTransaction,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
      addAccount,
      editAccount,
      removeAccount,
      useSpreadsheet
    ]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData () {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
