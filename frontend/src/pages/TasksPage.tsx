import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { listTasks, createTask, runTask, deleteTask, resumeTask } from '../features/tasks/tasksSlice'
import { listTeams } from '../features/teams/teamsSlice'
import type { RootState, AppDispatch } from '../store'
import type { Team, Task } from '../types'

const createTaskSchema = z.object({
  team_id: z.string().min(1, 'Select a team'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  require_approval: z.boolean(),
})

type CreateTaskFormData = z.infer<typeof createTaskSchema>

const STATUS_STYLES: Record<string, string> = {
  pending: 'badge-neutral',
  running: 'badge-info',
  done: 'badge-success',
  failed: 'badge-error',
  awaiting_review: 'badge-warning',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  awaiting_review: 'Awaiting Review',
}

export default function TasksPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { tasks, loading: tasksLoading, error: tasksError } = useSelector((state: RootState) => state.tasks)
  const { teams, loading: teamsLoading } = useSelector((state: RootState) => state.teams)

  const [runningTaskId, setRunningTaskId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const createDialogRef = useRef<HTMLDialogElement>(null)
  const deleteDialogRef = useRef<HTMLDialogElement>(null)
  const resultDialogRef = useRef<HTMLDialogElement>(null)
  const rejectDialogRef = useRef<HTMLDialogElement>(null)

  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

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
  }, [dispatch])

  // Look up the selected task fresh from the store every render, rather than
  // relying on a single shared "last run result" — this is what made the
  // eye icon show stale or wrong data for any task other than the most
  // recently run one.
  const selectedTask: Task | undefined = tasks.find((t) => t.id === selectedTaskId)

  const openCreateModal = () => createDialogRef.current?.showModal()
  const closeCreateModal = () => createDialogRef.current?.close()

  const openResultModal = (taskId: string) => {
    setSelectedTaskId(taskId)
    resultDialogRef.current?.showModal()
  }

  const openDeleteModal = (id: string) => {
    setDeletingId(id)
    deleteDialogRef.current?.showModal()
  }
  const closeDeleteModal = () => {
    deleteDialogRef.current?.close()
    setDeletingId(null)
  }

  const onSubmit = async (data: CreateTaskFormData) => {
    setActionError(null)
    try {
      await dispatch(createTask({
        team_id: data.team_id,
        description: data.description,
        require_approval: data.require_approval,
      })).unwrap()
      reset({ team_id: '', description: '', require_approval: false })
      closeCreateModal()
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not create the task. Try again.')
    }
  }

  const handleRun = async (taskId: string) => {
    setActionError(null)
    setRunningTaskId(taskId)
    try {
      await dispatch(runTask({ taskId })).unwrap()
      openResultModal(taskId)
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'The task run failed. Check the team configuration and try again.')
    } finally {
      setRunningTaskId(null)
    }
  }

  const handleApprove = async (taskId: string) => {
    setActionError(null)
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: true } })).unwrap()
      openResultModal(taskId)
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not approve the plan. Try again.')
    } finally {
      setRunningTaskId(null)
    }
  }

  const openRejectModal = (taskId: string) => {
    setRejectingTaskId(taskId)
    setFeedback('')
    rejectDialogRef.current?.showModal()
  }

  const closeRejectModal = () => {
    rejectDialogRef.current?.close()
    setRejectingTaskId(null)
  }

  const handleReject = async (taskId: string) => {
    setActionError(null)
    setRunningTaskId(taskId)
    try {
      await dispatch(resumeTask({ taskId, payload: { approval: false, feedback: feedback.trim() || undefined } })).unwrap()
      closeRejectModal()
      openResultModal(taskId)
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not reject the plan. Try again.')
    } finally {
      setRunningTaskId(null)
    }
  }

  const confirmDelete = async (id: string) => {
    setActionError(null)
    try {
      await dispatch(deleteTask(id)).unwrap()
    } catch (err) {
      setActionError(typeof err === 'string' ? err : 'Could not delete the task. Try again.')
    } finally {
      closeDeleteModal()
    }
  }

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'No team'
    return teams.find((t: Team) => t.id === teamId)?.name || teamId
  }

  const isBusy = tasksLoading || teamsLoading

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start">
          <Link to="/dashboard" className="btn btn-ghost text-xl font-bold">Multi-Agent Collaboration</Link>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/dashboard" className="btn btn-ghost">Dashboard</Link></li>
            <li><Link to="/teams" className="btn btn-ghost">Teams</Link></li>
            <li><Link to="/agents" className="btn btn-ghost">Agents</Link></li>
            <li><Link to="/tasks" className="btn btn-ghost active">Tasks</Link></li>
          </ul>
        </div>
      </nav>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-base-content">Tasks</h1>
            <button
              onClick={openCreateModal}
              disabled={teams.length === 0}
              className="btn btn-primary gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Create Task
            </button>
          </div>

          {(tasksError || actionError) && (
            <div className="alert alert-error mb-6" role="alert">
              <span>{actionError || tasksError}</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setActionError(null)} aria-label="Dismiss error">
                ✕
              </button>
            </div>
          )}

          {tasks.length === 0 && !isBusy && (
            <div className="card bg-base-100 border border-base-300 text-center py-12">
              <p className="text-base-content/60 mb-4">
                {teams.length === 0
                  ? 'Create a team before you can create a task.'
                  : 'No tasks yet. Create your first task to see it run here.'}
              </p>
              <button onClick={openCreateModal} disabled={teams.length === 0} className="btn btn-primary mx-auto">
                {teams.length === 0 ? 'Create Team First' : 'Create Task'}
              </button>
            </div>
          )}

          {tasks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
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

                    return (
                      <tr key={task.id}>
                        <td className="max-w-xs truncate text-base-content">{task.description || 'No description'}</td>
                        <td className="text-base-content">{getTeamName(task.team_id)}</td>
                        <td>
                          <span className={`badge ${STATUS_STYLES[task.status || 'pending']}`}>
                            {isRunningThis && <span className="loading loading-spinner loading-xs mr-1" />}
                            {STATUS_LABELS[task.status || 'pending']}
                          </span>
                        </td>
                        <td className="text-base-content/50 text-sm">{new Date(task.created_at).toLocaleDateString()}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasResult && (
                              <button
                                onClick={() => openResultModal(task.id)}
                                className="btn btn-ghost btn-sm btn-circle"
                                aria-label="View result"
                                title="View result"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                              </button>
                            )}
                            {isAwaiting && (
                              <>
                                <button
                                  onClick={() => handleApprove(task.id)}
                                  disabled={isBusy}
                                  className="btn btn-success btn-sm btn-circle"
                                  aria-label="Approve plan"
                                  title="Approve plan and execute"
                                >
                                  {isRunningThis
                                    ? <span className="loading loading-spinner loading-xs" />
                                    : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                </button>
                                <button
                                  onClick={() => openRejectModal(task.id)}
                                  disabled={isBusy}
                                  className="btn btn-error btn-sm btn-circle"
                                  aria-label="Reject plan"
                                  title="Reject plan with feedback"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </>
                            )}
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleRun(task.id)}
                                disabled={!canRun || isBusy}
                                className="btn btn-primary btn-sm btn-circle"
                                aria-label="Run task"
                                title="Run task"
                              >
                                {isRunningThis
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                              </button>
                            )}
                            {task.status !== 'pending' && !isAwaiting && (
                              <button
                                onClick={() => handleRun(task.id)}
                                disabled={!canRun || isBusy}
                                className="btn btn-primary btn-sm btn-circle"
                                aria-label="Re-run task"
                                title="Re-run task"
                              >
                                {isRunningThis
                                  ? <span className="loading loading-spinner loading-xs" />
                                  : <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>}
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(task.id)}
                              disabled={isBusy || isRunningThis}
                              className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                              aria-label="Delete task"
                              title="Delete task"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
      <dialog ref={createDialogRef} className="modal" onClose={closeCreateModal}>
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-xl mb-4">Create Task</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content">Team</span>
              </label>
              <select {...register('team_id')} className="select select-bordered w-full max-w-xs">
                <option value="">Select a team</option>
                {teams.map((team: Team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.pattern || 'sequential'})
                  </option>
                ))}
              </select>
              {errors.team_id && (
                <label className="label text-error">
                  <span className="label-text-alt">{errors.team_id.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-base-content">Task Description</span>
              </label>
              <textarea
                placeholder="Describe the task for the team to execute…"
                className="textarea textarea-bordered w-full min-h-[100px]"
                {...register('description')}
              />
              {errors.description && (
                <label className="label text-error">
                  <span className="label-text-alt">{errors.description.message}</span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  {...register('require_approval')}
                />
                <span className="label-text text-base-content">
                  Pause for my approval before the team executes
                </span>
              </label>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeCreateModal}>Cancel</button>
              <button type="submit" disabled={isBusy} className="btn btn-primary">
                {isBusy ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* Delete confirmation */}
      <dialog ref={deleteDialogRef} className="modal" onClose={closeDeleteModal}>
        <div className="modal-box max-w-sm">
          <h3 className="font-bold text-lg mb-3">Delete task?</h3>
          <p className="text-base-content/70 mb-4">This action cannot be undone.</p>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={closeDeleteModal}>Cancel</button>
            <button
              type="button"
              className="btn btn-error"
              onClick={() => deletingId && confirmDelete(deletingId)}
            >
              Delete
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* Reject plan with feedback */}
      <dialog ref={rejectDialogRef} className="modal" onClose={closeRejectModal}>
        <div className="modal-box max-w-md">
          <h3 className="font-bold text-lg mb-3">Reject Plan</h3>
          <p className="text-base-content/70 mb-4">
            The team will revise the plan based on your feedback and pause for approval again.
          </p>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-base-content">Feedback (optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What should the plan do differently?"
              className="textarea textarea-bordered w-full min-h-[100px]"
            />
          </div>
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={closeRejectModal}>Cancel</button>
            <button
              type="button"
              disabled={runningTaskId === rejectingTaskId}
              className="btn btn-error"
              onClick={() => rejectingTaskId && handleReject(rejectingTaskId)}
            >
              {runningTaskId === rejectingTaskId ? 'Revising…' : 'Reject Plan'}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {/* Task result */}
      <dialog ref={resultDialogRef} className="modal" onClose={() => setSelectedTaskId(null)}>
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-xl mb-4">Task Result</h3>
          {selectedTask ? (
            <div className="space-y-4">
              <div>
                <label className="label"><span className="label-text">Status</span></label>
                <span className={`badge ${STATUS_STYLES[selectedTask.status]}`}>
                  {STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </span>
              </div>
              <div>
                <label className="label"><span className="label-text">Final Output</span></label>
                <pre className="mockup-code w-full min-h-[200px] max-h-[400px] overflow-auto whitespace-pre-wrap rounded-box border border-base-300 p-4 bg-base-200">
                  {selectedTask.final_output || 'No output yet.'}
                </pre>
              </div>
              {selectedTask.status === 'awaiting_review' && selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div>
                  <label className="label"><span className="label-text">Plan Awaiting Approval</span></label>
                  <ul className="space-y-2">
                    {(selectedTask.subtasks as { id: string; agent: string; description: string }[]).map((s) => (
                      <li key={s.id} className="flex items-start gap-2 text-sm">
                        <span className="badge badge-outline badge-sm mt-0.5 shrink-0">{s.agent}</span>
                        <span className="text-base-content/80">{s.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedTask.agent_outputs && Object.keys(selectedTask.agent_outputs).length > 0 && (
                <div>
                  <label className="label"><span className="label-text">Agent Quality Scores</span></label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedTask.agent_outputs).map(([agent, score]) => (
                      <span key={agent} className="badge badge-outline">
                        {agent}: {typeof score === 'number' ? score.toFixed(2) : String(score)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-base-content/60">This task's result is no longer available.</p>
          )}
          <div className="modal-action">
            <button type="button" className="btn btn-primary" onClick={() => resultDialogRef.current?.close()}>Close</button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>
    </div>
  )
}