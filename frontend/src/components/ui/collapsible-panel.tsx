import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useCollapsiblePanel } from './use-collapsible-panel'

/**
 * Collapsible side panel with a divider toggle.
 *
 * Renders a fixed-width column on the right of a flex parent; the sibling
 * (the primary pane) must be `flex-1 min-w-0` so it reflows into the freed
 * space when the panel collapses.
 *
 * - Toggle button sits vertically centered on the divider, half-overlapping
 *   both panes. The chevron points toward the direction it will collapse
 *   (› collapses the right-hand panel, ‹ expands it back).
 * - Collapsing animates width to 0 (200ms ease-out) and unmounts the body
 *   once the animation finishes so nothing stays rendered/focusable inside a
 *   fully-collapsed pane.
 * - State persists across refreshes and defaults to collapsed on narrow
 *   viewports (see useCollapsiblePanel).
 */

export const PANEL_DEFAULT_WIDTH = 320
export const PANEL_COLLAPSE_MS = 200

interface CollapsiblePanelProps {
  children: ReactNode
  /** localStorage key that persists collapsed/expanded state. */
  storageKey: string
  /** Human label used for the toggle's aria-label and the panel's aria-label. */
  label: string
  /** Expanded width in px. Defaults to 320. */
  width?: number
  className?: string
  contentClassName?: string
}

export function CollapsiblePanel({
  children,
  storageKey,
  label,
  width = PANEL_DEFAULT_WIDTH,
  className,
  contentClassName,
}: CollapsiblePanelProps) {
  const { collapsed, toggle } = useCollapsiblePanel(storageKey)
  const [bodyHidden, setBodyHidden] = useState(collapsed)

  useEffect(() => {
    if (collapsed) {
      const id = window.setTimeout(() => setBodyHidden(true), PANEL_COLLAPSE_MS)
      return () => window.clearTimeout(id)
    }
    setBodyHidden(false)
  }, [collapsed])

  const expanded = !collapsed

  return (
    <div className={cn('relative h-full shrink-0', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
        aria-expanded={expanded}
        title={expanded ? `Collapse ${label}` : `Expand ${label}`}
        className={cn(
          'absolute -left-3 top-1/2 z-10 grid size-6 -translate-y-1/2 place-items-center',
          'rounded-full border border-base-300 bg-base-100 text-ink-muted shadow-sm',
          'transition-colors hover:border-accent hover:text-accent',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {expanded ? (
            <polyline points="9 6 15 12 9 18" />
          ) : (
            <polyline points="15 6 9 12 15 18" />
          )}
        </svg>
      </button>

      <div
        className="h-full overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: expanded ? width : 0 }}
      >
        {!bodyHidden && (
          <aside
            aria-label={label}
            className={cn('h-full border-l border-base-300', contentClassName)}
            style={{ width }}
          >
            {children}
          </aside>
        )}
      </div>
    </div>
  )
}