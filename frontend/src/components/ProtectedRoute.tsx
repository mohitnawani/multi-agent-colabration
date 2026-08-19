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
      <div className="min-h-dvh bg-base-200 grid place-items-center px-4" aria-label="Loading">
        <div className="surface p-6 w-full max-w-sm">
          <div className="skeleton-block h-6 w-32 mb-4" />
          <div className="skeleton-block h-4 w-full mb-2" />
          <div className="skeleton-block h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}