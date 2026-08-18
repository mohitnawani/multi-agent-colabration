import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { listAgents, createAgentFromTemplate, deleteAgent } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import type { Template } from '../types'

const createAgentSchema = z.object({
  template_key: z.string().min(1, 'Select a template'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  system_prompt: z.string().optional(),
})

type CreateAgentFormData = z.infer<typeof createAgentSchema>

const TEMPLATE_LABELS: Record<string, string> = {
  researcher: 'Researcher — web search, note taking',
  writer: 'Writer — clear, structured content',
  analyst: 'Analyst — data analysis, patterns, risks',
  critic: 'Critic — find weaknesses, fact-check',
  developer: 'Developer — clean, idiomatic code',
  designer: 'Designer — creative, visual ideas',
}

export default function AgentsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { agents, loading, error } = useSelector((state: RootState) => state.agents)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAgentFormData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: { template_key: 'researcher', name: '', system_prompt: '' },
  })

  useEffect(() => {
    dispatch(listAgents())
    apiGetTemplates()
  }, [dispatch])

  const apiGetTemplates = async () => {
    try {
      const res = await (await fetch('/api/templates')).json()
      setTemplates(res)
    } catch {
      console.error('Failed to load templates')
    }
  }

  const onSubmit = (data: CreateAgentFormData) => {
    dispatch(createAgentFromTemplate(data)).then(() => {
      reset()
      setShowCreateModal(false)
    })
  }

  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = (id: string) => {
    dispatch(deleteAgent(id))
    setDeletingId(null)
  }

  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

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
            <li><Link to="/agents" className="btn btn-ghost active">Agents</Link></li>
            <li><Link to="/tasks" className="btn btn-ghost">Tasks</Link></li>
          </ul>
        </div>
      </nav>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-base-content">Agents</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Agent
            </button>
          </div>

          {error && (
            <div className="alert alert-error mb-6" role="alert">
              <span>{error}</span>
            </div>
          )}

          {agents.length === 0 && !loading && (
            <div className="card bg-base-100 border border-base-300 text-center py-12">
              <p className="text-base-content/60 mb-4">No agents yet. Create your first agent from a template.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create Agent
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <article key={agent.id} className="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow">
                <div className="card-body">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-base-content">{agent.name}</h3>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="btn btn-ghost btn-sm btn-circle text-error hover:bg-error/10"
                      aria-label="Delete agent"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  {agent.role && (
                    <span className="badge badge-secondary mb-2">{agent.role}</span>
                  )}
                  <p className="text-sm text-base-content/70 mb-3 line-clamp-2">{agent.system_prompt || 'No custom prompt'}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {agent.tools.map((tool) => (
                      <span key={tool} className="badge badge-outline badge-sm">{tool}</span>
                    ))}
                    {agent.tools.length === 0 && (
                      <span className="badge badge-outline badge-sm badge-neutral">No tools</span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/50 flex items-center gap-4">
                    <span>Model: <code>{agent.llm_model}</code></span>
                    <span>Temp: {agent.temperature}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      <>
        {/* Create Agent Modal */}
        <input type="checkbox" id="create-agent-modal" className="modal-toggle" checked={showCreateModal} onChange={() => setShowCreateModal(false)} />
        <div className="modal">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-xl mb-4">Create Agent from Template</h3>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">Template</span>
                </label>
                <select
                  {...register('template_key')}
                  className="select select-bordered w-full max-w-xs"
                >
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {TEMPLATE_LABELS[t.key] || t.name}
                    </option>
                  ))}
                </select>
                {errors.template_key && (
                  <label className="label text-error">
                    <span className="label-text-alt">{errors.template_key.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base-content">Agent Name</span>
                </label>
                <input
                  type="text"
                  placeholder="My Researcher"
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
                  <span className="label-text text-base-content">Custom System Prompt (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full min-h-[80px]"
                  placeholder="Override the template's default prompt..."
                  {...register('system_prompt')}
                />
              </div>

              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Creating…' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Delete Confirm Modal */}
        {deletingId && (
          <>
            <input type="checkbox" id="delete-agent-modal" className="modal-toggle" checked={true} />
            <div className="modal">
              <div className="modal-box max-w-sm">
                <h3 className="font-bold text-lg mb-3">Delete Agent?</h3>
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