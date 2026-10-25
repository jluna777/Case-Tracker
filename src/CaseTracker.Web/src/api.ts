import type { CaseSummary, QueueSummary } from './types.ts'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    // Errors are ProblemDetails; the UI shows the detail text.
    const problem = await res.json().catch(() => null)
    throw new Error(problem?.detail ?? problem?.title ?? `Request failed (${res.status}).`)
  }
  return res.json()
}

export function getCases(query: URLSearchParams) {
  const qs = query.toString()
  return request<CaseSummary[]>(`/api/cases${qs ? `?${qs}` : ''}`)
}

export function getSummary() {
  return request<QueueSummary>('/api/cases/summary')
}
