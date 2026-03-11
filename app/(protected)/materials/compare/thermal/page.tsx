'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'

interface WallMaterial {
  id: string
  name: string
  lambda: number
}

const WALL_MATERIALS: WallMaterial[] = [
  { id: '1', name: 'Кирпич керамический (красный)', lambda: 0.7 },
  { id: '2', name: 'Кирпич силикатный (белый)', lambda: 0.8 },
  { id: '3', name: 'Газобетон (автоклавный)', lambda: 0.12 },
  { id: '4', name: 'Пенобетон', lambda: 0.24 },
  { id: '5', name: 'Керамзитобетонные блоки', lambda: 0.53 },
  { id: '6', name: 'Арболит (деревобетон)', lambda: 0.12 },
  { id: '7', name: 'Теплостен (многослойные блоки)', lambda: 0.12 },
  { id: '8', name: 'Кирпич поризованный (тёплая керамика)', lambda: 0.18 },
  { id: '9', name: 'Шлакоблок', lambda: 0.48 },
  { id: '10', name: 'Пенополистиролбетон', lambda: 0.11 },
  { id: '11', name: 'Дерево (брус)', lambda: 0.16 },
  { id: '12', name: 'Бревно оцилиндрованное', lambda: 0.18 },
  { id: '13', name: 'Каркас (дерево + утеплитель)', lambda: 0.09 },
  { id: '14', name: 'СИП-панели', lambda: 0.045 },
  { id: '15', name: 'Кирпич клинкерный', lambda: 1.0 },
]

const LAMBDA_MIN = 0
const LAMBDA_MAX = 1.2

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
      <div className="android-panel-soft">
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
          className="android-field rounded-2xl border-0 bg-transparent px-3 py-3"
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
        <div className="android-menu absolute left-0 right-0 top-full max-h-60 overflow-auto">
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
                    className="android-menu-item"
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
  const lambdaValue = selected?.lambda ?? 0
  const scalePercent = Math.min(100, (lambdaValue / LAMBDA_MAX) * 100)
  const isWarm = scalePercent < 50
  const gradient =
    isWarm
      ? `linear-gradient(to right, rgb(245 158 11 / 0.8) 0%, rgb(245 158 11 / 0.8) 70%, rgb(59 130 246 / 0.8) 100%)`
      : `linear-gradient(to right, rgb(245 158 11 / 0.8) 0%, rgb(59 130 246 / 0.8) 30%, rgb(59 130 246 / 0.8) 100%)`

  return (
    <div className="pb-2">
      <div className="mb-1 flex justify-between text-sm text-zinc-400">
        <span>λ, Вт/(м·°C)</span>
        {selected && (
          <span className="font-medium text-white">
            {selected.lambda} Вт/(м·°C)
          </span>
        )}
      </div>
      <div className="h-10 w-full overflow-hidden rounded-xl bg-[#10161f] ring-1 ring-white/10">
        <div
          className="h-full rounded-xl transition-all duration-300"
          style={{
            width: `${scalePercent}%`,
            background: gradient,
          }}
        />
      </div>
    </div>
  )
}

export default function ThermalConductivityPage() {
  const [selected, setSelected] = useState<WallMaterial | null>(null)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [selected2, setSelected2] = useState<WallMaterial | null>(null)
  const [search2, setSearch2] = useState('')
  const [open2, setOpen2] = useState(false)

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

  return (
    <AppPage header={<AppHeader />} width="lg" className="py-5">
      <div className="space-y-4">
        <SurfaceCard className="p-5">
          <h2 className="text-2xl font-semibold text-white">Теплопроводность</h2>
          <p className="mt-1 text-sm text-zinc-300">Сравнение материалов для возведения стен.</p>
        </SurfaceCard>

        {/* Материал 1 */}
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

        {/* Материал 2 */}
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

        {/* Теплопроводность 1 */}
        <ScaleBlock selected={selected} />

        {/* Теплопроводность 2 */}
        <ScaleBlock selected={selected2} />

        {selected && selected2 && (() => {
          const low = selected.lambda <= selected2.lambda ? selected : selected2
          const high = selected.lambda <= selected2.lambda ? selected2 : selected
          const percent = high.lambda > 0 ? Math.round(((high.lambda - low.lambda) / high.lambda) * 100) : 0
          const isEqual = selected.lambda === selected2.lambda
          return (
            <p className="rounded-2xl bg-[#141a22] px-3 py-2.5 text-sm text-zinc-300">
              {isEqual
                ? <>У <strong className="text-white">{selected.name}</strong> и <strong className="text-white">{selected2.name}</strong> одинаковая теплопроводность λ = {selected.lambda} Вт/(м·°C).</>
                : <>Материал <strong className="text-white">{low.name}</strong> имеет лучшую теплопроводность на {percent}% по сравнению с материалом <strong className="text-white">{high.name}</strong> (меньше λ — лучше теплоизоляция).</>}
              {' '}Чем ниже коэффициент λ, тем меньше теплопотери через стену.
            </p>
          )
        })()}

        <BackButton fallbackHref="/materials/compare" className="mt-1 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          Назад к сравнению материалов
        </BackButton>
      </div>
    </AppPage>
  )
}
