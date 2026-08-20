import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { listTasks, createTask, runTask, deleteTask, resumeTask, stopTask, fetchTaskOutputs } from '../features/tasks/tasksSlice'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import type { Team, Task } from '../types'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { AgentAvatar } from '../components/AgentAvatar'
import { RoleBadge } from '../components/RoleBadge'
import { Skeleton } from '../components/Skeleton'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { useNotify } from '../components/ui/use-notify'
import { cn } from '../lib/cn'

// Transcript (incl. react-markdown) loads only when a transcript is opened
const TranscriptView = lazy(() =>
  import('../components/ui/transcript-view').then((m) => ({ default: m.TranscriptView })),
)

const createTaskSchema = z.object({
  team_id: z.string().min(1, 'Select a team'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be at most 1000 characters'),
  require_approval: z.boolean(),
})

type CreateTaskFormData = z.infer<typeof createTaskSchema>

type StatusFilter = 'all' | 'pending' | 'running' | 'awaiting_review' | 'done' | 'failed'

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Queued' },
  { id: 'running', label: 'Running' },
  { id: 'awaiting_review', label: 'Review' },
  { id: 'done', label: 'Done' },
  { id: 'failed', label: 'Failed' },
]

export default function TasksPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { tasks, loading: tasksLoading, error: tasksError, outputs, outputsLoading, outputsError } = useSelector((state: RootState) => state.tasks)
  const { teams, loading: teamsLoading } = useSelector((state: RootState) => state.teams)
  const { agents } = useSelector((state: RootState) => state.agents)

  const [filter, setFilter] = useState<StatusFilter>('all')
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const notify = useNotify()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { team_id: '', description: '', require_approval: false },
  })

  const selectedTeamId = watch('team_id')
  const selectedTeam = teams.find((t: Team) => t.id === selectedTeamId)

  useEffect(() => {
    dispatch(listTasks())
    dispatch(listTeams())
    dispatch(listAgents())
  }, [dispatch])

  const selectedTask: Task | undefined = tasks.find((t) => t.id === selectedTaskId)

  useEffect(() => {
    if (selectedTaskId && selectedTask?.status === 'done') {
      dispatch(fetchTaskOutputs(selectedTaskId))
    }
  }, [selectedTaskId, selectedTask?.status, dispatch])

  const onSubmit = async (data: CreateTaskFormData) => {
    setSubmitting(true)
    try {
      await dispatch(createTask({
        team_id: data.team_id,
        description: data.description,
        require_approval: data.require_approval,
      })).unwrap()
      reset({ team_id: '', description: '', require_approval: false })
      setShowCreateModal(false)
      notify.success('Task queued')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't create the task - ${err}` : "Couldn't create the task")
    } finally {
      setSubmitting(false)
    }
  }

  const openTranscript = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowTranscript(true)
  }

  const handleRun = async (taskId: string) => {
    // Open the transcript right away so the live hand-offs stream in as the
    // team works; the run itself resolves when it finishes (or stops).
    setRunningTaskId(taskId)
    openTranscript(taskId)
    try {
      await dispatch(runTask({ taskId })).unwrap()
    } catch (err) {
      const message = typeof err === 'string' ? err : 'The run failed before the team finished.'
      notify.error(`${message} Open the transcript to see what happened.`)
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleStop = async (taskId: string) => {
    try {
      await dispatch(stopTask(taskId)).unwrap()
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't stop the run - ${err}` : "Couldn't stop the run")
    }
  }

  const handleStreamDone = useCallback(() => {
    // The run reached a terminal event (done / stopped / failed): refresh the
    // task list; the outputs effect below picks up 'done' automatically.
    dispatch(listTasks())
  }, [dispatch])

  const handleApprove = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: true } })).unwrap()
      openTranscript(taskId)
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't approve the plan - ${err}` : "Couldn't approve the plan")
    } finally {
      setRunningTaskId(null)
    }
  }

  const openReject = (taskId: string) => {
    setRejectingTaskId(taskId)
    setFeedback('')
    setShowRejectModal(true)
  }

  const handleReject = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: false, feedback: feedback.trim() || undefined } })).unwrap()
      setShowRejectModal(false)
      openTranscript(taskId)
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't reject the plan - ${err}` : "Couldn't reject the plan")
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleDelete = (id: string) => setDeletingId(id)

  const confirmDelete = async (id: string) => {
    setDeleting(true)
    try {
      await dispatch(deleteTask(id)).unwrap()
      notify.success('Task deleted')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't delete the task - ${err}` : "Couldn't delete the task")
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  const getTeam = (teamId: string | null) => {
    if (!teamId) return null
    return teams.find((t: Team) => t.id === teamId) || null
  }

  const getAgentNames = (teamId: string | null) => {
    const team = getTeam(teamId)
    if (!team) return []
    return team.agent_ids
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter((n): n is string => Boolean(n))
  }

  const isBusy = tasksLoading || teamsLoading
  const deletingTask = deletingId ? tasks.find((t) => t.id === deletingId) : undefined

  const visibleTasks =
    filter === 'all'
      ? tasks
      : tasks.filter((t) => (t.status || 'pending') === filter)

  return (
    <AppShell active="tasks">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-text-primary">
            Tasks
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary text-pretty">
            A task runs end-to-end against a team - you can watch every hand-off live.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={teams.length === 0}
          title={teams.length === 0 ? 'Create a team first' : undefined}
          className="bg-accent-amber text-bg-base hover:bg-accent-amber/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Start task
        </Button>
      </header>

      {tasksError && (
        <div className="mb-6 flex items-start gap-2.5 rounded-field bg-status-error/10 px-4 py-3 text-sm text-status-error ring-1 ring-inset ring-status-error/25" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          {tasksError}
        </div>
      )}

      {/* Filter chips - mono, uppercase; active chip carries the amber accent */}
      {tasks.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter tasks by status">
          {FILTERS.map((f) => {
            const count =
              f.id === 'all'
                ? tasks.length
                : tasks.filter((t) => (t.status || 'pending') === f.id).length
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={cn(
                  'rounded-[4px] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150',
                  'ring-1 ring-inset ring-border',
                  filter === f.id
                    ? 'bg-accent-amber text-bg-base ring-accent-amber'
                    : 'text-text-secondary hover:bg-bg-panel-raised hover:text-text-primary',
                )}
              >
                {f.label} <span className="opacity-60 tabular">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {isBusy && tasks.length === 0 ? (
        <div className="grid grid-cols-1 gap-4" aria-label="Loading tasks">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5">
              <Skeleton className="mb-3 h-4 w-3/4" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="surface">
          {teams.length === 0 ? (
            <EmptyState
              title="Tasks run against a team"
              tint="bg-mod-tasks/10 text-mod-tasks ring-mod-tasks/25"
              flow="tasks"
              description={
                <>
                  A task is a prompt executed end-to-end by a team of agents. Build a team
                  first — <Link to="/teams" className="font-semibold text-text-primary underline underline-offset-4">group some agents under a pattern</Link> — then start tasks here.
                </>
              }
            >
              <Link to="/teams">
                <Button>Create Team</Button>
              </Link>
            </EmptyState>
          ) : (
            <EmptyState
              title="No tasks yet"
              tint="bg-mod-tasks/10 text-mod-tasks ring-mod-tasks/25"
              flow="tasks"
              description="Start a task and the team executes it end-to-end - you can watch the hand-offs live in the transcript."
            >
              <Button onClick={() => setShowCreateModal(true)} className="bg-accent-amber text-bg-base hover:bg-accent-amber/90">
                Start task
              </Button>
            </EmptyState>
          )}
        </div>
      ) : visibleTasks.length === 0 ? (
        <p className="rounded-field border border-dashed border-border p-8 text-center text-sm text-text-secondary">
          No tasks match this status yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleTasks.map((task) => {
            const isRunningThis = runningTaskId === task.id
            const canRun = (task.status === 'pending' || task.status === 'done' || task.status === 'failed') && !isRunningThis
            const isAwaiting = task.status === 'awaiting_review'
            const hasResult = task.status === 'done' || task.status === 'failed' || task.status === 'awaiting_review'
            const failed = task.status === 'failed'
            const team = getTeam(task.team_id)
            const agentNames = getAgentNames(task.team_id)

            return (
              <li key={task.id}>
                <article className="surface p-4 transition-colors duration-150 hover:bg-bg-panel-raised sm:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-text-primary text-pretty">
                        {task.description || 'No description'}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-text-secondary/80 tabular">
                        <span>{task.id.slice(0, 8)}</span>
                        <span>{new Date(task.created_at).toLocaleString()}</span>
                        {team && (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-accent-amber">{team.pattern || 'sequential'}</span>
                            <span className="text-text-secondary/50">·</span>
                            {team.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={task.status || 'pending'} spinner={isRunningThis} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="flex items-center gap-1.5">
                      {agentNames.slice(0, 3).map((name) => (
                        <AgentAvatar key={name} name={name} className="size-6 text-[9px] ring-2 ring-bg-panel" />
                      ))}
                      {agentNames.length > 3 && (
                        <span className="grid size-6 place-items-center rounded-md bg-console font-mono text-[9px] font-semibold text-text-secondary">
                          +{agentNames.length - 3}
                        </span>
                      )}
                      {agentNames.length === 0 && (
                        <span className="text-[10px] text-text-secondary">No team assigned</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {hasResult && (
                        <button
                          onClick={() => openTranscript(task.id)}
                          className={cn(
                            'grid size-8 place-items-center rounded-field transition-colors',
                            failed
                              ? 'text-status-error hover:bg-status-error/10'
                              : 'text-text-secondary hover:bg-bg-panel-raised hover:text-text-primary',
                          )}
                          aria-label={failed ? 'View transcript - see what failed' : 'View transcript'}
                          title={failed ? 'View transcript - see what failed' : 'View transcript'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                        </button>
                      )}
                      {isAwaiting && (
                        <>
                          <button
                            onClick={() => handleApprove(task.id)}
                            disabled={isBusy}
                            className="grid size-8 place-items-center rounded-field bg-status-online text-bg-base transition-colors hover:bg-status-online/90 disabled:opacity-45"
                            aria-label="Approve plan and execute"
                            title="Approve plan and execute"
                          >
                            {isRunningThis
                              ? <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                              : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>}
                          </button>
                          <button
                            onClick={() => openReject(task.id)}
                            disabled={isBusy}
                            className="grid size-8 place-items-center rounded-field border border-border text-text-secondary transition-colors hover:border-status-error/40 hover:text-status-error disabled:opacity-45"
                            aria-label="Reject plan with feedback"
                            title="Reject plan with feedback"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </>
                      )}
                      {(task.status === 'pending' || task.status === 'done' || task.status === 'failed') && (
                        <button
                          onClick={() => handleRun(task.id)}
                          disabled={!canRun || isBusy}
                          className={cn(
                            'grid size-8 place-items-center rounded-field transition-colors disabled:opacity-45',
                            failed
                              ? 'border border-status-error/40 text-status-error hover:bg-status-error/10'
                              : 'bg-accent-amber text-bg-base hover:bg-accent-amber/90',
                          )}
                          aria-label={task.status === 'pending' ? 'Run task' : 'Re-run task'}
                          title={task.status === 'pending' ? 'Run task' : 'Re-run task'}
                        >
                          {isRunningThis
                            ? <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                            : <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={isBusy || isRunningThis}
                        className="grid size-8 place-items-center rounded-field text-text-secondary transition-colors hover:bg-status-error/10 hover:text-status-error disabled:opacity-45"
                        aria-label="Delete task"
                        title="Delete task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {/* Create task */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Start a task"
        description="The team executes this description end-to-end."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" form="create-task-form" disabled={submitting} className="bg-accent-amber text-bg-base hover:bg-accent-amber/90">
              {submitting ? 'Starting\u2026' : 'Start task'}
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="task-team">
              Team
            </label>
            <select
              id="task-team"
              className={cn(
                'h-10 w-full rounded-field border border-line bg-bg-base px-3 text-sm text-text-primary focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20',
                errors.team_id ? 'border-status-error' : 'border-line',
              )}
              {...register('team_id')}
            >
              <option value="">Select a team</option>
              {teams.map((team: Team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.pattern || 'sequential'})
                </option>
              ))}
            </select>
            {errors.team_id && <p className="mt-1.5 text-xs text-status-error" role="alert">{errors.team_id.message}</p>}

            {/* Agent preview - what the team will actually run */}
            {selectedTeam && (
              <div className="mt-3 rounded-field border border-border bg-console p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  This team runs
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {selectedTeam.agent_ids.map((id) => {
                    const agent = agents.find((a) => a.id === id)
                    if (!agent) return null
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-[4px] border border-border bg-bg-panel px-2 py-1">
                        <AgentAvatar name={agent.name} className="size-5 text-[8px]" />
                        <span className="text-xs font-medium text-text-primary">{agent.name}</span>
                        {agent.role && <RoleBadge role={agent.role} />}
                      </span>
                    )
                  })}
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent-amber">
                  {selectedTeam.pattern || 'sequential'} pattern
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="task-description">
              Task description
            </label>
            <textarea
              id="task-description"
              placeholder="Describe the task for the team to execute\u2026"
              className={cn(
                'min-h-[110px] w-full rounded-field border border-line bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60',
                'focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20',
                errors.description ? 'border-status-error' : 'border-line',
              )}
              {...register('description')}
            />
            {errors.description && <p className="mt-1.5 text-xs text-status-error" role="alert">{errors.description.message}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <span className="relative inline-flex">
              <input
                type="checkbox"
                className="peer size-4 appearance-none rounded-[4px] border border-line bg-bg-base transition-colors checked:border-accent-amber checked:bg-accent-amber focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-amber"
                {...register('require_approval')}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 m-auto text-bg-base opacity-0 transition-opacity peer-checked:opacity-100"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm text-text-secondary">
              Pause for my approval before the team executes
            </span>
          </label>
        </form>
      </Modal>

      {/* Reject plan with feedback */}
      <Modal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject plan"
        description="The team will revise the plan based on your feedback and pause for approval again."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => rejectingTaskId && handleReject(rejectingTaskId)}
              disabled={runningTaskId === rejectingTaskId}
            >
              {runningTaskId === rejectingTaskId ? 'Revising\u2026' : 'Reject plan'}
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="reject-feedback">
            Feedback (optional)
          </label>
          <textarea
            id="reject-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should the plan do differently?"
            className="min-h-[110px] w-full rounded-field border border-line bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20"
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deletingId}
        onClose={() => !deleting && setDeletingId(null)}
        title="Delete task?"
        size="sm"
        description={
          <>
            <strong>{deletingTask?.description || 'This task'}</strong> and its transcript will be
            removed. This cannot be undone.
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deletingId && confirmDelete(deletingId)} disabled={deleting}>
              {deleting ? 'Deleting\u2026' : 'Delete task'}
            </Button>
          </>
        }
      />

      {/* Task transcript */}
      <Modal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        title="Task transcript"
        description="Every hand-off in the run, in order."
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-text-secondary">
              Status and agent answers update from the latest run.
            </span>
            <Button variant="ghost" onClick={() => setShowTranscript(false)}>Close</Button>
          </div>
        }
      >
        {selectedTask ? (
          <Suspense
            fallback={
              <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                Loading transcript\u2026
              </div>
            }
          >
            <TranscriptView
              task={selectedTask}
              teamName={selectedTask.team_id ? teams.find((t) => t.id === selectedTask.team_id)?.name || selectedTask.team_id : 'No team'}
              teamPattern={getTeam(selectedTask.team_id)?.pattern || null}
              agentNames={getAgentNames(selectedTask.team_id)}
              outputs={outputs ?? []}
              outputsLoading={outputsLoading}
              outputsError={outputsError}
              runningTaskId={runningTaskId}
              streaming={runningTaskId === selectedTask.id || selectedTask.status === 'running'}
              onStop={() => handleStop(selectedTask.id)}
              onStreamDone={handleStreamDone}
              onReRun={handleRun}
              onApprove={handleApprove}
              onReject={openReject}
            />
          </Suspense>
        ) : (
          <p className="text-sm text-text-secondary">This task's transcript is no longer available.</p>
        )}
      </Modal>
    </AppShell>
  )
}