import assert from 'node:assert/strict'
import test from 'node:test'
import { adminEmails, isAdminUser } from './admin.js'

test('admin access uses a normalized comma-separated allowlist', () => {
  const previous = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = ' Owner@Example.com, second@example.com '

  try {
    assert.deepEqual(adminEmails(), ['owner@example.com', 'second@example.com'])
    assert.equal(isAdminUser({ email: 'OWNER@example.com' }), true)
    assert.equal(isAdminUser({ email: 'visitor@example.com' }), false)
    assert.equal(isAdminUser(null), false)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})
