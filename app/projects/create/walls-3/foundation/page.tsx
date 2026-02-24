'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Maximize2 } from 'lucide-react'
import { useDirty } from '../../buildings-2/DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { getFoundationOverridesFromStorage, setFoundationOverridesInStorage } from '@/lib/projects/resultOverridesStorage'

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

type FoundationPageProps = {
  /** При true скрываем шапку (используется при просмотре сохранённого проекта) */
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
}

export default function FoundationPage({ embedInView, onSchemaClick }: FoundationPageProps = {}) {
  const { markDirty } = useDirty()

  const [left, setLeft] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.left || 0
        } catch {}
      }
    }
    return 0
  })
  const [back, setBack] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.back || 0
        } catch {}
      }
    }
    return 0
  })
  const [right, setRight] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.right || 0
        } catch {}
      }
    }
    return 0
  })
  const [height, setHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.height || 0
        } catch {}
      }
    }
    return 0
  })
  const [thickness, setThickness] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.thickness || 0
        } catch {}
      }
    }
    return 0
  })
  const [principle, setPrinciple] = useState<Principle>(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.principle || 'inside'
        } catch {}
      }
    }
    return 'inside'
  })
  const [concreteGrade, setConcreteGrade] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedData = sessionStorage.getItem('currentProjectData_foundation_3')
      if (savedData) {
        try {
          const data = JSON.parse(savedData)
          return data.concreteGrade || ''
        } catch {}
      }
    }
    return ''
  })

  const hasMountedRef = useRef(false)
  const leftRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)
  const rightRef = useRef<HTMLInputElement>(null)
  const [activePart, setActivePart] = useState<'left' | 'back' | 'right' | null>(null)
  const [foundationVolumeOverride, setFoundationVolumeOverride] = useState<number | undefined>(undefined)
  const [foundationReinforcementOverride, setFoundationReinforcementOverride] = useState<number | undefined>(undefined)
  const [foundationHoopsOverride, setFoundationHoopsOverride] = useState<number | undefined>(undefined)
  const [isConcreteGradeOpen, setIsConcreteGradeOpen] = useState(false)
  const isConcreteGradeRequired = left > 0 && back > 0 && right > 0 && height > 0 && thickness > 0

  const [leftText, setLeftText] = useState(() => left ? formatRu1(left) : '')
  const [backText, setBackText] = useState(() => back ? formatRu1(back) : '')
  const [rightText, setRightText] = useState(() => right ? formatRu1(right) : '')
  const [heightText, setHeightText] = useState(() => height ? formatRu1(height) : '')
  const [thicknessText, setThicknessText] = useState(() => thickness ? formatRu1(thickness) : '')

  // Удаляем useEffect для загрузки данных, так как мы используем lazy initialization

  // Сохраняем данные в sessionStorage при изменении
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const foundationData = {
        left: clampNonNeg(left),
        back: clampNonNeg(back),
        right: clampNonNeg(right),
        height: clampNonNeg(height),
        thickness: clampNonNeg(thickness),
        principle,
        concreteGrade,
      }

      const hasData = foundationData.left > 0 || foundationData.back > 0 ||
                      foundationData.right > 0 || foundationData.height > 0 ||
                      foundationData.thickness > 0

      if (hasData) {
        if (!hasMountedRef.current) {
          hasMountedRef.current = true
          sessionStorage.removeItem('pdfViewerUri')
          sessionStorage.setItem('currentProjectData_foundation_3', JSON.stringify(foundationData))
          return
        }
        sessionStorage.setItem('projectIsDirty', 'true')
        sessionStorage.removeItem('pdfViewerUri')
        sessionStorage.setItem('currentProjectData_foundation_3', JSON.stringify(foundationData))
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
      } else {
        if (!hasMountedRef.current) {
          sessionStorage.removeItem('pdfViewerUri')
          sessionStorage.removeItem('currentProjectData_foundation_3')
          return
        }
        sessionStorage.setItem('projectIsDirty', 'true')
        sessionStorage.removeItem('pdfViewerUri')
        sessionStorage.removeItem('currentProjectData_foundation_3')
        window.dispatchEvent(new CustomEvent('projectDataChanged'))
      }
    }
  }, [left, back, right, height, thickness, principle, concreteGrade])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const overrides = getFoundationOverridesFromStorage('3')
    queueMicrotask(() => {
      if (overrides.foundationVolume != null) setFoundationVolumeOverride(overrides.foundationVolume)
      if (overrides.foundationReinforcement != null) setFoundationReinforcementOverride(overrides.foundationReinforcement)
      if (overrides.foundationHoops != null) setFoundationHoopsOverride(overrides.foundationHoops)
    })
  }, [])

  // Расчет результатов
  const results = useMemo(() => {
    if (left === 0 || back === 0 || right === 0 || height === 0 || thickness === 0) return null

    const t = clampNonNeg(thickness)
    const adj = principle === 'inside' ? t / 2 : -t / 2
    const adjustedLeft = Math.max(0, left + adj)
    const adjustedBack = Math.max(0, back + adj)
    const adjustedRight = Math.max(0, right + adj)
    const foundationLength = adjustedLeft + adjustedBack + adjustedRight
    const volume = foundationLength * t * height
    const reinforcement = foundationLength * 4
    const hoopWidth = Math.max(0, t - 0.08)
    const hoopHeight = Math.max(0, height - 0.08)
    const hoopPerimeter = (hoopWidth + hoopHeight) * 2
    const hoopCount = Math.ceil(foundationLength / 0.25) + 1
    const hoops = hoopPerimeter * hoopCount

    return { volume, foundationLength, reinforcement, hoops }
  }, [left, back, right, height, thickness, principle])

  const concreteGradeLabel = CONCRETE_GRADES.find((g) => g.value === concreteGrade)?.label || 'Не выбрана'

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/projects/create/walls-3"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" aria-label="Назад" />
              </Link>
              <h1 className="text-2xl font-bold">Фундамент</h1>
              <div className="w-[88px]" />
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

        {/* mini visualization (same style as 2-walls) */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="relative flex items-center justify-center">
            {embedInView && onSchemaClick && (
              <button
                type="button"
                onClick={onSchemaClick}
                aria-label="Открыть план в масштабе"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <svg
              viewBox="0 0 200 120"
              className="h-28 w-full max-w-md select-none rounded-xl border border-white/10 bg-black/40"
            >
              <rect width="200" height="120" fill="transparent" />
              {(() => {
                const l = Number.isFinite(left) && left > 0 ? left : 1
                const b = Number.isFinite(back) && back > 0 ? back : 1
                const r = Number.isFinite(right) && right > 0 ? right : 1

                const scale = 60 / Math.max(l, b, r, 1)
                const lPx = l * scale
                const bPx = b * scale
                const rPx = r * scale
                const thick = 4

                // U-shape placement
                const x0 = 40
                const yTop = 28
                const LABEL_OFFSET = 18

                const activeFill = '#3b82f6'
                const inactiveFill = 'rgba(255,255,255,0.20)'
                const activeStroke = '#2563eb'
                const inactiveStroke = 'rgba(255,255,255,0.25)'

                // walls: left vertical, back horizontal, right vertical
                const leftX = x0
                const backY = yTop
                const rightX = x0 + bPx - thick

                const leftY = backY + thick
                const rightY = backY + thick

                // labels (RU comma)
                const leftLabel = `${format2(clampNonNeg(left))}`.replace('.', ',') + ' м'
                const backLabel = `${format2(clampNonNeg(back))}`.replace('.', ',') + ' м'
                const rightLabel = `${format2(clampNonNeg(right))}`.replace('.', ',') + ' м'

                return (
                  <>
                    {/* back */}
                    <rect
                      x={x0}
                      y={backY}
                      width={bPx}
                      height={thick}
                      rx={2}
                      fill={activePart === 'back' ? activeFill : inactiveFill}
                      stroke={activePart === 'back' ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('back')
                        backRef.current?.focus()
                      }}
                    />

                    {/* left */}
                    <rect
                      x={leftX}
                      y={leftY}
                      width={thick}
                      height={lPx}
                      rx={2}
                      fill={activePart === 'left' ? activeFill : inactiveFill}
                      stroke={activePart === 'left' ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('left')
                        leftRef.current?.focus()
                      }}
                    />

                    {/* right */}
                    <rect
                      x={rightX}
                      y={rightY}
                      width={thick}
                      height={rPx}
                      rx={2}
                      fill={activePart === 'right' ? activeFill : inactiveFill}
                      stroke={activePart === 'right' ? activeStroke : inactiveStroke}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('right')
                        rightRef.current?.focus()
                      }}
                    />

                    {/* back label (centered on the back wall, consistent offset) */}
                    <text
                      x={x0 + bPx / 2}
                      y={Math.max(12, backY - LABEL_OFFSET)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'back' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('back')
                        backRef.current?.focus()
                      }}
                    >
                      {backLabel}
                    </text>

                    {/* left label (rotated) */}
                    <text
                      x={leftX - LABEL_OFFSET}
                      y={leftY + lPx / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'left' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${leftX - LABEL_OFFSET} ${leftY + lPx / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('left')
                        leftRef.current?.focus()
                      }}
                    >
                      {leftLabel}
                    </text>

                    {/* right label (rotated) */}
                    <text
                      x={rightX + thick + LABEL_OFFSET}
                      y={rightY + rPx / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={700}
                      fill={activePart === 'right' ? '#60a5fa' : 'rgba(255,255,255,0.55)'}
                      transform={`rotate(-90 ${rightX + thick + LABEL_OFFSET} ${rightY + rPx / 2})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setActivePart('right')
                        rightRef.current?.focus()
                      }}
                    >
                      {rightLabel}
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
                placeholder="Левая стена (м)"
                value={leftText}
                ref={leftRef}
                onFocus={() => setActivePart('left')}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setLeftText(t)
                  setLeft(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (leftText.trim() === '') return
                  setLeftText(formatRu1(left))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Задняя стена (м)"
                value={backText}
                ref={backRef}
                onFocus={() => setActivePart('back')}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setBackText(t)
                  setBack(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (backText.trim() === '') return
                  setBackText(formatRu1(back))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Правая стена (м)"
                value={rightText}
                ref={rightRef}
                onFocus={() => setActivePart('right')}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setRightText(t)
                  setRight(parseRuDecimal(t))
                  markDirty()
                }}
                onBlur={() => {
                  if (rightText.trim() === '') return
                  setRightText(formatRu1(right))
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

        {/* Результаты */}
        {results && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="space-y-2 text-sm">
              <EditableResultBlock
                label="Объём"
                calculatedValue={results.volume}
                overrideValue={foundationVolumeOverride}
                unit="м³"
                onOverride={(v: number | undefined) => {
                  setFoundationVolumeOverride(v)
                  if (typeof window !== 'undefined') {
                    setFoundationOverridesInStorage('3', { foundationVolume: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
              <EditableResultBlock
                label="Арматура"
                calculatedValue={results.reinforcement}
                overrideValue={foundationReinforcementOverride}
                unit="м"
                onOverride={(v: number | undefined) => {
                  setFoundationReinforcementOverride(v)
                  if (typeof window !== 'undefined') {
                    setFoundationOverridesInStorage('3', { foundationReinforcement: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
              <EditableResultBlock
                label="Хомуты (шаг 0,25 м)"
                calculatedValue={results.hoops}
                overrideValue={foundationHoopsOverride}
                unit="м"
                onOverride={(v: number | undefined) => {
                  setFoundationHoopsOverride(v)
                  if (typeof window !== 'undefined') {
                    setFoundationOverridesInStorage('3', { foundationHoops: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
