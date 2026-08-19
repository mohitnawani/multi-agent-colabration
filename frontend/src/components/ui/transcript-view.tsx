import { cn } from '../../lib/cn'
import type { AgentOutput, Task } from '../../types'
import { AgentAvatar } from '../AgentAvatar'
import { StatusBadge } from '../StatusBadge'
import { Skeleton } from '../Skeleton'
import { Button } from './button'

type StationState = 'idle' | 'running' | 'done' | 'failed' | 'review'

interface Station {
  id: string
  label: string
  sub: string
  state: StationState
  gate?: boolean
}

const LAMP_FOR: Record<StationState, string> = {
  idle: 'lamp-idle',
  running: 'lamp-running',
  done: 'lamp-done',
  failed: 'lamp-failed',
  review: 'lamp-review',
}

function buildStations(task: Task, agentNames: string[], outputs: AgentOutput[]): Station[] {
  const status = task.status
  const stations: Station[] = [
    { id: 'start', label: 'Start', sub: 'workflow entry', state: status === 'failed' ? 'done' : 'done' },
    {
      id: 'supervisor',
      label: task.team_id ? 'Supervisor' : 'Run',
      sub: 'coordination',
      state: status === 'failed' ? 'done' : status === 'running' ? 'running' : 'done',
    },
  ]

  const names = outputs.length > 0 ? outputs.map((o) => o.agent_name) : agentNames
  if (names.length > 0) {
    stations.push({
      id: 'agents',
      label: names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0],
      sub: names.length > 1 ? `${names.length} workers` : 'worker',
      state:
        status === 'failed' || status === 'done'
          ? 'done'
          : status === 'running'
            ? 'running'
            : status === 'awaiting_review'
              ? 'done'
              : 'idle',
    })
  }

  stations.push({
    id: 'gate',
    label: 'Quality gate',
    sub: 'review',
    state:
      status === 'awaiting_review'
        ? 'review'
        : status === 'failed'
          ? 'done'
          : status === 'running'
            ? 'idle'
            : 'done',
    gate: true,
  })

  stations.push({
    id: 'end',
    label: 'End',
    sub: status === 'failed' ? 'run stopped' : 'final output',
    state: status === 'failed' ? 'failed' : status === 'done' ? 'done' : 'idle',
  })

  return stations
}

export function TranscriptView({
  task,
  teamName,
  teamPattern,
  agentNames,
  outputs,
  outputsLoading,
  outputsError,
  runningTaskId,
  onReRun,
  onApprove,
  onReject,
}: {
  task: Task
  teamName: string
  teamPattern?: string | null
  agentNames: string[]
  outputs: AgentOutput[]
  outputsLoading: boolean
  outputsError: string | null
  runningTaskId: string | null
  onReRun: (taskId: string) => void
  onApprove: (taskId: string) => void
  onReject: (taskId: string) => void
}) {
  const stations = buildStations(task, agentNames, outputs)
  const isRunningThis = runningTaskId === task.id

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-ink">
            {task.description || 'Untitled task'}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-ink-muted">
            {teamName}
            {teamPattern ? ` · ${teamPattern} pattern` : ''} · {task.id.slice(0, 8)} ·{' '}
            {new Date(task.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={task.status} spinner={isRunningThis} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        {/* Run schematic — the hand-off visible */}
        <div className="rounded-field border border-base-300 bg-console/60 p-4">
          <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Run route
          </p>
          <ol className="space-y-0">
            {stations.map((s, i) => (
              <li key={s.id} className="relative flex items-start gap-3 pb-5 last:pb-0">
                {i < stations.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute left-[3.5px] top-4 h-full w-px',
                      s.state === 'done' || s.state === 'running'
                        ? s.state === 'running'
                          ? 'bg-lamp-running/60'
                          : 'bg-lamp-done/40'
                        : 'bg-base-300',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'lamp mt-1',
                    s.gate ? 'size-2.5 rotate-45 rounded-[2px]' : undefined,
                    LAMP_FOR[s.state],
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      s.state === 'done'
                        ? 'text-ink'
                        : s.state === 'running'
                          ? 'text-lamp-running'
                          : s.state === 'failed'
                            ? 'text-lamp-failed'
                            : s.state === 'review'
                              ? 'text-lamp-review'
                              : 'text-ink-muted',
                    )}
                  >
                    {s.label}
                  </p>
                  <p className="truncate font-mono text-[10px] text-ink-muted/80">{s.sub}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Transcript body */}
        <div className="min-w-0 space-y-5">
          {task.status === 'running' && (
            <div className="flex items-start gap-3 rounded-field bg-lamp-running/8 p-4 ring-1 ring-inset ring-lamp-running/20">
              <span className="lamp lamp-running mt-1" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-lamp-running">Run in progress</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  The team is working through the run. This transcript fills in as agents hand
                  off.
                </p>
              </div>
            </div>
          )}

          {task.status === 'failed' && (
            <div className="rounded-field bg-lamp-failed/8 p-4 ring-1 ring-inset ring-lamp-failed/20">
              <p className="text-sm font-semibold text-lamp-failed">Run failed</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                The run stopped before the team finished. The transcript below shows what each
                agent produced before the failure. Check the team's agents and tools, then
                re-run the task.
              </p>
              <div className="mt-3">
                <Button size="sm" variant="danger" onClick={() => onReRun(task.id)} disabled={isRunningThis}>
                  {isRunningThis ? 'Running…' : 'Re-run task'}
                </Button>
              </div>
            </div>
          )}

          {task.status === 'awaiting_review' && (
            <div className="rounded-field bg-lamp-review/8 p-4 ring-1 ring-inset ring-lamp-review/20">
              <p className="text-sm font-semibold text-lamp-review">Plan awaiting approval</p>
              <p className="mt-1 text-sm text-ink-muted">
                The team prepared a plan and paused before executing. Approve it to continue, or
                reject it with feedback so the team revises.
              </p>
              {task.subtasks && task.subtasks.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {(task.subtasks as { id: string; agent: string; description: string }[]).map((s) => (
                    <li key={s.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 shrink-0 rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted ring-1 ring-inset ring-line">
                        {s.agent}
                      </span>
                      <span className="text-ink-muted">{s.description}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => onApprove(task.id)} disabled={isRunningThis}>
                  {isRunningThis ? 'Executing…' : 'Approve and execute'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(task.id)} disabled={isRunningThis}>
                  Reject with feedback
                </Button>
              </div>
            </div>
          )}

          {task.status === 'done' && task.final_output && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Final output
              </h4>
              <div className="max-h-64 overflow-y-auto rounded-field border border-base-300 bg-console/60 p-4 text-sm leading-relaxed whitespace-pre-wrap text-ink">
                {task.final_output}
              </div>
            </section>
          )}

          {task.status === 'done' && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Agent hand-offs
              </h4>
              {outputsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : outputsError ? (
                <p className="rounded-field bg-lamp-failed/8 p-3 text-sm text-lamp-failed ring-1 ring-inset ring-lamp-failed/20">
                  {outputsError}
                </p>
              ) : outputs.length > 0 ? (
                <ul className="space-y-3">
                  {outputs.map((out) => {
                    const score = out.quality_score
                    return (
                      <li key={out.id} className="overflow-hidden rounded-field border border-base-300">
                        <div className="flex flex-wrap items-center gap-2.5 border-b border-base-300 bg-console/60 px-4 py-2.5">
                          <AgentAvatar name={out.agent_name} className="size-7 text-[10px]" />
                          <span className="text-sm font-semibold text-ink">{out.agent_name}</span>
                          {out.revision_round > 0 && (
                            <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-muted ring-1 ring-inset ring-line">
                              rev {out.revision_round}
                            </span>
                          )}
                          {score !== null && (
                            <span
                              className={cn(
                                'ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                score >= 0.7
                                  ? 'bg-lamp-done/8 text-lamp-done ring-lamp-done/20'
                                  : 'bg-lamp-review/8 text-lamp-review ring-lamp-review/20',
                              )}
                            >
                              <span className={cn('lamp', score >= 0.7 ? 'lamp-done' : 'lamp-review')} />
                              quality {score.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="max-h-56 overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
                          {out.content || 'No content.'}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="rounded-field border border-dashed border-base-300 p-4 text-sm text-ink-muted">
                  No agent answers recorded for this run.
                </p>
              )}
            </section>
          )}

          {task.status !== 'done' && task.status !== 'failed' && task.status !== 'running' && task.status !== 'awaiting_review' && (
            <div className="flex items-start gap-3 rounded-field bg-console/60 p-4 ring-1 ring-inset ring-base-300">
              <span className="lamp lamp-idle mt-1" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-ink">Queued</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  This task hasn't run yet. Run it to see the team's hand-offs here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
