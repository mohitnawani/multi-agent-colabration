import type { ReactNode } from 'react'
import { DelegationTrail } from '../ui/delegation-trail'
import type { TrailStage } from '../ui/delegation-trail'

const LOGO = '/nexus-logo.png'

const AMBIENT_STAGES: TrailStage[] = [
  { id: 'task', label: 'Task', sub: 'incoming' },
  { id: 'decompose', label: 'Decomposed', sub: 'planning' },
  {
    id: 'delegate',
    label: 'Delegated',
    sub: '3 agents',
    agentNames: ['Researcher', 'Analyst', 'Critic'],
  },
  { id: 'gate', label: 'Quality Gate', sub: 'review', gate: true },
  { id: 'synthesis', label: 'Synthesized', sub: 'final output' },
]

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
        <img src={LOGO} alt="NEXUS logo" className="size-8 object-cover" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-[0.18em] text-panel-text">NEXUS</p>
        <p className="text-[11px] text-panel-muted">Agent orchestration</p>
      </div>
    </div>
  )
}

/**
 * Auth canvas - split 55/45. Left: the Delegation Trail rendered large and
 * ambient as the thesis (this is the product, not a stock illustration).
 * Right: the auth panel on bg-panel. Flat panels, hairline borders, no
 * gradients or glassmorphism.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-bg-base lg:grid-cols-[55fr_45fr]">
      {/* Left - ambient Delegation Trail */}
      <div className="relative hidden overflow-hidden border-r border-border lg:block">
        {/* Faint instrument-grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(38,44,56,0.5) 0 1px, transparent 1px 64px), repeating-linear-gradient(90deg, rgba(38,44,56,0.5) 0 1px, transparent 1px 64px)',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Wordmark />

          <div className="max-w-lg">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight text-panel-text">
              One supervisor.
              <br />
              A crew of specialists.
              <br />
              <span className="text-accent-amber">One deliverable.</span>
            </h2>
            <p className="mt-4 max-w-[38ch] text-sm leading-relaxed text-panel-muted">
              NEXUS decomposes your task, delegates it to a team of AI agents, runs every
              answer through a quality gate, and synthesizes the result. Every hand-off
              leaves an audit trail.
            </p>
          </div>

          <div className="rounded-[8px] border border-border bg-bg-panel/80 p-6">
            <DelegationTrail
              stages={AMBIENT_STAGES}
              size="full"
              className="mx-auto max-w-xl"
              aria-label="How NEXUS works: task, decomposed, delegated to agents, quality gate, synthesized"
            />
          </div>
        </div>
      </div>

      {/* Right - auth panel */}
      <div className="flex flex-col bg-bg-panel">
        <div className="flex items-center justify-between p-4 lg:hidden">
          <Wordmark />
        </div>
        <div className="my-auto w-full max-w-[400px] px-6 py-10 sm:px-10">{children}</div>
      </div>
    </div>
  )
}