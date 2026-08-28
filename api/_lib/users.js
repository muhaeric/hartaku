import { neon } from '@neondatabase/serverless'

let sqlClient = null
let schemaReady = null

function database () {
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL belum dikonfigurasi.')
    error.code = 'user_registry_not_configured'
    throw error
  }

  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL)
  return sqlClient
}

async function ensureSchema () {
  if (schemaReady) return schemaReady

  const sql = database()
  schemaReady = (async () => {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        google_sub TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        picture_url TEXT,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sign_in_count INTEGER NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0
      )
    `)
    await sql.query(`
      CREATE TABLE IF NOT EXISTS app_user_daily_activity (
        google_sub TEXT NOT NULL REFERENCES app_users(google_sub) ON DELETE CASCADE,
        activity_date DATE NOT NULL,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        event_count INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (google_sub, activity_date)
      )
    `)
    await sql.query(`
      CREATE INDEX IF NOT EXISTS app_users_last_seen_idx
      ON app_users (last_seen_at DESC)
    `)
    await sql.query(`
      CREATE INDEX IF NOT EXISTS app_user_activity_date_idx
      ON app_user_daily_activity (activity_date DESC)
    `)
  })().catch((error) => {
    schemaReady = null
    throw error
  })

  return schemaReady
}

/**
 * Records identity and activity without ever touching the user's finance data.
 * Authentication must remain available during a database outage, so callers
 * use the safe wrapper below.
 */
export async function recordUser (user, event = 'session') {
  if (!user?.sub || !user?.email) return

  await ensureSchema()
  const sql = database()
  const signInIncrement = event === 'sign_in' ? 1 : 0
  const sessionIncrement = event === 'session' ? 1 : 0

  await sql.query(
    `
      INSERT INTO app_users (
        google_sub, email, name, picture_url, sign_in_count, session_count
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (google_sub) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        picture_url = EXCLUDED.picture_url,
        last_seen_at = NOW(),
        sign_in_count = app_users.sign_in_count + EXCLUDED.sign_in_count,
        session_count = app_users.session_count + EXCLUDED.session_count
    `,
    [
      user.sub,
      user.email,
      user.name || user.email,
      user.picture || null,
      signInIncrement,
      sessionIncrement
    ]
  )

  await sql.query(
    `
      INSERT INTO app_user_daily_activity (google_sub, activity_date)
      VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE)
      ON CONFLICT (google_sub, activity_date) DO UPDATE SET
        last_seen_at = NOW(),
        event_count = app_user_daily_activity.event_count + 1
    `,
    [user.sub]
  )
}

export async function recordUserSafely (user, event) {
  if (!process.env.DATABASE_URL) return

  try {
    await recordUser(user, event)
  } catch (error) {
    // User tracking is operational metadata, never a reason to lock someone
    // out of their own spreadsheet during a temporary database outage.
    console.error('[user-registry] failed to record user:', error)
  }
}

export async function getUserDashboard ({ search = '', page = 1, limit = 25 } = {}) {
  await ensureSchema()
  const sql = database()
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25))
  const offset = (safePage - 1) * safeLimit
  const term = String(search || '').trim()
  const pattern = `%${term}%`

  const [summaryRows, dailyRows, countRows, userRows] = await Promise.all([
    sql.query(`
      SELECT
        (SELECT COUNT(*)::INT FROM app_users) AS total_users,
        (SELECT COUNT(*)::INT FROM app_users WHERE first_seen_at >= NOW() - INTERVAL '30 days') AS new_users_30d,
        (SELECT COUNT(DISTINCT google_sub)::INT FROM app_user_daily_activity WHERE activity_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE) AS active_today,
        (SELECT COUNT(DISTINCT google_sub)::INT FROM app_user_daily_activity WHERE activity_date >= (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - 29) AS active_30d
    `),
    sql.query(`
      SELECT activity_date::TEXT AS date, COUNT(DISTINCT google_sub)::INT AS users
      FROM app_user_daily_activity
      WHERE activity_date >= (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE - 13
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `),
    sql.query(
      `
        SELECT COUNT(*)::INT AS count
        FROM app_users
        WHERE $1 = '' OR email ILIKE $2 OR COALESCE(name, '') ILIKE $2
      `,
      [term, pattern]
    ),
    sql.query(
      `
        SELECT
          google_sub, email, name, picture_url,
          first_seen_at, last_seen_at, sign_in_count, session_count
        FROM app_users
        WHERE $1 = '' OR email ILIKE $2 OR COALESCE(name, '') ILIKE $2
        ORDER BY last_seen_at DESC
        LIMIT $3 OFFSET $4
      `,
      [term, pattern, safeLimit, offset]
    )
  ])

  const total = countRows[0]?.count || 0
  return {
    summary: summaryRows[0],
    daily: dailyRows,
    users: userRows.map((user) => ({
      id: user.google_sub,
      email: user.email,
      name: user.name,
      picture: user.picture_url,
      firstSeenAt: user.first_seen_at,
      lastSeenAt: user.last_seen_at,
      signInCount: user.sign_in_count,
      sessionCount: user.session_count
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit))
    }
  }
}
