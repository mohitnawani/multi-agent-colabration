import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useDispatch, useSelector } from 'react-redux'
import { checkAuth } from '../features/auth/authSlice'
import type { RootState, AppDispatch } from '../store'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const { user, checked, loading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!checked && !loading) {
      dispatch(checkAuth())
    }
  }, [dispatch, checked, loading])

  if (!checked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}