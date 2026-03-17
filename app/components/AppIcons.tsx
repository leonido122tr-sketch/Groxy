'use client'

/** Импорты только нужных иконок из lucide-react (named imports) для tree-shaking. */
import type { SVGProps } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Calculator,
  ChevronRight,
  Download,
  Droplets,
  FileText,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  Layers3,
  LogOut,
  MessagesSquare,
  Monitor,
  Share2,
  ShieldCheck,
  Smartphone,
  Thermometer,
  Trash2,
  User,
  UserPlus,
  UserCircle2,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react'

function makeIcon(Icon: LucideIcon) {
  return function AppIcon({
    className = 'h-5 w-5',
    strokeWidth = 2.1,
    ...props
  }: LucideProps) {
    return <Icon className={className} strokeWidth={strokeWidth} {...props} />
  }
}

type CustomIconProps = SVGProps<SVGSVGElement> & {
  strokeWidth?: number
}

function BaseIcon({
  className = 'h-5 w-5',
  strokeWidth = 2.1,
  children,
  ...props
}: CustomIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const BackIcon = makeIcon(ArrowLeft)
export const ForwardIcon = makeIcon(ChevronRight)
export const DashboardIcon = makeIcon(LayoutDashboard)
export const ProjectsIcon = makeIcon(FolderOpen)
export const ProfileIcon = makeIcon(UserCircle2)
export const KnowledgeIcon = makeIcon(BookOpen)
export const CompareIcon = makeIcon(Calculator)
export const ForumIcon = makeIcon(MessagesSquare)
export const PdfIcon = makeIcon(FileText)
export const DownloadIcon = makeIcon(Download)
export const ShareIcon = makeIcon(Share2)
export const DeleteIcon = makeIcon(Trash2)
export const AndroidIcon = makeIcon(Smartphone)
export const WebIcon = makeIcon(Monitor)
export const SecurityIcon = makeIcon(ShieldCheck)
export const ThermalIcon = makeIcon(Thermometer)
export const VaporIcon = makeIcon(Droplets)
export const LogoutIcon = makeIcon(LogOut)
export const KeyIcon = makeIcon(KeyRound)
export const SignupIcon = makeIcon(UserPlus)
export const VerifyIcon = makeIcon(BadgeCheck)
export const StackIcon = makeIcon(Layers3)
export const UserFormIcon = makeIcon(User)

type IconBadgeProps = {
  children: React.ReactNode
  tone?: 'neutral' | 'blue' | 'teal' | 'amber' | 'violet' | 'indigo' | 'emerald' | 'red'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function IconBadge({
  children,
  tone = 'neutral',
  size = 'md',
  className = '',
}: IconBadgeProps) {
  const sizeClass =
    size === 'sm'
      ? 'h-10 w-10 rounded-2xl'
      : size === 'lg'
        ? 'h-14 w-14 rounded-[22px]'
        : 'h-12 w-12 rounded-2xl'

  const toneClass =
    tone === 'blue'
      ? 'bg-[linear-gradient(180deg,#1e4fb6,#173055)] text-blue-50'
      : tone === 'teal'
        ? 'bg-[linear-gradient(180deg,#156d75,#14383a)] text-teal-50'
        : tone === 'amber'
          ? 'bg-[linear-gradient(180deg,#5d4a16,#3a3114)] text-amber-100'
          : tone === 'violet'
            ? 'bg-[linear-gradient(180deg,#55318d,#31224d)] text-violet-50'
            : tone === 'indigo'
              ? 'bg-[linear-gradient(180deg,#334a8f,#1f2952)] text-indigo-50'
              : tone === 'emerald'
                ? 'bg-[linear-gradient(180deg,#1d6b55,#18392f)] text-emerald-50'
                : tone === 'red'
                  ? 'bg-[linear-gradient(180deg,#7a2d42,#3f1f2a)] text-red-50'
                  : 'bg-[linear-gradient(180deg,#243140,#1b2430)] text-sky-100'

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.18)] ${sizeClass} ${toneClass} ${className}`}
    >
      {children}
    </div>
  )
}

/** Иконки типов пристроя: вид сверху (план). 2 стены — L, 3 стены — П, 4 стены — прямоугольник. */
export function ProjectTypeIcon({
  variant,
  className = 'h-5 w-5',
  strokeWidth = 2.1,
  ...props
}: CustomIconProps & { variant: 2 | 3 | 4 }) {
  if (variant === 2) {
    // L-образный пристрой: две стены (левая + нижняя)
    return (
      <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
        <path d="M6 8v11h11" />
      </BaseIcon>
    )
  }

  if (variant === 3) {
    // П-образный пристрой: три стены, открыто сверху
    return (
      <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
        <path d="M6 8v11h11V8" />
      </BaseIcon>
    )
  }

  // 4 стены: замкнутый прямоугольник
  return (
    <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
      <path d="M6 8v11h11V8H6z" />
    </BaseIcon>
  )
}

export function FoundationIcon({
  className = 'h-5 w-5',
  strokeWidth = 2.1,
  ...props
}: CustomIconProps) {
  return (
    <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
      <path d="M4 19h16" />
      <path d="M6.5 15.5h11" />
      <path d="M8 15.5V11" />
      <path d="M12 15.5V9" />
      <path d="M16 15.5V11" />
    </BaseIcon>
  )
}

export function WallsIcon({
  className = 'h-5 w-5',
  strokeWidth = 2.1,
  ...props
}: CustomIconProps) {
  return (
    <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
      <path d="M7 18V6" />
      <path d="M17 18V6" />
      <path d="M7 8.5h10" />
      <path d="M7 13h10" opacity="0.7" />
      <path d="M7 18h10" opacity="0.45" />
    </BaseIcon>
  )
}

export function RoofIcon({
  className = 'h-5 w-5',
  strokeWidth = 2.1,
  ...props
}: CustomIconProps) {
  return (
    <BaseIcon className={className} strokeWidth={strokeWidth} {...props}>
      <path d="M4.5 12.5 12 6l7.5 6.5" />
      <path d="M7.5 11.5V18" />
      <path d="M16.5 11.5V18" />
      <path d="M7.5 18h9" />
    </BaseIcon>
  )
}
