import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'
import { logout } from '../features/auth/authSlice'
import type { RootState, AppDispatch } from '../store'

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)

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
            <li><a className="btn btn-ghost active">Dashboard</a></li>
            <li><a className="btn btn-ghost">Teams</a></li>
            <li><a className="btn btn-ghost">Agents</a></li>
            <li><a className="btn btn-ghost">Tasks</a></li>
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
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-base-content">Teams</h2>
                <p className="text-4xl font-bold text-primary">0</p>
                <p className="text-base-content/50">Create teams to organize agents</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary">Create Team</button>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-base-content">Agents</h2>
                <p className="text-4xl font-bold text-secondary">0</p>
                <p className="text-base-content/50">Add AI agents to your teams</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-secondary">Add Agent</button>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 border border-base-300">
              <div className="card-body">
                <h2 className="card-title text-base-content">Tasks</h2>
                <p className="text-4xl font-bold text-accent">0</p>
                <p className="text-base-content/50">Run collaborative tasks</p>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-accent">New Task</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 border border-base-300">
            <div className="card-body">
              <h2 className="card-title text-base-content">Quick Start</h2>
              <p className="text-base-content/70 mb-4">Get started by creating your first team and adding agents.</p>
              <div className="flex gap-4">
                <button className="btn btn-primary">Create Team</button>
                <button className="btn btn-outline">View Documentation</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}