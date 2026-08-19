import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { listTasks, createTask, runTask, deleteTask, resumeTask, fetchTaskOutputs } from '../features/tasks/tasksSlice'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import type { AgentOutput, Team, Task } from '../types'
import { AppNavbar } from '../components/AppNavbar'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { TableSkeleton } from '../components/Skeleton'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { useNotify } from '../components/ui/use-notify'
import { TranscriptView } from '../components/ui/transcript-view'
import { cn } from '../lib/cn'

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

export default function TasksPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { tasks, loading: tasksLoading, error: tasksError, outputs, outputsLoading, outputsError } = useSelector((state: RootState) => state.tasks)
  const { teams, loading: teamsLoading } = useSelector((state: RootState) => state.teams)
  const { agents } = useSelector((state: RootState) => state.agents)

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
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { team_id: '', description: '', require_approval: false },
  })

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
      notify.success('Task created')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't create the task â€” ${err}` : "Couldn't create the task")
    } finally {
      setSubmitting(false)
    }
  }

  const openTranscript = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowTranscript(true)
  }

  const handleRun = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await dispatch(runTask({ taskId })).unwrap()
      openTranscript(taskId)
    } catch (err) {
      const message = typeof err === 'string' ? err : 'The run failed before the team finished.'
      notify.error(`${message} Open the transcript to see what happened.`)
      openTranscript(taskId)
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleApprove = async (taskId: string) => {
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: true } })).unwrap()
      openTranscript(taskId)
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't approve the plan â€” ${err}` : "Couldn't approve the plan")
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
      notify.error(typeof err === 'string' ? `Couldn't reject the plan â€” ${err}` : "Couldn't reject the plan")
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
      notify.error(typeof err === 'string' ? `Couldn't delete the task â€” ${err}` : "Couldn't delete the task")
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'No team'
    return teams.find((t: Team) => t.id === teamId)?.name || teamId
  }

  const getTeamPattern = (teamId: string | null) => {
    if (!teamId) return null
    return teams.find((t: Team) => t.id === teamId)?.pattern || null
  }

  const getAgentNames = (teamId: string | null) => {
    if (!teamId) return []
    const team = teams.find((t: Team) => t.id === teamId)
    if (!team) return []
    return team.agent_ids
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter((n): n is string => Boolean(n))
  }

  const isBusy = tasksLoading || teamsLoading
  const deletingTask = deletingId ? tasks.find((t) => t.id === deletingId) : undefined

  return (
    <div className="min-h-dvh bg-base-200">
      <AppNavbar active="tasks" />

      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl page-enter">
          <PageHeader
            title="Tasks"
            subtitle="Run collaborative tasks and track each team's progress."
            actions={
              <Button
                onClick={() => setShowCreateModal(true)}
                disabled={teams.length === 0}
                title={teams.length === 0 ? 'Create a team first' : undefined}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Create Task
              </Button>
            }
          />

          {tasksError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-field bg-lamp-failed/10 px-4 py-3 text-sm text-lamp-failed ring-1 ring-inset ring-lamp-failed/25" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              {tasksError}
            </div>
          )}

          {isBusy && tasks.length === 0 ? (
            <TableSkeleton rows={4} cols={4} />
          ) : tasks.length === 0 ? (
            <div className="surface">
              {teams.length === 0 ? (
                <EmptyState
                  title="Tasks run against a team"
                  description={
                    <>
                      A task is a prompt executed end-to-end by a team of agents. Build a team
                      first â€” <Link to="/teams" className="font-semibold text-ink underline underline-offset-4">group some agents under a pattern</Link> â€” then create tasks here.
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
                  description="Create a task and the team executes it end-to-end â€” you can watch the hand-offs live in the transcript."
                >
                  <Button onClick={() => setShowCreateModal(true)}>Create Task</Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <div className="surface overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Team</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const isRunningThis = runningTaskId === task.id
                    const canRun = (task.status === 'pending' || task.status === 'done' || task.status === 'failed') && !isRunningThis
                    const isAwaiting = task.status === 'awaiting_review'
                    const hasResult = task.status === 'done' || task.status === 'failed' || task.status === 'awaiting_review'
                    const failed = task.status === 'failed'

                    return (
                      <tr key={task.id} className="transition-colors hover:bg-console/70">
                        <td className="max-w-xs truncate font-medium text-ink">
                          {task.description || 'No description'}
                        </td>
                        <td className="text-ink-muted">{getTeamName(task.team_id)}</td>
                        <td>
                          <StatusBadge status={task.status || 'pending'} spinner={isRunningThis} />
                        </td>
                        <td className="font-mono text-xs text-ink-muted/80 tabular">
                          {new Date(task.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {hasResult && (
                              <button
                                onClick={() => openTranscript(task.id)}
                                className={cn(
                                  'grid size-8 place-items-center rounded-field transition-colors',
                                  failed
                                    ? 'text-lamp-failed hover:bg-lamp-failed/10'
                                    : 'text-ink-muted hover:bg-console hover:text-ink',
                                )}
                                aria-label={failed ? 'View transcript â€” see what failed' : 'View transcript'}
                                title={failed ? 'View transcript â€” see what failed' : 'View transcript'}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                              </button>
                            )}
                            {isAwaiting && (
                              <>
                                <button
                                  onClick={() => handleApprove(task.id)}
                                  disabled={isBusy}
                                  className="grid size-8 place-items-center rounded-field bg-lamp-done text-white transition-colors hover:bg-lamp-done/90 disabled:opacity-45"
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
                                  className="grid size-8 place-items-center rounded-field border border-line text-ink-muted transition-colors hover:border-lamp-failed/40 hover:text-lamp-failed disabled:opacity-45"
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
                                    ? 'border border-lamp-failed/40 text-lamp-failed hover:bg-lamp-failed/10'
                                    : 'bg-primary text-primary-content hover:bg-primary/90',
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
                              className="grid size-8 place-items-center rounded-field text-ink-muted transition-colors hover:bg-lamp-failed/10 hover:text-lamp-failed disabled:opacity-45"
                              aria-label="Delete task"
                              title="Delete task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create task */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create task"
        description="The team executes this description end-to-end."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" form="create-task-form" disabled={submitting}>
              {submitting ? 'Creatingâ€¦' : 'Create task'}
            </Button>
          </>
        }
      >
        <form id="create-task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="task-team">
              Team
            </label>
            <select
              id="task-team"
              className="h-10 w-full rounded-field border border-line bg-base-100 px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
              {...register('team_id')}
            >
              <option value="">Select a team</option>
              {teams.map((team: Team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.pattern || 'sequential'})
                </option>
              ))}
            </select>
            {errors.team_id && <p className="mt-1.5 text-xs text-lamp-failed" role="alert">{errors.team_id.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="task-description">
              Task description
            </label>
            <textarea
              id="task-description"
              placeholder="Describe the task for the team to executeâ€¦"
              className={cn(
                'min-h-[110px] w-full rounded-field border bg-base-100 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60',
                'focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15',
                errors.description ? 'border-lamp-failed' : 'border-line',
              )}
              {...register('description')}
            />
            {errors.description && <p className="mt-1.5 text-xs text-lamp-failed" role="alert">{errors.description.message}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <span className="relative inline-flex">
              <input
                type="checkbox"
                className="peer size-4 appearance-none rounded-[4px] border border-line bg-base-100 transition-colors checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
                className="pointer-events-none absolute inset-0 m-auto text-primary-content opacity-0 transition-opacity peer-checked:opacity-100"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span className="text-sm text-ink-muted">
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
              {runningTaskId === rejectingTaskId ? 'Revisingâ€¦' : 'Reject plan'}
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="reject-feedback">
            Feedback (optional)
          </label>
          <textarea
            id="reject-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should the plan do differently?"
            className="min-h-[110px] w-full rounded-field border border-line bg-base-100 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
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
              {deleting ? 'Deletingâ€¦' : 'Delete task'}
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
            <span className="text-xs text-ink-muted">
              Status and agent answers update from the latest run.
            </span>
            <Button variant="ghost" onClick={() => setShowTranscript(false)}>Close</Button>
          </div>
        }
      >
        {selectedTask ? (
          <TranscriptView
            task={selectedTask}
            teamName={getTeamName(selectedTask.team_id)}
            teamPattern={getTeamPattern(selectedTask.team_id)}
            agentNames={getAgentNames(selectedTask.team_id)}
            outputs={outputs as AgentOutput[]}
            outputsLoading={outputsLoading}
            outputsError={outputsError}
            runningTaskId={runningTaskId}
            onReRun={handleRun}
            onApprove={handleApprove}
            onReject={openReject}
          />
        ) : (
          <p className="text-sm text-ink-muted">This task's transcript is no longer available.</p>
        )}
      </Modal>
    </div>
  )
}
