import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ThemeToggle } from '../ui/theme-toggle'

const CANVAS = '/abstract-hand-painted-modern-art-canvas-design-background_1048-19282.webp'
const LOGO = '/nexus-logo.png'

function Wordmark({ dark }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg',
          dark ? 'bg-white' : 'bg-white ring-1 ring-line',
        )}
      >
        <img src={LOGO} alt="NEXUS logo" className="size-8 object-cover" />
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
  { chip: 'legend-idle', label: 'Pending' },
  { chip: 'legend-running', label: 'Running' },
  { chip: 'legend-done', label: 'Succeeded' },
  { chip: 'legend-failed', label: 'Failed' },
]

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-bg relative grid min-h-dvh place-items-center px-4 py-8 sm:py-12">
      {/* Canvas behind the card on mobile (left panel is hidden < lg) */}
      <div className="absolute inset-0 -z-10 lg:hidden" aria-hidden="true">
        <img src={CANVAS} alt="" className="h-full w-full object-cover opacity-30" />
      </div>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl">
        {/* Mobile wordmark (<lg: left panel hides) */}
        <div className="mb-6 flex justify-center lg:hidden">
          <Wordmark />
        </div>

        {/* One floating console sheet — split 45/55, canvas slants toward the right.
            Fixed height on desktop so login and signup cards match; the form column
            scrolls internally instead of scrolling the page. */}
        <div className="grid overflow-hidden rounded-box bg-base-100 shadow-xl ring-1 ring-base-300 lg:h-[calc(100dvh-6rem)] lg:grid-cols-[45fr_55fr]">
          {/* Left — art canvas panel, slanted edge */}
          <div className="relative hidden lg:block">
            <div className="auth-slant absolute inset-0">
              <img
                src={CANVAS}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Scrims keep panel text legible over any artwork */}
              <div className="absolute inset-0 bg-panel/50" />
              <div className="absolute inset-0 bg-gradient-to-b from-panel/80 via-transparent to-panel/80" />

              <div className="relative flex h-full flex-col justify-between p-7">
                <Wordmark dark />

                <div className="px-1">
                  <h2 className="text-4xl leading-tight font-bold tracking-tight text-panel-text">
                    Multi Agent
                    <br />
                    Collaboration System
                  </h2>
                  <p className="mt-2.5 max-w-[32ch] text-sm leading-relaxed text-panel-muted">
                    Plan. Delegate. Review. Every run leaves an audit trail.
                  </p>
                </div>

                <div className="pr-[14%]">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-panel-muted">
                    Start → Supervisor → Agents → Gate → End
                  </span>
                  <span className="mt-2 hidden items-center gap-2 sm:flex" aria-hidden="true">
                    {LEGEND.map((item) => (
                      <span key={item.label} className={cn('legend-chip', item.chip)}>
                        <span className="lamp" />
                        {item.label}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — form sheet (centers when short, scrolls when tall) */}
          <div className="bg-base-100 lg:flex lg:flex-col lg:overflow-y-auto">
            <div className="my-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}