import { cn } from '../lib/cn'

const STATUS_CONFIG: Record<
  string,
  { label: string; lamp: string; pill: string }
> = {
  pending: {
    label: 'Pending',
    lamp: 'lamp-idle',
    pill: 'status-pill-idle',
  },
  running: {
    label: 'Running',
    lamp: 'lamp-running',
    pill: 'status-pill-running',
  },
  done: {
    label: 'Succeeded',
    lamp: 'lamp-done',
    pill: 'status-pill-done',
  },
  failed: {
    label: 'Failed',
    lamp: 'lamp-failed',
    pill: 'status-pill-failed',
  },
  awaiting_review: {
    label: 'Awaiting approval',
    lamp: 'lamp-review',
    pill: 'status-pill-review',
  },
}

export function StatusBadge({
  status,
  spinner = false,
  className,
}: {
  status: string
  spinner?: boolean
  className?: string
}) {
  const cfg = STATUS_CONFIG[status] || { label: status, lamp: 'lamp-idle', pill: 'status-pill-idle' }
  return (
    <span className={cn('status-pill', cfg.pill, className)} role="status" aria-label={cfg.label}>
      {spinner ? (
        <span
          className="size-2 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        <span className={cn('lamp', cfg.lamp)} aria-hidden="true" />
      )}
      {cfg.label}
    </span>
  )
}
