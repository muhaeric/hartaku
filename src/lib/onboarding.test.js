import assert from 'node:assert/strict'
import test from 'node:test'
import { ONBOARDING, normalizeOnboarding, onboardingDecision } from './onboarding.js'

test('unknown stored values fall back to pending', () => {
  assert.equal(normalizeOnboarding(null), ONBOARDING.pending)
  assert.equal(normalizeOnboarding('yes'), ONBOARDING.pending)
  assert.equal(normalizeOnboarding('done'), ONBOARDING.done)
  assert.equal(normalizeOnboarding('replay'), ONBOARDING.replay)
})

test('waits for data before deciding a pending walkthrough', () => {
  assert.equal(
    onboardingDecision({ status: ONBOARDING.pending, ready: false, transactionCount: 0 }),
    'wait'
  )
})

test('shows the walkthrough to someone with no transactions yet', () => {
  assert.equal(
    onboardingDecision({ status: ONBOARDING.pending, ready: true, transactionCount: 0 }),
    'show'
  )
})

test('skips it for someone who already has records', () => {
  assert.equal(
    onboardingDecision({ status: ONBOARDING.pending, ready: true, transactionCount: 12 }),
    'skip'
  )
})

test('a replay shows it even when records exist', () => {
  assert.equal(
    onboardingDecision({ status: ONBOARDING.replay, ready: true, transactionCount: 12 }),
    'show'
  )
})

test('done stays hidden regardless of data', () => {
  assert.equal(
    onboardingDecision({ status: ONBOARDING.done, ready: false, transactionCount: 0 }),
    'hide'
  )
})
