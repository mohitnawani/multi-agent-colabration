import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import { listTasks } from '../features/tasks/tasksSlice'
import type { RootState, AppDispatch } from '../store'
import type { Task } from '../types'
import { AppShell } from '../components/AppShell'
import { Skeleton } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { AgentAvatar } from '../components/AgentAvatar'
import { DelegationTrail } from '../components/ui/delegation-trail'
import type { TrailStage } from '../components/ui/delegation-trail'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'

const TRAIL_STAGES: TrailStage[] = [
  { id: 'task', label: 'Task', sub: 'incoming' },
  { id: 'decompose', label: 'Decomposed', sub: 'planning' },
  { id: 'delegate', label: 'Delegated', sub: 'workers' },
  { id: 'gate', label: 'Quality Gate', sub: 'review', gate: true },
  { id: 'synthesis', label: 'Synthesized', sub: 'final output' },
]

/** Map a task's status to the delegation-trail active stage index. */
function trailIndexFor(status: string): number {
  switch (status) {
    case 'running':
      return 2
    case 'awaiting_review':
      return 3
    case 'done':
      return 4
    case 'failed':
      return 3
    default:
      return -1
  }
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const teams = useSelector((state: RootState) => state.teams.teams)
  const agents = useSelector((state: RootState) => state.agents.agents)
  const tasks = useSelector((state: RootState) => state.tasks.tasks)
  const teamsLoading = useSelector((state: RootState) => state.teams.loading)
  const agentsLoading = useSelector((state: RootState) => state.agents.loading)
  const tasksLoading = useSelector((state: RootState) => state.tasks.loading)

  useEffect(() => {
    dispatch(listTeams())
    dispatch(listAgents())
    dispatch(listTasks())
  }, [dispatch])

  const loading = teamsLoading || agentsLoading || tasksLoading
  const isEmpty = !loading && teams.length === 0 && agents.length === 0 && tasks.length === 0

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'awaiting_review').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const failedTasks = tasks.filter((t) => t.status === 'failed').length
  const ran = doneTasks + failedTasks
  const passRate = ran > 0 ? Math.round((doneTasks / ran) * 100) : null

  const stats = [
    { label: 'Active Tasks', value: String(activeTasks) },
    { label: 'Agents Online', value: String(agents.length) },
    { label: 'Running Teams', value: String(teams.length) },
    { label: 'Quality Gate Pass Rate', value: passRate === null ? '\u2014' : `${passRate}%` },
  ]

  const recentTasks = [...tasks].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
  const latestTask = recentTasks[0]

  return (
    <AppShell active="dashboard">
      {loading && teams.length === 0 && agents.length === 0 && tasks.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading summary">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface p-5">
              <Skeleton className="mb-4 h-4 w-24" />
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          title="Nothing running yet"
          tint="bg-accent-amber-dim text-accent-amber ring-accent-amber/25"
          flow="tasks"
          description="Describe a task, pick a team, and NEXUS decomposes it, delegates it to the agents, and synthesizes the result. Start with your first task."
        >
          <Link to="/tasks">
            <Button className="bg-accent-amber text-bg-base hover:bg-accent-amber/90">Create a task</Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {/* Stat cards - numbers in mono, labels in Plex secondary */}
          <section aria-label="Workspace summary">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="surface p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {s.label}
                  </p>
                  <p className="mt-2 font-mono text-3xl font-semibold tabular text-text-primary">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Mini Delegation Trail - most recent task, live */}
          {latestTask && (
            <section className="surface p-5 sm:p-6" aria-label="Latest task delegation trail">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                    Latest run
                  </h2>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-text-secondary">
                    {latestTask.id.slice(0, 8)} · {new Date(latestTask.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={latestTask.status || 'pending'} />
              </div>
              <DelegationTrail
                stages={TRAIL_STAGES}
                activeIndex={trailIndexFor(latestTask.status || 'pending')}
                size="mini"
                aria-label="Delegation trail for the latest task"
              />
            </section>
          )}

          {/* Two columns: active teams + recent tasks */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <section aria-label="Active agent teams">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  Active Agent Teams
                </h2>
                <Link to="/teams" className="text-xs font-semibold text-accent-amber hover:underline underline-offset-4">
                  View all
                </Link>
              </div>
              {teams.length === 0 ? (
                <p className="rounded-[8px] border border-dashed border-border p-5 text-sm text-text-secondary">
                  No teams yet. <Link to="/teams" className="font-semibold text-accent-amber hover:underline underline-offset-4">Build one</Link> from your agents.
                </p>
              ) : (
                <ul className="space-y-3">
                  {teams.slice(0, 4).map((team) => {
                    const members = team.agent_ids
                      .map((id) => agents.find((a) => a.id === id)?.name)
                      .filter((n): n is string => Boolean(n))
                    return (
                      <li key={team.id}>
                        <Link
                          to="/teams"
                          className="group flex items-center gap-3.5 rounded-[8px] border border-border bg-bg-panel p-4 transition-colors duration-150 hover:bg-bg-panel-raised"
                        >
                          <span className="lamp lamp-done" aria-hidden="true" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text-primary">
                              {team.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-secondary">
                              {team.pattern || 'sequential'} pattern
                            </p>
                          </div>
                          <div className="flex shrink-0 -space-x-1.5">
                            {members.slice(0, 4).map((name) => (
                              <AgentAvatar key={name} name={name} className="size-7 text-[9px] ring-2 ring-bg-panel" />
                            ))}
                            {members.length > 4 && (
                              <span className="grid size-7 place-items-center rounded-lg bg-console text-[9px] font-semibold text-text-secondary ring-2 ring-bg-panel">
                                +{members.length - 4}
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-label="Recent tasks">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  Recent Tasks
                </h2>
                <Link to="/tasks" className="text-xs font-semibold text-accent-amber hover:underline underline-offset-4">
                  View all
                </Link>
              </div>
              {recentTasks.length === 0 ? (
                <p className="rounded-[8px] border border-dashed border-border p-5 text-sm text-text-secondary">
                  No tasks yet. <Link to="/tasks" className="font-semibold text-accent-amber hover:underline underline-offset-4">Create one</Link>.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentTasks.map((task: Task) => (
                    <li key={task.id}>
                      <Link
                        to={`/tasks/${task.id}`}
                        className="group flex items-center gap-3.5 rounded-[8px] border border-border bg-bg-panel p-4 transition-colors duration-150 hover:bg-bg-panel-raised"
                      >
                        <span className="shrink-0 font-mono text-[10px] text-text-secondary">
                          {task.id.slice(0, 8)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-text-primary">
                            {task.description || 'No description'}
                          </p>
                          <p className="mt-0.5 font-mono text-[10px] text-text-secondary/70 tabular">
                            {new Date(task.created_at).toLocaleString()}
                          </p>
                        </div>
                        <StatusBadge status={task.status || 'pending'} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </AppShell>
  )
}