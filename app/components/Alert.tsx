'use client'

import { AlertCircle, CheckCircle, Info } from 'lucide-react'

type AlertVariant = 'error' | 'success' | 'info'

const variants: Record<
  AlertVariant,
  { className: string; icon: typeof AlertCircle }
> = {
  error: {
    className: 'rounded-2xl border border-red-400/25 bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(239,68,68,0.08))] p-4 text-sm text-red-100 shadow-[0_16px_40px_rgba(127,29,29,0.18)]',
    icon: AlertCircle,
  },
  success: {
    className: 'rounded-2xl border border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(16,185,129,0.08))] p-4 text-sm text-emerald-100 shadow-[0_16px_40px_rgba(6,78,59,0.18)]',
    icon: CheckCircle,
  },
  info: {
    className: 'rounded-2xl border border-cyan-400/25 bg-[linear-gradient(180deg,rgba(59,130,246,0.16),rgba(59,130,246,0.08))] p-4 text-sm text-cyan-50 shadow-[0_16px_40px_rgba(30,64,175,0.18)]',
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
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#10161f]">
          <Icon className="h-4 w-4 shrink-0" />
        </div>
        <span className="flex-1 leading-6">{children}</span>
      </div>
    </div>
  )
}
