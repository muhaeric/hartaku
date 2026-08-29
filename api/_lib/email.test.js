import assert from 'node:assert/strict'
import test from 'node:test'
import { newUserAdminEmail, welcomeEmail } from './email.js'

test('welcome email escapes profile text before rendering HTML', () => {
  const email = welcomeEmail(
    { email: 'new@example.com', name: '<script>alert(1)</script> User' },
    'https://hartaku.example'
  )

  assert.deepEqual(email.to, ['new@example.com'])
  assert.match(email.html, /&lt;script&gt;/)
  assert.doesNotMatch(email.html, /<script>/)
  assert.match(email.text, /https:\/\/hartaku\.example/)
})

test('admin notification uses the configured allowlist and safe subject text', () => {
  const previous = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = 'owner@example.com, second@example.com'

  try {
    const email = newUserAdminEmail({
      email: 'new@example.com',
      name: 'User\r\nBcc: injected@example.com'
    })

    assert.deepEqual(email.to, ['owner@example.com', 'second@example.com'])
    assert.equal(email.subject, 'User baru Hartaku: User Bcc: injected@example.com')
    assert.match(email.html, /new@example\.com/)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})
