import { useDispatch } from 'react-redux'
import { addToast } from '../../features/toast/toastSlice'
import type { AppDispatch } from '../../store'

export function useNotify() {
  const dispatch = useDispatch<AppDispatch>()
  return {
    success: (message: string) => dispatch(addToast({ message, tone: 'success' })),
    error: (message: string) => dispatch(addToast({ message, tone: 'error' })),
    info: (message: string) => dispatch(addToast({ message, tone: 'info' })),
  }
}
