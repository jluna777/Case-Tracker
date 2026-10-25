import type { Priority } from '../types.ts'

export default function PriorityLabel({ priority }: { priority: Priority }) {
  return (
    <span className="priority">
      <span className={`priority-dot priority-${priority}`} />
      {priority}
    </span>
  )
}
