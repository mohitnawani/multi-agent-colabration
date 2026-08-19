import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { cn } from '../lib/cn'
import { ThemeToggle } from './ui/theme-toggle'
import { logout } from '../features/auth/authSlice'
import type { RootState, AppDispatch } from '../store'

const LOGO = '/nexus-logo.png'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/teams', label: 'Teams' },
  { to: '/agents', label: 'Agents' },
  { to: '/tasks', label: 'Tasks' },
]

export function AppNavbar({ active }: { active: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    setMobileOpen(false)
    dispatch(logout())
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-sticky border-b border-base-300 bg-base-100/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6" aria-label="Main">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-line">
            <img src={LOGO} alt="NEXUS logo" className="size-7 object-cover" />
          </span>
          <span className="text-sm font-bold tracking-[0.14em] text-ink">NEXUS</span>
        </Link>

        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  'rounded-field px-3 py-1.5 text-sm font-semibold transition-colors',
                  active === item.to
                    ? 'bg-accent/10 text-accent ring-1 ring-inset ring-accent/25'
                    : 'text-ink-muted hover:bg-console hover:text-ink',
                )}
                aria-current={active === item.to ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-field py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-console"
                aria-haspopup="menu"
                aria-expanded={mobileOpen}
              >
                <span className="grid size-7 place-items-center rounded-lg bg-ink/8 text-xs font-bold text-ink ring-1 ring-inset ring-line">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-ink lg:inline">{user.name}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-muted"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {mobileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-popover mt-2 w-52 rounded-box bg-base-100 p-1.5 shadow-xl ring-1 ring-base-300"
                >
                  <p className="px-3 pb-1 pt-2 text-sm font-semibold text-ink">{user.name}</p>
                  {user.email && (
                    <p className="px-3 pb-2 text-xs text-ink-muted truncate">{user.email}</p>
                  )}
                  <hr className="mx-2 border-base-300" />
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="mt-1 w-full rounded-field px-3 py-2 text-left text-sm font-semibold text-lamp-failed transition-colors hover:bg-lamp-failed/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="grid size-9 place-items-center rounded-field text-ink-muted transition-colors hover:bg-console hover:text-ink"
                aria-label="Menu"
                aria-expanded={mobileOpen}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>
              </button>
              {mobileOpen && (
                <div
                  role="menu"
                  className="absolute right-4 top-14 z-popover w-44 rounded-box bg-base-100 p-1.5 shadow-xl ring-1 ring-base-300"
                >
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      role="menuitem"
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'block rounded-field px-3 py-2 text-sm font-semibold transition-colors',
                        active === item.to
                          ? 'bg-accent/10 text-accent'
                          : 'text-ink-muted hover:bg-console hover:text-ink',
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}
