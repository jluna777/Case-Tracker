import type { QueueSummary } from '../types.ts'

export default function SummaryCards({ summary }: { summary: QueueSummary }) {
  return (
    <div className="summary-cards">
      <div className="card summary-card">
        <span className="card-icon icon-open">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#4F46E5" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 9h4l1 2h4l1-2h4" /></svg>
        </span>
        <div>
          <div className="card-label">Open</div>
          <div className="card-value">{summary.open}</div>
        </div>
      </div>
      <div className="card summary-card summary-card-overdue">
        <span className="card-icon icon-overdue">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#DC2626" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5M10 13.5h.01" /></svg>
        </span>
        <div>
          <div className="card-label">Overdue</div>
          <div className="card-value">{summary.overdue}</div>
        </div>
      </div>
      <div className="card summary-card">
        <span className="card-icon icon-waiting">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#B45309" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path d="M8 7.5v5M12 7.5v5" /></svg>
        </span>
        <div>
          <div className="card-label">Waiting on Customer</div>
          <div className="card-value">{summary.waitingOnCustomer}</div>
        </div>
      </div>
      <div className="card summary-card">
        <span className="card-icon icon-resolved">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#047857" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 10.5l3 3 7-7" /></svg>
        </span>
        <div>
          <div className="card-label">Resolved Today</div>
          <div className="card-value">{summary.resolvedToday}</div>
        </div>
      </div>
    </div>
  )
}
