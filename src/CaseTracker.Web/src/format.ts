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

// "Oct 21, 9:15 AM"
export function formatDateTime(d: Date) {
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${formatTime(d)}`
}

// "Wed, Oct 21, 9:15 AM"
export function formatLongDateTime(d: Date) {
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${formatTime(d)}`
}

// Under a day: "1h 30m" (or "30m"). A day or more: "2d 4h".
export function formatDuration(ms: number) {
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
  return days < 0 ? formatDateTime(due) : formatLongDateTime(due)
}

// "Overdue by 5h 15m · was due today 9:15 AM"
export function formatOverdueBadge(dueAt: string, now: Date) {
  const due = new Date(dueAt)
  const when = calendarDaysBetween(now, due) === 0 ? `today ${formatTime(due)}` : formatDateTime(due)
  return `Overdue by ${formatDuration(now.getTime() - due.getTime())} · was due ${when}`
}

// "Fri, Oct 23 at 2:30 PM"
export function formatPreviewDue(d: Date) {
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatTime(d)}`
}

// "24 hours from now" / "3 days from now"
export function formatHoursFromNow(hours: number) {
  return hours > 24 && hours % 24 === 0 ? `${hours / 24} days from now` : `${hours} hours from now`
}

// "24h from creation (High)" / "3 days from creation (Medium)", read from the stored dates
// so the frontend doesn't repeat the due-date rule.
export function formatDueRule(createdAt: string, dueAt: string, priority: string) {
  const hours = Math.round((new Date(dueAt).getTime() - new Date(createdAt).getTime()) / (60 * MINUTE))
  const span = hours > 24 && hours % 24 === 0 ? `${hours / 24} days` : `${hours}h`
  return `${span} from creation (${priority})`
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
