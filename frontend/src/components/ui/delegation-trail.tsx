import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { AgentAvatar } from '../AgentAvatar'

export type TrailNodeState = 'pending' | 'active' | 'done'

export interface TrailStage {
  id: string
  label: string
  /** Raw system line under the label - mono layer, e.g. agent id / count */
  sub?: string
  /** Optional wall-clock timestamp (full variant only) */
  timestamp?: string
  /** Quality gate renders as a diamond instead of a circle */
  gate?: boolean
  /** Agent avatars fan out on the "Delegated" stage */
  agentNames?: string[]
}

/**
 * Delegation Trail - NEXUS's signature element. A connected node strip:
 * Task -> Decomposed -> Delegated [agent avatars] -> Quality Gate ->
 * Synthesized, live-updating with a subtle pulse on the active node.
 * On mount, nodes light up in sequence (150ms stagger) - the one
 * orchestrated moment in the product; everything else stays quiet.
 *
 * `size="full"` adds timestamps and a richer node layout for the task
 * detail page; `size="mini"` is the compact dashboard strip.
 */
export function DelegationTrail({
  stages,
  activeIndex = -1,
  size = 'full',
  className,
  'aria-label': ariaLabel = 'Delegation trail',
}: {
  stages: TrailStage[]
  activeIndex?: number
  size?: 'mini' | 'full'
  className?: string
  'aria-label'?: string
}) {
  const reduced = useReducedMotion()
  const [lit, setLit] = useState<number[]>([])
  // Snapshot the stage count once - the light-up sequence runs once on mount
  // and must not re-trigger if the parent recreates the stages array.
  const stageCount = useRef(stages.length).current

  useEffect(() => {
    if (reduced) {
      setLit(Array.from({ length: stageCount }, (_, i) => i))
      return
    }
    let n = 0
    const t = setInterval(() => {
      n += 1
      setLit(Array.from({ length: Math.min(n, stageCount) }, (_, i) => i))
      if (n >= stageCount) clearInterval(t)
    }, 150)
    return () => clearInterval(t)
  }, [reduced, stageCount])

  const isMini = size === 'mini'

  return (
    <div
      className={cn('select-none', className)}
      aria-label={ariaLabel}
      role="img"
    >
      <ol
        className={cn(
          'flex items-stretch',
          isMini ? 'gap-0' : 'flex-col gap-2 md:flex-row md:items-center md:gap-0',
        )}
      >
        {stages.map((stage, i) => {
          const state: TrailNodeState =
            i === activeIndex
              ? 'active'
              : i < activeIndex || (activeIndex < 0 && lit.includes(i))
                ? 'done'
                : 'pending'
          const done = state === 'done'
          const active = state === 'active'

          return (
            <li key={stage.id} className={cn('flex items-center', isMini ? 'min-w-0 flex-1' : 'md:flex-1')}>
              <div className={cn('flex w-full items-center', !isMini && 'flex-row gap-3 md:flex-col md:gap-2')}>
                {/* Node */}
                <div
                  className={cn(
                    'relative grid shrink-0 place-items-center rounded-full border',
                    isMini ? 'size-7' : 'size-11 md:size-12',
                    'trail-node',
                    active && 'trail-node--active',
                    stage.gate && 'trail-node--gate',
                    done && 'trail-node--lit',
                  )}
                  style={{ animationDelay: done ? `${i * 150}ms` : undefined }}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'trail-node__glyph grid place-items-center rounded-full',
                      isMini ? 'size-4' : 'size-6',
                      stage.gate
                        ? 'border border-current'
                        : cn(done && 'trail-node--lit'),
                      done
                        ? 'bg-status-online/15 text-status-online'
                        : active
                          ? 'bg-accent-amber-dim text-accent-amber'
                          : 'bg-console text-text-secondary',
                    )}
                    style={{ animationDelay: done ? `${i * 150}ms` : undefined }}
                  >
                    {done && !stage.gate && (
                      <svg xmlns="http://www.w3.org/2000/svg" width={isMini ? 10 : 14} height={isMini ? 10 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                    {active && !stage.gate && (
                      <span className="absolute -inset-1 rounded-full border border-accent-amber/40" aria-hidden="true" />
                    )}
                  </span>
                </div>

                {/* Label block */}
                <div className={cn('min-w-0', isMini ? 'ml-2 truncate' : 'flex-1 md:mt-2 md:text-center')}>
                  <p
                    className={cn(
                      'truncate font-semibold',
                      isMini ? 'text-[11px] leading-tight' : 'text-xs md:text-sm',
                      done
                        ? 'text-text-primary'
                        : active
                          ? 'text-accent-amber'
                          : 'text-text-secondary',
                    )}
                  >
                    {stage.label}
                  </p>
                  {(stage.sub || stage.timestamp) && (
                    <p
                      className={cn(
                        'truncate font-mono',
                        isMini ? 'text-[9px]' : 'text-[10px] md:text-[11px]',
                        done ? 'text-text-secondary' : 'text-text-secondary/70',
                      )}
                    >
                      {stage.timestamp ? (
                        <>
                          <span className="tabular">{stage.timestamp}</span>
                          {stage.sub && <span className="hidden sm:inline"> · {stage.sub}</span>}
                        </>
                      ) : (
                        stage.sub
                      )}
                    </p>
                  )}
                  {!isMini && stage.agentNames && stage.agentNames.length > 0 && (
                    <div className="mt-1.5 flex items-center md:justify-center">
                      <div className="flex -space-x-1.5">
                        {stage.agentNames.map((name) => (
                          <AgentAvatar
                            key={name}
                            name={name}
                            className="size-6 text-[9px] ring-2 ring-bg-base"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {i < stages.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'trail-line shrink-0',
                    isMini
                      ? 'mx-1 h-px flex-1'
                      : 'h-px flex-1 md:mx-2 md:h-px',
                    !isMini && 'hidden md:block',
                    done ? 'bg-status-online/50' : active ? 'bg-accent-amber/60' : 'bg-border',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}