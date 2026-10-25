import type { CaseSummary } from './types.ts'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

export function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// "Thursday, Oct 22 · 2:30 PM"
export function formatNow(d: Date) {
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  return `${day} · ${formatTime(d)}`
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Calendar days, not 24h blocks, so a Sunday due date seen on Thursday reads "in 3 days".
function calendarDaysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY)
}

// Under a day: "1h 30m" (or "30m"). A day or more: "2d 4h".
function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}d ${hours}h`
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function formatDay(due: Date, now: Date) {
  const days = calendarDaysBetween(now, due)
  const time = formatTime(due)
  if (days === 0) return `Today, ${time}`
  if (days === 1) return `Tomorrow, ${time}`
  if (days < 0) return `${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
  return `${due.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

export interface DueText {
  primary: string
  secondary: string | null
  tone: 'overdue' | 'today' | 'normal'
}

export function formatDue(c: CaseSummary, now: Date): DueText {
  const due = new Date(c.dueAt)
  const ms = due.getTime() - now.getTime()

  if (c.isOverdue) {
    return { primary: `Overdue ${formatDuration(-ms)}`, secondary: formatDay(due, now), tone: 'overdue' }
  }
  // A countdown only makes sense while the case is still being worked.
  if (c.status === 'Resolved' || c.status === 'Closed') {
    return { primary: formatDay(due, now), secondary: null, tone: 'normal' }
  }

  const days = calendarDaysBetween(now, due)
  if (days === 0) return { primary: formatDay(due, now), secondary: `in ${formatDuration(ms)}`, tone: 'today' }
  if (days === 1) return { primary: formatDay(due, now), secondary: `in ${formatDuration(ms)}`, tone: 'normal' }
  return { primary: formatDay(due, now), secondary: `in ${days} days`, tone: 'normal' }
}
