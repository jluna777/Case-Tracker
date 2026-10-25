import { Link } from 'react-router'
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, STATUSES, STATUS_LABELS } from '../types.ts'

export interface FilterValues {
  status: string
  priority: string
  category: string
}

interface Props {
  values: FilterValues
  countText: string
  onChange: (name: keyof FilterValues, value: string) => void
}

interface ChipProps {
  name: keyof FilterValues
  label: string
  value: string
  options: [value: string, label: string][]
  onChange: Props['onChange']
}

// Only the selected option carries the "Status:" prefix, so the open list reads cleanly.
function FilterChip({ name, label, value, options, onChange }: ChipProps) {
  return (
    <>
      <label htmlFor={`filter-${name}`} className="visually-hidden">{label}</label>
      <select
        id={`filter-${name}`}
        className={value ? 'chip chip-active' : 'chip'}
        value={value}
        onChange={e => onChange(name, e.target.value)}
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>{v === value ? `${label}: ${text}` : text}</option>
        ))}
      </select>
    </>
  )
}

export default function Filters({ values, countText, onChange }: Props) {
  const hasFilters = Boolean(values.status || values.priority || values.category)

  return (
    <div className="filter-bar">
      <div className="filters">
        <FilterChip
          name="status"
          label="Status"
          value={values.status}
          options={[['', 'All open'], ...STATUSES.map(s => [s, STATUS_LABELS[s]] as [string, string]), ['all', 'All']]}
          onChange={onChange}
        />
        <FilterChip
          name="priority"
          label="Priority"
          value={values.priority}
          options={[['', 'All'], ...PRIORITIES.map(p => [p, p] as [string, string])]}
          onChange={onChange}
        />
        <FilterChip
          name="category"
          label="Category"
          value={values.category}
          options={[['', 'All'], ...CATEGORIES.map(c => [c, CATEGORY_LABELS[c]] as [string, string])]}
          onChange={onChange}
        />
        {hasFilters && <Link to="/" className="clear-link">Clear filters</Link>}
      </div>
      <span className="muted small">{countText}</span>
    </div>
  )
}
