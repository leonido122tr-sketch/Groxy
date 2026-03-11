'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ChevronDown, Maximize2 } from 'lucide-react'
import { useDirty } from '../../DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { DetailPlanFoundationWalls4 } from '@/app/components/DetailPlanFoundationWalls4'
import { setFoundationOverridesInStorage } from '@/lib/projects/resultOverridesStorage'
import { BackButton, useAndroidBackHandler } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'

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

const FOUNDATION_STORAGE_KEY = 'currentProjectData_foundation_4'

function readFoundation4InitFromStorage(): Record<string, unknown> | null {
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

type FoundationOverrides = { foundationVolume?: number; foundationReinforcement?: number; foundationHoops?: number }

type FoundationPageProps = {
  /** При true скрываем шапку (используется при просмотре сохранённого проекта) */
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
  /** Сохранённый проект (при просмотре) — переопределения инициализируются из него, как у стен */
  initialProject?: { resultsOverrides?: FoundationOverrides }
}

function FoundationPageContent({ embedInView, onSchemaClick, initialProject }: FoundationPageProps = {}) {
  const { markDirty } = useDirty()
  const storageInit = useMemo(() => readFoundation4InitFromStorage(), [])

  const [length, setLength] = useState(() => (storageInit ? Number(storageInit.length ?? 0) : 0))
  const [width, setWidth] = useState(() => (storageInit ? Number(storageInit.width ?? 0) : 0))
  const [height, setHeight] = useState(() => (storageInit ? Number(storageInit.height ?? 0) : 0))
  const [thickness, setThickness] = useState(() => (storageInit ? Number(storageInit.thickness ?? 0) : 0))
  const [principle, setPrinciple] = useState<Principle>(() => ((storageInit?.principle === 'outside' ? 'outside' : 'inside') as Principle))
  const [concreteGrade, setConcreteGrade] = useState(() => String(storageInit?.concreteGrade ?? ''))
  const [isConcreteGradeOpen, setIsConcreteGradeOpen] = useState(false)
  const [isConcreteGradeRequired, setIsConcreteGradeRequired] = useState(false)

  const [lengthText, setLengthText] = useState(() => (storageInit && Number(storageInit.length) > 0 ? formatRu1(Number(storageInit.length)) : ''))
  const [widthText, setWidthText] = useState(() => (storageInit && Number(storageInit.width) > 0 ? formatRu1(Number(storageInit.width)) : ''))
  const [heightText, setHeightText] = useState(() => (storageInit && Number(storageInit.height) > 0 ? formatRu1(Number(storageInit.height)) : ''))
  const [thicknessText, setThicknessText] = useState(() => (storageInit && Number(storageInit.thickness) > 0 ? formatRu1(Number(storageInit.thickness)) : ''))
  const [activePart, setActivePart] = useState<'width' | 'length' | null>(null)
  const ro = initialProject?.resultsOverrides
  const [foundationOverrides, setFoundationOverrides] = useState<FoundationOverrides>(() => ({
    foundationVolume: ro?.foundationVolume,
    foundationReinforcement: ro?.foundationReinforcement,
    foundationHoops: ro?.foundationHoops,
  }))

  const widthRef = useRef<HTMLInputElement | null>(null)
  const lengthRef = useRef<HTMLInputElement | null>(null)
  const hasMountedRef = useRef(false)

  // Как у стен: пишем в storage при изменении overrides, помечаем dirty при расхождении с initial
  useEffect(() => {
    if (typeof window === 'undefined') return
    setFoundationOverridesInStorage('4', foundationOverrides)
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

  // Сохраняем данные в sessionStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const foundationData = {
        length: clampNonNeg(length),
        width: clampNonNeg(width),
        height: clampNonNeg(height),
        thickness: clampNonNeg(thickness),
        principle,
        concreteGrade,
      }

      const hasData = foundationData.length > 0 || foundationData.width > 0 ||
                      foundationData.height > 0 || foundationData.thickness > 0

      if (hasData) {
        if (!hasMountedRef.current) {
          hasMountedRef.current = true
          sessionStorage.removeItem('pdfViewerUri')
          sessionStorage.setItem('currentProjectData_foundation_4', JSON.stringify(foundationData))
          return
        }
        sessionStorage.setItem('projectIsDirty', 'true')
        sessionStorage.removeItem('pdfViewerUri')
        sessionStorage.setItem('currentProjectData_foundation_4', JSON.stringify(foundationData))
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
      } else {
        if (!hasMountedRef.current) {
          sessionStorage.removeItem('pdfViewerUri')
          sessionStorage.removeItem('currentProjectData_foundation_4')
          return
        }
        sessionStorage.setItem('projectIsDirty', 'true')
        sessionStorage.removeItem('pdfViewerUri')
        sessionStorage.removeItem('currentProjectData_foundation_4')
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
      }
    }
  }, [length, width, height, thickness, principle, concreteGrade])

  // Расчет результатов
  const results = useMemo(() => {
    if (length === 0 || width === 0 || height === 0 || thickness === 0) return null

    const t = clampNonNeg(thickness)
    const adj = principle === 'inside' ? t / 2 : -t / 2
    const adjustedWidth = Math.max(0, width + adj)
    const adjustedLength = Math.max(0, length + adj)
    const foundationLength = 2 * (adjustedWidth + adjustedLength) // Периметр для 4 стен
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

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f14] font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/8 bg-[#10161f]">
          <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <BackButton
                fallbackHref="/projects/create/walls-4"
                className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-2xl bg-[#1a2230] px-3 py-2.5 text-sm font-medium text-white"
              >
                <BackIcon className="h-5 w-5" aria-label="Назад" />
              </BackButton>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-white">Фундамент</h1>
              <div className="h-12 w-12" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-3 pb-8 sm:px-6">
        <div className="mt-1 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
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
                      : 'border-white/10 bg-[#10161f] text-zinc-200 hover:bg-[#141a22]'
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
                      : 'border-white/10 bg-[#10161f] text-zinc-200 hover:bg-[#141a22]'
                  }`}
                >
                  Снаружи
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* mini visualization */}

        {/* mini visualization (same style as others) */}
        <div className="mt-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          <div className="relative flex items-center justify-center">
            {onSchemaClick && (
              <button
                type="button"
                onClick={onSchemaClick}
                aria-label="Открыть план в масштабе"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-[20px] border border-white/10 bg-[#10161f]">
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const w = Number.isFinite(width) && width > 0 ? width : 1
                const l = Number.isFinite(length) && length > 0 ? length : 1

                const scale = 60 / Math.max(w, l, 1)
                const wPx = w * scale
                const lPx = l * scale
                const thick = 4
                const LABEL_OFFSET = 18

                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'

                // Rectangle placement (derived from width/length)
                const x0 = 60
                const y0 = 26
                const rectW = wPx
                const rectH = lPx

                const leftX = x0
                const rightX = x0 + rectW - thick
                const topY = y0
                const bottomY = y0 + rectH - thick

                const widthLabel = `${format2(clampNonNeg(width))}`.replace('.', ',') + ' м'
                const lengthLabel = `${format2(clampNonNeg(length))}`.replace('.', ',') + ' м'

                return (
                  <>
                    {/* length (top) */}
                    <rect
                      x={x0}
                      y={topY}
                      width={rectW}
                      height={thick}
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
                    {/* length (bottom) */}
                    <rect
                      x={x0}
                      y={bottomY}
                      width={rectW}
                      height={thick}
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
                    {/* width (left) */}
                    <rect
                      x={leftX}
                      y={topY}
                      width={thick}
                      height={rectH}
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
                    {/* width (right) */}
                    <rect
                      x={rightX}
                      y={topY}
                      width={thick}
                      height={rectH}
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

                    {/* length label above */}
                    <text
                      x={x0 + rectW / 2}
                      y={Math.max(12, topY - LABEL_OFFSET)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'length' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('length')
                        lengthRef.current?.focus()
                      }}
                    >
                      {lengthLabel}
                    </text>

                    {/* width label (rotated, left) */}
                    <text
                      x={leftX - LABEL_OFFSET}
                      y={topY + rectH / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'width' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${leftX - LABEL_OFFSET} ${topY + rectH / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('width')
                        widthRef.current?.focus()
                      }}
                    >
                      {widthLabel}
                    </text>
                  </>
                )
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-3 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                className="android-field text-sm"
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
                className="android-field text-sm"
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
                className="android-field text-sm"
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
                className="android-field text-sm"
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
                className={`android-select text-sm ${
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
                <div className="android-menu">
                  {CONCRETE_GRADES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => {
                        setConcreteGrade(g.value)
                        setIsConcreteGradeOpen(false)
                        setIsConcreteGradeRequired(false)
                        markDirty()
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-[#141a22] first:rounded-t-xl last:rounded-b-xl"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Результаты */}
        {results && (
          <div className="mt-3 rounded-[22px] border border-white/10 bg-[#141a22] p-5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]">
            <div className="grid gap-4 text-sm">
              <div className="android-panel-soft p-5">
                <EditableResultBlock
                  plain
                  label="Объём"
                  calculatedValue={results.volume}
                  overrideValue={foundationOverrides.foundationVolume}
                  unit="м³"
                  onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationVolume: v }))}
                />
              </div>
              <div className="android-panel-soft p-5">
                <EditableResultBlock
                  plain
                  label="Арматура"
                  calculatedValue={results.reinforcement}
                  overrideValue={foundationOverrides.foundationReinforcement}
                  unit="м"
                  onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationReinforcement: v }))}
                />
              </div>
              <div className="android-panel-soft p-5">
                <EditableResultBlock
                  plain
                  label="Хомуты (шаг 0,25 м)"
                  calculatedValue={results.hoops}
                  overrideValue={foundationOverrides.foundationHoops}
                  unit="м"
                  onOverride={(v: number | undefined) => setFoundationOverrides((prev) => ({ ...prev, foundationHoops: v }))}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function FoundationPage(
  props: { params?: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string | string[] | undefined>> }
) {
  const [showBigPlan, setShowBigPlan] = useState(false)
  useAndroidBackHandler(() => setShowBigPlan(false), showBigPlan)
  const p = props as unknown as FoundationPageProps
  const onSchemaClick = p?.onSchemaClick ?? (() => setShowBigPlan(true))
  const effectiveEmbedInView = p?.embedInView ?? false
  return (
    <>
      <FoundationPageContent embedInView={effectiveEmbedInView} onSchemaClick={onSchemaClick} initialProject={p?.initialProject} />
      {showBigPlan && (() => {
        let width = 0
        let length = 0
        let thickness = 0.25
        let principle: 'inside' | 'outside' = 'inside'
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem('currentProjectData_foundation_4')
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; thickness?: number; principle?: 'inside' | 'outside' }
              width = Number(d.width) >= 0 ? Number(d.width) : 0
              length = Number(d.length) >= 0 ? Number(d.length) : 0
              if (Number(d.thickness) >= 0) thickness = Number(d.thickness)
              if (d.principle === 'inside' || d.principle === 'outside') principle = d.principle
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanFoundationWalls4 width={width} length={length} thickness={thickness} principle={principle} onClose={() => setShowBigPlan(false)} />
        )
      })()}
    </>
  )
}
