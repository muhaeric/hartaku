import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminApi } from '../../services/appApi.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import { ErrorState, LoadingBlock } from '../ui/Feedback.jsx'

const DATE_TIME = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta'
})

function dateTime (value) {
  if (!value) return '—'
  return DATE_TIME.format(new Date(value))
}

function initials (name, email) {
  return String(name || email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function SummaryCard ({ label, value, hint }) {
  return (
    <Card>
      <p className="text-caption font-medium text-subtitle">{label}</p>
      <p className="amount mt-1 text-[26px] font-bold leading-8">{value ?? '—'}</p>
      <p className="mt-1 text-[11px] leading-4 text-subtitle">{hint}</p>
    </Card>
  )
}

function ActivityChart ({ daily = [] }) {
  const points = useMemo(() => {
    const byDate = new Map(daily.map((point) => [point.date, point.users]))
    return Array.from({ length: 14 }, (_, offset) => {
      const date = new Date()
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() - (13 - offset))
      const key = date.toISOString().slice(0, 10)
      return { key, label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), users: byDate.get(key) || 0 }
    })
  }, [daily])
  const max = Math.max(1, ...points.map((point) => point.users))

  return (
    <Card>
      <div>
        <h2 className="text-section-title font-semibold">User aktif 14 hari</h2>
        <p className="text-[11px] leading-4 text-subtitle">Akun unik yang membuka aplikasi per hari.</p>
      </div>
      <div className="mt-5 flex h-36 items-end gap-1.5" aria-label="Grafik user aktif harian">
        {points.map((point, index) => (
          <div key={point.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-semibold opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {point.users}
            </span>
            <div
              className="w-full min-w-1 rounded-t bg-brand/75"
              style={{ height: `${Math.max(3, (point.users / max) * 100)}%` }}
              title={`${point.label}: ${point.users} user`}
            />
            <span className={`whitespace-nowrap text-[9px] text-subtitle ${index % 3 ? 'invisible sm:visible' : ''}`}>
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function UserIdentity ({ user }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {user.picture ? (
        <img className="h-9 w-9 shrink-0 rounded-full" src={user.picture} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-caption font-bold text-brand-onsoft">
          {initials(user.name, user.email)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-body font-semibold">{user.name || 'Tanpa nama'}</span>
        <span className="block truncate text-caption text-subtitle">{user.email}</span>
      </span>
    </div>
  )
}

export default function AdminPage () {
  const { user, signOut } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await adminApi.users({ search, page }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => {
    load()
  }, [load])

  const submitSearch = (event) => {
    event.preventDefault()
    setPage(1)
    setSearch(query.trim())
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-page py-5 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-caption font-semibold text-brand">
            <span aria-hidden="true">💸</span>
            Hartaku
          </div>
          <h1 className="mt-1 text-page-title font-bold tracking-tight">Admin user</h1>
          <p className="mt-1 text-body text-subtitle">Pantau pertumbuhan dan aktivitas akun Hartaku.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="inline-flex h-9 items-center rounded-control px-3 text-caption font-semibold text-subtitle hover:bg-tint/5" to="/">
            Buka aplikasi
          </Link>
          <Button size="sm" variant="secondary" onClick={signOut}>Keluar</Button>
        </div>
      </header>

      <div className="mt-2 text-[11px] text-subtitle">Masuk sebagai {user?.email}</div>

      {loading && !data ? (
        <LoadingBlock label="Memuat data user…" />
      ) : error && !data ? (
        <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>
      ) : (
        <>
          {error && <div className="mt-5"><ErrorState message={error} onRetry={load} /></div>}

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard label="Total user" value={data?.summary?.total_users} hint="Seluruh akun Google unik" />
            <SummaryCard label="Aktif hari ini" value={data?.summary?.active_today} hint="Membuka aplikasi hari ini" />
            <SummaryCard label="Aktif 30 hari" value={data?.summary?.active_30d} hint="Monthly active users" />
            <SummaryCard label="User baru 30 hari" value={data?.summary?.new_users_30d} hint="Pertama masuk dalam 30 hari" />
          </section>

          <section className="mt-4">
            <ActivityChart daily={data?.daily} />
          </section>

          <section className="mt-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-section-title font-semibold">Daftar user</h2>
                <p className="text-[11px] leading-4 text-subtitle">{data?.pagination?.total || 0} akun ditemukan</p>
              </div>
              <form className="flex gap-2" onSubmit={submitSearch}>
                <label className="sr-only" htmlFor="admin-user-search">Cari user</label>
                <input
                  id="admin-user-search"
                  className="field w-full sm:w-64"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama atau email"
                />
                <Button size="sm" type="submit">Cari</Button>
              </form>
            </div>

            <div className={`card-flush mt-3 overflow-hidden ${loading ? 'opacity-60' : ''}`}>
              <div className="hidden grid-cols-[minmax(210px,1.4fr)_minmax(135px,1fr)_minmax(135px,1fr)_minmax(135px,1fr)_70px] gap-4 border-b border-hairline bg-tint/[0.03] px-page py-2 text-[11px] font-semibold text-subtitle md:grid">
                <span>User</span><span>Pertama masuk</span><span>Terakhir aktif</span><span>Tambah transaksi</span><span className="text-right">Login</span>
              </div>
              {data?.users?.length ? (
                <div className="divide-hairline">
                  {data.users.map((entry) => (
                    <article key={entry.id} className="grid gap-3 px-page py-3 md:grid-cols-[minmax(210px,1.4fr)_minmax(135px,1fr)_minmax(135px,1fr)_minmax(135px,1fr)_70px] md:items-center md:gap-4">
                      <UserIdentity user={entry} />
                      <dl className="grid grid-cols-2 gap-3 text-caption md:contents">
                        <div><dt className="text-[10px] text-subtitle md:hidden">Pertama masuk</dt><dd>{dateTime(entry.firstSeenAt)}</dd></div>
                        <div><dt className="text-[10px] text-subtitle md:hidden">Terakhir aktif</dt><dd>{dateTime(entry.lastSeenAt)}</dd></div>
                        <div className="col-span-2 md:col-span-1"><dt className="text-[10px] text-subtitle md:hidden">Terakhir tambah transaksi</dt><dd>{dateTime(entry.lastTransactionAt)}</dd></div>
                      </dl>
                      <div className="text-caption md:text-right">
                        <span className="text-subtitle md:hidden">Login: </span>
                        <span className="amount font-semibold">{entry.signInCount}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="px-page py-10 text-center text-body text-subtitle">Belum ada user yang cocok.</p>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="text-caption text-subtitle">Halaman {data?.pagination?.page || 1} dari {data?.pagination?.pages || 1}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Sebelumnya</Button>
                <Button size="sm" variant="secondary" disabled={page >= (data?.pagination?.pages || 1) || loading} onClick={() => setPage((value) => value + 1)}>Berikutnya</Button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
