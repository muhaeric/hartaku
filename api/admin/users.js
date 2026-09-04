import { requireAdmin } from '../_lib/admin.js'
import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import { getUserDashboard } from '../_lib/users.js'

export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'ADMIN_PIN', 'DATABASE_URL'])) return
  if (!requireAdmin(req, res)) return

  try {
    const dashboard = await getUserDashboard(req.body || {})
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json(dashboard)
  } catch (error) {
    console.error('[admin/users] failed to load dashboard:', error)
    return res.status(500).json({
      error: error.code || 'user_dashboard_failed',
      message: 'Data user gagal dimuat. Periksa koneksi database lalu coba lagi.'
    })
  }
}
