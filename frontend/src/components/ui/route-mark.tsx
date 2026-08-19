import { cn } from '../../lib/cn'

/** Route mark — three stations under one supervisor line. The product's glyph. */
export function RouteMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="5" cy="5.5" r="2.4" fill="currentColor" />
      <circle cx="19" cy="5.5" r="2.4" fill="currentColor" />
      <circle cx="12" cy="18.5" r="2.4" fill="currentColor" />
      <path
        d="M6.4 7.2 L10.6 16.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M17.6 7.2 L13.4 16.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
