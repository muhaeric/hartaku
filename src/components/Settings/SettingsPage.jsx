import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CURRENCIES, DATE_FORMATS, THEMES, isGlassTheme } from '../../lib/constants.js'
import { extractSpreadsheetId } from '../../lib/spreadsheetId.js'
import { sortOptions } from '../../lib/sortOptions.js'
import { fileToThemePhoto } from '../../lib/themePhoto.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { ExternalIcon, ScanIcon } from '../ui/icons.jsx'
import LocalDataSection from './LocalDataSection.jsx'

export default function SettingsPage () {
  const toast = useToast()
  const { user, signOut } = useAuth()
  const { isLocal } = useStorage()
  const { settings, updateSettings, resetSettings, resolvedTheme } = useSettings()
  const { activeCategories, activeAccounts, workbook, useSpreadsheet } = useData()

  const [sheetId, setSheetId] = useState('')
  const [switching, setSwitching] = useState(false)

  const handleSwitchSheet = async () => {
    const id = extractSpreadsheetId(sheetId)
    if (!id) {
      toast.error('ID spreadsheet tidak dikenali. Tempel ID-nya atau URL Google Sheets lengkap.')
      return
    }

    setSwitching(true)
    try {
      await useSpreadsheet(id)
      setSheetId('')
      toast.success('Spreadsheet diganti.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <>
      <Section title="Tampilan">
        <ThemePicker
          value={settings.theme}
          resolved={resolvedTheme}
          onChange={(theme) => updateSettings({ theme })}
        />

        {/* Only the glass cuts have anywhere to put a picture, so the control
            appears with them rather than sitting inert under the other six. */}
        {isGlassTheme(resolvedTheme) && <ThemePhotoField />}
        <Row label="Mata uang" htmlFor="currency">
          <Select
            id="currency"
            value={settings.currency}
            onChange={(currency) => updateSettings({ currency })}
            options={CURRENCIES.map((item) => ({ value: item.code, label: item.label }))}
          />
        </Row>
        <Row label="Format tanggal" htmlFor="date-format">
          <Select
            id="date-format"
            value={settings.dateFormat}
            onChange={(dateFormat) => updateSettings({ dateFormat })}
            options={DATE_FORMATS.map((item) => ({
              value: item.value,
              label: `${item.value} — ${item.label}`
            }))}
          />
        </Row>
      </Section>

      <Section title="Default form transaksi">
        <Row label="Jenis" htmlFor="default-type">
          <Select
            id="default-type"
            value={settings.defaultType}
            onChange={(defaultType) => updateSettings({ defaultType })}
            options={[
              { value: 'expense', label: 'Pengeluaran' },
              { value: 'income', label: 'Pemasukan' }
            ]}
          />
        </Row>
        <Row label="Akun" htmlFor="default-account">
          <Select
            id="default-account"
            value={settings.defaultAccount}
            onChange={(defaultAccount) => updateSettings({ defaultAccount })}
            options={[
              { value: '', label: 'Tidak ada' },
              ...activeAccounts.map((account) => ({ value: account.name, label: account.name }))
            ]}
          />
        </Row>
        <Row label="Kategori" htmlFor="default-category">
          <Select
            id="default-category"
            value={settings.defaultCategory}
            onChange={(defaultCategory) => updateSettings({ defaultCategory })}
            options={[
              { value: '', label: 'Tidak ada' },
              ...activeCategories.map((category) => ({
                value: category.name,
                label: category.name
              }))
            ]}
          />
        </Row>
      </Section>

      {/* One section, two very different stories about where the money is
          written down. */}
      {isLocal ? (
        <Section title="Sumber data">
          <LocalDataSection />
        </Section>
      ) : (
        <Section title="Sumber data">
          {workbook ? (
          <div className="space-y-1">
            <p className="text-body">{workbook.title}</p>
            <p className="break-all font-mono text-caption text-subtitle">
              {workbook.spreadsheetId}
            </p>
            <a
              href={workbook.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand"
            >
              <ExternalIcon className="h-4 w-4" />
              Buka di Google Sheets
            </a>
          </div>
        ) : (
          <p className="text-caption text-subtitle">
            Spreadsheet belum siap.
          </p>
        )}

        <div>
          <label className="label" htmlFor="sheet-id">
            Pakai spreadsheet lain
          </label>
          <div className="flex gap-gap">
            <input
              id="sheet-id"
              type="text"
              className="field flex-1 font-mono"
              placeholder="ID atau URL spreadsheet"
              value={sheetId}
              onChange={(event) => setSheetId(event.target.value)}
            />
            <Button onClick={handleSwitchSheet} loading={switching} disabled={!sheetId.trim()}>
              Ganti
            </Button>
          </div>
          <p className="hint">
            Pakai ini untuk membuka spreadsheet yang sama dari perangkat lain. Hanya spreadsheet
              yang dibuat aplikasi ini yang bisa dibuka — batas izin <code>drive.file</code>.
            </p>
          </div>

          {/* Only rendered when a device copy is actually still there. */}
          <LocalDataSection />
        </Section>
      )}

      <Section title="Import data">
        <Link
          to="/import/money-manager"
          className="-m-1 flex items-center gap-3 rounded-control p-1 transition hover:bg-tint/[0.04]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
            <ScanIcon className="h-[19px] w-[19px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium">Dari Money Manager</span>
            <span className="block text-caption text-subtitle">
              Baca file Excel hasil ekspornya — akun, kategori, dan transaksinya ikut terbawa
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-subtitle">
            ›
          </span>
        </Link>
      </Section>

      <Section title="Tentang">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="text-body font-medium text-brand" href="/privacy">
            Kebijakan Privasi
          </a>
          <a className="text-body font-medium text-brand" href="/terms">
            Syarat &amp; Ketentuan
          </a>
        </div>
        {!isLocal && (
          <p className="hint">
            Cabut akses aplikasi kapan saja lewat{' '}
            <a
              className="font-medium text-brand"
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
            >
              izin akun Google
            </a>
            .
          </p>
        )}
      </Section>

      {/* Without a session there is nothing to sign out of, so the section is
          about the app rather than about an account. */}
      <Section title={isLocal ? 'Aplikasi' : 'Akun'}>
        <p className="text-body text-subtitle">
          {isLocal ? 'Dipakai tanpa akun — tidak ada sesi yang tersimpan.' : user?.email}
        </p>
        <div className="flex flex-col gap-gap sm:flex-row">
          <Button
            variant="secondary"
            className="justify-center"
            onClick={() => {
              resetSettings()
              toast.success('Pengaturan dikembalikan ke default.')
            }}
          >
            Reset pengaturan
          </Button>
          {!isLocal && (
            <Button variant="danger" className="justify-center" onClick={signOut}>
              Keluar
            </Button>
          )}
        </div>
      </Section>
    </>
  )
}

function Section ({ title, children }) {
  return (
    <div className="space-y-gap-normal">
      <SectionHeader title={title} />
      <Card className="space-y-gap-normal">{children}</Card>
    </div>
  )
}

/** Label left, control right - the iOS Settings shape, and far more compact. */
function Row ({ label, htmlFor, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-body" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="w-1/2 max-w-[220px] shrink-0">{children}</div>
    </div>
  )
}

function ThemePhotoField () {
  const toast = useToast()
  const { settings, updateSettings, themePhoto, saveThemePhoto } = useSettings()
  const [busy, setBusy] = useState(false)

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    // Cleared straight away so picking the same file twice still fires.
    event.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      const encoded = await fileToThemePhoto(file)
      if (!saveThemePhoto(encoded)) {
        toast.error('Penyimpanan browser penuh, fotonya tidak bisa disimpan.')
        return
      }
      toast.success('Foto latar dipasang.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <span className="label">Foto latar</span>

      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-hairline bg-tint/[0.06]">
          {themePhoto ? (
            <img src={themePhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true" className="text-subtitle">
              🖼️
            </span>
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-wrap gap-gap">
          <label className="inline-flex">
            <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
            <span
              role="button"
              tabIndex={0}
              aria-disabled={busy}
              className="inline-flex h-9 cursor-pointer items-center rounded-control border border-hairline bg-surface px-3 text-caption font-semibold text-ink"
            >
              {busy ? 'Memproses…' : themePhoto ? 'Ganti foto' : 'Pilih foto'}
            </span>
          </label>

          {themePhoto && (
            <Button variant="ghost" size="sm" onClick={() => saveThemePhoto('')}>
              Hapus
            </Button>
          )}
        </div>
      </div>

      <p className="hint">
        Fotonya diperkecil dan disimpan di perangkat ini saja — tidak ikut ke spreadsheet.
      </p>

      <div className="mt-gap-normal">
        <label className="label" htmlFor="glass-scrim">
          Peredup foto
        </label>
        <input
          id="glass-scrim"
          type="range"
          min="0"
          max="0.85"
          step="0.05"
          value={settings.glassScrim}
          onChange={(event) => updateSettings({ glassScrim: Number(event.target.value) })}
          className="w-full accent-brand"
        />
        <p className="hint">
          Foto terlihat {Math.round((1 - settings.glassScrim) * 100)}%. Geser sesukamu — kartunya
          membawa kontrasnya sendiri, jadi angkanya tetap terbaca bahkan kalau peredupnya dimatikan
          sepenuhnya.
        </p>
      </div>
    </div>
  )
}

/**
 * Each tile carries its own `data-theme`, so the palette variables resolve
 * inside it and the preview is painted by the real theme rather than by a copy
 * of its colours kept here. 'Ikut sistem' previews whatever it currently
 * resolves to.
 */
function ThemePicker ({ value, resolved, onChange }) {
  return (
    <fieldset>
      <legend className="label">Tema</legend>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {THEMES.map((theme) => {
          const selected = theme.value === value

          return (
            <button
              key={theme.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(theme.value)}
              className={`rounded-control border p-1.5 text-left transition ${
                selected ? 'border-brand ring-2 ring-brand/30' : 'border-hairline hover:bg-tint/5'
              }`}
            >
              <span
                data-theme={theme.value === 'auto' ? resolved : theme.value}
                className="mb-1.5 block rounded-[10px] border border-hairline bg-canvas p-1.5"
              >
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-brand" />
                  <span className="h-1.5 min-w-0 flex-1 rounded-full bg-hairline" />
                </span>
                <span className="mt-1.5 flex items-center gap-1 rounded-[6px] border border-hairline bg-surface p-1.5">
                  <span className="h-1.5 w-1/3 rounded-full bg-subtitle/60" />
                  <span className="ml-auto h-1.5 w-1/4 rounded-full bg-income" />
                </span>
              </span>
              <span className="block truncate text-caption font-medium">{theme.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Every list here is offered A-Z; "Tidak ada" keeps its place at the top. */
function Select ({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="field h-9 truncate py-0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {sortOptions(options).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
