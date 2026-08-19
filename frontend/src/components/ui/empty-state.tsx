import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { RouteMark } from './route-mark'

export function EmptyState({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-6 py-14 text-center', className)}>
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-ink/5 text-ink ring-1 ring-inset ring-line">
        <RouteMark className="size-6" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted text-pretty">{description}</p>
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{children}</div>}
    </div>
  )
}
