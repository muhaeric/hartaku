import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveInstallStatus } from './useInstallApp.js'

test('installed display modes and related PWAs suppress installation UI', () => {
  assert.equal(resolveInstallStatus({ standalone: true }), 'installed')
  assert.equal(resolveInstallStatus({ relatedInstalled: true }), 'installed')
})

test('install status waits for related app detection before offering installation', () => {
  assert.equal(resolveInstallStatus({ checking: true, promptAvailable: true }), 'checking')
  assert.equal(resolveInstallStatus({ promptAvailable: true }), 'available')
})

test('install status keeps platform-specific manual instructions', () => {
  assert.equal(resolveInstallStatus({ ios: true, safari: true }), 'ios-safari')
  assert.equal(resolveInstallStatus({ ios: true, safari: false }), 'ios-other')
  assert.equal(resolveInstallStatus(), 'manual')
})
