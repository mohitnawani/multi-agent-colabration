import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  labelledBy,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: keyof typeof SIZE_CLASSES
  labelledBy?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = labelledBy ?? `modal-title-${title.toLowerCase().replace(/\s+/g, '-')}`

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className={cn('modal-box w-full rounded-box bg-base-100 p-6 shadow-xl ring-1 ring-base-300', SIZE_CLASSES[size])}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-ink-muted text-pretty">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 -mt-1 grid size-8 place-items-center rounded-field text-ink-muted transition-colors hover:bg-console hover:text-ink"
            aria-label="Close dialog"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {children && <div className="max-h-[62dvh] overflow-y-auto pr-1">{children}</div>}

        {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
      </div>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button aria-label="Close dialog">close</button>
      </form>
    </dialog>
  )
}
