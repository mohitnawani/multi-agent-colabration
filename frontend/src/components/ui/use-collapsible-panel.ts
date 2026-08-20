import { useCallback, useEffect, useState } from 'react'

/**
 * Persistent collapsed/expanded state for a side panel.
 *
 * - Survives page refresh via localStorage (`storageKey`).
 * - First visit: expanded by default on wide screens, collapsed on narrow
 *   viewports (< 768px) so the primary pane stays usable on mobile.
 * - Once the user toggles manually, that choice is stored and respected
 *   on every subsequent visit, at any width.
 */

const MOBILE_BREAKPOINT = 768

function readStored(key: string): boolean | null {
  const raw = localStorage.getItem(key)
  if (raw === 'collapsed') return true
  if (raw === 'expanded') return false
  return null
}

export function useCollapsiblePanel(storageKey: string) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const stored = readStored(storageKey)
    if (stored !== null) return stored
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  })

  useEffect(() => {
    localStorage.setItem(storageKey, collapsed ? 'collapsed' : 'expanded')
  }, [collapsed, storageKey])

  const toggle = useCallback(() => setCollapsed((c) => !c), [])

  return { collapsed, toggle }
}