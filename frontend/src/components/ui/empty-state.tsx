import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { cn } from '../../lib/cn'
import { RouteMark } from './route-mark'

export type EmptyFlowStep = 'agents' | 'teams' | 'tasks'

const FLOW_STEPS: { key: EmptyFlowStep; color: string }[] = [
  { key: 'agents', color: 'text-mod-agents' },
  { key: 'teams', color: 'text-mod-teams' },
  { key: 'tasks', color: 'text-mod-tasks' },
]

/** The setup pipeline as a mono chain — where the user is in it, in module colors. */
function FlowLine({ current }: { current: EmptyFlowStep }) {
  return (
    <p
      className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em]"
      aria-label={`Setup path: ${current} is the next step`}
    >
      {FLOW_STEPS.map((step, i) => (
        <Fragment key={step.key}>
          {i > 0 && (
            <span aria-hidden="true" className="text-ink-muted/40">
              →
            </span>
          )}
          <span className={step.key === current ? cn('font-semibold', step.color) : 'text-ink-muted/60'}>
            {step.key}
          </span>
        </Fragment>
      ))}
    </p>
  )
}

export function EmptyState({
  title,
  description,
  children,
  className,
  tint = 'bg-ink/5 text-ink ring-line',
  flow,
}: {
  title: string
  description: ReactNode
  children?: ReactNode
  className?: string
  tint?: string
  flow?: EmptyFlowStep
}) {
  return (
    <div className={cn('px-6 py-14 text-center', className)}>
      <div className={cn('mx-auto mb-5 grid size-14 place-items-center rounded-xl ring-1 ring-inset', tint)}>
        <RouteMark className="size-6" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted/80 text-pretty">{description}</p>
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{children}</div>}
      {flow && <FlowLine current={flow} />}
    </div>
  )
}