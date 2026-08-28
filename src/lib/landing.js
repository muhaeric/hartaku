/**
 * The public landing copy, in one place.
 *
 * Two audiences read this page and they must be told the same thing: a visitor
 * running React, and a reviewer or crawler fetching the HTML with no JavaScript
 * at all. The static version in index.html is generated from this object at
 * build time (see the landingHtmlPlugin in vite.config.js), so the two cannot
 * drift the way they did when each was written by hand.
 */
export const LANDING = {
  name: 'Hartaku',
  tagline:
    'Pencatat keuangan pribadi yang menyimpan datamu di Google Spreadsheet milikmu sendiri.',

  intro:
    'Hartaku dipakai untuk mencatat pemasukan, pengeluaran, transfer antar akun, dan investasi emas dalam satu tempat, lalu meringkasnya jadi total aset dan kewajiban. Setiap catatan keuangan ditulis langsung ke sebuah Google Spreadsheet di dalam Google Drive kamu, bukan ke database Hartaku. Datanya tetap bisa kamu buka, ubah, ekspor, atau hapus kapan saja tanpa lewat aplikasi ini.',

  features: [
    {
      icon: '📊',
      title: 'Ringkasan bulanan',
      body: 'Pemasukan, pengeluaran, dan selisihnya per bulan, dengan rincian kategori pengeluaran terbesar.'
    },
    {
      icon: '🏦',
      title: 'Banyak akun',
      body: 'Tunai, bank, e-wallet, piutang, dan utang — lengkap dengan transfer antar akun serta total aset dan kewajiban.'
    },
    {
      icon: '🥇',
      title: 'Investasi emas',
      body: 'Catat gramasi dan harga beli, lalu nilainya dihitung memakai harga buyback harian beserta untung atau ruginya.'
    },
    {
      icon: '🧾',
      title: 'Import dari screenshot',
      body: 'Bukti transfer atau daftar mutasi dibaca otomatis. Pemrosesan gambarnya berjalan di perangkatmu, gambarnya tidak diunggah ke mana pun.'
    }
  ],

  steps: [
    'Masuk dengan akun Google kamu.',
    'Hartaku membuatkan satu spreadsheet bernama "Hartaku - Expense Tracker" di Google Drive kamu.',
    'Setiap transaksi yang kamu catat ditulis ke spreadsheet itu, dan dibaca kembali dari sana.'
  ],

  /** Why each permission is requested - the question a reviewer wants answered. */
  access: [
    {
      what: 'Nama, alamat email, dan foto profil Google',
      why: 'Menampilkan siapa yang sedang masuk, menghubungkan sesi ke akun Google kamu, dan mengelola jumlah pengguna layanan.'
    },
    {
      what: 'Izin Google Drive terbatas (drive.file)',
      why: 'Membuat dan mengelola satu spreadsheet tempat catatan keuanganmu disimpan. Izin ini hanya berlaku untuk file yang dibuat aplikasi ini sendiri — file lain di Google Drive kamu tidak bisa dilihat, dibuka, maupun dihapus.'
    }
  ],

  privacyNote:
    'Hartaku tidak menyimpan catatan keuanganmu di server mana pun. Profil dasar Google dan waktu aktivitas disimpan untuk mengelola pengguna layanan; tidak ada iklan atau pelacakan lintas situs. Akses aplikasi bisa kamu cabut kapan saja lewat pengaturan izin akun Google.',

  links: [
    { href: '/privacy', label: 'Kebijakan Privasi' },
    { href: '/terms', label: 'Syarat & Ketentuan' }
  ]
}
