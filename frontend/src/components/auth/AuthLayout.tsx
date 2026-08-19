import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FlowSchematic } from '../FlowSchematic'
import { RouteMark } from '../ui/route-mark'
import { ThemeToggle } from '../ui/theme-toggle'
import { AUTH_WORKFLOW } from './workflow'

function Wordmark({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid size-8 place-items-center rounded-lg',
          dark ? 'bg-panel-text text-panel' : 'bg-primary text-primary-content',
        )}
      >
        <RouteMark className="size-5" />
      </span>
      <div className="leading-tight">
        <p
          className={cn(
            'text-sm font-bold tracking-[0.18em]',
            dark ? 'text-panel-text' : 'text-ink',
          )}
        >
          NEXUS
        </p>
        <p className={cn('text-[11px]', dark ? 'text-panel-muted' : 'text-ink-muted')}>
          Agent orchestration
        </p>
      </div>
    </div>
  )
}

const LEGEND = [
  { lamp: 'lamp-idle', label: 'Pending' },
  { lamp: 'lamp-running', label: 'Running' },
  { lamp: 'lamp-done', label: 'Succeeded' },
  { lamp: 'lamp-failed', label: 'Failed' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-console px-4 py-8 sm:py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-5xl">
        {/* Mobile wordmark (<lg: left panel hides) */}
        <div className="mb-6 flex justify-center lg:hidden">
          <Wordmark />
        </div>

        {/* One floating console sheet — split 45/55 */}
        <div className="grid overflow-hidden rounded-box bg-base-100 shadow-xl ring-1 ring-base-300 lg:grid-cols-[45fr_55fr]">
          {/* Left — control room: the route schematic, live */}
          <div className="panel relative hidden flex-col overflow-hidden lg:flex">
            <div className="flex items-center justify-between p-7">
              <Wordmark dark />
            </div>

            <div className="flex flex-1 items-center justify-center px-8">
              <FlowSchematic nodes={AUTH_WORKFLOW.nodes} edges={AUTH_WORKFLOW.edges} />
            </div>

            <div className="flex items-center justify-between gap-3 p-7">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-panel-muted">
                Start → Supervisor → Agents → Gate → End
              </span>
              <span className="hidden items-center gap-3 sm:flex" aria-hidden="true">
                {LEGEND.map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5 text-[10px] font-medium text-panel-muted">
                    <span className={`lamp ${item.lamp}`} />
                    {item.label}
                  </span>
                ))}
              </span>
            </div>
          </div>

          {/* Right — form sheet */}
          <div className="bg-base-100">{children}</div>
        </div>
      </div>
    </div>
  )
}
