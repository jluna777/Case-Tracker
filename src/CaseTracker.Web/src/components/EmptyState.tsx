import { Link } from 'react-router'
import { CATEGORY_LABELS, STATUS_LABELS, type CaseStatus, type Category } from '../types.ts'
import type { FilterValues } from './Filters.tsx'

interface Props {
  filters: FilterValues
  openCount: number | null
}

// e.g. "Nothing is Waiting on Customer at Medium priority in Integration."
function describe({ status, priority, category }: FilterValues) {
  let text = 'No open cases'
  if (status === 'all') text = 'No cases'
  else if (status) text = `Nothing is ${STATUS_LABELS[status as CaseStatus] ?? status}`
  if (priority) text += ` at ${priority} priority`
  if (category) text += ` in ${CATEGORY_LABELS[category as Category] ?? category}`
  return `${text}.`
}

export default function EmptyState({ filters, openCount }: Props) {
  const hasFilters = Boolean(filters.status || filters.priority || filters.category)
  const seeAll = openCount === null ? 'see all open cases'
    : `see all ${openCount} open case${openCount === 1 ? '' : 's'}`

  return (
    <div className="empty-state">
      <span className="empty-icon">
        <svg width="30" height="30" viewBox="0 0 20 20" fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 9h4l1 2h4l1-2h4" /></svg>
      </span>
      <h2>No cases match these filters</h2>
      <p>
        {describe(filters)}
        {hasFilters && ` Try a different status, priority or category, or clear the filters to ${seeAll}.`}
      </p>
      <div className="empty-actions">
        {hasFilters && <Link to="/" className="btn btn-secondary">Clear filters</Link>}
        <Link to="/cases/new" className="btn">New case</Link>
      </div>
    </div>
  )
}
