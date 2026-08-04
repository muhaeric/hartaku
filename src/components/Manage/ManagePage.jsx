import { useSearchParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import AccountManager from '../Account/AccountManager.jsx'
import CategoryManager from '../Category/CategoryManager.jsx'
import { ErrorState, LoadingBlock } from '../ui/Feedback.jsx'

const TABS = [
  { id: 'accounts', label: 'Akun' },
  { id: 'categories', label: 'Kategori' }
]

/**
 * Accounts and categories share one nav slot: six items do not fit a phone tab
 * bar without truncating every label.
 */
export default function ManagePage () {
  const [params, setParams] = useSearchParams()
  const { loading, error, reload, accounts, categories } = useData()

  const active = TABS.some((tab) => tab.id === params.get('tab'))
    ? params.get('tab')
    : TABS[0].id

  if (error) return <ErrorState message={error} onRetry={() => reload()} />
  if (loading && !accounts.length && !categories.length) return <LoadingBlock />

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
        role="tablist"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setParams({ tab: tab.id }, { replace: true })}
            className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold transition ${
              active === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'accounts' ? <AccountManager /> : <CategoryManager />}
    </div>
  )
}
