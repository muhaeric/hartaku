import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CURRENCIES, DATE_FORMATS } from '../../lib/constants.js'
import { extractSpreadsheetId } from '../../lib/spreadsheetId.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { ExternalIcon, ScanIcon } from '../ui/icons.jsx'

const THEMES = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'auto', label: 'Ikut sistem' }
]

export default function SettingsPage () {
  const toast = useToast()
  const { user, signOut } = useAuth()
  const { settings, updateSettings, resetSettings } = useSettings()
  const { categories, accounts, workbook, useSpreadsheet } = useData()

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
        <Row label="Tema" htmlFor="theme">
          <Select
            id="theme"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={THEMES}
          />
        </Row>
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
              ...accounts.map((account) => ({ value: account.name, label: account.name }))
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
              ...categories.map((category) => ({ value: category.name, label: category.name }))
            ]}
          />
        </Row>
      </Section>

      <Section title="Sumber data">
        {workbook ? (
          <div className="space-y-1">
            <p className="text-body">{workbook.title}</p>
            <p className="break-all font-mono text-caption text-subtitle dark:text-subtitle-dark">
              {workbook.spreadsheetId}
            </p>
            <a
              href={workbook.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-caption font-semibold text-brand-500"
            >
              <ExternalIcon className="h-4 w-4" />
              Buka di Google Sheets
            </a>
          </div>
        ) : (
          <p className="text-caption text-subtitle dark:text-subtitle-dark">
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
              className="field flex-1 font-mono text-caption"
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
      </Section>

      <Section title="Import data">
        <Link
          to="/import/money-manager"
          className="-m-1 flex items-center gap-3 rounded-control p-1 transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <ScanIcon className="h-[19px] w-[19px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-medium">Dari Money Manager</span>
            <span className="block text-caption text-subtitle dark:text-subtitle-dark">
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
          <a className="text-body font-medium text-brand-500" href="/privacy">
            Kebijakan Privasi
          </a>
          <a className="text-body font-medium text-brand-500" href="/terms">
            Syarat &amp; Ketentuan
          </a>
        </div>
        <p className="hint">
          Cabut akses aplikasi kapan saja lewat{' '}
          <a
            className="font-medium text-brand-500"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            izin akun Google
          </a>
          .
        </p>
      </Section>

      <Section title="Akun">
        <p className="text-body text-subtitle dark:text-subtitle-dark">{user?.email}</p>
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
          <Button variant="danger" className="justify-center" onClick={signOut}>
            Keluar
          </Button>
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

function Select ({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      className="field h-10 truncate py-0 text-caption"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
