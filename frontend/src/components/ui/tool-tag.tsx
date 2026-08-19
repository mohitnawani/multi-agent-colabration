import { cn } from '../../lib/cn'

export function ToolTag({ tool, className }: { tool: string; className?: string }) {
  return (
    <code className={cn('tool-tag', className)}>
      {tool}
    </code>
  )
}
