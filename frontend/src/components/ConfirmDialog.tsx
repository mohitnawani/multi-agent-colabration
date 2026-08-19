import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  danger = true,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog ref={ref} className="modal" aria-labelledby="confirm-title">
      <div className="modal-box w-full max-w-sm rounded-box bg-base-100 p-6 shadow-xl ring-1 ring-base-300">
        <h2 id="confirm-title" className="text-lg font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-ink-muted text-pretty">{description}</p>}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-field px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-console hover:text-ink disabled:opacity-45"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex h-10 items-center rounded-field px-4 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-45',
              danger ? 'bg-lamp-failed text-white hover:bg-lamp-failed/90' : 'bg-primary text-primary-content hover:bg-primary/90',
            )}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="Close dialog">close</button>
      </form>
    </dialog>
  )
}
