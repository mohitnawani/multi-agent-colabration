import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { listTeams, createTeam, deleteTeam } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import type { RootState, AppDispatch } from '../store'
import { AppNavbar } from '../components/AppNavbar'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AgentAvatar } from '../components/AgentAvatar'
import { RoleBadge } from '../components/RoleBadge'
import { TableSkeleton } from '../components/Skeleton'
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

const PATTERN_LABELS: Record<string, string> = {
  sequential: 'Sequential — assembly line, one after another',
  parallel: 'Parallel — all agents work simultaneously, then synthesis',
  debate: 'Debate — agents argue for/against, judge picks winner',
  supervisor: 'Supervisor — lead agent coordinates workers',
}

export default function TeamsPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { teams, loading: teamsLoading, error: teamsError } = useSelector((state: RootState) => state.teams)
  const { agents, loading: agentsLoading } = useSelector((state: RootState) => state.agents)
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
      notify.error(typeof err === 'string' ? `Couldn't create the team — ${err}` : "Couldn't create the team")
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
      notify.error(typeof err === 'string' ? `Couldn't delete the team — ${err}` : "Couldn't delete the team")
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }

  const getAgentNames = (agentIds: string[]) => {
    return agentIds
      .map((id) => agents.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'No agents assigned'
  }

  const isSubmitting = teamsLoading || agentsLoading
  const openCreate = () => {
    reset({ name: '', pattern: 'sequential', agent_ids: [] })
    setShowCreateModal(true)
  }

  return (
    <div className="min-h-dvh bg-base-200">
      <AppNavbar active="teams" />

      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl page-enter">
          <PageHeader
            title="Teams"
            subtitle="Group agents into collaboration patterns, then run tasks against them."
            actions={
              <Button onClick={openCreate} disabled={agents.length === 0} title={agents.length === 0 ? 'Create agents first' : undefined}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Create Team
              </Button>
            }
          />

          {teamsError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-field bg-lamp-failed/10 px-4 py-3 text-sm text-lamp-failed ring-1 ring-inset ring-lamp-failed/25" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              {teamsError}
            </div>
          )}

          {isSubmitting && teams.length === 0 && !teamsError ? (
            <TableSkeleton rows={3} cols={4} />
          ) : teams.length === 0 ? (
            <div className="surface">
              {agents.length === 0 ? (
                <EmptyState
                  title="Teams are built from agents"
                  tint="bg-mod-teams/10 text-mod-teams ring-mod-teams/25"
                  flow="teams"
                  description={
                    <>
                      Create a researcher or a critic first — then assemble agents into a team
                      under a collaboration pattern. Start on the{' '}
                      <Link to="/agents" className="font-semibold text-ink underline underline-offset-4">Agents</Link> page.
                    </>
                  }
                >
                  <Link to="/agents">
                    <Button>Create Agent</Button>
                  </Link>
                </EmptyState>
              ) : (
                <EmptyState
                  title="No teams yet"
                  tint="bg-mod-teams/10 text-mod-teams ring-mod-teams/25"
                  flow="teams"
                  description="Pick a collaboration pattern and choose which agents work together. A task runs against a team, not a single agent."
                >
                  <Button onClick={openCreate}>Create Team</Button>
                </EmptyState>
              )}
            </div>
          ) : (
            <div className="surface overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Pattern</th>
                    <th>Agents</th>
                    <th className="text-right">Created</th>
                    <th className="w-20 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team.id} className="transition-colors hover:bg-console/70">
                      <td className="font-semibold text-ink">{team.name}</td>
                      <td>
                        <span className="inline-flex items-center rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink-muted ring-1 ring-inset ring-line" title={PATTERN_LABELS[team.pattern || 'sequential']}>
                          {team.pattern || 'sequential'}
                        </span>
                      </td>
                      <td className="max-w-xs truncate text-ink-muted">{getAgentNames(team.agent_ids)}</td>
                      <td className="font-mono text-xs text-ink-muted/80 tabular text-right">
                        {new Date(team.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleDelete(team)}
                          className="grid size-8 place-items-center rounded-field text-ink-muted transition-colors hover:bg-lamp-failed/10 hover:text-lamp-failed"
                          aria-label={`Delete team ${team.name}`}
                          title="Delete team"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
              {submitting ? 'Creating…' : 'Create team'}
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
              <option value="sequential">Sequential</option>
              <option value="parallel">Parallel</option>
              <option value="debate">Debate</option>
              <option value="supervisor">Supervisor</option>
            </select>
            <p className="mt-1.5 text-xs text-ink-muted">
              {PATTERN_LABELS[watch('pattern') || 'sequential']}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-semibold text-ink">
              Agents ({selectedAgentIds.length} selected)
            </p>
            {agents.length === 0 ? (
              <p className="text-sm text-ink-muted">
                Create agents first on the <Link to="/agents" className="font-semibold text-ink underline underline-offset-4">Agents</Link> page.
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
    </div>
  )
}
