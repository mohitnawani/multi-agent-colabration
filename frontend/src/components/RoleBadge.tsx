import { cn } from '../lib/cn'

const ROLE_CLASSES: Record<string, string> = {
  researcher: 'role-researcher',
  writer: 'role-writer',
  analyst: 'role-analyst',
  critic: 'role-critic',
  developer: 'role-developer',
  designer: 'role-designer',
}

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span className={cn('role-chip', ROLE_CLASSES[role] || 'role-analyst', className)}>
      {role}
    </span>
  )
}
