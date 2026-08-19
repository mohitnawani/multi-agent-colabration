import { useEffect, useRef, useState } from 'react'

export interface LiveStreamEvent {
  type: string
  node?: string
  phase?: string
  summary?: string
  detail?: string
  timestamp?: string
}

interface UseTaskStreamOptions {
  enabled: boolean
  onDone?: () => void
}

/**
 * Live SSE consumer for a task's run, via fetch (the backend auths via the
 * access_token cookie, so `credentials: 'include'` is all that's needed).
 * Accumulates progress events, tracks the node currently executing, and flags
 * when the user requested a stop.
 */
export function useTaskStream(taskId: string | null, { enabled, onDone }: UseTaskStreamOptions) {
  const [events, setEvents] = useState<LiveStreamEvent[]>([])
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [stopping, setStopping] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (!taskId || !enabled) {
      setEvents([])
      setActiveNode(null)
      setStopping(false)
      return
    }

    const base = import.meta.env.VITE_API_URL || '/api'
    const url = `${base}/tasks/${taskId}/stream`
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
    let cancelled = false

    const open = async () => {
      try {
        const res = await fetch(url, {
          credentials: 'include',
          headers: { Accept: 'text/event-stream' },
        })
        if (!res.ok || !res.body) {
          onDoneRef.current?.()
          return
        }
        reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          buffer += decoder.decode(value, { stream: true })
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            let data = ''
            for (const line of frame.split('\n')) {
              if (line.startsWith('data:')) data += line.slice(5).trim()
            }
            if (!data) continue
            let ev: LiveStreamEvent
            try {
              ev = JSON.parse(data)
            } catch {
              continue
            }
            if (ev.type === 'progress') {
              setEvents((prev) => (prev.length >= 300 ? [...prev.slice(-299), ev] : [...prev, ev]))
              setActiveNode(ev.node ?? null)
            } else if (ev.type === 'stopping') {
              setStopping(true)
            } else if (ev.type === 'done' || ev.type === 'error' || ev.type === 'stopped' || ev.type === 'end') {
              onDoneRef.current?.()
              return
            }
          }
        }
      } catch {
        // aborted on unmount / network drop — nothing to surface
      }
    }

    void open()
    return () => {
      cancelled = true
      reader?.cancel().catch(() => {})
    }
  }, [taskId, enabled])

  return { events, activeNode, stopping }
}