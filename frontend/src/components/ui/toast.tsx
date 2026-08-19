import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { dismissToast } from '../../features/toast/toastSlice'
import type { RootState, AppDispatch } from '../../store'
import { cn } from '../../lib/cn'

const TONE_LAMP: Record<string, string> = {
  success: 'lamp-done',
  error: 'lamp-failed',
  info: 'lamp-idle',
}

export function Toaster() {
  const toasts = useSelector((state: RootState) => state.toast.toasts)
  const dispatch = useDispatch<AppDispatch>()

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-popover flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          message={toast.message}
          tone={toast.tone}
          onDismiss={() => dispatch(dismissToast(toast.id))}
        />
      ))}
    </div>
  )
}

function ToastItem({
  message,
  tone,
  onDismiss,
}: {
  message: string
  tone: string
  onDismiss: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-center gap-2.5 rounded-box bg-base-100 px-3.5 py-2.5 shadow-lg ring-1 ring-base-300',
        'page-enter',
      )}
    >
      <span className={cn('lamp', TONE_LAMP[tone])} aria-hidden="true" />
      <p className="flex-1 text-sm text-ink">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 grid size-6 place-items-center rounded text-ink-muted transition-colors hover:bg-console hover:text-ink"
        aria-label="Dismiss notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  )
}
