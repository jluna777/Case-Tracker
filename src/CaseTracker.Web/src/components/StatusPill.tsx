import { STATUS_LABELS, type CaseStatus } from '../types.ts'

export default function StatusPill({ status }: { status: CaseStatus }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABELS[status]}</span>
}
