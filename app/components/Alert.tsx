'use client'

import { AlertCircle, CheckCircle, Info } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'info'

const variants: Record<
  AlertVariant,
  { className: string; icon: typeof AlertCircle }
> = {
  error: {
    className: 'rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400',
    icon: AlertCircle,
  },
  success: {
    className: 'rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400',
    icon: CheckCircle,
  },
  info: {
    className: 'rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300',
    icon: Info,
  },
}

export function Alert({
  variant = 'error',
  children,
  className = '',
}: {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}) {
  const { className: variantClass, icon: Icon } = variants[variant]
  return (
    <div className={`${variantClass} ${className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1">{children}</span>
      </div>
    </div>
  )
}
