import type { ReactNode } from 'react'
import { DelegationTrail } from '../ui/delegation-trail'
import type { TrailStage } from '../ui/delegation-trail'

const LOGO = '/nexus-logo.png'
const CANVAS_ART = '/abstract-hand-painted-modern-art-canvas-design-background_1048-19282.webp'

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
 * Auth canvas - split 55/45. Left: the abstract canvas art full-bleed behind
 * the Delegation Trail rendered large and ambient as the thesis (this is the
 * product, not a stock illustration). Right: the auth panel on bg-panel.
 * Flat panels, hairline borders, no gradients or glassmorphism. A dark scrim
 * keeps the wordmark, headline, and trail legible over the art.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-bg-base lg:grid-cols-[55fr_45fr]">
      {/* Left - canvas art + ambient Delegation Trail */}
      <div className="relative hidden overflow-hidden border-r border-border lg:block">
        <img
          src={CANVAS_ART}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Scrim - heavier on the left where the copy sits, lighter on the right */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-bg-base/85 via-bg-base/60 to-bg-base/35"
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10">
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

          <div className="rounded-[8px] border border-border bg-bg-panel/90 p-6">
            <DelegationTrail
              stages={AMBIENT_STAGES}
              size="full"
              className="mx-auto max-w-xl"
              aria-label="How NEXUS works: task, decomposed, delegated to agents, quality gate, synthesized"
            />
          </div>
        </div>
      </div>

      {/* Right - auth panel, fills the frame without scrolling */}
      <div className="flex h-dvh flex-col overflow-y-auto bg-bg-panel">
        <div className="relative overflow-hidden lg:hidden">
          <img
            src={CANVAS_ART}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-bg-base/70" />
          <div className="relative z-10 p-4">
            <Wordmark />
          </div>
        </div>
        <div className="my-auto flex w-full flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>
      </div>
    </div>
  )
}