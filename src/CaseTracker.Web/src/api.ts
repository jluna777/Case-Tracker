import type { CaseDetail, CaseNote, CaseStatus, CaseSummary, Category, Priority, QueueSummary } from './types.ts'

// Carries ValidationProblem field errors (keyed by camelCase field name) so forms can show them inline.
export class ApiError extends Error {
  fieldErrors: Record<string, string[]>

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    // Errors are ProblemDetails; the UI shows the detail text.
    const problem = await res.json().catch(() => null)
    throw new ApiError(problem?.detail ?? problem?.title ?? `Request failed (${res.status}).`, problem?.errors)
  }
  return res.json()
}

function send<T>(method: string, url: string, body: unknown) {
  return request<T>(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function getCases(query: URLSearchParams) {
  const qs = query.toString()
  return request<CaseSummary[]>(`/api/cases${qs ? `?${qs}` : ''}`)
}

export function getSummary() {
  return request<QueueSummary>('/api/cases/summary')
}

export function getCase(id: string) {
  return request<CaseDetail>(`/api/cases/${encodeURIComponent(id)}`)
}

export interface CreateCaseRequest {
  title: string
  customer: string | null
  category: Category | null
  priority: Priority
  assignee: string | null
  description: string | null
  actor: string
}

export function createCase(req: CreateCaseRequest) {
  return send<CaseDetail>('POST', '/api/cases', req)
}

export function changeStatus(id: number, status: CaseStatus, actor: string) {
  return send<CaseDetail>('PATCH', `/api/cases/${id}/status`, { status, actor })
}

export function reopenCase(id: number, actor: string) {
  return send<CaseDetail>('POST', `/api/cases/${id}/reopen`, { actor })
}

export function addNote(id: number, body: string, actor: string) {
  return send<CaseNote>('POST', `/api/cases/${id}/notes`, { body, actor })
}
