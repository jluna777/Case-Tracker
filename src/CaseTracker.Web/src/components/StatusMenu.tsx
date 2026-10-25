import { useEffect, useRef, useState } from 'react'
import { STATUS_LABELS, type CaseDetail, type CaseStatus } from '../types.ts'

interface Props {
  detail: CaseDetail
  busy: boolean
  error: string | null
  onMove: (status: CaseStatus) => void
  onReopen: () => void
  onDismiss: () => void
}

export default function StatusMenu({ detail, busy, error, onMove, onReopen, onDismiss }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const current = STATUS_LABELS[detail.status]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(action: () => void) {
    setOpen(false)
    action()
  }

  const buttonClass = ['status-button', open && 'status-button-open', error && 'status-button-error']
    .filter(Boolean).join(' ')

  return (
    <div className="status-control" ref={containerRef}>
      <span id="status-label" className="field-label">Status</span>
      <button
        type="button"
        className={buttonClass}
        aria-labelledby="status-label"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'status-error' : undefined}
        disabled={busy}
        onClick={() => setOpen(!open)}
      >
        <span className="status-current">
          <span className={`status-dot status-dot-${detail.status}`} />
          {current}
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'} />
        </svg>
      </button>

      {open && (
        <div className="status-menu" role="menu" aria-label={`Move from ${current} to`}>
          <div className="meta status-menu-title">Move from {current} to</div>
          {detail.allowedNextStatuses.map(s => (
            <button key={s} type="button" role="menuitem" className="status-option" onClick={() => choose(() => onMove(s))}>
              <span className={`status-dot status-dot-${s}`} />
              {STATUS_LABELS[s]}
            </button>
          ))}
          {detail.canReopen && (
            <button type="button" role="menuitem" className="status-option" onClick={() => choose(onReopen)}>
              <span className="status-dot status-dot-InProgress" />
              Reopen case
            </button>
          )}
          <div className="meta status-menu-footer">Only allowed next statuses are shown.</div>
        </div>
      )}

      {error && (
        <div id="status-error" className="status-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#DC2626" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5M10 13.5h.01" /></svg>
          <div className="status-error-body">
            <span className="status-error-message">{error}</span>
            <span className="status-error-context">
              Status is now {current}.{detail.canReopen && ' Reopen the case to continue.'}
            </span>
            <div className="status-error-actions">
              {detail.canReopen && <button type="button" className="btn" disabled={busy} onClick={onReopen}>Reopen case</button>}
              <button type="button" className="btn btn-secondary" onClick={onDismiss}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
