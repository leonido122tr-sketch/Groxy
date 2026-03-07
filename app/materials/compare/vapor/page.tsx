'use client'

import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppHeader } from '@/app/components/AppHeader'
import { PageLoader } from '@/app/components/PageLoader'
import type { User } from '@supabase/supabase-js'

interface WallMaterial {
  id: string
  name: string
  mu: number
}

const WALL_MATERIALS: WallMaterial[] = [
  { id: '1', name: 'Кирпич керамический (красный)', mu: 0.14 },
  { id: '2', name: 'Кирпич силикатный (белый)', mu: 0.11 },
  { id: '3', name: 'Газобетон (автоклавный)', mu: 0.23 },
  { id: '4', name: 'Пенобетон', mu: 0.23 },
  { id: '5', name: 'Керамзитобетонные блоки', mu: 0.19 },
  { id: '6', name: 'Арболит (деревобетон)', mu: 0.28 },
  { id: '7', name: 'Теплостен (многослойные блоки)', mu: 0.14 },
  { id: '8', name: 'Кирпич поризованный (тёплая керамика)', mu: 0.14 },
  { id: '9', name: 'Шлакоблок', mu: 0.14 },
  { id: '10', name: 'Пенополистиролбетон', mu: 0.05 },
  { id: '11', name: 'Дерево (брус)', mu: 0.32 },
  { id: '12', name: 'Бревно оцилиндрованное', mu: 0.3 },
  { id: '13', name: 'Каркас (дерево + утеплитель)', mu: 0.18 },
  { id: '14', name: 'СИП-панели', mu: 0.02 },
  { id: '15', name: 'Кирпич клинкерный', mu: 0.11 },
]

const MU_MAX = 0.4

function MaterialSelector({
  label,
  selected,
  search,
  open,
  onSelect,
  onSearchChange,
  onOpenChange,
  filtered,
}: {
  label: string
  selected: WallMaterial | null
  search: string
  open: boolean
  onSelect: (m: WallMaterial) => void
  onSearchChange: (v: string) => void
  onOpenChange: (v: boolean) => void
  filtered: WallMaterial[]
}) {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <input
          type="text"
          value={open ? search : (selected?.name ?? '')}
          onChange={(e) => {
            onSearchChange(e.target.value)
            onOpenChange(true)
          }}
          onFocus={() => onOpenChange(true)}
          onBlur={() => setTimeout(() => onOpenChange(false), 180)}
          placeholder={label}
          className="w-full rounded-2xl border-0 bg-transparent px-3 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          aria-label={open ? 'Закрыть список' : 'Открыть список'}
        >
          <svg className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-2xl border border-white/10 bg-black/95 shadow-xl">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-zinc-500">Нет подходящих материалов</div>
          ) : (
            <ul className="py-1">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault()
                      onSelect(m)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10"
                  >
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ScaleBlock({ selected }: { selected: WallMaterial | null }) {
  const muValue = selected?.mu ?? 0
  const scalePercent = Math.min(100, (muValue / MU_MAX) * 100)
  const opacity = 0.25 + 0.75 * (1 - scalePercent / 100)

  return (
    <div className="pb-2">
      <div className="mb-1 flex justify-between text-sm text-zinc-400">
        <span>μ, мг/(м·ч·Па)</span>
        {selected && (
          <span className="font-medium text-white">
            {selected.mu}
          </span>
        )}
      </div>
      <div className="h-10 w-full overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
        <div
          className="h-full rounded-xl bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-300"
          style={{ width: `${scalePercent}%`, opacity }}
        />
      </div>
    </div>
  )
}

export default function VaporPermeabilityPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WallMaterial | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selected2, setSelected2] = useState<WallMaterial | null>(null)
  const [search2, setSearch2] = useState('')
  const [open2, setOpen2] = useState(false)

  useEffect(() => {
    const AUTH_CHECK_TIMEOUT_MS = 8000
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      setLoading(false)
      router.push('/login')
    }, AUTH_CHECK_TIMEOUT_MS)

    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.getSession()
        if (timedOut) return
        if (sessionError) {
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            try { await supabase.auth.signOut() } catch { /* noop */ }
          }
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (timedOut) return
        if (userError) {
          clearTimeout(timeoutId)
          setLoading(false)
          router.push('/login')
          return
        }
        clearTimeout(timeoutId)
        setUser(user)
        setLoading(false)
        if (!user) router.push('/login')
      } catch (err: unknown) {
        clearTimeout(timeoutId)
        if (isSupabaseNetworkError(err)) {
          console.warn('Нет связи с сервером авторизации.')
        } else {
          console.error('Auth check error:', err)
        }
        setLoading(false)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower
    ? WALL_MATERIALS.filter((m) => m.name.toLowerCase().includes(searchLower))
    : WALL_MATERIALS

  const search2Lower = search2.trim().toLowerCase()
  const filtered2 = search2Lower
    ? WALL_MATERIALS.filter((m) => m.name.toLowerCase().includes(search2Lower))
    : WALL_MATERIALS

  const handleSelect = (m: WallMaterial) => {
    setSelected(m)
    setSearch('')
    setOpen(false)
  }

  const handleSelect2 = (m: WallMaterial) => {
    setSelected2(m)
    setSearch2('')
    setOpen2(false)
  }

  if (loading) return <PageLoader />
  if (!user) return <PageLoader message="Перенаправление..." />

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-black font-sans text-white pt-safe">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-xl flex-1 px-3 py-4 sm:px-4 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Паропроницаемость</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Материалы для возведения стен</p>
        </div>

        <MaterialSelector
          label="Материал 1"
          selected={selected}
          search={search}
          open={open}
          onSelect={handleSelect}
          onSearchChange={setSearch}
          onOpenChange={setOpen}
          filtered={filtered}
        />

        <MaterialSelector
          label="Материал 2"
          selected={selected2}
          search={search2}
          open={open2}
          onSelect={handleSelect2}
          onSearchChange={setSearch2}
          onOpenChange={setOpen2}
          filtered={filtered2}
        />

        <ScaleBlock selected={selected} />

        <ScaleBlock selected={selected2} />

        {selected && selected2 && (() => {
          const low = selected.mu <= selected2.mu ? selected : selected2
          const high = selected.mu <= selected2.mu ? selected2 : selected
          const percent = high.mu > 0 ? Math.round(((high.mu - low.mu) / high.mu) * 100) : 0
          const isEqual = selected.mu === selected2.mu
          return (
            <p className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-400">
              {isEqual
                ? <>У <strong className="text-white">{selected.name}</strong> и <strong className="text-white">{selected2.name}</strong> одинаковая паропроницаемость μ = {selected.mu} мг/(м·ч·Па).</>
                : <>Материал <strong className="text-white">{high.name}</strong> имеет лучшую паропроницаемость на {percent}% по сравнению с материалом <strong className="text-white">{low.name}</strong> (чем выше μ, тем лучше стена «дышит»).</>}
              {' '}Чем выше коэффициент μ, тем лучше отвод влаги из конструкций.
            </p>
          )
        })()}

        <Link href="/materials/compare" className="mt-1 inline-block text-sm text-white/80 underline hover:text-white">
          Назад к сравнению материалов
        </Link>
      </main>
    </div>
  )
}
