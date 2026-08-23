import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeDashboardCategories } from './dashboardFilters.js'

test('normalizes cached Dashboard categories to unique non-empty strings', () => {
  assert.deepEqual(
    normalizeDashboardCategories(['Utilities', '', 'Household', 'Utilities', null, 7]),
    ['Utilities', 'Household']
  )
})

test('ignores malformed Dashboard category cache values', () => {
  assert.deepEqual(normalizeDashboardCategories({ category: 'Utilities' }), [])
})
