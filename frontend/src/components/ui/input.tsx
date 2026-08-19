import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-field border bg-base-100 px-3.5 text-sm text-ink',
        'placeholder:text-ink-muted/60 transition-[border-color,box-shadow] duration-150',
        invalid
          ? 'border-lamp-failed focus:border-lamp-failed focus:ring-2 focus:ring-lamp-failed/20'
          : 'border-line focus:border-accent focus:ring-2 focus:ring-accent/20',
        'focus:outline-none disabled:opacity-60',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}
