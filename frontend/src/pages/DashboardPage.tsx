import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import { listTasks } from '../features/tasks/tasksSlice'
import type { RootState, AppDispatch } from '../store'
import { AppNavbar } from '../components/AppNavbar'
import { Skeleton } from '../components/Skeleton'
import { RouteMark } from '../components/ui/route-mark'
import { cn } from '../lib/cn'

const CANVAS = '/abstract-hand-painted-modern-art-canvas-design-background_1048-19282.webp'
const LOGO = '/nexus-logo.png'

const STAT_CARDS = [
  {
    to: '/teams',
    label: 'Teams',
    blurb: 'Collaboration patterns',
    cta: 'Create team',
    chip: 'bg-mod-teams/12 text-mod-teams ring-1 ring-inset ring-mod-teams/25',
    primary: false,
  },
  {
    to: '/agents',
    label: 'Agents',
    blurb: 'Specialized AI workers',
    cta: 'Create agent',
    chip: 'bg-mod-agents/12 text-mod-agents ring-1 ring-inset ring-mod-agents/25',
    primary: true,
  },
  {
    to: '/tasks',
    label: 'Tasks',
    blurb: 'Runs against teams',
    cta: 'Create task',
    chip: 'bg-mod-tasks/12 text-mod-tasks ring-1 ring-inset ring-mod-tasks/25',
    primary: false,
  },
]

const LEGEND = [
  { chip: 'legend-idle', label: 'Pending' },
  { chip: 'legend-running', label: 'Running' },
  { chip: 'legend-done', label: 'Succeeded' },
  { chip: 'legend-failed', label: 'Failed' },
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
    <div className="auth-bg min-h-dvh">
      <AppNavbar active="dashboard" />

      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl page-enter">
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
              <Hero counts={counts} />

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

/** Canvas hero — mirrors the login/register card: art panel slanted toward the right, stats beside it. */
function Hero({ counts }: { counts: number[] }) {
  return (
    <section
      className="grid overflow-hidden rounded-box bg-base-100 shadow-xl ring-1 ring-base-300 lg:grid-cols-[45fr_55fr]"
      aria-label="Workspace summary"
    >
      {/* Left — canvas panel, slanted edge (same as auth) */}
      <div className="relative hidden lg:block">
        <div className="auth-slant absolute inset-0">
          <img src={CANVAS} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-panel/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-panel/80 via-transparent to-panel/80" />

          <div className="relative flex h-full flex-col justify-between p-7">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
                <img src={LOGO} alt="NEXUS logo" className="size-8 object-cover" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-[0.18em] text-panel-text">NEXUS</p>
                <p className="text-[11px] text-panel-muted">Agent orchestration</p>
              </div>
            </div>

            <div className="px-1">
              <h2 className="text-4xl leading-tight font-bold tracking-tight text-panel-text">
                Multi Agent
                <br />
                Collaboration System
              </h2>
              <p className="mt-2.5 max-w-[32ch] text-sm leading-relaxed text-panel-muted">
                Plan. Delegate. Review. Every run leaves an audit trail.
              </p>
            </div>

            <div className="pr-[14%]">
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-panel-muted">
                Start → Supervisor → Agents → Gate → End
              </span>
              <span className="mt-2 hidden items-center gap-2 sm:flex" aria-hidden="true">
                {LEGEND.map((item) => (
                  <span key={item.label} className={cn('legend-chip', item.chip)}>
                    <span className="lamp" />
                    {item.label}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — stats */}
      <div className="flex flex-col justify-center gap-1.5 p-6 sm:p-8">
        {STAT_CARDS.map((card, i) => (
          <div
            key={card.to}
            className="group flex items-center gap-3.5 rounded-field p-3 transition-colors hover:bg-console"
          >
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', card.chip)}>
              <RouteMark className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{card.label}</span>
                <span className="tabular rounded-full bg-ink/5 px-2 py-0.5 font-mono text-xs font-semibold leading-none text-ink ring-1 ring-inset ring-line">
                  {counts[i]}
                </span>
              </span>
              <span className="mt-1 block truncate text-xs text-ink-muted/80">{card.blurb}</span>
            </span>
            <Link
              to={card.to}
              className={cn(
                'btn btn-sm shrink-0 gap-1.5',
                card.primary ? 'btn-primary' : 'btn-outline',
              )}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              {card.cta}
            </Link>
          </div>
        ))}

        <p className="mt-2 px-3 text-xs text-ink-muted/70">
          Pick a tile to manage each workspace — or run your first task below.
        </p>
      </div>
    </section>
  )
}

/** First-run experience — canvas panel with the setup steps, styled like the auth card. */
function FirstRun() {
  return (
    <section
      className="grid overflow-hidden rounded-box bg-base-100 shadow-xl ring-1 ring-base-300 lg:grid-cols-[45fr_55fr]"
      aria-label="First-run setup"
    >
      {/* Left — canvas panel, slanted edge */}
      <div className="relative hidden lg:block">
        <div className="auth-slant absolute inset-0">
          <img src={CANVAS} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-panel/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-panel/80 via-transparent to-panel/80" />

          <div className="relative flex h-full flex-col justify-between p-7">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
                <img src={LOGO} alt="NEXUS logo" className="size-8 object-cover" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold tracking-[0.18em] text-panel-text">NEXUS</p>
                <p className="text-[11px] text-panel-muted">Agent orchestration</p>
              </div>
            </div>

            <div className="px-1">
              <h2 className="text-4xl leading-tight font-bold tracking-tight text-panel-text">
                Assemble your
                <br />
                first agent team
              </h2>
              <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-panel-muted">
                Nexus runs tasks as teams of specialized agents. Three steps to your first run.
              </p>
            </div>

            <div className="pr-[14%]">
              <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-panel-muted">
                Start → Supervisor → Agents → Gate → End
              </span>
              <span className="mt-2 hidden items-center gap-2 sm:flex" aria-hidden="true">
                {LEGEND.map((item) => (
                  <span key={item.label} className={cn('legend-chip', item.chip)}>
                    <span className="lamp" />
                    {item.label}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — setup steps */}
      <div className="p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight text-ink">Setup in three steps</h2>
        <p className="mt-1 text-sm text-ink-muted text-pretty">
          Start with one agent, group agents under a collaboration pattern, then run a task
          against the team.
        </p>

        <ol className="mt-6 space-y-5">
          {SETUP_STEPS.map((step) => (
            <li key={step.n} className="flex items-start gap-4">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-lamp-idle/10 font-mono text-xs font-semibold text-lamp-idle ring-1 ring-inset ring-lamp-idle/20">
                {step.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{step.body}</p>
              </div>
              <div className="shrink-0">
                {step.ready ? (
                  <Link
                    to={step.to}
                    className="inline-flex h-9 items-center rounded-field bg-primary px-3.5 text-xs font-semibold text-primary-content transition-opacity hover:opacity-90"
                  >
                    {step.cta}
                  </Link>
                ) : (
                  <span
                    className="inline-flex h-9 items-center rounded-field border border-line px-3.5 text-xs font-semibold text-ink-muted/70"
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
    </section>
  )
}