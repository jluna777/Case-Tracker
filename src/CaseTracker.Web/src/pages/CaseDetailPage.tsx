import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { addNote, changeStatus, getCase, reopenCase } from '../api.ts'
import AddNote from '../components/AddNote.tsx'
import BackLink from '../components/BackLink.tsx'
import Avatar from '../components/Avatar.tsx'
import StatusMenu from '../components/StatusMenu.tsx'
import StatusPill from '../components/StatusPill.tsx'
import Timeline from '../components/Timeline.tsx'
import { useAgent } from '../context/AgentContext.tsx'
import { formatDueRule, formatLongDateTime, formatOverdueBadge } from '../format.ts'
import { CATEGORY_LABELS, type CaseDetail, type CaseStatus } from '../types.ts'

export default function CaseDetailPage() {
  const { id = '' } = useParams()
  const { agent } = useAgent()
  const [detail, setDetail] = useState<CaseDetail | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function show(d: CaseDetail) {
    setDetail(d)
    setNow(new Date())
  }

  useEffect(() => {
    let ignore = false
    setDetail(null)
    setLoadError(null)
    setStatusError(null)
    if (!/^\d+$/.test(id)) {
      setLoadError(`Case #${id} was not found.`)
      return
    }
    getCase(id)
      .then(d => { if (!ignore) show(d) })
      .catch(e => { if (!ignore) setLoadError(e.message) })
    return () => { ignore = true }
  }, [id])

  // After a failed write the page may be stale, so pull the real current state.
  async function refetch() {
    try {
      show(await getCase(id))
    } catch {
      // Keep showing what we have; the original error is already on screen.
    }
  }

  async function runStatusAction(action: () => Promise<CaseDetail>) {
    setBusy(true)
    try {
      show(await action())
      setStatusError(null)
    } catch (e) {
      setStatusError((e as Error).message)
      await refetch()
    } finally {
      setBusy(false)
    }
  }

  async function submitNote(body: string) {
    try {
      await addNote(Number(id), body, agent)
    } catch (e) {
      await refetch()
      throw e
    }
    await refetch()
  }

  if (loadError) {
    return (
      <main className="detail-page">
        <BackLink />
        <p className="error-text">{loadError}</p>
      </main>
    )
  }
  if (!detail) {
    return (
      <main className="detail-page">
        <BackLink />
        <p className="muted">Loading…</p>
      </main>
    )
  }

  const createdAt = new Date(detail.createdAt)
  const dueAt = new Date(detail.dueAt)

  return (
    <main className="detail-page">
      <BackLink />

      <section className="card detail-header">
        <div className="meta detail-id">#{detail.id} · {detail.customer}</div>
        <h1>{detail.title}</h1>
        <div className="badges">
          <span className={`pill priority-pill-${detail.priority}`}>
            <span className={`priority-dot priority-${detail.priority}`} />
            {detail.priority} priority
          </span>
          <StatusPill status={detail.status} />
          {detail.isOverdue && (
            <span className="pill overdue-badge">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5M10 13.5h.01" /></svg>
              {formatOverdueBadge(detail.dueAt, now)}
            </span>
          )}
        </div>
      </section>

      <div className="detail-columns">
        <div className="detail-main">
          <section className="card detail-section">
            <h2>Description</h2>
            <p className="description">{detail.description ?? <span className="muted">No description.</span>}</p>
          </section>

          <section className="card detail-section timeline-card">
            <Timeline detail={detail} />
            <AddNote agent={agent} locked={detail.status === 'Closed'} onAdd={submitNote} />
          </section>
        </div>

        <aside className="card detail-side">
          <StatusMenu
            detail={detail}
            busy={busy}
            error={statusError}
            onMove={(status: CaseStatus) => runStatusAction(() => changeStatus(detail.id, status, agent))}
            onReopen={() => runStatusAction(() => reopenCase(detail.id, agent))}
            onDismiss={() => setStatusError(null)}
          />
          <dl className="details">
            <dt>Priority</dt>
            <dd>
              <span className={`pill priority-pill-${detail.priority}`}>
                <span className={`priority-dot priority-${detail.priority}`} />
                {detail.priority}
              </span>
            </dd>
            <dt>Customer</dt>
            <dd>{detail.customer}</dd>
            <dt>Category</dt>
            <dd>{CATEGORY_LABELS[detail.category]}</dd>
            <dt>Assignee</dt>
            <dd>
              {detail.assignee
                ? <span className="assignee"><Avatar name={detail.assignee} />{detail.assignee}</span>
                : <span className="muted">Unassigned</span>}
            </dd>
            <dt>Created</dt>
            <dd>
              {formatLongDateTime(createdAt)}
              <div className="meta">by {detail.createdBy}</div>
            </dd>
            <dt>Due</dt>
            <dd>
              <span className={detail.isOverdue ? 'due-overdue' : undefined}>{formatLongDateTime(dueAt)}</span>
              <div className="meta">{formatDueRule(detail.createdAt, detail.dueAt, detail.priority)}</div>
            </dd>
          </dl>
        </aside>
      </div>
    </main>
  )
}
