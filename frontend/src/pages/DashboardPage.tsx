import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { logout } from '../features/auth/authSlice'
import { listTeams } from '../features/teams/teamsSlice'
import { listAgents } from '../features/agents/agentsSlice'
import { listTasks } from '../features/tasks/tasksSlice'
import { Link } from 'react-router'
import type { RootState, AppDispatch } from '../store'

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const teamsCount = useSelector((state: RootState) => state.teams.teams.length)
  const agentsCount = useSelector((state: RootState) => state.agents.agents.length)
  const tasksCount = useSelector((state: RootState) => state.tasks.tasks.length)

  useEffect(() => {
    dispatch(listTeams())
    dispatch(listAgents())
    dispatch(listTasks())
  }, [dispatch])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base-100">
      <nav className="navbar bg-base-100 border-b border-base-300">
        <div className="navbar-start">
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </label>
            <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
              <li><span className="text-sm font-medium text-base-content">{user?.name}</span></li>
              <li><span className="text-xs text-base-content/50">{user?.email}</span></li>
              <li className="divider"></li>
              <li><button onClick={handleLogout} className="btn btn-ghost w-full justify-start text-error">Logout</button></li>
            </ul>
          </div>
          <a className="btn btn-ghost text-xl font-bold">Multi-Agent Collaboration</a>
        </div>
        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            <li><Link to="/dashboard" className="btn btn-ghost active">Dashboard</Link></li>
            <li><Link to="/teams" className="btn btn-ghost">Teams</Link></li>
            <li><Link to="/agents" className="btn btn-ghost">Agents</Link></li>
            <li><Link to="/tasks" className="btn btn-ghost">Tasks</Link></li>
          </ul>
        </div>
        <div className="navbar-end">
          <button onClick={handleLogout} className="btn btn-ghost btn-circle avatar">
            <div className="w-10 rounded-full bg-base-300 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </div>
          </button>
        </div>
      </nav>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-base-content mb-8">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link to="/teams" className="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow no-underline">
              <div className="card-body">
                <h2 className="card-title text-base-content">Teams</h2>
                <p className="text-4xl font-bold text-primary">{teamsCount}</p>
                <p className="text-base-content/50">Create teams to organize agents</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary">Create Team</button>
                </div>
              </div>
            </Link>
            
            <Link to="/agents" className="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow no-underline">
              <div className="card-body">
                <h2 className="card-title text-base-content">Agents</h2>
                <p className="text-4xl font-bold text-secondary">{agentsCount}</p>
                <p className="text-base-content/50">Add AI agents to your teams</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-secondary">Add Agent</button>
                </div>
              </div>
            </Link>
            
            <Link to="/tasks" className="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow no-underline">
              <div className="card-body">
                <h2 className="card-title text-base-content">Tasks</h2>
                <p className="text-4xl font-bold text-accent">{tasksCount}</p>
                <p className="text-base-content/50">Run collaborative tasks</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-accent">New Task</button>
                </div>
              </div>
            </Link>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-base-content">Quick Start</h2>
              <p className="text-base-content/70 mb-4">Get started by creating your first team and adding agents.</p>
              <div className="flex gap-4">
                <Link to="/teams" className="btn btn-primary">Create Team</Link>
                <Link to="/agents" className="btn btn-outline">Create Agent</Link>
                <Link to="/tasks" className="btn btn-accent">New Task</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}