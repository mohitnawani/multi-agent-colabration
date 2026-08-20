import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { listTeams, createTeam, deleteTeam } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import { AppShell } from '../components/AppShell'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AgentAvatar } from '../components/AgentAvatar'
import { RoleBadge } from '../components/RoleBadge'
import { Modal } from '../components/ui/modal'
import { Button } from '../components/ui/button'
import { EmptyState } from '../components/ui/empty-state'
import { useNotify } from '../components/ui/use-notify'
import { cn } from '../lib/cn'

const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  pattern: z.enum(['sequential', 'parallel', 'debate', 'supervisor']),
  agent_ids: z.array(z.string()).min(1, 'Select at least one agent'),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

const PATTERN_META: Record<string, { label: string; blurb: string; chip: string }> = {
  sequential: {
    label: 'Sequential',
    blurb: 'Assembly line: each agent hands its answer to the next.',
    chip: 'bg-console text-text-secondary',
  },
  parallel: {
    label: 'Parallel',
    blurb: 'All agents work the same task at once, then synthesis merges.',
    chip: 'bg-console text-text-secondary',
  },
  debate: {
    label: 'Debate',
    blurb: 'Agents argue for and against, then a judge picks the winner.',
    chip: 'bg-console text-text-secondary',
  },
  supervisor: {
    label: 'Supervisor',
    blurb: 'A lead agent coordinates workers and runs a quality gate.',
    chip: 'bg-console text-text-secondary',
  },
}

const PATTERN_ORDER = ['supervisor', 'sequential', 'parallel', 'debate']

type Tab = 'all' | 'mine' | 'templates'

export default function TeamsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { teams, loading: teamsLoading, error: teamsError } = useSelector((state: RootState) => state.teams)
  const { agents, loading: agentsLoading } = useSelector((state: RootState) => state.agents)
  const [tab, setTab] = useState<Tab>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingName, setDeletingName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const notify = useNotify()

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

  const onSubmit = async (data: CreateTeamFormData) => {
    setSubmitting(true)
    try {
      await dispatch(createTeam(data)).unwrap()
      reset({ name: '', pattern: 'sequential', agent_ids: [] })
      setShowCreateModal(false)
      notify.success('Team created')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't create the team - ${err}` : "Couldn't create the team")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (team: { id: string; name: string }) => {
    setDeletingId(team.id)
    setDeletingName(team.name)
  }

  const confirmDelete = async (id: string) => {
    setDeleting(true)
    try {
      await dispatch(deleteTeam(id)).unwrap()
      notify.success('Team deleted')
    } catch (err) {
      notify.error(typeof err === 'string' ? `Couldn't delete the team - ${err}` : "Couldn't delete the team")
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  const openCreate = (pattern: string = 'sequential') => {
    reset({ name: '', pattern: pattern as CreateTeamFormData['pattern'], agent_ids: [] })
    setShowCreateModal(true)
  }

  const memberNames = (agentIds: string[]) =>
    agentIds
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter((n): n is string => Boolean(n))

  const isSubmitting = teamsLoading || agentsLoading

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'mine', label: 'My Teams' },
    { id: 'templates', label: 'Templates' },
  ]

  return (
    <AppShell active="teams">
      <header className="mb-7">
        <h1 className="font-display text-[28px] font-semibold tracking-tight text-text-primary">
          Teams
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary text-pretty">
          Group agents into collaboration patterns, then run tasks against them.
        </p>
      </header>

      {/* Tab bar - amber underline on the active tab, nothing else changes color */}
      <div role="tablist" aria-label="Team views" className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'relative -mb-px rounded-t-[8px] px-4 py-2.5 text-sm font-semibold transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-amber',
              tab === t.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {t.label}
            {tab === t.id && (
              <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-amber" />
            )}
          </button>
        ))}
      </div>

      {teamsError && (
        <div className="mb-6 flex items-start gap-2.5 rounded-[8px] bg-status-error/10 px-4 py-3 text-sm text-status-error ring-1 ring-inset ring-status-error/25" role="alert">
          {teamsError}
        </div>
      )}

      {tab === 'templates' ? (
        <TemplateGrid onUse={openCreate} disabled={agents.length === 0} />
      ) : isSubmitting && teams.length === 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading teams">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-40 p-5" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="surface">
          {agents.length === 0 ? (
            <EmptyState
              title="Teams are built from agents"
              tint="bg-mod-teams/10 text-mod-teams ring-mod-teams/25"
              flow="teams"
              description="Create a researcher or a critic first - then assemble agents into a team under a collaboration pattern. Start on the Agents page."
            >
              <Button variant="outline" onClick={() => (window.location.href = '/agents')}>
                Go to Agents
              </Button>
            </EmptyState>
          ) : (
            <EmptyState
              title="No teams yet"
              tint="bg-mod-teams/10 text-mod-teams ring-mod-teams/25"
              flow="teams"
              description="Pick a collaboration pattern and choose which agents work together. A task runs against a team, not a single agent."
            >
              <Button onClick={() => openCreate()}>Create Team</Button>
            </EmptyState>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const names = memberNames(team.agent_ids)
            const meta = PATTERN_META[team.pattern || 'sequential'] || PATTERN_META.sequential
            return (
              <article key={team.id} className="surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex -space-x-1.5">
                    {names.slice(0, 4).map((name) => (
                      <AgentAvatar key={name} name={name} className="size-8 text-[10px] ring-2 ring-bg-base" />
                    ))}
                    {names.length > 4 && (
                      <span className="grid size-8 place-items-center rounded-lg bg-console text-[10px] font-semibold text-text-secondary ring-2 ring-bg-base">
                        +{names.length - 4}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(team)}
                    className="grid size-8 shrink-0 place-items-center rounded-[8px] text-text-secondary transition-colors duration-150 hover:bg-status-error/10 hover:text-status-error"
                    aria-label={`Delete team ${team.name}`}
                    title="Delete team"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>

                <h3 className="mt-3 truncate text-base font-semibold tracking-tight text-text-primary">
                  {team.name}
                </h3>
                <span className={cn('mt-1.5 inline-flex w-fit items-center rounded-[4px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ring-1 ring-inset ring-border', meta.chip)}>
                  {team.pattern || 'sequential'}
                </span>
                <p className="mt-2 text-sm text-text-secondary text-pretty">{meta.blurb}</p>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="font-mono text-[10px] text-text-secondary tabular">
                    {new Date(team.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-text-secondary">
                    <span className="lamp lamp-done" aria-hidden="true" />
                    {names.length} agents
                  </span>
                </div>
              </article>
            )
          })}

          {/* Create custom team - dashed card, not a floating action button */}
          <button
            type="button"
            onClick={() => openCreate()}
            disabled={agents.length === 0}
            title={agents.length === 0 ? 'Create agents first' : undefined}
            className="grid min-h-[200px] place-items-center rounded-[8px] border border-dashed border-border text-center transition-colors duration-150 hover:border-accent-amber/60 hover:bg-console disabled:opacity-45"
          >
            <span className="px-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto text-accent-amber"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="mt-2 block text-sm font-semibold text-text-primary">Create custom team</span>
              <span className="mt-1 block text-xs text-text-secondary">
                {agents.length === 0 ? 'Create agents first' : 'Pick agents and a pattern'}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Create team */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create team"
        description="Pick a pattern and the agents that will work together."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              type="submit"
              form="create-team-form"
              disabled={submitting || agents.length === 0}
            >
              {submitting ? 'Creating\u2026' : 'Create team'}
            </Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="team-name">
              Team name
            </label>
            <input
              id="team-name"
              type="text"
              placeholder="Research Team"
              className={cn(
                'h-10 w-full rounded-field border bg-base-100 px-3.5 text-sm text-ink placeholder:text-ink-muted/60',
                'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                errors.name ? 'border-lamp-failed' : 'border-line',
              )}
              {...register('name')}
            />
            {errors.name && <p className="mt-1.5 text-xs text-lamp-failed" role="alert">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="team-pattern">
              Collaboration pattern
            </label>
            <select
              id="team-pattern"
              className={cn(
                'h-10 w-full rounded-field border border-line bg-base-100 px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
              )}
              {...register('pattern')}
            >
              {PATTERN_ORDER.map((p) => (
                <option key={p} value={p}>{PATTERN_META[p].label}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-ink-muted">
              {PATTERN_META[watch('pattern') || 'sequential']?.blurb}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">
              Agents ({selectedAgentIds.length} selected)
            </p>
            {agents.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Create agents first on the Agents page.
              </p>
            ) : (
              <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-field border border-line p-1.5">
                {agents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex cursor-pointer items-center gap-3 rounded-field px-2 py-1.5 transition-colors hover:bg-console"
                  >
                    <span className="relative inline-flex shrink-0">
                      <input
                        type="checkbox"
                        value={agent.id}
                        className="peer size-4 appearance-none rounded-[4px] border border-line bg-base-100 transition-colors checked:border-ink checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        {...register('agent_ids')}
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
                    <AgentAvatar name={agent.name} className="size-7 text-[10px]" />
                    <span className="flex-1 text-sm font-medium text-ink">{agent.name}</span>
                    {agent.role && <RoleBadge role={agent.role} />}
                  </label>
                ))}
              </div>
            )}
            {errors.agent_ids && <p className="mt-1.5 text-xs text-lamp-failed" role="alert">{errors.agent_ids.message}</p>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingId}
        title="Delete team?"
        description={
          <>
            <strong>{deletingName}</strong> will be removed. This cannot be undone.
          </>
        }
        confirmLabel="Delete team"
        busy={deleting}
        onConfirm={() => deletingId && confirmDelete(deletingId)}
        onClose={() => !deleting && setDeletingId(null)}
      />
    </AppShell>
  )
}

function TemplateGrid({ onUse, disabled }: { onUse: (pattern: string) => void; disabled: boolean }) {
  const notify = useNotify()

  const applyTemplate = (pattern: string) => {
    if (disabled) return
    notify.success(`${PATTERN_META[pattern].label} template selected`)
    onUse(pattern)
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {PATTERN_ORDER.map((p) => {
        const meta = PATTERN_META[p]
        return (
          <article key={p} className="surface flex flex-col p-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-[4px] bg-accent-amber-dim px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-amber ring-1 ring-inset ring-accent-amber/25">
              Template
            </span>
            <h3 className="mt-3 text-base font-semibold tracking-tight text-text-primary">
              {meta.label} team
            </h3>
            <p className="mt-1.5 text-sm text-text-secondary text-pretty">{meta.blurb}</p>
            <div className="mt-auto pt-4">
              <Button
                variant="outline"
                className="w-full"
                disabled={disabled}
                title={disabled ? 'Create agents first' : undefined}
                onClick={() => applyTemplate(p)}
              >
                Use template
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}