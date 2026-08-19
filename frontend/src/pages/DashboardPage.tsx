import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import { listTasks } from '../features/tasks/tasksSlice'
import type { RootState, AppDispatch } from '../store'
import { AppNavbar } from '../components/AppNavbar'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Skeleton'
import { FlowSchematic } from '../components/FlowSchematic'
import { RouteMark } from '../components/ui/route-mark'
import { AUTH_WORKFLOW } from '../components/auth/workflow'
import { cn } from '../lib/cn'

const STAT_CARDS = [
  {
    to: '/teams',
    label: 'Teams',
    blurb: 'Collaboration patterns',
    cta: 'Create team',
    chip: 'bg-lamp-review/10 text-lamp-review',
  },
  {
    to: '/agents',
    label: 'Agents',
    blurb: 'Specialized AI workers',
    cta: 'Create agent',
    chip: 'bg-lamp-idle/10 text-lamp-idle',
  },
  {
    to: '/tasks',
    label: 'Tasks',
    blurb: 'Runs against teams',
    cta: 'Create task',
    chip: 'bg-lamp-done/10 text-lamp-done',
  },
]

const SETUP_STEPS = [
  {
    n: '01',
    title: 'Create an agent',
    body: 'Pick a template — researcher, critic, developer — and give it a name. Each template sets a role, tools, and a base prompt.',
    cta: 'Create agent',
    to: '/agents',
    ready: true,
  },
  {
    n: '02',
    title: 'Build a team',
    body: 'Group agents under a collaboration pattern: sequential, parallel, debate, or supervisor-led.',
    cta: 'Create team',
    to: '/teams',
    ready: false,
    note: 'Needs an agent first',
  },
  {
    n: '03',
    title: 'Run a task',
    body: 'Describe what the team should do. Watch each hand-off — and the quality gate — live in the transcript.',
    cta: 'Create task',
    to: '/tasks',
    ready: false,
    note: 'Needs a team first',
  },
]

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const teamsCount = useSelector((state: RootState) => state.teams.teams.length)
  const agentsCount = useSelector((state: RootState) => state.agents.agents.length)
  const tasksCount = useSelector((state: RootState) => state.tasks.tasks.length)
  const teamsLoading = useSelector((state: RootState) => state.teams.loading)
  const agentsLoading = useSelector((state: RootState) => state.agents.loading)
  const tasksLoading = useSelector((state: RootState) => state.tasks.loading)

  useEffect(() => {
    dispatch(listTeams())
    dispatch(listAgents())
    dispatch(listTasks())
  }, [dispatch])

  const loading = teamsLoading || agentsLoading || tasksLoading
  const counts = [teamsCount, agentsCount, tasksCount]
  const isEmpty = !loading && counts.every((c) => c === 0)

  return (
    <div className="min-h-dvh bg-base-200">
      <AppNavbar active="dashboard" />

      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl page-enter">
          <PageHeader title="Dashboard" subtitle="Your agent workspace at a glance." />

          {loading && counts.every((c) => c === 0) ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3" aria-label="Loading summary">
              {[0, 1, 2].map((i) => (
                <div key={i} className="surface p-5">
                  <Skeleton className="mb-4 h-4 w-24" />
                  <Skeleton className="mb-3 h-8 w-14" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <FirstRun />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {STAT_CARDS.map((card, i) => (
                  <Link
                    key={card.to}
                    to={card.to}
                    className="surface group p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('grid size-9 place-items-center rounded-lg', card.chip)}>
                        <RouteMark className="size-5" />
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="text-ink-muted transition-transform group-hover:translate-x-0.5"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink-muted">{card.label}</p>
                    <p className="tabular mt-0.5 font-mono text-3xl font-semibold tracking-tight">
                      {counts[i]}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted/80">{card.blurb}</p>
                    <p className="mt-3 text-sm font-semibold text-ink group-hover:underline underline-offset-4">
                      {card.cta}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="surface mt-6 p-6">
                <h2 className="text-lg font-semibold tracking-tight text-ink">Quick start</h2>
                <p className="mt-1 max-w-xl text-sm text-ink-muted text-pretty">
                  Create an agent from a template, group it into a team with a collaboration
                  pattern, then run a task and watch the team work.
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link to="/agents" className="btn btn-primary gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Create Agent
                  </Link>
                  <Link to="/teams" className="btn btn-outline gap-2">
                    <RouteMark className="size-4" />
                    Create Team
                  </Link>
                  <Link to="/tasks" className="btn btn-outline gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Create Task
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

/** First-run experience — the control room panel with the route schematic. */
function FirstRun() {
  return (
    <div className="panel overflow-hidden rounded-box shadow-xl">
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-[var(--panel-line)] p-8 lg:border-b-0 lg:border-r">
          <FlowSchematic nodes={AUTH_WORKFLOW.nodes} edges={AUTH_WORKFLOW.edges} cycleMs={2600} />
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--panel-muted)]">
            Start → Supervisor → Agents → Quality gate → End
          </p>
        </div>

        <div className="p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--panel-text)]">
            Assemble your first agent team
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--panel-muted)] text-pretty">
            Nexus runs tasks as teams of specialized agents. Start with one agent, group agents
            under a collaboration pattern, then run a task against the team.
          </p>

          <ol className="mt-8 space-y-6">
            {SETUP_STEPS.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span className="mt-0.5 font-mono text-xs font-semibold text-[var(--panel-muted)]">
                  {step.n}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--panel-text)]">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--panel-muted)]">{step.body}</p>
                </div>
                <div className="shrink-0">
                  {step.ready ? (
                    <Link
                      to={step.to}
                      className="inline-flex h-9 items-center rounded-field bg-[var(--panel-text)] px-3.5 text-xs font-semibold text-[var(--panel)] transition-opacity hover:opacity-90"
                    >
                      {step.cta}
                    </Link>
                  ) : (
                    <span
                      className="inline-flex h-9 items-center rounded-field border border-[var(--panel-line)] px-3.5 text-xs font-semibold text-[var(--panel-muted)] opacity-70"
                      title={step.note}
                    >
                      {step.note}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
