'use client'

import Link from 'next/link'
import { ForwardIcon, IconBadge } from './AppIcons'

type WidthKey = 'sm' | 'md' | 'lg' | 'xl'

const widthClasses: Record<WidthKey, string> = {
  sm: 'max-w-md',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
}

type AppPageProps = {
  children: React.ReactNode
  header?: React.ReactNode
  width?: WidthKey
  className?: string
  contentClassName?: string
  backgroundClassName?: string
}

export function AppPage({
  children,
  header,
  width = 'lg',
  className = '',
  contentClassName = '',
  backgroundClassName = '',
}: AppPageProps) {
  return (
    <div className={`relative flex min-h-app flex-col overflow-hidden bg-[#0b0f14] font-sans text-white pt-safe pb-safe ${backgroundClassName}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(37,99,235,0.1),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(15,23,42,0.38),transparent)]" />
      </div>

      {header ? <div className="relative z-20">{header}</div> : null}

      <main className={`relative z-10 mx-auto flex w-full flex-1 flex-col px-4 sm:px-6 lg:px-8 ${widthClasses[width]} ${className}`}>
        <div className={`flex flex-1 flex-col ${contentClassName}`}>{children}</div>
      </main>
    </div>
  )
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  align = 'left',
  actions,
  className = '',
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  actions?: React.ReactNode
  className?: string
}) {
  const alignment = align === 'center' ? 'items-center text-center' : 'items-start text-left'

  return (
    <section className={`flex flex-col gap-4 ${alignment} ${className}`}>
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#10161f] px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-sky-200/90">
          <span className="h-2 w-2 rounded-full bg-sky-300" />
          {eyebrow}
        </span>
      ) : null}
      <div className="space-y-4">
        <h1 className="max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-base leading-7 text-zinc-300">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div> : null}
    </section>
  )
}

export function SurfaceCard({
  children,
  className = '',
  accent = false,
}: {
  children: React.ReactNode
  className?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-[22px] border p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${
        accent
          ? 'border-white/10 bg-[linear-gradient(180deg,rgba(37,99,235,0.12),rgba(20,26,34,0.98))]'
          : 'border-white/10 bg-[#141a22]'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function MetricTile({
  label,
  value,
  description,
  className = '',
}: {
  label: string
  value: string
  description?: string
  className?: string
}) {
  return (
    <SurfaceCard className={`h-full p-4 ${className}`}>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">{value}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-zinc-300">{description}</p> : null}
    </SurfaceCard>
  )
}

export function FeatureCard({
  icon,
  title,
  description,
  href,
  className = '',
  iconWrapClassName = '',
}: {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
  className?: string
  iconWrapClassName?: string
}) {
  const content = (
    <SurfaceCard className={`group h-full min-h-[84px] p-4 transition duration-150 ${className}`}>
      <div className="flex min-h-14 items-center gap-4">
        <IconBadge className={iconWrapClassName}>{icon}</IconBadge>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-sm leading-5 text-zinc-300">{description}</p>
        </div>
        {href ? <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-500" /> : null}
      </div>
    </SurfaceCard>
  )

  if (!href) return content

  return <Link href={href} className="block rounded-[22px] active:scale-[0.995]">{content}</Link>
}

export function PrimaryActionLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#2f6fed] px-6 text-base font-semibold text-white shadow-[0_6px_18px_rgba(47,111,237,0.34)] transition active:scale-[0.99] ${className}`}
    >
      {children}
    </Link>
  )
}

export function SecondaryActionLink({
  href,
  children,
  className = '',
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/10 bg-[#141a22] px-6 text-base font-semibold text-white transition active:scale-[0.99] ${className}`}
    >
      {children}
    </Link>
  )
}
