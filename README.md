# Hartaku

Expense tracker ringan, mobile-first. Datanya disimpan di **Google Spreadsheet milik penggunanya
sendiri** — aplikasi ini tidak punya database.

- **Frontend:** Vite + React 18 + Tailwind CSS (tanpa state library, tanpa axios, tanpa icon package)
- **Backend:** 4 serverless function di `api/` — hanya untuk OAuth. Semua akses Sheets terjadi
  langsung dari browser memakai access token berumur pendek.
- **Bundle:** ~73 kB gzip.

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
  lib/       constants · dates · format · summary · id
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
| 3 | Dashboard (saldo akun, ringkasan bulan, top pengeluaran) | ✅ |
| 4 | Daftar transaksi (filter, cari, edit, hapus, bulk, paginasi) | ✅ |
| 5 | Manajer kategori | ✅ (kecuali drag & drop urutan) |
| 6 | Monthly Claude Review | ⬜ belum dikerjakan |
| 7 | Merchant learning | ❌ dibatalkan — kolom `merchant` diganti `account` |
| 8 | Settings & preferensi | ✅ (field Claude API key menyusul bersama fitur 6) |
| 9 | Mobile responsiveness | ✅ |
| — | Manajer akun + saldo per akun | ✅ tambahan di luar spec |
| — | Transaksi transfer antar akun | ✅ tambahan di luar spec |
| — | Aset / kewajiban / total kekayaan | ✅ tambahan di luar spec |
| — | Investasi emas + harga pasar + untung/rugi | ✅ tambahan di luar spec (jual emas belum) |

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
- **Akun dan kategori berbagi satu slot navigasi** (menu "Kelola", dua tab). Enam item tidak
  muat di tab bar HP tanpa memotong setiap labelnya.
- **Token disimpan di cookie httpOnly** seperti di security checklist spec, dengan tambahan PKCE
  dan pengecekan `Origin`.

## Perintah

```bash
npm run dev       # dev server + api/ di http://127.0.0.1:3000
npm run build     # build produksi ke dist/
npm run preview   # cek hasil build (tanpa api/)
```
