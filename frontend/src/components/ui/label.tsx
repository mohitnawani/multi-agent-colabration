import type { LabelHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode
}

export function Label({ className, children, ...rest }: LabelProps) {
  return (
    <label className={cn('block text-sm font-semibold text-ink', className)} {...rest}>
      {children}
    </label>
  )
}
