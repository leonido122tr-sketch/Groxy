'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Maximize2 } from 'lucide-react'
import { useDirty } from '../../buildings-2/DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { DetailPlanFoundationWalls2 } from '@/app/components/DetailPlanFoundationWalls2'
import { setFoundationOverridesInStorage } from '@/lib/projects/resultOverridesStorage'

const FOUNDATION_STORAGE_KEY = 'currentProjectData_foundation_2'

function readFoundation2InitFromStorage(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(FOUNDATION_STORAGE_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    const len = Number(data.length ?? 0), w = Number(data.width ?? 0), h = Number(data.height ?? 0), t = Number(data.thickness ?? 0)
    if (len > 0 || w > 0 || h > 0 || t > 0) return data
    return null
  } catch {
    return null
  }
}

type Principle = 'inside' | 'outside'

type ConcreteGradeOption = { value: string; label: string }

const CONCRETE_GRADES: ConcreteGradeOption[] = [
  { value: '', label: 'Выберите марку бетона' },
  { value: 'm150', label: 'М150 (B10)' },
  { value: 'm200', label: 'М200 (B15)' },
  { value: 'm250', label: 'М250 (B20)' },
  { value: 'm300', label: 'М300 (B22,5)' },
  { value: 'm400', label: 'М400 (B30)' },
]

function parseRuDecimal(value: string) {
  const cleaned = value.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function sanitizeRuDecimalInput(raw: string, maxDecimals = 2) {
  const filtered = raw.replace(/[^\d,\.]/g, '')
  const firstSepIdx = filtered.search(/[.,]/)
  const sep = firstSepIdx >= 0 ? filtered[firstSepIdx] : null

  const intPartRaw = (sep ? filtered.slice(0, firstSepIdx) : filtered).replace(/[.,]/g, '')
  const rest = sep ? filtered.slice(firstSepIdx + 1) : ''
  const decRaw = rest.replace(/[.,]/g, '')

  let intPart = intPartRaw.replace(/^0+(?=\d)/, '')
  if (intPart === '' && (raw.includes(',') || raw.startsWith(','))) intPart = '0'

  let out = intPart
  if (sep) {
    const dec = decRaw.slice(0, maxDecimals)
    out = `${intPart}${sep}${dec}`
    if (dec.length === 0 && (raw.endsWith(',') || raw.endsWith('.'))) out = `${intPart}${sep}`
  }

  return out
}

function formatRu1(n: number) {
  const v = Number.isFinite(n) ? n : 0
  return v.toFixed(2).replace('.', ',')
}

function format2(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2)
}

function clampNonNeg(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

type FoundationOverrides = { foundationVolume?: number; foundationReinforcement?: number; foundationHoops?: number }

type FoundationPageProps = {
  /** При true скрываем шапку (используется при просмотре сохранённого проекта) */
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
  /** Сохранённый проект (при просмотре) — переопределения инициализируются из него, как у стен */
  initialProject?: { resultsOverrides?: FoundationOverrides }
}

function FoundationPageContent({ embedInView, onSchemaClick, initialProject }: FoundationPageProps) {
  const { markDirty } = useDirty()
  const storageInit = useMemo(() => readFoundation2InitFromStorage(), [])

  const [length, setLength] = useState(() => (storageInit ? Number(storageInit.length ?? 0) : 0))
  const [width, setWidth] = useState(() => (storageInit ? Number(storageInit.width ?? 0) : 0))
  const [height, setHeight] = useState(() => (storageInit ? Number(storageInit.height ?? 0) : 0))
  const [thickness, setThickness] = useState(() => (storageInit ? Number(storageInit.thickness ?? 0) : 0))
  const [principle, setPrinciple] = useState<Principle>(() => ((storageInit?.principle === 'outside' ? 'outside' : 'inside') as Principle))
  const [concreteGrade, setConcreteGrade] = useState(() => String(storageInit?.concreteGrade ?? ''))

  const widthRef = useRef<HTMLInputElement>(null)
  const lengthRef = useRef<HTMLInputElement>(null)
  const hasMountedRef = useRef(false)
  const [activePart, setActivePart] = useState<'width' | 'length' | null>(null)
  const ro = initialProject?.resultsOverrides
  const [foundationOverrides, setFoundationOverrides] = useState<FoundationOverrides>(() => ({
    foundationVolume: ro?.foundationVolume,
    foundationReinforcement: ro?.foundationReinforcement,
    foundationHoops: ro?.foundationHoops,
  }))
  const [isConcreteGradeOpen, setIsConcreteGradeOpen] = useState(false)
  const isConcreteGradeRequired =
    !embedInView && length > 0 && width > 0 && height > 0 && thickness > 0

  const [lengthText, setLengthText] = useState(() => (storageInit && Number(storageInit.length) > 0 ? formatRu1(Number(storageInit.length)) : ''))
  const [widthText, setWidthText] = useState(() => (storageInit && Number(storageInit.width) > 0 ? formatRu1(Number(storageInit.width)) : ''))
  const [heightText, setHeightText] = useState(() => (storageInit && Number(storageInit.height) > 0 ? formatRu1(Number(storageInit.height)) : ''))
  const [thicknessText, setThicknessText] = useState(() => (storageInit && Number(storageInit.thickness) > 0 ? formatRu1(Number(storageInit.thickness)) : ''))

  // Как у стен: пишем в storage при изменении overrides, помечаем dirty при расхождении с initial
  useEffect(() => {
    if (typeof window === 'undefined') return
    setFoundationOverridesInStorage('2', foundationOverrides)
    const initial = initialProject?.resultsOverrides ?? {}
    const overridesChanged =
      JSON.stringify(foundationOverrides) !==
      JSON.stringify({ foundationVolume: initial.foundationVolume, foundationReinforcement: initial.foundationReinforcement, foundationHoops: initial.foundationHoops })
    if (overridesChanged) {
      sessionStorage.setItem('projectIsDirty', 'true')
      markDirty()
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
    }
  }, [foundationOverrides, initialProject?.resultsOverrides])

  // Сохраняем в sessionStorage только при наличии данных (единый принцип как у стен)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const foundationData = {
      length: clampNonNeg(length),
      width: clampNonNeg(width),
      height: clampNonNeg(height),
      thickness: clampNonNeg(thickness),
      principle,
      concreteGrade,
    }
    const hasData =
      foundationData.length > 0 ||
      foundationData.width > 0 ||
      foundationData.height > 0 ||
      foundationData.thickness > 0
    if (!hasData) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.removeItem('pdfViewerUri')
      sessionStorage.setItem('currentProjectData_foundation_2', JSON.stringify(foundationData))
      return
    }
    sessionStorage.setItem('projectIsDirty', 'true')
    sessionStorage.removeItem('pdfViewerUri')
    sessionStorage.setItem('currentProjectData_foundation_2', JSON.stringify(foundationData))
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  }, [length, width, height, thickness, principle, concreteGrade])

  // Расчет результатов
  const results = useMemo(() => {
    if (length === 0 || width === 0 || height === 0 || thickness === 0) return null

    const t = clampNonNeg(thickness)
    const adj = principle === 'inside' ? t / 2 : -t / 2
    const adjustedWidth = Math.max(0, width + adj)
    const adjustedLength = Math.max(0, length + adj)
    const foundationLength = adjustedWidth + adjustedLength
    const volume = foundationLength * t * height
    const reinforcement = foundationLength * 4
    const hoopWidth = Math.max(0, t - 0.08)
    const hoopHeight = Math.max(0, height - 0.08)
    const hoopPerimeter = (hoopWidth + hoopHeight) * 2
    const hoopCount = Math.ceil(foundationLength / 0.25) + 1
    const hoops = hoopPerimeter * hoopCount

    return { volume, foundationLength, reinforcement, hoops }
  }, [length, width, height, thickness, principle])

  const concreteGradeLabel = CONCRETE_GRADES.find((g) => g.value === concreteGrade)?.label || 'Не выбрана'
  const principleLabel = principle === 'inside' ? 'Внутри' : 'Снаружи'

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/projects/create/walls-2"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" aria-label="Назад" />
              </Link>
              <h1 className="text-2xl font-bold">Фундамент</h1>
              <div className="w-9" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 pb-10 sm:px-6">
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Принцип расчёта</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPrinciple('inside')
                    markDirty()
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    principle === 'inside'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                      : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  Внутри
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrinciple('outside')
                    markDirty()
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    principle === 'outside'
                      ? 'border-blue-500/50 bg-blue-500/15 text-blue-200'
                      : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
                  }`}
                >
                  Снаружи
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mini visualization */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="relative flex items-center justify-center">
            {onSchemaClick && (
              <button
                type="button"
                onClick={onSchemaClick}
                aria-label="Открыть план в масштабе"
                disabled={!(width > 0 || length > 0 || height > 0 || thickness > 0)}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-xl border border-white/10 bg-black/40">
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const w = Number.isFinite(width) && width > 0 ? width : 1
                const l = Number.isFinite(length) && length > 0 ? length : 1
                const scale = 60 / Math.max(w, l, 1)
                const wPx = w * scale
                const lPx = l * scale
                const thickPx = 4
                const x0 = 10
                const y0 = 78
                const xV = x0 + wPx - thickPx
                const yV = y0 - lPx + thickPx
                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'
                const widthLabel = `${format2(clampNonNeg(width))}м`.replace('.', ',')
                const lengthLabel = `${format2(clampNonNeg(length))}м`.replace('.', ',')
                return (
                  <>
                    <rect
                      x={x0}
                      y={y0}
                      width={wPx}
                      height={thickPx}
                      rx={2}
                      fill={activePart === 'width' ? activeFill : inactiveFill}
                      stroke={activePart === 'width' ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('width')
                        widthRef.current?.focus()
                      }}
                    />
                    <rect
                      x={xV}
                      y={yV}
                      width={thickPx}
                      height={lPx}
                      rx={2}
                      fill={activePart === 'length' ? activeFill : inactiveFill}
                      stroke={activePart === 'length' ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('length')
                        lengthRef.current?.focus()
                      }}
                    />
                    <text x={x0 + wPx / 2} y={96} textAnchor="middle" fontSize={14} fontWeight={700} fill={activePart === 'width' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}>
                      {widthLabel}
                    </text>
                    <text
                      x={xV + 18}
                      y={yV + lPx / 2}
                      textAnchor="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'length' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${xV + 18} ${yV + lPx / 2})`}
                    >
                      {lengthLabel}
                    </text>
                  </>
                )
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Ширина (м)"
                value={widthText}
                ref={widthRef}
                onFocus={() => setActivePart('width')}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setWidthText(t)
                  setWidth(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (widthText.trim() === '') return
                  setWidthText(formatRu1(width))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Длина (м)"
                value={lengthText}
                ref={lengthRef}
                onFocus={() => setActivePart('length')}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setLengthText(t)
                  setLength(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (lengthText.trim() === '') return
                  setLengthText(formatRu1(length))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Высота (м)"
                value={heightText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setHeightText(t)
                  setHeight(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (heightText.trim() === '') return
                  setHeightText(formatRu1(height))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Толщина (м)"
                value={thicknessText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setThicknessText(t)
                  setThickness(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (thicknessText.trim() === '') return
                  setThicknessText(formatRu1(thickness))
                }}
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsConcreteGradeOpen(!isConcreteGradeOpen)}
                className={`flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white ${
                  isConcreteGradeRequired && !concreteGrade
                    ? 'border-amber-500/50 bg-amber-500/10'
                    : ''
                }`}
              >
                <span className={concreteGrade ? 'text-white' : 'text-zinc-500'}>
                  {concreteGradeLabel}
                </span>
                <ChevronDown className={`h-5 w-5 text-zinc-400 transition-transform ${isConcreteGradeOpen ? 'rotate-180' : ''}`} />
              </button>
              {isConcreteGradeOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-lg">
                  {CONCRETE_GRADES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        setConcreteGrade(g.value)
                        setIsConcreteGradeOpen(false)
                        markDirty()
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-transparent p-6">
          <h3 className="text-lg font-semibold text-white">Результат расчёта</h3>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-sm text-zinc-300">
              <span>Принцип расчёта:</span>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-blue-200">
                {principleLabel}
              </span>
            </div>
            {!results ? (
              <p className="mt-4 text-sm text-zinc-400">Введите параметры фундамента</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <EditableResultBlock
                    label="Объём"
                    calculatedValue={results.volume}
                    overrideValue={foundationOverrides.foundationVolume}
                    unit="м³"
                    onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationVolume: v }))}
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <EditableResultBlock
                    label="Арматура"
                    calculatedValue={results.reinforcement}
                    overrideValue={foundationOverrides.foundationReinforcement}
                    unit="м"
                    onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationReinforcement: v }))}
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <EditableResultBlock
                    label="Хомуты (шаг 0,25 м)"
                    calculatedValue={results.hoops}
                    overrideValue={foundationOverrides.foundationHoops}
                    unit="м"
                    onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationHoops: v }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  )
}

type PageProps = { params?: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

export default function FoundationPage(props: PageProps) {
  const [showBigPlan, setShowBigPlan] = useState(false)
  const p = props as unknown as FoundationPageProps
  const onSchemaClick = p?.onSchemaClick ?? (() => setShowBigPlan(true))
  const effectiveEmbedInView = p?.embedInView ?? false
  return (
    <>
      <FoundationPageContent embedInView={effectiveEmbedInView} onSchemaClick={onSchemaClick} initialProject={p?.initialProject} />
      {showBigPlan &&
        (() => {
          let width = 0
          let length = 0
          let thickness = 0
          let principle: 'inside' | 'outside' = 'inside'
          if (typeof window !== 'undefined') {
            try {
              const raw = sessionStorage.getItem('currentProjectData_foundation_2')
              if (raw) {
                const d = JSON.parse(raw) as { width?: number; length?: number; thickness?: number; principle?: 'inside' | 'outside' }
                width = Number(d.width) >= 0 ? Number(d.width) : 0
                length = Number(d.length) >= 0 ? Number(d.length) : 0
                thickness = Number(d.thickness) >= 0 ? Number(d.thickness) : 0
                if (d.principle === 'inside' || d.principle === 'outside') principle = d.principle
              }
            } catch {
              // ignore
            }
          }
          return (
            <DetailPlanFoundationWalls2
              width={width}
              length={length}
              thickness={thickness}
              principle={principle}
              onClose={() => setShowBigPlan(false)}
            />
          )
        })()}
    </>
  )
}
