import * as local from './localRepository.js'
import * as sheets from './sheetsRepository.js'

/**
 * One data layer, two backends.
 *
 * Every call arrives with the open workbook as its first argument, and the
 * workbook knows where it lives: a Google spreadsheet, or the device's own
 * database. That single flag is the whole switch, which is why it is made here
 * rather than in the context above - the app should not have to hold two mental
 * models of where a transaction goes when it is saved.
 *
 * The two modules are checked against each other at load: a function added to
 * one and forgotten in the other would otherwise surface as "not a function"
 * on whichever backend the user happens to be on, which could easily be the one
 * nobody develops against.
 */

const FUNCTIONS = [
  'listTransactions',
  'createTransaction',
  'createTransactions',
  'updateTransaction',
  'moveTransactions',
  'recategorizeTransactions',
  'tagTransactions',
  'renameTag',
  'deleteTag',
  'deleteTransactions',
  'renameReferences',
  'listCategories',
  'createCategory',
  'createCategories',
  'updateCategory',
  'deleteCategory',
  'listAccounts',
  'createAccount',
  'createAccounts',
  'updateAccount',
  'deleteAccount',
  'listGoldLots',
  'createGoldLot',
  'updateGoldLot',
  'deleteGoldLot',
  'renameGoldAccountReferences',
  'listBudgets',
  'createBudget',
  'createBudgets',
  'updateBudget',
  'deleteBudget',
  'renameBudgetCategoryReferences'
]

for (const name of FUNCTIONS) {
  if (typeof sheets[name] !== 'function' || typeof local[name] !== 'function') {
    throw new Error(`repository: "${name}" tidak lengkap di salah satu backend`)
  }
}

/** A local workbook says so; anything else is a spreadsheet. */
export function isLocalWorkbook (workbook) {
  return Boolean(workbook?.local)
}

function backend (workbook) {
  return isLocalWorkbook(workbook) ? local : sheets
}

function forward (name) {
  return (workbook, ...args) => backend(workbook)[name](workbook, ...args)
}

export const listTransactions = forward('listTransactions')
export const createTransaction = forward('createTransaction')
export const createTransactions = forward('createTransactions')
export const updateTransaction = forward('updateTransaction')
export const moveTransactions = forward('moveTransactions')
export const recategorizeTransactions = forward('recategorizeTransactions')
export const tagTransactions = forward('tagTransactions')
export const renameTag = forward('renameTag')
export const deleteTag = forward('deleteTag')
export const deleteTransactions = forward('deleteTransactions')
export const renameReferences = forward('renameReferences')

export const listCategories = forward('listCategories')
export const createCategory = forward('createCategory')
export const createCategories = forward('createCategories')
export const updateCategory = forward('updateCategory')
export const deleteCategory = forward('deleteCategory')

export const listAccounts = forward('listAccounts')
export const createAccount = forward('createAccount')
export const createAccounts = forward('createAccounts')
export const updateAccount = forward('updateAccount')
export const deleteAccount = forward('deleteAccount')

export const listGoldLots = forward('listGoldLots')
export const createGoldLot = forward('createGoldLot')
export const updateGoldLot = forward('updateGoldLot')
export const deleteGoldLot = forward('deleteGoldLot')
export const renameGoldAccountReferences = forward('renameGoldAccountReferences')

export const listBudgets = forward('listBudgets')
export const createBudget = forward('createBudget')
export const createBudgets = forward('createBudgets')
export const updateBudget = forward('updateBudget')
export const deleteBudget = forward('deleteBudget')
export const renameBudgetCategoryReferences = forward('renameBudgetCategoryReferences')

export { HEADERS } from './sheetsRepository.js'
