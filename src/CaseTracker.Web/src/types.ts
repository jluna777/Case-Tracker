export type CaseStatus = 'New' | 'InProgress' | 'WaitingOnCustomer' | 'Resolved' | 'Closed'
export type Priority = 'High' | 'Medium' | 'Low'
export type Category = 'D365Sales' | 'CustomerService' | 'PowerAutomate' | 'Integration'

export interface CaseSummary {
  id: number
  title: string
  customer: string
  category: Category
  priority: Priority
  status: CaseStatus
  assignee: string | null
  createdAt: string
  dueAt: string
  isOverdue: boolean
}

export interface QueueSummary {
  open: number
  overdue: number
  waitingOnCustomer: number
  resolvedToday: number
}

export const STATUSES: CaseStatus[] = ['New', 'InProgress', 'WaitingOnCustomer', 'Resolved', 'Closed']
export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
export const CATEGORIES: Category[] = ['D365Sales', 'CustomerService', 'PowerAutomate', 'Integration']

export const STATUS_LABELS: Record<CaseStatus, string> = {
  New: 'New',
  InProgress: 'In Progress',
  WaitingOnCustomer: 'Waiting on Customer',
  Resolved: 'Resolved',
  Closed: 'Closed',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  D365Sales: 'D365 Sales',
  CustomerService: 'Customer Service',
  PowerAutomate: 'Power Automate',
  Integration: 'Integration',
}

// Mirrors ReferenceData.cs on the server; there's no lookup endpoint.
export const AGENTS = ['Amy', 'John', 'Sam']
