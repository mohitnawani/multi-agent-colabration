import { cn } from '../lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-block', className)} aria-hidden="true" />
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="surface overflow-hidden">
      <div className="divide-y divide-base-300">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-6 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-4', c === 0 ? 'w-2/5' : 'flex-1')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
