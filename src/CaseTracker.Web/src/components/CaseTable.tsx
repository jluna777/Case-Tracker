import { Link } from 'react-router'
import { formatDue } from '../format.ts'
import { CATEGORY_LABELS, type CaseSummary } from '../types.ts'
import Avatar from './Avatar.tsx'
import PriorityLabel from './PriorityLabel.tsx'
import StatusPill from './StatusPill.tsx'

interface Props {
  cases: CaseSummary[]
  now: Date
}

export default function CaseTable({ cases, now }: Props) {
  return (
    <div className="table-scroll">
      <table className="case-table">
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Category</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
            <th scope="col">Assignee</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => {
            const due = formatDue(c, now)
            return (
              <tr key={c.id} className={c.isOverdue ? 'overdue' : undefined}>
                <td className="case-cell">
                  <Link to={`/cases/${c.id}`} className="case-title">{c.title}</Link>
                  <div className="meta">#{c.id} · {c.customer}</div>
                </td>
                <td>{CATEGORY_LABELS[c.category]}</td>
                <td><PriorityLabel priority={c.priority} /></td>
                <td><StatusPill status={c.status} /></td>
                <td>
                  {c.assignee
                    ? <span className="assignee"><Avatar name={c.assignee} />{c.assignee}</span>
                    : <span className="muted">Unassigned</span>}
                </td>
                <td>
                  <div className={`due due-${due.tone}`}>{due.primary}</div>
                  {due.secondary && <div className={`meta due-sub-${due.tone}`}>{due.secondary}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
