import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { cn } from '../lib/cn'
import { logout } from '../features/auth/authSlice'
import { ConfirmDialog } from './ConfirmDialog'
import type { RootState, AppDispatch } from '../store'

const LOGO = '/nexus-logo.png'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
    ),
  },
  {
    to: '/teams',
    label: 'Teams',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
    ),
  },
  {
    to: '/agents',
    label: 'Agents',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1m0-14.2-2.1 2.1m-10 10-2.1 2.1" /></svg>
    ),
  },
]

export function AppShell({ active, children }: { active: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 1024
  })
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [health, setHealth] = useState<'ok' | 'down' | 'checking'>('checking')
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)

  // System health - real data from the backend, refreshed on mount and every minute
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/health')
        setHealth(res.ok ? 'ok' : 'down')
      } catch {
        setHealth('down')
      }
    }
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    setConfirmLogout(false)
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-dvh bg-bg-base">
      {/* Left rail - 72px collapsed / 240px expanded */}
      <aside
        className={cn(
          'sticky top-0 z-sticky flex h-dvh shrink-0 flex-col border-r border-border bg-bg-panel transition-[width] duration-200 ease-out',
          expanded ? 'w-60' : 'w-[72px]',
        )}
        aria-label="Primary"
      >
        {/* Brand + collapse toggle */}
        <div className={cn('flex h-14 items-center border-b border-border', expanded ? 'justify-between px-3' : 'justify-center')}>
          {expanded ? (
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
                <img src={LOGO} alt="NEXUS logo" className="size-7 object-cover" />
              </span>
              <span className="font-display text-sm font-bold tracking-[0.14em] text-text-primary">NEXUS</span>
            </Link>
          ) : (
            <Link to="/dashboard" aria-label="NEXUS home" className="grid size-7 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
              <img src={LOGO} alt="NEXUS logo" className="size-7 object-cover" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'grid size-7 place-items-center rounded-[4px] text-text-secondary transition-colors duration-150 hover:bg-console hover:text-text-primary',
              !expanded && 'hidden',
            )}
            aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.to.slice(1)
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={cn(
                      'group flex items-center gap-3 rounded-[8px] px-2.5 py-2 text-sm font-semibold transition-colors duration-150',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-amber',
                      expanded ? 'justify-start' : 'justify-center',
                      isActive
                        ? 'bg-accent-amber-dim text-accent-amber'
                        : 'text-text-secondary hover:bg-console hover:text-text-primary',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon}
                    {expanded && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Rail footer - avatar + logout */}
        <div className="border-t border-border p-2.5">
          <div className={cn('flex items-center gap-2.5', expanded ? '' : 'justify-center')}>
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full bg-ink/8 text-xs font-bold text-text-primary ring-1 ring-inset ring-line',
                'transition-colors duration-150 hover:bg-console',
              )}
              aria-label="Open account menu"
              title={user?.name ?? 'Account'}
            >
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </button>
            {expanded && (
              <button
                type="button"
                onClick={() => setConfirmLogout(true)}
                className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-text-primary transition-colors duration-150 hover:text-accent-amber"
                title="Log out"
              >
                {user?.name}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar - workspace, health, notifications */}
        <header className="sticky top-0 z-sticky border-b border-border bg-bg-base/85 backdrop-blur">
          <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="grid size-8 place-items-center rounded-[8px] text-text-secondary transition-colors duration-150 hover:bg-console hover:text-text-primary lg:hidden"
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">Control Room</p>
              <p className="hidden truncate font-mono text-[10px] text-text-secondary sm:block">
                {location.pathname}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-[4px] px-2 py-1 font-mono text-[10px] font-semibold ring-1 ring-inset',
                  health === 'ok'
                    ? 'text-status-online ring-status-online/30 bg-status-online/10'
                    : 'text-status-error ring-status-error/30 bg-status-error/10',
                )}
                title={health === 'ok' ? 'All systems nominal' : health === 'down' ? 'Backend unreachable' : 'Checking systems…'}
              >
                <span className={cn('lamp', health === 'ok' ? 'lamp-done' : health === 'down' ? 'lamp-failed' : 'lamp-idle')} aria-hidden="true" />
                {health === 'ok' ? 'ONLINE' : health === 'down' ? 'DOWN' : 'CHECK'}
              </span>

              <button
                type="button"
                className="relative grid size-8 place-items-center rounded-[8px] text-text-secondary transition-colors duration-150 hover:bg-console hover:text-text-primary"
                aria-label="Notifications"
                title="No notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1440px] page-enter">{children}</div>
        </main>
      </div>

      {/* Logout is a real state change - confirm step */}
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        description={
          <>
            You'll need to sign in again to manage teams and run tasks. Running tasks keep
            going in the background.
          </>
        }
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  )
}