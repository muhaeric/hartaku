import assert from 'node:assert/strict'
import test from 'node:test'
import {
  TEAM_CONTACT_URL,
  announcementEmail,
  emailSenderAddress,
  newUserAdminEmail,
  sendWelcomeEmail,
  welcomeEmail
} from './email.js'

test('sender defaults to the domain provisioned by the Resend integration', () => {
  const previousFrom = process.env.EMAIL_FROM
  const previousDomain = process.env.RESEND_EMAIL_DOMAIN
  delete process.env.EMAIL_FROM
  process.env.RESEND_EMAIL_DOMAIN = 'hartaku.web.id'

  try {
    assert.equal(emailSenderAddress(), 'HartakuSigma <halo@hartaku.web.id>')
    process.env.EMAIL_FROM = 'Tim Hartaku <support@hartaku.web.id>'
    assert.equal(emailSenderAddress(), 'Tim Hartaku <support@hartaku.web.id>')
  } finally {
    if (previousFrom === undefined) delete process.env.EMAIL_FROM
    else process.env.EMAIL_FROM = previousFrom
    if (previousDomain === undefined) delete process.env.RESEND_EMAIL_DOMAIN
    else process.env.RESEND_EMAIL_DOMAIN = previousDomain
  }
})

test('welcome email escapes profile text before rendering HTML', () => {
  const email = welcomeEmail(
    { email: 'new@example.com', name: '<script>alert(1)</script> User' },
    'https://hartaku.example'
  )

  assert.deepEqual(email.to, ['new@example.com'])
  assert.match(email.html, /&lt;script&gt;/)
  assert.doesNotMatch(email.html, /<script>/)
  assert.match(email.text, /https:\/\/hartaku\.example/)
  assert.match(email.html, />Kritik dan saran<\/a>/)
  assert.match(email.text, /Kritik dan saran:/)
  assert.ok(email.text.includes(TEAM_CONTACT_URL))
})

test('announcement email carries the new brand, greets by first name, and links to the app', () => {
  const email = announcementEmail(
    { email: 'user@example.com', name: 'Budi Santoso' },
    'https://app.example'
  )

  assert.deepEqual(email.to, ['user@example.com'])
  assert.match(email.subject, /HartakuSigma/)
  assert.match(email.html, /Halo Budi/)
  assert.match(email.html, /https:\/\/app\.example/)
  // The spreadsheet in the user's Drive keeps its original name.
  assert.match(email.text, /"Hartaku - Expense Tracker"/)
})

test('announcement email escapes the name before rendering HTML', () => {
  const email = announcementEmail(
    { email: 'user@example.com', name: '<script>alert(1)</script>' },
    'https://app.example'
  )
  assert.match(email.html, /&lt;script&gt;/)
  assert.doesNotMatch(email.html, /<script>/)
})

test('announcement email omits the app button when no url is given', () => {
  const email = announcementEmail({ email: 'user@example.com', name: 'Budi' })
  assert.doesNotMatch(email.html, /<a href/)
})

test('manual welcome email sends only the selected user with a fresh idempotency key', async () => {
  const previousKey = process.env.RESEND_API_KEY
  const previousFrom = process.env.EMAIL_FROM
  const previousFetch = globalThis.fetch
  process.env.RESEND_API_KEY = 'test-key'
  process.env.EMAIL_FROM = 'Hartaku <halo@hartaku.web.id>'
  let request
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return {
      ok: true,
      json: async () => ({ id: 'email-123' })
    }
  }

  try {
    const result = await sendWelcomeEmail(
      { sub: 'google-user-1', email: 'selected@example.com', name: 'Selected User' },
      { appUrl: 'https://hartaku.web.id', idempotencyKey: 'manual-welcome-unique' }
    )
    const body = JSON.parse(request.options.body)

    assert.equal(request.url, 'https://api.resend.com/emails')
    assert.equal(request.options.headers['Idempotency-Key'], 'manual-welcome-unique')
    assert.equal(body.from, 'Hartaku <halo@hartaku.web.id>')
    assert.deepEqual(body.to, ['selected@example.com'])
    assert.equal(result.id, 'email-123')
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY
    else process.env.RESEND_API_KEY = previousKey
    if (previousFrom === undefined) delete process.env.EMAIL_FROM
    else process.env.EMAIL_FROM = previousFrom
    globalThis.fetch = previousFetch
  }
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
    assert.equal(email.subject, 'User baru HartakuSigma: User Bcc: injected@example.com')
    assert.match(email.html, /new@example\.com/)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})
