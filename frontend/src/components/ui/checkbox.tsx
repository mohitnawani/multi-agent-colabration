import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  invalid?: boolean
}

export function Checkbox({ label, id, invalid, className, ...rest }: CheckboxProps) {
  return (
    <label htmlFor={id} className={cn('group flex cursor-pointer items-center gap-2.5 select-none', className)}>
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          className={cn(
            'peer size-4 appearance-none rounded-[4px] border bg-base-100 transition-colors',
            'checked:border-ink checked:bg-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            'disabled:opacity-60',
            invalid ? 'border-lamp-failed' : 'border-line',
          )}
          {...rest}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto text-primary-content opacity-0 transition-opacity peer-checked:opacity-100"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="text-sm text-ink-muted">{label}</span>
    </label>
  )
}
