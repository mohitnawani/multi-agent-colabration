import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'
import type { FlowEdge, FlowNode } from './auth/workflow'

export type { FlowEdge, FlowNode } from './auth/workflow'
export type FlowNodeStatus = 'pending' | 'active' | 'done'

const PILL_H = 32
const PILL_R = 16

/** Track between two stations — routed S-curve, like a signal board. */
function edgePath(a: FlowNode, b: FlowNode) {
  const y1 = a.y + PILL_H / 2
  const y2 = b.y - PILL_H / 2
  const midX = a.x + (b.x - a.x) / 2
  return `M ${a.x} ${y1} C ${midX} ${y1 + 14}, ${midX} ${y2 - 14}, ${b.x} ${y2}`
}

function statusFor(index: number, activeIndex: number): FlowNodeStatus {
  if (index === activeIndex) return 'active'
  if (index < activeIndex) return 'done'
  return 'pending'
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * Route schematic — the product's signature. The agent workflow drawn as an
 * instrumented track diagram: stations, signal lamps, and a traveling dash
 * that marks the active hand-off. Used only on the auth screen and the
 * first-run dashboard empty state.
 */
export function FlowSchematic({
  nodes,
  edges,
  cycleMs = 2400,
  className,
}: {
  nodes: FlowNode[]
  edges: FlowEdge[]
  cycleMs?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(3)

  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      setActiveIndex((i) => (i + 1) % nodes.length)
    }, cycleMs)
    return () => clearInterval(t)
  }, [reduced, cycleMs, nodes.length])

  const byId = new Map(nodes.map((n, i) => [n.id, { node: n, index: i }]))

  return (
    <svg
      viewBox="0 0 480 500"
      className={cn('h-auto w-full', className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Tracks — off = dark line; flowing = signal-colored traveling dash */}
      {edges.map((e, i) => {
        const a = byId.get(e.from)
        const b = byId.get(e.to)
        if (!a || !b) return null
        const targetStatus = statusFor(b.index, activeIndex)
        const flowing = targetStatus === 'active' || targetStatus === 'done'
        const color =
          targetStatus === 'done'
            ? 'var(--lamp-done)'
            : targetStatus === 'active'
              ? 'var(--lamp-running)'
              : 'var(--panel-line)'
        return (
          <path
            key={i}
            d={edgePath(a.node, b.node)}
            fill="none"
            stroke={color}
            strokeWidth={flowing ? 1.75 : 1.25}
            strokeLinecap="round"
            className={flowing ? 'schematic-track-flow' : undefined}
          />
        )
      })}

      {/* Stations */}
      {nodes.map((node, index) => {
        const status = statusFor(index, activeIndex)
        const isActive = status === 'active'
        const isDone = status === 'done'
        const isGate = node.id === 'gate'
        const w = node.width ?? 110
        const stroke = isActive
          ? 'var(--lamp-running)'
          : isDone
            ? 'var(--lamp-done)'
            : 'var(--panel-line)'

        return (
          <g key={node.id}>
            {isActive && (
              <circle
                cx={node.x}
                cy={node.y}
                r="22"
                fill="color-mix(in srgb, var(--lamp-running) 12%, transparent)"
                className="schematic-halo"
              />
            )}

            {isGate ? (
              /* Quality gate — decision diamond */
              <g className={cn(isActive && 'schematic-active')}>
                <polygon
                  points={`${node.x},${node.y - PILL_H / 2} ${node.x + w / 2},${node.y} ${node.x},${node.y + PILL_H / 2} ${node.x - w / 2},${node.y}`}
                  fill={isActive ? 'color-mix(in srgb, var(--lamp-review) 18%, transparent)' : 'var(--panel-2)'}
                  stroke={isActive ? 'var(--lamp-review)' : stroke}
                  strokeWidth={isActive ? 2 : 1.25}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="2.5"
                  fill={isActive ? 'var(--lamp-review)' : 'var(--panel-line)'}
                />
                <text
                  x={node.x}
                  y={node.y - PILL_H / 2 - 10}
                  textAnchor="middle"
                  fontFamily="'Fira Sans', sans-serif"
                  fontSize="11"
                  fontWeight={600}
                  letterSpacing="0.4"
                  fill={isActive ? 'var(--panel-text)' : 'var(--panel-muted)'}
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + PILL_H / 2 + 14}
                  textAnchor="middle"
                  fontFamily="'Fira Code', monospace"
                  fontSize="10"
                  fill="var(--panel-muted)"
                >
                  {node.sublabel}
                </text>
              </g>
            ) : (
              <g className={cn(isActive && 'schematic-active')}>
                <rect
                  x={node.x - w / 2}
                  y={node.y - PILL_H / 2}
                  width={w}
                  height={PILL_H}
                  rx={PILL_R}
                  fill={isActive ? 'color-mix(in srgb, var(--lamp-running) 10%, transparent)' : 'var(--panel-2)'}
                  stroke={stroke}
                  strokeWidth={isActive ? 2 : 1.25}
                />
                {/* Signal lamp */}
                <circle
                  cx={node.x - w / 2 + 12}
                  cy={node.y}
                  r="2.75"
                  fill={
                    isActive
                      ? 'var(--lamp-running)'
                      : isDone
                        ? 'var(--lamp-done)'
                        : 'var(--panel-line)'
                  }
                />
                <text
                  x={node.x + 2}
                  y={node.y + 3.5}
                  textAnchor="middle"
                  fontFamily="'Fira Sans', sans-serif"
                  fontSize="11"
                  fontWeight={isActive ? 600 : 500}
                  letterSpacing="0.4"
                  fill={isActive ? 'var(--panel-text)' : isDone ? 'var(--panel-muted)' : 'color-mix(in srgb, var(--panel-muted) 70%, transparent)'}
                >
                  {node.label}
                </text>
              </g>
            )}

            {!isGate && (
              <text
                x={node.x}
                y={node.y + PILL_H / 2 + 16}
                textAnchor="middle"
                fontFamily="'Fira Code', monospace"
                fontSize="10"
                fill={isActive ? 'var(--lamp-running)' : 'var(--panel-muted)'}
              >
                {node.sublabel}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
