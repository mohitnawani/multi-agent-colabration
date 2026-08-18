import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { listTeams, createTeam, deleteTeam } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'

const createTeamSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  pattern: z.enum(['sequential', 'parallel', 'debate', 'supervisor']),
  agent_ids: z.array(z.string()).min(1, 'Select at least one agent'),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

const PATTERN_LABELS: Record<string, string> = {
  sequential: 'Sequential — assembly line, one after another',
  parallel: 'Parallel — all agents work simultaneously, then synthesis',
  debate: 'Debate — agents argue for/against, judge picks winner',
  supervisor: 'Supervisor — lead agent coordinates workers',
}

const PATTERN_COLORS: Record<string, string> = {
  sequential: 'badge-primary',
  parallel: 'badge-secondary',
  debate: 'badge-accent',
  supervisor: 'badge-warning',
}

export default function TeamsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { teams, loading: teamsLoading, error: teamsError } = useSelector((state: RootState) => state.teams)
  const { agents, loading: agentsLoading } = useSelector((state: RootState) => state.agents)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', pattern: 'sequential', agent_ids: [] },
  })

  const selectedAgentIds = watch('agent_ids')

  useEffect(() => {
    dispatch(listTeams())
    dispatch(listAgents())
  }, [dispatch])

  const onSubmit = (data: CreateTeamFormData) => {
    dispatch(createTeam(data)).then(() => {
      reset({ name: '', pattern: 'sequential', agent_ids: [] })
      setShowCreateModal(false)
    })
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = (id: string) => {
    dispatch(deleteTeam(id))
    setDeletingId(null)
  }

  const getAgentNames = (agentIds: string[]) => {
    return agentIds
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'No agents assigned'
  }

  const isSubmitting = teamsLoading || agentsLoading

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start">
          <a className="btn btn-ghost text-xl font-bold">Multi-Agent Collaboration</a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><a className="btn btn-ghost" href="/dashboard">Dashboard</a></li>
            <li><a className="btn btn-ghost active" href="/teams">Teams</a></li>
            <li><a className="btn btn-ghost" href="/agents">Agents</a></li>
          </ul>
        </div>
      </nav>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-base-content">Teams</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={agents.length === 0}
              className="btn btn-primary gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Team
            </button>
          </div>

          {teamsError && (
            <div className="alert alert-error mb-6" role="alert">
              <span>{teamsError}</span>
            </div>
          )}

          {teams.length === 0 && !isSubmitting && (
            <div className="card bg-base-100 border border-base-300 text-center py-12">
              <p className="text-base-content/60 mb-4">
                No teams yet. {agents.length === 0 ? 'Create agents first, then build a team.' : 'Create your first team.'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={agents.length === 0}
                className="btn btn-primary"
              >
                {agents.length === 0 ? 'Create Agents First' : 'Create Team'}
              </button>
            </div>
          )}

          {teams.length > 0 && (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Pattern</th>
                    <th>Agents</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id}>
                      <td className="font-medium text-base-content">{team.name}</td>
                      <td>
                        <span className={`badge ${PATTERN_COLORS[team.pattern || 'sequential']}`}>
                          {team.pattern || 'sequential'}
                        </span>
                      </td>
                      <td className="max-w-xs truncate text-base-content/70">{getAgentNames(team.agent_ids)}</td>
                      <td className="text-base-content/50 text-sm">{new Date(team.created_at).toLocaleDateString()}</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                          aria-label="Delete team"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <>
        {/* Create Team Modal */}
        <input type="checkbox" id="create-team-modal" className="modal-toggle" checked={showCreateModal} onChange={() => setShowCreateModal(false)} />
        <div className="modal">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-xl mb-4">Create Team</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">Team Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Research Team"
                  className="input input-bordered w-full"
                  {...register('name')}
                />
                {errors.name && (
                  <label className="label text-error">
                    <span className="label-text-alt">{errors.name.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">Collaboration Pattern</span>
                </label>
                <select
                  {...register('pattern')}
                  className="select select-bordered w-full max-w-xs"
                >
                  <option value="sequential">Sequential</option>
                  <option value="parallel">Parallel</option>
                  <option value="debate">Debate</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                <p className="label-text-alt text-base-content/60">
                  {PATTERN_LABELS[watch('pattern') || 'sequential']}
                </p>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">Agents ({selectedAgentIds.length} selected)</span>
                </label>
                {agents.length === 0 ? (
                  <p className="text-base-content/50 text-sm">Create agents first on the Agents page.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border border-base-300 rounded p-3">
                    {agents.map((agent) => (
                      <label key={agent.id} className="label cursor-pointer justify-start gap-2 hover:bg-base-200 rounded p-2 transition-colors">
                        <input
                          type="checkbox"
                          value={agent.id}
                          {...register('agent_ids')}
                          className="checkbox checkbox-primary"
                        />
                        <span className="text-base-content">{agent.name}</span>
                        {agent.role && <span className="badge badge-sm badge-outline">{agent.role}</span>}
                      </label>
                    ))}
                  </div>
                )}
                {errors.agent_ids && (
                  <label className="label text-error">
                    <span className="label-text-alt">{errors.agent_ids.message}</span>
                  </label>
                )}
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting || agents.length === 0} className="btn btn-primary">
                  {isSubmitting ? 'Creating…' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Delete Confirm Modal */}
        {deletingId && (
          <>
            <input type="checkbox" id="delete-team-modal" className="modal-toggle" checked={true} />
            <div className="modal">
              <div className="modal-box max-w-sm">
                <h3 className="font-bold text-lg mb-3">Delete Team?</h3>
                <p className="text-base-content/70 mb-4">This action cannot be undone.</p>
                <div className="modal-action">
                  <button type="button" className="btn btn-ghost" onClick={() => setDeletingId(null)}>Cancel</button>
                  <button type="button" className="btn btn-error" onClick={() => confirmDelete(deletingId)}>Delete</button>
                </div>
              </div>
            </div>
          </>
        )}
      </>
    </div>
  )
}