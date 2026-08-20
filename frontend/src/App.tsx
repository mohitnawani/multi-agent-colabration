import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { Provider } from 'react-redux'
import { store } from './store'
import { checkAuth } from './features/auth/authSlice'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginPage from './routes/login'
import RegisterPage from './routes/register'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import AgentsPage from './pages/AgentsPage'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import { Toaster } from './components/ui/toast'
import './index.css'

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const { user, checked } = useSelector((state: RootState) => state.auth)
  const from = (location.state as { from?: string } | null)?.from

  useEffect(() => {
    if (!checked) {
      dispatch(checkAuth())
    }
  }, [dispatch, checked])

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={from && !['/login', '/register'].includes(from) ? from : '/dashboard'} replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to={from && !['/login', '/register'].includes(from) ? from : '/dashboard'} replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents"
        element={
          <ProtectedRoute>
            <AgentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute>
            <TaskDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </Provider>
  )
}