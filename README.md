# Hartaku

Expense tracker ringan, mobile-first. Datanya disimpan di **Google Spreadsheet milik penggunanya
sendiri** — aplikasi ini tidak punya database.

- **Frontend:** Vite + React 18 + Tailwind CSS (tanpa state library, tanpa axios, tanpa icon package)
- **Backend:** 4 serverless function di `api/` — hanya untuk OAuth. Semua akses Sheets terjadi
  langsung dari browser memakai access token berumur pendek.
- **Bundle:** ~99 kB gzip, tanpa pustaka chart maupun pembaca spreadsheet — keduanya ditulis
  sendiri dari primitif browser.

---

## 1. Setup Google Cloud (sekali saja)

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **New Project**, beri nama
   `Hartaku`.
2. **APIs & Services → Library** → aktifkan:
   - **Google Sheets API** (wajib)
   - **Google Drive API** (wajib juga dalam praktiknya — ini satu-satunya cara aplikasi
     menemukan kembali spreadsheet yang sudah ada. ID spreadsheet disimpan di `localStorage`,
     yang terpisah per origin dan per browser, jadi tanpa Drive API setiap perangkat baru
     tidak akan menemukan data lamamu. Aplikasi menolak membuat spreadsheet baru diam-diam
     dalam keadaan itu — kamu akan disodori layar pilihan.)
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**, isi nama app + email support.
   - Scopes: tambahkan `.../auth/drive.file` (yang lain — `openid`, `email`, `profile` — sudah
     otomatis).
   - **Test users:** tambahkan alamat Gmail kamu. Selama app masih berstatus *Testing*, hanya
     akun di daftar ini yang bisa login.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins:** `http://127.0.0.1:3000` (+ URL produksi nanti)
   - **Authorized redirect URIs:** `http://127.0.0.1:3000/auth/callback`
     (+ `https://<domain-produksi>/auth/callback`)
5. Salin **Client ID** dan **Client secret**.

## 2. Jalankan lokal

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi:

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
SESSION_SECRET=<hasil perintah di bawah>
```

Generate `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Lalu:

```bash
npm run dev
```

Buka **http://127.0.0.1:3000** (bukan `localhost` — redirect URI Google harus sama persis dengan
origin yang dipakai browser).

Untuk mencoba dari HP di jaringan yang sama: `npm run dev -- --host`, lalu daftarkan juga
origin/redirect URI IP tersebut di Google Cloud.

> `npm run dev` menjalankan `api/` lewat middleware Vite dengan signature handler yang sama
> seperti di Vercel — tidak perlu `vercel dev`.

## 3. Deploy ke Vercel

```bash
npm i -g vercel
vercel
```

Lalu di dashboard Vercel → **Settings → Environment Variables**, isi `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`. Terakhir, tambahkan URL produksi ke **Authorized
JavaScript origins** dan `<url>/auth/callback` ke **Authorized redirect URIs** di Google Cloud.

> ⚠️ Repo ini publik. Jangan pernah commit `.env` atau menempelkan Client Secret di kode.

---

## Cara kerja autentikasi

```
Browser                     api/ (serverless)                Google
  |  POST /api/auth/start        |                              |
  |----------------------------->|  simpan state+PKCE           |
  |                              |  di cookie httpOnly 10 menit |
  |<-- { url } ------------------|                              |
  |  redirect ----------------------------------------------->  |
  |  <-- /auth/callback?code&state ---------------------------  |
  |  POST /api/auth/callback     |                              |
  |----------------------------->|  cek state, tukar code ----> |
  |                              |  <---- refresh + access ---- |
  |                              |  refresh token disimpan      |
  |                              |  terenkripsi (AES-256-GCM)   |
  |                              |  di cookie httpOnly 7 hari   |
  |<-- { user, accessToken } ----|                              |
  |                                                             |
  |  panggil Sheets API langsung dengan access token ---------> |
```

- **Refresh token tidak pernah sampai ke JavaScript** — hanya ada di cookie `HttpOnly`,
  `SameSite=Strict`, `Secure` (di produksi), terenkripsi dengan `SESSION_SECRET`.
- **Access token hanya di memori React**, tidak pernah masuk `localStorage`. Diperbarui otomatis
  saat mau kedaluwarsa atau saat Google membalas `401`.
- Masa berlaku sesi 7 hari dan **geser** setiap aplikasi dibuka; kalau tidak dibuka 7 hari,
  sesinya mati (`invalid_grant` → cookie dihapus, balik ke layar login).
- CSRF: semua endpoint hanya menerima `POST` dan menolak `Origin` lintas situs.
- Scope OAuth cuma `drive.file` — aplikasi **hanya bisa melihat file yang dibuatnya sendiri**,
  bukan seluruh isi Google Drive.

## Struktur spreadsheet

Dibuat otomatis saat login pertama, dengan nama `Hartaku - Expense Tracker`.

**Sheet `Transactions`**

| id | date | account | amount | type | category | description | created_at | updated_at | to_account |
|----|------|---------|--------|------|----------|-------------|------------|------------|------------|
| uuid | `YYYY-MM-DD` | nama akun | angka | `expense` \| `income` \| `transfer` | nama kategori | teks | ISO | ISO | nama akun tujuan |

`to_account` hanya terisi pada baris `transfer`; `category` justru selalu kosong di baris
transfer. Satu transfer = satu baris, bukan dua baris double-entry.

**Sheet `Categories`**

| id | name | type | color | icon | description | sort_order |
|----|------|------|-------|------|-------------|------------|
| uuid | teks | `expense` \| `income` \| `both` | hex | emoji | teks | angka |

**Sheet `Accounts`**

| id | name | kind | color | icon | opening_balance | description | sort_order |
|----|------|------|-------|------|-----------------|-------------|------------|
| uuid | teks | `cash` \| `bank` \| `ewallet` \| `receivable` \| `debt` \| `other` | hex | emoji | angka | teks | angka |

**Sheet `Gold`** — satu baris per pembelian emas

| id | date | grams | cost | price_per_gram | from_account | description | created_at | updated_at |
|----|------|-------|------|----------------|--------------|-------------|------------|------------|
| uuid | `YYYY-MM-DD` | angka | angka | angka (turunan) | nama akun (opsional) | teks | ISO | ISO |

`price_per_gram` disimpan supaya spreadsheet enak dibaca, tapi aplikasi selalu menghitung
ulang dari `cost / grams` — sheet ini bisa diedit tangan.

**Sheet `Budgets`** — satu batas pengeluaran per kategori per bulan

| id | month | category | amount | created_at | updated_at |
|----|-------|----------|--------|------------|------------|
| uuid | `YYYY-MM` | nama kategori | angka | ISO | ISO |

Realisasi tidak disimpan: aplikasi menjumlahkan transaksi `expense` pada bulan dan kategori
yang sama. Pemasukan dan transfer tidak mengurangi anggaran. Pengeluaran pada kategori yang
belum punya batas tetap dilaporkan sebagai pengeluaran belum dianggarkan.

Saldo akun dihitung di aplikasi, tidak disimpan: `opening_balance` + pemasukan − pengeluaran
− transfer keluar + transfer masuk − pembelian emas yang didanai akun itu. Boleh minus
(utang, atau akun yang kelebihan pakai).

**Aset vs kewajiban** dipisah berdasarkan tanda saldo, bukan jenis akun: saldo ≥ 0 masuk aset,
saldo negatif masuk kewajiban. Dompet yang kebobolan tetap terhitung kewajiban apa pun
labelnya, dan akun utang yang sudah lunas tidak. Total = aset − kewajiban.

Baris diidentifikasi lewat kolom `id`. Sebelum setiap update/delete, nomor barisnya
diverifikasi ulang ke spreadsheet, jadi mengurutkan atau menyisipkan baris manual di Google
Sheets tidak akan membuat aplikasi menimpa baris yang salah.

Transaksi menyimpan **nama** akun dan kategori, bukan id-nya, supaya spreadsheet tetap enak
dibaca manusia. Konsekuensinya, mengganti nama akun/kategori lewat aplikasi ikut memperbarui
seluruh transaksi lama dalam satu batched write. Mengganti namanya langsung di Google Sheets
tidak — lakukan lewat aplikasi.

Preferensi (tema, mata uang, format tanggal, default form) disimpan di `localStorage`, bukan di
spreadsheet.

## Grafik di beranda

Dua grafik, keduanya SVG tulisan tangan — tidak ada pustaka chart, dan tidak akan ada.

**Pengeluaran terbesar: donat.** Bagian-dari-keseluruhan untuk sekali lihat. Lima kategori
teratas digambar, sisanya dilipat jadi satu irisan "Lainnya" — lewat enam segmen, busurnya
terlalu tipis untuk dibandingkan dan warnanya mulai berulang. Antar-irisan dipisah **celah
2px berwarna kartu**, bukan garis tepi, jadi dua kategori yang kebetulan berwarna sama tetap
terbaca sebagai dua. Di bawahnya tiap irisan didaftar lengkap dengan **persentase dan
nominalnya**, karena tidak boleh ada angka yang cuma bisa didapat dengan hover: cincinnya untuk
sekilas, daftarnya untuk jawaban. Menyorot satu baris meredupkan irisan lain dan memindahkan
detailnya ke tengah cincin.

**Pertumbuhan aset: garis, per minggu/bulan/tahun.** Satu seri, jadi tanpa legenda — judulnya
sudah menyebut apa yang digambar. Skalanya **tidak dimulai dari nol** (grafik kekayaan yang
dipaksa mulai dari nol adalah garis datar), dan justru karena itu yang digambar garis, bukan
area terisi: isian dari dasar yang bukan nol terbaca sebagai jumlah padahal cuma bentuk. Bisa
disentuh, digeser, dan ditelusuri dengan tombol panah; tombol "Lihat angkanya" membuka daftar
angka mentahnya.

Riwayatnya dihitung dengan aturan yang sama persis dengan saldo akun, jadi titik terakhirnya
mendarat di angka besar yang ada di atasnya — dengan satu pengecualian yang disengaja: **emas
dihitung sebesar modalnya**, bukan harga buyback hari ini. Menerapkan harga hari ini ke gram
yang dipegang Maret lalu akan mengarang pertumbuhan yang tidak pernah terjadi. Jadi kalau ada
emas, garisnya berakhir di bawah angka besar persis sebesar keuntungan yang belum direalisasi —
dan grafiknya mengatakan itu, bukan mendiamkannya.

## Investasi emas & harga pasar

Harga emas diambil dari [logam-mulia-api](https://github.com/iamutaki/logam-mulia-api)
(gratis, sumber `anekalogam`) lewat endpoint sendiri `GET /api/gold-price`. Diproksi, tidak
dipanggil langsung dari browser, karena dua alasan: API pihak ketiga tidak mengizinkan CORS,
dan lewat proxy responsnya bisa di-cache sekali untuk semua pengunjung (30 menit; harga emas
cuma berubah sekali sehari).

**Penilaian memakai harga buyback, bukan harga jual dealer.** Buyback adalah uang yang
benar-benar kamu terima kalau emasnya dijual hari ini; harga jual dealer sekitar 3% lebih
tinggi dan akan melebih-lebihkan profit. Keduanya tetap ditampilkan.

Dua kehati-hatian terhadap kualitas data feed-nya:

- Harga buyback per gram diambil dari **median** `buybackPrice / weight` seluruh baris ≥1gr,
  bukan dari satu baris, supaya satu baris rusak tidak menggeser hasilnya. Batangan di bawah
  1 gram dibuang — spread-nya jauh lebih lebar.
- Feed-nya memuat baris batangan besar yang `weight`-nya salah tulis jadi `1` (batangan 100
  gram dikutip per gram). Untuk harga beli 1 gram dipilih baris 1gr dengan `sellPrice`
  **tertinggi**, karena eceran 1 gram selalu paling mahal per gramnya.

Kalau feed-nya mati, kutipan terakhir yang berhasil dipakai dari `localStorage` dan diberi
label "harga tersimpan, gagal memperbarui" — angka basi tidak pernah disajikan seolah harga
hari ini.

Yang **belum** ada: pencatatan penjualan emas. Saat ini hanya pembelian, jadi total gram tidak
bisa berkurang.

## Import dari screenshot (OCR)

**Tambah → Import dari screenshot**, ambil dari kamera atau galeri. Bisa bukti transfer tunggal
maupun **daftar mutasi berisi banyak transaksi** — semuanya dibaca, ditampilkan sebagai daftar
bercentang, dan bisa diperbaiki satu per satu sebelum disimpan sekaligus dalam satu penulisan.

**Akun dipilih di awal, sebelum gambarnya diproses.** Satu screenshot selalu berasal dari satu
akun, jadi menanyakannya sekali lebih cepat daripada mengulang pilihan di tiap baris — dan
membuat OCR-nya tidak perlu menebak ini bank apa sama sekali.

**Kategori disarankan otomatis secara lokal dan tetap bisa dikoreksi.** Prioritas pertama adalah
merchant yang pernah dicatat pengguna; jika belum ada, nama merchant dicocokkan secara
konservatif dengan nama/deskripsi kategori (misalnya PLN → Utilities). Prediksi yang lemah tidak
dipaksakan dan kembali ke kategori default atau pilihan manual. Gambar maupun riwayat transaksi
tidak dikirim ke layanan AI.

OCR-nya **Tesseract.js, berjalan di perangkat** — tanpa API key, tanpa biaya per-scan, dan gambar
tidak pernah dikirim ke mana pun. Modelnya (bahasa Indonesia) diunduh saat pertama dipakai,
jadi scan pertama terasa lambat; berikutnya cepat. Modul `src/services/ocr.js` sengaja hanya
mengembalikan `{ text, confidence }`, jadi mengganti mesinnya dengan model vision berbayar nanti
cukup menyentuh satu file.

Parser-nya (`src/lib/receiptParser.js`) tidak dibuat per-bank. Ia mengunci pada label yang sama
dipakai hampir semua aplikasi bank/e-wallet Indonesia ("Nominal", "Ke", "Saldo", "No. Ref"),
sehingga bank yang tidak pernah diantisipasi pun tetap terbaca. Dua kehati-hatian yang lahir dari
pengujian:

- Label sering berada di baris terpisah dari nilainya ("Nominal" di atas, "Rp 250.000" di
  bawahnya) — baris sebelumnya ikut diperiksa.
- Tanggal, jam, dan nomor rekening juga berupa angka panjang. Semuanya dibuang sebelum
  pencarian nominal, dan deretan 10+ digit tanpa tanda "Rp" ditolak.

Struk atau mutasi ditentukan **dari datanya**, bukan dari pilihan pengguna: struk hanya punya
satu nominal transaksi (baris biaya dan saldonya dikenali lalu disisihkan), mutasi punya banyak.
Pada mutasi, tanggal biasanya dicetak sekali sebagai heading grup, jadi tanggal terakhir yang
terlihat diturunkan ke baris-baris di bawahnya.

Skor keyakinan menggabungkan seberapa jernih gambar terbaca dengan seberapa banyak kolom yang
berhasil dipahami — scan tajam yang tidak bisa ditafsirkan bukan hasil yang meyakinkan.

## Import dari Money Manager

**Pengaturan → Import data → Dari Money Manager**, pilih file Excel hasil ekspornya. Akun,
kategori, dan seluruh transaksinya ikut terbawa dalam satu jalan.

**File-nya dibaca di perangkat, tanpa dependensi baru.** `lib/xlsx.js` (~250 baris) membaca
daftar isi arsip zip-nya sendiri lalu menyerahkan pembongkarannya ke `DecompressionStream`
milik browser, dan XML-nya ke `DOMParser`. Pustaka spreadsheet siap pakai berukuran beberapa
kali lipat seluruh aplikasi ini, sementara yang dibutuhkan cuma "berikan isi selnya". Satu-satunya
pertanyaan gaya yang diajukan ke sebuah sel adalah apakah dia tanggal — karena tanggal di
spreadsheet hanyalah angka sampai ada format yang mengatakan sebaliknya.

Pemetaannya (`lib/moneyManager.js`) mengenali kolom **dari nama headernya**, bukan posisinya:
urutan kolom di ekspor Money Manager berubah mengikuti bahasa aplikasinya dan ada-tidaknya mata
uang kedua. Empat kehati-hatian yang lahir dari file ekspor sungguhan:

- **Satu transfer tercatat dua kali** di sana — sebagai `Transfer-In` di akun penerima dan
  `Transfer-Out` di akun pengirim. Pasangannya dicocokkan lalu satu dibuang. Pencocokannya
  dihitung, bukan ditandai, jadi tiga transfer identik di hari yang sama tetap masuk tiga.
  Kaki yang tidak menemukan pasangan **tetap diimpor** — ekspor sepotong boleh kehilangan
  duplikat, tidak boleh kehilangan transaksi.
- **Kolom nominal yang dipakai adalah kolom berjudul kode mata uang** (`IDR`), bukan `Amount`.
  Untuk pengguna multi-mata-uang, `Amount` berisi angka dalam mata uang akunnya sedangkan kolom
  kode berisi angka yang sudah dikonversi — dan aplikasi ini hanya mengenal satu mata uang.
  Kalau ketemu baris mata uang lain, itu diberitahukan, bukan didiamkan.
- **Money Manager membolehkan "Utang mba tari" dan "Utang mba Tari" hidup berdampingan.** Ejaan
  disatukan sebelum apa pun dijalankan, supaya kedua kaki transfer masih bisa dipasangkan dan
  tidak ada baris yang menunjuk ke akun yang tidak akan pernah dibuat.
- **Jenis akun ditebak dari namanya, lalu ditampilkan untuk dikoreksi.** Nama adalah satu-satunya
  petunjuk yang dibawa file-nya; "Mandiri kredit" itu kartu, bukan rekening bank, dan "Piutang"
  bukan "Utang".

Sebelum menulis apa pun, layarnya menunjukkan berapa transaksi yang akan masuk, akun dan kategori
apa saja yang akan dibuat, dan **berapa baris yang dilewati karena sudah ada**. Duplikat dikenali
dari tanggal + jenis + nominal + akun + kategori + keterangan yang sama persis, dan dihitung
sebagai multiset — jadi mengimpor file yang sama dua kali tidak menggandakan apa pun, tapi dua
kopi identik di hari yang sama tetap dua transaksi.

Penulisannya dipecah 400 baris per permintaan. Satu permintaan berisi tiga ribu baris juga satu
permintaan yang bisa hilang; kalau gagal di tengah, yang sudah masuk disebutkan apa adanya dan
file yang sama bisa diimpor ulang — sisanya saja yang tertulis.

Saldo awal akun baru diisi 0. Money Manager tidak mengekspor saldo awal, dan menebaknya dari
selisih akan membuat angkanya terlihat pasti padahal karangan.

## Cache lokal

Isi spreadsheet disalin ke `localStorage` setiap kali berubah, dan dipakai untuk menggambar
layar begitu aplikasi dibuka — tidak ada skeleton selama menunggu Sheets. Refresh tetap jalan di
latar dan menimpa isinya; cache ini kenyamanan tampilan, bukan sumber kebenaran.

Kalau refresh gagal padahal data lama sudah tampil, datanya **dibiarkan** dan tombol muat ulang
diberi titik oranye. Mengosongkan layar yang sedang berfungsi hanya karena satu permintaan gagal
tidak menolong siapa pun.

Cache dihapus saat keluar akun dan saat berganti spreadsheet. Batas 2MB; di atas itu cache
dibuang, karena error kuota akan ikut merusak penyimpanan pengaturan.

## Desain

Design system-nya ada di `tailwind.config.js` dan `src/styles/index.css`, bukan tersebar di
komponen:

- **Spasi** 8pt — 16 (padding halaman & kartu), 8, 12, 20 (antar seksi)
- **Radius** kartu 16, kontrol 14, bottom sheet 24
- **Warna** `#f6f7fb` kanvas, `#ffffff` kartu, `#e7eaf0` garis, `#4361ee` primer, `#6b7280`
  subjudul — masing-masing punya padanan mode gelap
- **Tipografi** 30 judul halaman / 20 judul seksi / 17 judul kartu / 15 body / 13 caption

Nominal memakai kelas `.amount` (`whitespace-nowrap` + `tabular-nums`) supaya tidak pernah wrap
dan lebarnya tidak bergoyang saat angkanya berubah. Kolom trailing pada baris daftar tidak boleh
menyusut — judulnya yang mengalah lebih dulu.

**Nominal seukuran judul barisnya, bobot medium — bukan semibold.** Mengikuti pola aplikasi
money manager: nama akun dan saldonya sama besar, jadi keduanya terbaca sebagai satu baris,
bukan sebagai angka yang menempel di label. Yang dihilangkan cuma tebalnya. Angka rupiah sudah
jadi elemen terlebar di barisnya karena diset dengan tabular figures, yang memberi tiap digit
lebar `0`; menebalkannya juga membuat kolom nominal berteriak mengalahkan hal yang seharusnya
ia jelaskan.

**Semua isi daftar 13px; yang membedakan peringkat adalah pita dan bobotnya, bukan ukurannya.**
Judul grup 13px semibold di atas pita abu tipis, barisnya 13px medium, baris keduanya 11px.
Peringkat sebuah baris datang dari pita di atasnya, **bukan** dari mengecilkan barisnya, jadi
daftar akun tidak berubah ukuran tergantung ia mendarat di layar yang mana. Tinggi baris 49px,
masih di atas batas sentuh 44px.

Dua percobaan yang dibuang sebelum sampai ke sini, keduanya karena mencoba memakai *ukuran*
untuk menyatakan peringkat:

- Judul grup 16px lalu 15px semibold di atas baris 13px — kepalanya jadi berteriak
  mengalahkan angka yang justru ia perkenalkan.
- Baris beranda dikecilkan jadi 10px supaya subtotalnya menonjol — langsung terlalu kecil untuk
  angka yang paling sering dibaca, dan membuat daftar akun yang sama tampil dua ukuran berbeda
  di dua layar.

Pita menyelesaikan keduanya sekaligus, dan sebagai bonus membuat kartu akun berbentuk sama
persis dengan header hari di halaman transaksi.

Nominal di baris transaksi tetap 13px, satu tingkat di bawah keterangannya — di sana angkanya
dipindai turun sebagai kolom, bukan dibaca berpasangan dengan judulnya, dan barisnya sudah
memuat tiga kolom.

Satu bentuk baris (`ListRow`) dipakai akun, kategori, dan emas. Aksi edit/hapus ada di menu
kebab, bukan tombol yang selalu tampil.

Menu kebab itu dirender ke `document.body`, bukan di sebelah tombolnya. Kartu daftarnya
memangkas isinya supaya latar baris tidak bocor melewati sudut membulat kartu, dan pemangkasan
yang sama dulu menelan menu ini bulat-bulat di baris paling bawah — yang di daftar berisi satu
baris berarti menunya tidak pernah muncul sama sekali.

Menunya membalik ke atas kalau ruang di bawah tombol tidak cukup, dan **batas bawah yang dipakai
adalah tepi atas tab bar, bukan `window.innerHeight`**. Viewport tetap berjalan terus di bawah
bar itu, jadi menu yang diukur terhadap tinggi penuh dengan senang hati menempatkan dirinya di
kolongnya — persis yang terjadi pada baris-baris bawah daftar akun. Tab bar menandai dirinya
(`data-bottom-bar`) supaya menu bisa menanyakannya; saat bar itu disembunyikan di `lg` ke atas,
ia terukur nol dan tinggi penuh kembali jadi jawaban yang benar.

Menu juga menutup sendiri saat halaman digulir atau ukurannya berubah: posisinya diukur sekali
saat dibuka, jadi apa pun yang bisa menggeser tombolnya lebih baik menutup menu daripada
membiarkannya melayang jauh dari tombol pemiliknya.

**Di daftar akun beranda, jenis akun dan subtotalnya duduk di pita**, sementara nama akun dan
saldonya ada di barisnya: "berapa uangku di bank" jauh lebih sering ditanyakan daripada "berapa
di rekening yang satu ini". Label jenis di tiap baris ikut dihapus — pitanya sudah
mengatakannya.

**Bulan dipilih dengan panah ‹ ›, bukan dropdown.** Gerakan yang benar-benar dilakukan orang
adalah "mundur satu bulan", dan itu harusnya satu ketukan, bukan tiga plus memindai 16 pilihan.
Labelnya sendiri masih `<select>` yang tembus pandang di atas teks, jadi lompat setahun ke
belakang tetap bisa tanpa kontrol kedua. Ditulis singkat ("Agu 2026") supaya "September" tidak
pernah terpotong di antara kedua panah.

**Filter akun bertahan saat berpindah halaman.** Kalau daftar sedang difilter ke satu akun,
form transaksi baru membuka akun itu juga — orang yang menyaring ke satu akun hampir selalu
sedang mau mencatat transaksi lain di akun yang sama. Nilainya disimpan di `localStorage`
(`lib/lastAccount.js`), bukan di pengaturan: ini jejak aktivitas, bukan preferensi. Akun yang
sudah dihapus dilupakan begitu daftar akun termuat, supaya tidak ada layar kosong tanpa sebab.

**Halaman transaksi punya bentuk barisnya sendiri**, mengikuti pola aplikasi money manager:
transaksi dikelompokkan per tanggal, dengan header hari berisi nomor tanggal, nama hari, dan
total masuk/keluar hari itu. Barisnya tiga kolom — kategori (lebar tetap, supaya mata bisa
memindai lurus ke bawah), keterangan + akun, lalu nominal. Kolom nominal tidak pernah menyusut;
keterangannya yang mengalah duluan.

Nominalnya diberi tanda − / + selain warna. Di aplikasi rujukan arah uang hanya dibedakan warna,
dan itu satu-satunya penanda — tidak terbaca oleh yang buta warna.

**Transfer netral lintas akun, tapi tidak saat dilihat dari satu akun.** Tanpa filter akun,
transfer cuma memindahkan uang dari kantong ke kantong, jadi ia dihitung jumlahnya tapi tidak
pernah ditambahkan ke Masuk maupun Keluar. Begitu daftarnya disaring ke satu akun, itu berhenti
benar: dari tempat akun itu berdiri, transfer keluar adalah uang yang benar-benar pergi dan
transfer masuk adalah uang yang benar-benar datang. Mengecualikan keduanya membuat "Selisih"
tidak bisa dicocokkan dengan saldo akun yang sama yang ditampilkan di layar lain.

Jadi `summarize` dan `groupByDay` menerima cakupan akun, dan barisnya ikut: transfer yang biasanya
tanpa tanda muncul sebagai − atau + ketika dilihat dari salah satu ujungnya. Kalau ringkasannya
menghitung sesuatu, barisnya harus mengatakan hal yang sama — kolom yang tidak terlihat menjumlah
di depan mata pembacanya adalah kolom yang tidak dipercaya. Diuji: dengan filter akun, Selisih
cocok persis dengan saldo akunnya; tanpa filter, angkanya tidak berubah sama sekali.

Ketuk baris untuk mengubah. Mode **Pilih** memunculkan kotak centang dan satu baris aksi yang
menempel di bawah layar: **pindah ke akun lain, salin, hapus** — ditempel di bawah karena pada
daftar sepanjang ini, aksi yang duduk di header sudah tergulung jauh dari baris yang barusan
dicentang. "Pilih semua" mencakup seluruh transaksi yang lolos filter, bukan cuma halaman yang
sedang tampil.

**Pindah** mengubah akun tempat transaksi tercatat — pada transfer, itu akun asalnya. Transfer
yang tujuannya sudah akun tersebut dilewati (kedua ujungnya akan jadi akun yang sama, dan itu
bukan transfer lagi), lalu jumlah yang benar-benar pindah itulah yang dilaporkan — bukan jumlah
yang diminta. Penulisannya menyentuh sel akun dan `updated_at` saja lewat satu batched write,
bukan menimpa seluruh baris: menulis ulang satu baris utuh mengandaikan semua kolom lain masih
mutakhir, dan setelah seleksi massal itu belum tentu benar.

**Salin** menggandakan persis — tanggal, akun, kategori, nominal, keterangan — dengan `id` dan
`created_at` baru. Sengaja tidak mewarisi `created_at` aslinya: salinannya dibuat sekarang, dan
memberinya stempel waktu yang lama justru menguburkannya tepat di sebelah baris yang disalin.

Tab Calendar/Monthly/Summary/Description di aplikasi rujukan belum dibuat — yang ada baru
tampilan harian.

## PWA

`manifest.webmanifest` + ikon 192/512/maskable, `display: standalone`, dan `theme-color` terpisah
untuk mode terang dan gelap. Bisa di-install dari Chrome Android dan Safari iOS.

Belum ada service worker, jadi **belum bisa dipakai offline** — aplikasi ini memang selalu butuh
jaringan untuk membaca dan menulis Google Sheets.

## Struktur kode

```
api/
  _lib/{session,google,http}.js   enkripsi cookie, OAuth helper, guard request
  auth/{start,callback,session,logout}.js
  gold-price.js                   proxy + normalisasi feed harga emas
src/
  components/{Auth,Dashboard,Transaction,Account,Gold,Category,Manage,Settings,Layout,ui}/
  context/{Auth,Data,Settings,Toast}Context.jsx
  hooks/     useGoldPrice · useLocalStorage
  services/  appApi · googleApi · sheets · workbook · repository · goldPrice
  lib/       constants · dates · format · summary · id · lastAccount
             xlsx · moneyManager   pembaca .xlsx + pemetaan ekspor Money Manager
```

`services/` berlapis dari bawah ke atas: `googleApi` (fetch + token) → `sheets` (REST Sheets/Drive)
→ `workbook` (bootstrap spreadsheet) → `repository` (CRUD domain).

---

## Status fitur

Mengacu ke spesifikasi MVP:

| # | Fitur | Status |
|---|-------|--------|
| 1 | Autentikasi Google | ✅ |
| 2 | Form transaksi (validasi inline) | ✅ |
| 3 | Dashboard (saldo akun, ringkasan bulan, top pengeluaran) | ✅ donat kategori + riwayat pertumbuhan aset |
| 4 | Daftar transaksi (filter, cari, edit, hapus, bulk, paginasi) | ✅ panah ‹ › antar bulan; bulk pindah akun / salin / hapus |
| 5 | Manajer kategori | ✅ (kecuali drag & drop urutan) |
| 6 | Monthly Claude Review | ⬜ belum dikerjakan |
| 7 | Merchant learning | ❌ dibatalkan — kolom `merchant` diganti `account` |
| 8 | Settings & preferensi | ✅ (field Claude API key menyusul bersama fitur 6) |
| 9 | Mobile responsiveness | ✅ |
| — | Manajer akun + saldo per akun | ✅ tambahan di luar spec |
| — | Transaksi transfer antar akun | ✅ tambahan di luar spec |
| — | Aset / kewajiban / total kekayaan | ✅ tambahan di luar spec |
| — | Investasi emas + harga pasar + untung/rugi | ✅ tambahan di luar spec (jual emas belum) |
| — | Anggaran bulanan per kategori + realisasi | ✅ termasuk salin dari bulan lalu |
| — | Import transaksi dari screenshot (OCR) | ✅ termasuk mutasi berisi banyak transaksi |
| — | Import dari Money Manager (.xlsx) | ✅ akun, kategori, transaksi, transfer, deteksi duplikat |
| — | Cache lokal agar buka aplikasi instan | ✅ |
| — | PWA installable | ✅ tanpa service worker / offline |

### Migrasi skema (kolom `merchant` → `account`)

Spreadsheet yang dibuat sebelum akun diperkenalkan akan menyesuaikan sendiri saat dibuka:
sheet `Accounts` ditambahkan dan diisi tiga akun default, header kolom C berubah dari
`merchant` menjadi `account`, dan kolom `to_account` ditambahkan di ujung kanan.

Yang **tidak** otomatis: isi kolom C. Baris lama masih berisi nama merchant (misal
`Indomaret`), yang sekarang dibaca sebagai nama akun. Transaksi itu tetap terhitung di
pemasukan/pengeluaran bulanan, tapi tidak masuk ke saldo akun mana pun karena namanya tidak
cocok dengan akun yang ada. Perbaiki dengan mengedit transaksinya lewat aplikasi dan memilih
akun yang benar — nama merchant-nya bisa dipindah ke kolom Keterangan.

### Catatan penyimpangan dari spec

- **Vite, bukan create-react-app.** CRA sudah tidak dimaintain.
- **Tanpa `axios`, `react-icons`, `date-fns`.** Diganti `fetch`, SVG inline, dan util tanggal
  sendiri (~40 baris) demi bundle yang lebih kecil.
- **Field `merchant` diganti dropdown `account`**, plus jenis transaksi ketiga: transfer antar
  akun. Nama merchant kini ditulis di kolom Keterangan.
- **Akun, kategori, emas, tag, dan anggaran berbagi satu slot navigasi** (menu "Kelola"). Enam item tidak
  muat di tab bar HP tanpa memotong setiap labelnya.
- **Token disimpan di cookie httpOnly** seperti di security checklist spec, dengan tambahan PKCE
  dan pengecekan `Origin`.

## Perintah

```bash
npm run dev       # dev server + api/ di http://127.0.0.1:3000
npm run build     # build produksi ke dist/
npm run preview   # cek hasil build (tanpa api/)
```
