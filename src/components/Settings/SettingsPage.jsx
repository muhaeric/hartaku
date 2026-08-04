import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { CURRENCIES, DATE_FORMATS } from '../../lib/constants.js'
import Button from '../ui/Button.jsx'
import { ExternalIcon } from '../ui/icons.jsx'

const THEMES = [
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
  { value: 'auto', label: 'Ikut sistem' }
]

export default function SettingsPage () {
  const toast = useToast()
  const { user, signOut } = useAuth()
  const { settings, updateSettings, resetSettings } = useSettings()
  const { categories, workbook, useSpreadsheet } = useData()

  const [sheetId, setSheetId] = useState('')
  const [switching, setSwitching] = useState(false)

  const handleSwitchSheet = async () => {
    const id = sheetId.trim()
    if (!id) return

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
    <div className="space-y-4">
      <Section title="Tampilan">
        <Field label="Tema" htmlFor="theme">
          <select
            id="theme"
            className="field"
            value={settings.theme}
            onChange={(event) => updateSettings({ theme: event.target.value })}
          >
            {THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Mata uang" htmlFor="currency">
          <select
            id="currency"
            className="field"
            value={settings.currency}
            onChange={(event) => updateSettings({ currency: event.target.value })}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Format tanggal" htmlFor="date-format">
          <select
            id="date-format"
            className="field"
            value={settings.dateFormat}
            onChange={(event) => updateSettings({ dateFormat: event.target.value })}
          >
            {DATE_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.value} — {format.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Default form transaksi">
        <Field label="Jenis default" htmlFor="default-type">
          <select
            id="default-type"
            className="field"
            value={settings.defaultType}
            onChange={(event) => updateSettings({ defaultType: event.target.value })}
          >
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </Field>

        <Field label="Kategori default" htmlFor="default-category">
          <select
            id="default-category"
            className="field"
            value={settings.defaultCategory}
            onChange={(event) => updateSettings({ defaultCategory: event.target.value })}
          >
            <option value="">Tidak ada</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Sumber data">
        {workbook ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">{workbook.title}</p>
            <p className="break-all font-mono text-xs text-slate-400">{workbook.spreadsheetId}</p>
            <a
              href={workbook.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"
            >
              <ExternalIcon className="h-4 w-4" />
              Buka di Google Sheets
            </a>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Spreadsheet belum siap.</p>
        )}

        <Field label="Pakai spreadsheet lain" htmlFor="sheet-id">
          <div className="flex gap-2">
            <input
              id="sheet-id"
              type="text"
              className="field flex-1 font-mono text-sm"
              placeholder="ID spreadsheet"
              value={sheetId}
              onChange={(event) => setSheetId(event.target.value)}
            />
            <Button onClick={handleSwitchSheet} loading={switching} disabled={!sheetId.trim()}>
              Ganti
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Hanya spreadsheet yang dibuat oleh aplikasi ini yang bisa dibuka — itu batas izin{' '}
            <code>drive.file</code> yang diminta saat login.
          </p>
        </Field>
      </Section>

      <Section title="Akun">
        <p className="text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
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
    </div>
  )
}

function Section ({ title, children }) {
  return (
    <section className="card space-y-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Field ({ label, htmlFor, children }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  )
}
