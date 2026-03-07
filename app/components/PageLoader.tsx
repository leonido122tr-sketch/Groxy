'use client'

export function PageLoader({ message = 'Загрузка...' }: { message?: string }) {
  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-blue-500" />
        <p className="text-zinc-400">{message}</p>
      </div>
    </div>
  )
}
