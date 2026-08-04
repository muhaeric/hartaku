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
  '/add': 'Tambah Transaksi',
  '/manage': 'Akun & Kategori',
  '/settings': 'Pengaturan'
}
