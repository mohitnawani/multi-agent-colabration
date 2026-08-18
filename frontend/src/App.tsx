import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Provider } from 'react-redux'
import { store } from './store'
import { checkAuth } from './features/auth/authSlice'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TeamsPage from './pages/TeamsPage'
import AgentsPage from './pages/AgentsPage'
import './index.css'

function AppRoutes() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, checked } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!checked) {
      dispatch(checkAuth())
    }
  }, [dispatch, checked])

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
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
      </BrowserRouter>
    </Provider>
  )
}