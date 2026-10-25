import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getCases, getSummary } from '../api.ts'
import CaseTable from '../components/CaseTable.tsx'
import EmptyState from '../components/EmptyState.tsx'
import Filters, { type FilterValues } from '../components/Filters.tsx'
import SummaryCards from '../components/SummaryCards.tsx'
import { formatNow } from '../format.ts'
import type { CaseSummary, QueueSummary } from '../types.ts'

export default function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [summary, setSummary] = useState<QueueSummary | null>(null)
  const [cases, setCases] = useState<CaseSummary[] | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [error, setError] = useState<string | null>(null)

  const filters: FilterValues = {
    status: searchParams.get('status') ?? '',
    priority: searchParams.get('priority') ?? '',
    category: searchParams.get('category') ?? '',
  }
  const queryKey = searchParams.toString()

  // The summary is queue-wide, so it doesn't reload when filters change.
  useEffect(() => {
    getSummary().then(setSummary).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    let ignore = false
    setError(null)
    getCases(new URLSearchParams(queryKey))
      .then(data => {
        if (ignore) return
        setCases(data)
        setNow(new Date())
      })
      .catch(e => { if (!ignore) setError(e.message) })
    // Drops a slow response that arrives after a newer filter change.
    return () => { ignore = true }
  }, [queryKey])

  function changeFilter(name: keyof FilterValues, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(name, value)
    else next.delete(name)
    setSearchParams(next)
  }

  const count = cases?.length ?? 0
  const countText = count === 0 ? '0 cases' : `${count} case${count === 1 ? '' : 's'} · sorted by due date`

  return (
    <main>
      <div className="page-header">
        <div>
          <p className="page-date">{formatNow(now)}</p>
          <h1>Cases</h1>
        </div>
        <Link to="/cases/new" className="btn">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
          New case
        </Link>
      </div>

      {summary && <SummaryCards summary={summary} />}

      <section className="card table-card">
        <Filters values={filters} countText={cases ? countText : ''} onChange={changeFilter} />
        {error && <p className="error-text panel-message">{error}</p>}
        {!error && !cases && <p className="muted panel-message">Loading…</p>}
        {!error && cases && cases.length > 0 && <CaseTable cases={cases} now={now} />}
        {!error && cases && cases.length === 0 && (
          <>
            <CaseTable cases={[]} now={now} />
            <EmptyState filters={filters} openCount={summary?.open ?? null} />
          </>
        )}
      </section>
    </main>
  )
}
