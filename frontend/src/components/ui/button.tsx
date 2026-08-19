import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-content hover:bg-primary/90',
  outline: 'border border-line bg-transparent text-ink hover:bg-console hover:border-base-300',
  ghost: 'bg-transparent text-ink-muted hover:bg-console hover:text-ink',
  danger: 'bg-lamp-failed text-white hover:bg-lamp-failed/90',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  iconOnly?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-field font-semibold select-none',
        'transition-[background-color,border-color,color,transform] duration-150',
        'active:scale-[0.98]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:opacity-45 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        iconOnly && 'aspect-square px-0',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
