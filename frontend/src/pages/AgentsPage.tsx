import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { listAgents, createAgentFromTemplate, deleteAgent } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import type { Template } from '../types'
import { AppShell } from '../components/AppShell'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AgentAvatar } from '../components/AgentAvatar'
import { RoleBadge } from '../components/RoleBadge'
import { Skeleton } from '../components/Skeleton'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { ToolTag } from '../components/ui/tool-tag'
import { EmptyState } from '../components/ui/empty-state'
import { useNotify } from '../components/ui/use-notify'
import { cn } from '../lib/cn'

const createAgentSchema = z.object({
  template_key: z.string().min(1, 'Select a template'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  system_prompt: z
    .string()
    .trim()
    .max(4000, 'Custom prompt must be at most 4000 characters')
    .optional()
    .or(z.literal('')),
})

type CreateAgentFormData = z.infer<typeof createAgentSchema>

const TEMPLATE_LABELS: Record<string, string> = {
  researcher: 'Researcher - web search, note taking',
  writer: 'Writer - clear, structured content',
  analyst: 'Analyst - data analysis, patterns, risks',
  critic: 'Critic - find weaknesses, fact-check',
  developer: 'Developer - clean, idiomatic code',
  designer: 'Designer - creative, visual ideas',
}

export default function AgentsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { agents, loading, error } = useSelector((state: RootState) => state.agents)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const notify = useNotify()

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

  const openCreate = () => {
    reset({ template_key: 'researcher', name: '', system_prompt: '' })
    setShowCreateModal(true)
  }

  const onSubmit = async (data: CreateAgentFormData) => {
    setSubmitting(true)
    try {
      await dispatch(createAgentFromTemplate(data)).unwrap()
      reset({ template_key: 'researcher', name: '', system_prompt: '' })
      setShowCreateModal(false)
      notify.success('Agent created')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't create the agent - ${err}` : "Couldn't create the agent")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (agent: { id: string; name: string }) => {
    setDeletingId(agent.id)
    setDeletingName(agent.name)
  }

  const confirmDelete = async (id: string) => {
    setDeleting(true)
    try {
      await dispatch(deleteAgent(id)).unwrap()
      notify.success('Agent deleted')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't delete the agent - ${err}` : "Couldn't delete the agent")
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  return (
    <AppShell active="agents">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-text-primary">
            Agents
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary text-pretty">
            Specialized AI workers created from templates, ready to join a team.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-accent-amber text-bg-base hover:bg-accent-amber/90">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create agent
        </Button>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-field bg-status-error/10 px-4 py-3 text-sm text-status-error ring-1 ring-inset ring-status-error/25" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          {error}
        </div>
      )}

      {loading && agents.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading agents">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface p-5">
              <div className="mb-4 flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
              <Skeleton className="mb-3 h-5 w-20" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-5 h-4 w-3/4" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="surface">
          <EmptyState
            title="No agents yet"
            tint="bg-mod-agents/10 text-mod-agents ring-mod-agents/25"
            flow="agents"
            description="Start from a template. Each template sets a role, tools, and a base prompt - you can override the prompt after."
          >
            <Button onClick={openCreate}>Create agent</Button>
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <article key={agent.id} className="surface flex flex-col p-5 transition-colors duration-150 hover:bg-bg-panel-raised">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AgentAvatar name={agent.name} />
                  <h3 className="truncate text-base font-semibold tracking-tight text-text-primary">
                    {agent.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleDelete(agent)}
                  className="grid size-8 shrink-0 place-items-center rounded-field text-text-secondary transition-colors hover:bg-status-error/10 hover:text-status-error"
                  aria-label={`Delete agent ${agent.name}`}
                  title="Delete agent"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
              </div>

              <div className="mb-2.5">{agent.role && <RoleBadge role={agent.role} />}</div>

              <p className="mb-4 line-clamp-2 text-sm text-text-secondary text-pretty">
                {agent.system_prompt || 'No custom prompt'}
              </p>

              <div className="mb-4 mt-0.5 flex flex-wrap gap-2">
                {agent.tools.map((tool) => (
                  <ToolTag key={tool} tool={tool} />
                ))}
                {agent.tools.length === 0 && (
                  <span className="text-xs text-text-secondary/70">No tools</span>
                )}
              </div>

              <div className="mt-auto flex items-center gap-4 border-t border-border pt-3 font-mono text-xs text-text-secondary">
                <span className="truncate">
                  <span className="text-text-secondary/70">Model </span>
                  <span className="text-text-primary">{agent.llm_model}</span>
                </span>
                <span>
                  <span className="text-text-secondary/70">Temp </span>
                  <span className="text-text-primary tabular">{agent.temperature}</span>
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create agent */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create agent"
        description="Start from a built-in template and customize the prompt."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button type="submit" form="create-agent-form" disabled={submitting} className="bg-accent-amber text-bg-base hover:bg-accent-amber/90">
              {submitting ? 'Creating\u2026' : 'Create agent'}
            </Button>
          </>
        }
      >
        <form id="create-agent-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="agent-template">
              Template
            </label>
            <select
              id="agent-template"
              className={cn(
                'h-10 w-full rounded-field border border-line bg-bg-base px-3 text-sm text-text-primary focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20',
                errors.template_key ? 'border-status-error' : 'border-line',
              )}
              {...register('template_key')}
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {TEMPLATE_LABELS[t.key] || t.name}
                </option>
              ))}
            </select>
            {errors.template_key?.message && <p className="mt-1.5 text-xs text-status-error" role="alert">{errors.template_key.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="agent-name">
              Agent name
            </label>
            <input
              id="agent-name"
              type="text"
              placeholder="My Researcher"
              className={cn(
                'h-10 w-full rounded-field border bg-bg-base px-3.5 text-sm text-text-primary placeholder:text-text-secondary/60',
                'focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20',
                errors.name ? 'border-status-error' : 'border-line',
              )}
              {...register('name')}
            />
            {errors.name && <p className="mt-1.5 text-xs text-status-error" role="alert">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-primary" htmlFor="agent-prompt">
              Custom system prompt (optional)
            </label>
            <textarea
              id="agent-prompt"
              className={cn(
                'min-h-[90px] w-full rounded-field border bg-bg-base px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60',
                'focus:border-accent-amber focus:outline-none focus:ring-2 focus:ring-accent-amber/20',
                'border-line',
              )}
              placeholder="Override the template's default prompt..."
              {...register('system_prompt')}
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingId}
        title="Delete agent?"
        description={
          <>
            <strong>{deletingName}</strong> will be removed from all teams. This cannot be undone.
          </>
        }
        confirmLabel="Delete agent"
        busy={deleting}
        onConfirm={() => deletingId && confirmDelete(deletingId)}
        onClose={() => !deleting && setDeletingId(null)}
      />
    </AppShell>
  )
}