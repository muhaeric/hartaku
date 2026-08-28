import { HomeIcon, ListIcon, PlusIcon, SettingsIcon, TagIcon } from '../ui/icons.jsx'

export const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: HomeIcon, end: true },
  { to: '/transactions', label: 'Transaksi', icon: ListIcon },
  { to: '/add', label: 'Tambah', icon: PlusIcon, highlight: true },
  { to: '/manage', label: 'Kelola', icon: TagIcon },
  { to: '/settings', label: 'Pengaturan', icon: SettingsIcon }
]

export const PAGE_TITLES = {
  '/': 'Beranda',
  '/transactions': 'Transaksi',
  '/add': 'Tambah',
  '/import': 'Import',
  '/import/money-manager': 'Import Money Manager',
  '/manage': 'Akun & Kategori',
  '/snapshot': 'Ringkasan',
  '/settings': 'Pengaturan'
}

/**
 * The bar's title for a path. A category detail page is titled by the category
 * itself - the name is the whole subject of the screen, and a fixed "Kategori"
 * would say less than the heading already on the page.
 */
export function pageTitle (pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]

  const category = pathname.match(/^\/categories\/(.+)$/)
  if (category) {
    try {
      return decodeURIComponent(category[1])
    } catch {
      return category[1]
    }
  }

  return 'Hartaku'
}
