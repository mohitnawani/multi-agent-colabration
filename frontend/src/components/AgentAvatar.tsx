import { cn } from '../lib/cn'

const AVATAR_TONES = [
  'bg-ink/8 text-ink',
  'bg-lamp-idle/10 text-lamp-idle',
  'bg-lamp-done/10 text-lamp-done',
  'bg-lamp-review/10 text-lamp-review',
  'bg-lamp-running/10 text-lamp-running',
]

export function AgentAvatar({ name, className }: { name: string; className?: string }) {
  // Stable tone per agent name so the same agent keeps its color everywhere.
  const tone = AVATAR_TONES[[...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_TONES.length]
  return (
    <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset ring-line', tone, className)} aria-hidden="true">
      <span className="text-xs font-semibold">{name.slice(0, 2).toUpperCase()}</span>
    </span>
  )
}
