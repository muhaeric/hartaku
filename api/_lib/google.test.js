import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DRIVE_SCOPE,
  GMAIL_READONLY_SCOPE,
  buildAuthUrl,
  hasDriveScope,
  hasGmailScope
} from './google.js'

const base = {
  clientId: 'client.apps.googleusercontent.com',
  redirectUri: 'https://hartaku.example/auth/callback',
  state: 'state',
  challenge: 'challenge'
}

test('normal sign-in requests Drive without Gmail', () => {
  const scope = new URL(buildAuthUrl(base)).searchParams.get('scope')
  assert.equal(hasDriveScope(scope), true)
  assert.equal(hasGmailScope(scope), false)
})

test('email connection adds read-only Gmail incrementally', () => {
  const url = new URL(buildAuthUrl({ ...base, gmail: true }))
  const scope = url.searchParams.get('scope')

  assert.equal(hasDriveScope(scope), true)
  assert.equal(hasGmailScope(scope), true)
  assert.ok(scope.includes(DRIVE_SCOPE))
  assert.ok(scope.includes(GMAIL_READONLY_SCOPE))
  assert.equal(url.searchParams.get('include_granted_scopes'), 'true')
})
