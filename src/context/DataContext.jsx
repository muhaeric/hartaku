import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransactions,
  listCategories,
  listTransactions,
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
  loading: true,
  error: null
}

export function DataProvider ({ children }) {
  const { status } = useAuth()
  const [state, setState] = useState(EMPTY)

  const load = useCallback(async ({ spreadsheetId } = {}) => {
    setState((current) => ({ ...current, loading: true, error: null }))

    try {
      const workbook = await ensureWorkbook({ spreadsheetId })
      const [transactions, categories] = await Promise.all([
        listTransactions(workbook),
        listCategories(workbook)
      ])
      setState({ workbook, transactions, categories, loading: false, error: null })
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
      const saved = await updateCategory(workbook, input)
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

  const useSpreadsheet = useCallback(
    async (spreadsheetId) => {
      rememberSpreadsheetId(spreadsheetId || null)
      await load({ spreadsheetId })
    },
    [load]
  )

  /** Distinct merchant names, most recently used first - powers the autocomplete. */
  const merchants = useMemo(() => {
    const seen = new Map()
    for (const transaction of [...state.transactions].sort((a, b) => b.date.localeCompare(a.date))) {
      const name = transaction.merchant?.trim()
      if (!name) continue

      const key = name.toLowerCase()
      const entry = seen.get(key)
      if (entry) entry.count += 1
      else seen.set(key, { name, count: 1, category: transaction.category, lastUsed: transaction.date })
    }
    return [...seen.values()]
  }, [state.transactions])

  const value = useMemo(
    () => ({
      ...state,
      merchants,
      reload: load,
      addTransaction,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
      useSpreadsheet
    }),
    [
      state,
      merchants,
      load,
      addTransaction,
      editTransaction,
      removeTransactions,
      addCategory,
      editCategory,
      removeCategory,
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
