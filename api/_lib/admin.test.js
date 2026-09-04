import assert from 'node:assert/strict'
import test from 'node:test'
import { adminEmails, isValidAdminPin, requireAdmin, startAdminSession } from './admin.js'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE } from './session.js'

test('admin notification recipients use a normalized comma-separated list', () => {
  const previous = process.env.ADMIN_EMAILS
  process.env.ADMIN_EMAILS = ' Owner@Example.com, second@example.com '

  try {
    assert.deepEqual(adminEmails(), ['owner@example.com', 'second@example.com'])
  } finally {
    if (previous === undefined) delete process.env.ADMIN_EMAILS
    else process.env.ADMIN_EMAILS = previous
  }
})

test('admin PIN must match the configured value exactly', () => {
  const previous = process.env.ADMIN_PIN
  process.env.ADMIN_PIN = '73918462'

  try {
    assert.equal(isValidAdminPin('73918462'), true)
    assert.equal(isValidAdminPin('73918461'), false)
    assert.equal(isValidAdminPin('7391846'), false)
    assert.equal(isValidAdminPin(''), false)
  } finally {
    if (previous === undefined) delete process.env.ADMIN_PIN
    else process.env.ADMIN_PIN = previous
  }
})

test('admin session is stored separately and expires on the server', () => {
  const previousPin = process.env.ADMIN_PIN
  process.env.SESSION_SECRET ||= 'test-session-secret-that-is-longer-than-32-characters'
  process.env.ADMIN_PIN = '73918462'

  try {
    const validResponse = mockResponse()
    startAdminSession({ headers: {} }, validResponse)
    const cookie = validResponse.headers['Set-Cookie'][0].split(';')[0]
    const validRequest = { headers: { cookie } }
    assert.equal(requireAdmin(validRequest, mockResponse()).admin, true)

    const expiredResponse = mockResponse()
    startAdminSession(
      { headers: {} },
      expiredResponse,
      Date.now() - ADMIN_SESSION_MAX_AGE * 1000 - 1
    )
    const expiredCookie = expiredResponse.headers['Set-Cookie'][0].split(';')[0]
    const rejected = mockResponse()
    assert.equal(requireAdmin({ headers: { cookie: expiredCookie } }, rejected), null)
    assert.equal(rejected.statusCode, 401)
    assert.equal(rejected.body.error, 'no_admin_session')
    assert.match(expiredCookie, new RegExp(`^${ADMIN_SESSION_COOKIE}=`))

    process.env.ADMIN_PIN = 'new-admin-pin'
    assert.equal(requireAdmin(validRequest, mockResponse()), null)
  } finally {
    if (previousPin === undefined) delete process.env.ADMIN_PIN
    else process.env.ADMIN_PIN = previousPin
  }
})

function mockResponse () {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    getHeader (name) { return this.headers[name] },
    setHeader (name, value) { this.headers[name] = value },
    status (code) { this.statusCode = code; return this },
    json (body) { this.body = body; return this }
  }
}
