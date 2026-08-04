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
   - **Google Drive API** (opsional — dipakai untuk menemukan kembali spreadsheet lama kalau
     `localStorage` browser terhapus. Tanpa ini aplikasi tetap jalan, tinggal tempel ID
     spreadsheet lewat halaman Pengaturan.)
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

| id | date | merchant | amount | type | category | description | created_at | updated_at |
|----|------|----------|--------|------|----------|-------------|------------|------------|
| uuid | `YYYY-MM-DD` | teks | angka | `expense` \| `income` | nama kategori | teks | ISO | ISO |

**Sheet `Categories`**

| id | name | type | color | icon | description | sort_order |
|----|------|------|-------|------|-------------|------------|
| uuid | teks | `expense` \| `income` \| `both` | hex | emoji | teks | angka |

Baris diidentifikasi lewat kolom `id`. Sebelum setiap update/delete, nomor barisnya
diverifikasi ulang ke spreadsheet, jadi mengurutkan atau menyisipkan baris manual di Google
Sheets tidak akan membuat aplikasi menimpa baris yang salah.

Preferensi (tema, mata uang, format tanggal, default form) disimpan di `localStorage`, bukan di
spreadsheet.

## Struktur kode

```
api/
  _lib/{session,google,http}.js   enkripsi cookie, OAuth helper, guard request
  auth/{start,callback,session,logout}.js
src/
  components/{Auth,Dashboard,Transaction,Category,Settings,Layout,ui}/
  context/{Auth,Data,Settings,Toast}Context.jsx
  services/  appApi · googleApi · sheets · workbook · repository
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
| 2 | Form transaksi (validasi, autocomplete merchant) | ✅ |
| 3 | Dashboard (ringkasan, pemilih bulan, top pengeluaran) | ✅ |
| 4 | Daftar transaksi (filter, cari, edit, hapus, bulk, paginasi) | ✅ |
| 5 | Manajer kategori | ✅ (kecuali drag & drop urutan) |
| 6 | Monthly Claude Review | ⬜ belum dikerjakan |
| 7 | Merchant learning (sheet `Merchants`) | ⬜ belum — autocomplete sementara diturunkan dari riwayat transaksi |
| 8 | Settings & preferensi | ✅ (field Claude API key menyusul bersama fitur 6) |
| 9 | Mobile responsiveness | ✅ |

### Catatan penyimpangan dari spec

- **Vite, bukan create-react-app.** CRA sudah tidak dimaintain.
- **Tanpa `axios`, `react-icons`, `date-fns`.** Diganti `fetch`, SVG inline, dan util tanggal
  sendiri (~40 baris) demi bundle yang lebih kecil.
- **Token disimpan di cookie httpOnly** seperti di security checklist spec, dengan tambahan PKCE
  dan pengecekan `Origin`.

## Perintah

```bash
npm run dev       # dev server + api/ di http://127.0.0.1:3000
npm run build     # build produksi ke dist/
npm run preview   # cek hasil build (tanpa api/)
```
