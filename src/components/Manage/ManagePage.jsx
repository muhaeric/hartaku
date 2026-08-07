import { useSearchParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import AccountManager from '../Account/AccountManager.jsx'
import CategoryManager from '../Category/CategoryManager.jsx'
import GoldManager from '../Gold/GoldManager.jsx'
import TagManager from '../Tag/TagManager.jsx'
import SegmentedControl from '../ui/SegmentedControl.jsx'
import { ErrorState, SkeletonRows } from '../ui/Feedback.jsx'

const TABS = [
  { value: 'accounts', label: 'Akun' },
  { value: 'gold', label: 'Emas' },
  { value: 'categories', label: 'Kategori' },
  { value: 'tags', label: 'Tag' }
]

const PANELS = {
  accounts: AccountManager,
  gold: GoldManager,
  categories: CategoryManager,
  tags: TagManager
}

/**
 * Accounts, gold and categories share one nav slot: six items do not fit a phone
 * tab bar without truncating every label.
 */
export default function ManagePage () {
  const [params, setParams] = useSearchParams()
  const { loading, error, reload, accounts, categories } = useData()

  const active = TABS.some((tab) => tab.value === params.get('tab'))
    ? params.get('tab')
    : TABS[0].value

  const Panel = PANELS[active]

  if (error) return <ErrorState message={error} onRetry={() => reload()} />
  if (loading && !accounts.length && !categories.length) return <SkeletonRows rows={5} />

  return (
    <>
      <SegmentedControl
        label="Pilih data yang dikelola"
        value={active}
        options={TABS}
        onChange={(tab) => setParams({ tab }, { replace: true })}
      />
      <Panel />
    </>
  )
}
