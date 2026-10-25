import type { ReactNode } from 'react'
import { formatDateTime } from '../format.ts'
import type { CaseDetail, CaseNote } from '../types.ts'
import Avatar from './Avatar.tsx'

const ICON_PROPS = {
  width: 16, height: 16, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const

const plusIcon = <svg {...ICON_PROPS}><path d="M10 4v12M4 10h12" /></svg>
const personIcon = <svg {...ICON_PROPS}><circle cx="10" cy="7" r="3" /><path d="M4 17c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" /></svg>
const arrowsIcon = <svg {...ICON_PROPS}><path d="M4 7h10l-3-3M16 13H6l3 3" /></svg>
const alertIcon = <svg {...ICON_PROPS} strokeWidth={1.8}><circle cx="10" cy="10" r="7" /><path d="M10 6v4.5M10 13.5h.01" /></svg>

function systemIcon(body: string) {
  if (body.startsWith('Case created')) return plusIcon
  if (body.startsWith('Assignee changed')) return personIcon
  return arrowsIcon
}

// System notes are stored as plain text; the status names are bolded here for display only.
function systemText(body: string): ReactNode {
  const match = /^Status changed from (.+?) to (.+) by (\S+)$/.exec(body)
  if (!match) return body
  const [, from, to, actor] = match
  return <>Status changed from <b>{from}</b> to <b>{to}</b> by {actor}</>
}

function SystemEntry({ icon, text, at, alert }: { icon: ReactNode, text: ReactNode, at: string, alert?: boolean }) {
  return (
    <div className={alert ? 'system-entry system-entry-alert' : 'system-entry'}>
      <span className="system-icon">{icon}</span>
      <span className="system-text">{text}</span>
      <span className="system-time">{formatDateTime(new Date(at))}</span>
    </div>
  )
}

function AgentEntry({ note }: { note: CaseNote }) {
  const author = note.author ?? 'Unknown'
  return (
    <div className="agent-entry">
      <Avatar name={author} large />
      <div className="note-card">
        <div className="note-header">
          <span className="note-author">{author}</span>
          <span className="meta">{formatDateTime(new Date(note.createdAt))}</span>
        </div>
        <p className="note-body">{note.body}</p>
      </div>
    </div>
  )
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export default function Timeline({ detail }: { detail: CaseDetail }) {
  const agentCount = detail.notes.filter(n => n.kind === 'Agent').length
  // The overdue entry isn't stored (no background job); it's placed at dueAt among the real notes.
  const overdueIndex = detail.isOverdue
    ? detail.notes.filter(n => new Date(n.createdAt) <= new Date(detail.dueAt)).length
    : -1
  const systemCount = detail.notes.length - agentCount + (detail.isOverdue ? 1 : 0)

  const entries: ReactNode[] = detail.notes.map(n => n.kind === 'Agent'
    ? <AgentEntry key={n.id} note={n} />
    : <SystemEntry key={n.id} icon={systemIcon(n.body)} text={systemText(n.body)} at={n.createdAt} />)
  if (overdueIndex >= 0) {
    entries.splice(overdueIndex, 0,
      <SystemEntry key="overdue" icon={alertIcon} text="Due date passed · case is now overdue" at={detail.dueAt} alert />)
  }

  return (
    <>
      <div className="section-header">
        <h2>Notes timeline</h2>
        <span className="meta">
          {plural(agentCount, 'note', 'notes')} · {plural(systemCount, 'system entry', 'system entries')} · oldest first
        </span>
      </div>
      <div className="timeline">{entries}</div>
    </>
  )
}
