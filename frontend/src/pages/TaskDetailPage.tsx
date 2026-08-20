import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, Link, useNavigate } from 'react-router'
import { listTasks, runTask, deleteTask, resumeTask, stopTask, fetchTaskOutputs } from '../features/tasks/tasksSlice'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { AgentAvatar } from '../components/AgentAvatar'
import { RoleBadge } from '../components/RoleBadge'
import { Skeleton } from '../components/Skeleton'
import { CollapsiblePanel } from '../components/ui/collapsible-panel'
import { DelegationTrail } from '../components/ui/delegation-trail'
import type { TrailStage } from '../components/ui/delegation-trail'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { useNotify } from '../components/ui/use-notify'
import { cn } from '../lib/cn'

// Transcript (incl. react-markdown) loads only when this page opens
const TranscriptView = lazy(() =>
  import('../components/ui/transcript-view').then((m) => ({ default: m.TranscriptView })),
)

const TRAIL_STAGES: TrailStage[] = [
  { id: 'task', label: 'Task', sub: 'incoming' },
  { id: 'decompose', label: 'Decomposed', sub: 'planning' },
  { id: 'delegate', label: 'Delegated', sub: 'workers' },
  { id: 'gate', label: 'Quality Gate', sub: 'review', gate: true },
  { id: 'synthesis', label: 'Synthesized', sub: 'final output' },
]

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

export default function TaskDetailPage() {
  const { taskId = '' } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { tasks, loading, outputs, outputsLoading, outputsError } = useSelector((state: RootState) => state.tasks)
  const { teams } = useSelector((state: RootState) => state.teams)
  const { agents } = useSelector((state: RootState) => state.agents)

  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const notify = useNotify()

  useEffect(() => {
    dispatch(listTasks())
    dispatch(listTeams())
    dispatch(listAgents())
  }, [dispatch])

  const task = tasks.find((t) => t.id === taskId)

  useEffect(() => {
    if (taskId && task?.status === 'done') {
      dispatch(fetchTaskOutputs(taskId))
    }
  }, [taskId, task?.status, dispatch])

  const team = task?.team_id ? teams.find((t) => t.id === task!.team_id) || null : null
  const agentNames = team
    ? team.agent_ids.map((id) => agents.find((a) => a.id === id)?.name).filter((n): n is string => Boolean(n))
    : []

  const isRunningThis = runningTaskId === taskId
  const isAwaiting = task?.status === 'awaiting_review'
  const canRun = task && (task.status === 'pending' || task.status === 'done' || task.status === 'failed') && !isRunningThis
  const failed = task?.status === 'failed'

  const handleRun = async () => {
    setRunningTaskId(taskId)
    try {
      await dispatch(runTask({ taskId })).unwrap()
    } catch (err) {
      const message = typeof err === 'string' ? err : 'The run failed before the team finished.'
      notify.error(`${message} Open the transcript to see what happened.`)
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleStop = async () => {
    try {
      await dispatch(stopTask(taskId)).unwrap()
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't stop the run - ${err}` : "Couldn't stop the run")
    }
  }

  const handleStreamDone = useCallback(() => {
    dispatch(listTasks())
  }, [dispatch])

  const handleApprove = async () => {
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: true } })).unwrap()
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't approve the plan - ${err}` : "Couldn't approve the plan")
    } finally {
      setRunningTaskId(null)
    }
  }

  const openReject = () => {
    setFeedback('')
    setShowRejectModal(true)
  }

  const handleReject = async () => {
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: false, feedback: feedback.trim() || undefined } })).unwrap()
      setShowRejectModal(false)
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't reject the plan - ${err}` : "Couldn't reject the plan")
    } finally {
      setRunningTaskId(null)
    }
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await dispatch(deleteTask(taskId)).unwrap()
      notify.success('Task deleted')
      navigate('/tasks')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't delete the task - ${err}` : "Couldn't delete the task")
      setDeleting(false)
      setDeletingId(null)
    }
  }

  const latestOutput = outputs && outputs.length > 0 ? outputs[outputs.length - 1] : null

  return (
    <AppShell active="tasks">
      {loading && !task ? (
        <div className="space-y-5" aria-label="Loading task">
          <Skeleton className="h-6 w-56" />
          <div className="surface p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        </div>
      ) : !task ? (
        <div className="surface p-8 text-center">
          <p className="text-sm text-text-secondary">This task no longer exists.</p>
          <Link to="/tasks" className="mt-4 inline-block text-sm font-semibold text-accent-amber hover:underline underline-offset-4">
            Back to tasks
          </Link>
        </div>
      ) : (
        <div className="page-enter">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/tasks"
                className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-text-secondary transition-colors hover:text-text-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
                Tasks
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-lg font-semibold text-text-primary">
                  {task.id.slice(0, 8)}
                </h1>
                <StatusBadge status={task.status || 'pending'} spinner={isRunningThis} />
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-text-secondary tabular">
                Created {new Date(task.created_at).toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAwaiting && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleApprove()}
                    disabled={isRunningThis}
                    className="border-status-online/50 text-status-online hover:bg-status-online/10"
                  >
                    {isRunningThis ? 'Approving\u2026' : 'Approve plan'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={openReject}
                    disabled={isRunningThis}
                    className="text-status-error hover:bg-status-error/10"
                  >
                    Reject
                  </Button>
                </>
              )}
              {canRun && (
                <Button
                  onClick={handleRun}
                  disabled={isRunningThis}
                  className="bg-accent-amber text-bg-base hover:bg-accent-amber/90"
                >
                  {isRunningThis && (
                    <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                  )}
                  {task.status === 'pending' ? 'Run task' : 'Re-run task'}
                </Button>
              )}
              <button
                onClick={() => setDeletingId(task.id)}
                disabled={isRunningThis}
                className="grid size-10 place-items-center rounded-field text-text-secondary transition-colors hover:bg-status-error/10 hover:text-status-error disabled:opacity-45"
                aria-label="Delete task"
                title="Delete task"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
              </button>
            </div>
          </div>

          {/* Full Delegation Trail */}
          <section className="surface p-5 sm:p-6" aria-label="Delegation trail">
            <DelegationTrail
              stages={TRAIL_STAGES}
              activeIndex={trailIndexFor(task.status || 'pending')}
              size="full"
              aria-label="Delegation trail for this task"
            />
          </section>

          {/* Main + transcript panel */}
          <div className="mt-6 flex min-h-0 gap-6">
            <div className="min-w-0 flex-1 space-y-6">
              {/* Description + team */}
              <section className="surface p-5 sm:p-6" aria-label="Task details">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  Task
                </h2>
                <p className="mt-2.5 text-base leading-relaxed text-text-primary text-pretty">
                  {task.description}
                </p>
                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                    Team
                  </p>
                  {team ? (
                    <>
                      <div className="mt-2.5 flex items-center gap-3">
                        <div className="flex -space-x-1.5">
                          {agentNames.slice(0, 4).map((name) => (
                            <AgentAvatar key={name} name={name} className="size-8 text-[10px] ring-2 ring-bg-panel" />
                          ))}
                          {agentNames.length > 4 && (
                            <span className="grid size-8 place-items-center rounded-lg bg-console font-mono text-[10px] font-semibold text-text-secondary ring-2 ring-bg-panel">
                              +{agentNames.length - 4}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text-primary">{team.name}</p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent-amber">
                            {team.pattern || 'sequential'} pattern
                          </p>
                        </div>
                      </div>
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {team.agent_ids.map((id) => {
                          const agent = agents.find((a) => a.id === id)
                          if (!agent) return null
                          return (
                            <li
                              key={id}
                              className="inline-flex items-center gap-2 rounded-field border border-border bg-bg-panel px-2.5 py-1.5"
                            >
                              <AgentAvatar name={agent.name} className="size-6 text-[9px]" />
                              <span className="text-xs font-medium text-text-primary">{agent.name}</span>
                              {agent.role && <RoleBadge role={agent.role} />}
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-2.5 text-sm text-text-secondary">No team assigned</p>
                  )}
                </div>
              </section>

              {/* Output summary */}
              {task.status === 'done' || task.status === 'failed' ? (
                <section className="surface p-5 sm:p-6" aria-label="Task output">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                      Output
                    </h2>
                    {outputsLoading && (
                      <span className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                        Loading\u2026
                      </span>
                    )}
                  </div>
                  {outputsError && (
                    <p className="text-sm text-status-error" role="alert">{outputsError}</p>
                  )}
                  {latestOutput ? (
                    <div
                      className={cn(
                        'markdown rounded-field border border-border bg-bg-base px-4 py-3 text-sm leading-relaxed text-text-primary',
                      )}
                    >
                      {typeof latestOutput.content === 'string'
                        ? latestOutput.content
                        : JSON.stringify(latestOutput.content, null, 2)}
                    </div>
                  ) : (
                    !outputsLoading && (
                      <p className="text-sm text-text-secondary">
                        {failed ? 'The run failed - open the transcript to see what happened.' : 'No output recorded yet.'}
                      </p>
                    )
                  )}
                </section>
              ) : null}
            </div>

            {/* Transcript - collapsible side panel, sticky while the page scrolls */}
            <div className="hidden h-[calc(100dvh-220px)] min-w-0 flex-1 lg:block xl:flex-none xl:w-[420px]">
              <div className="sticky top-6 h-full overflow-hidden rounded-[8px] border border-border bg-bg-panel">
                <CollapsiblePanel storageKey="task-detail-transcript" label="Transcript" width={420} className="h-full" contentClassName="bg-bg-panel">
                  <div className="h-full min-h-0">
                    <Suspense
                      fallback={
                        <div className="flex h-full items-center justify-center gap-2.5 p-6 text-sm text-text-secondary">
                          <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                          Loading transcript\u2026
                        </div>
                      }
                    >
                      <TranscriptView
                        task={task}
                        teamName={team?.name || (task.team_id ? task.team_id : 'No team')}
                        teamPattern={team?.pattern || null}
                        agentNames={agentNames}
                        outputs={outputs ?? []}
                        outputsLoading={outputsLoading}
                        outputsError={outputsError}
                        runningTaskId={runningTaskId}
                        streaming={isRunningThis || task.status === 'running'}
                        onStop={handleStop}
                        onStreamDone={handleStreamDone}
                        onReRun={() => handleRun()}
                        onApprove={handleApprove}
                        onReject={openReject}
                      />
                    </Suspense>
                  </div>
                </CollapsiblePanel>
              </div>
            </div>
          </div>

          {/* Mobile: transcript below */}
          <div className="mt-6 lg:hidden">
            <section className="surface p-5">
              <h2 className="mb-3 text-sm font-semibold text-text-primary">Transcript</h2>
              <Suspense
                fallback={
                  <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                    <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" aria-hidden="true" />
                    Loading transcript\u2026
                  </div>
                }
              >
                <TranscriptView
                  task={task}
                  teamName={team?.name || (task.team_id ? task.team_id : 'No team')}
                  teamPattern={team?.pattern || null}
                  agentNames={agentNames}
                  outputs={outputs ?? []}
                  outputsLoading={outputsLoading}
                  outputsError={outputsError}
                  runningTaskId={runningTaskId}
                  streaming={isRunningThis || task.status === 'running'}
                  onStop={handleStop}
                  onStreamDone={handleStreamDone}
                  onReRun={() => handleRun()}
                  onApprove={handleApprove}
                  onReject={openReject}
                />
              </Suspense>
            </section>
          </div>
        </div>
      )}

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
              onClick={handleReject}
              disabled={isRunningThis}
            >
              {isRunningThis ? 'Revising\u2026' : 'Reject plan'}
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
            <strong>{task?.description || 'This task'}</strong> and its transcript will be
            removed. This cannot be undone.
          </>
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting\u2026' : 'Delete task'}
            </Button>
          </>
        }
      />
    </AppShell>
  )
}