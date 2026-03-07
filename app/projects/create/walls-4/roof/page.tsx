'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Maximize2 } from 'lucide-react'
import { useDirty } from '../../buildings-2/DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { DetailPlanRoofWalls4 } from '@/app/components/DetailPlanRoofWalls4'
import { setRoofOverridesInStorage } from '@/lib/projects/resultOverridesStorage'

export type RoofType = 'single' | 'gable' | 'hip' | 'mansard'

const ROOF_STORAGE_KEY = 'currentProjectData_roof_4'

const ROOF_OPTIONS: { id: RoofType; label: string }[] = [
  { id: 'single', label: 'Односкатная крыша' },
  { id: 'gable', label: 'Двускатная крыша' },
  { id: 'hip', label: 'Вальмовая крыша' },
  { id: 'mansard', label: 'Мансардная крыша' },
]

function parseRuDecimal(value: string) {
  const cleaned = value.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function sanitizeRuDecimalInput(raw: string, maxDecimals = 2) {
  const filtered = raw.replace(/[^\d,.]/g, '')
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

const inputClass =
  'rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40'

function recommendedHeight(width: number): number | null {
  if (!(width > 0)) return null
  const slopeDeg = 12
  const h = width * Math.tan((slopeDeg * Math.PI) / 180)
  return Math.round(h * 100) / 100
}

/** Рекомендуемая высота конька для двускатной при уклоне ~12° (пролёт одного ската = width/2) */
function recommendedHeightGable(width: number): number | null {
  if (!(width > 0)) return null
  const slopeDeg = 12
  const h = (width / 2) * Math.tan((slopeDeg * Math.PI) / 180)
  return Math.round(h * 100) / 100
}

const RECOMMENDED_OVERHANG = 0.4

type RoofOverrides = { roofArea?: number; roofRaftersVolume?: number; roofPurlinVolume?: number; roofBattenVolume?: number }

type RoofPageProps = {
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
  /** Сохранённый проект (при просмотре) — переопределения инициализируются из него, как у фундамента и стен */
  initialProject?: { resultsOverrides?: RoofOverrides }
}

function RoofPageContent({ embedInView, onSchemaClick, initialProject }: RoofPageProps = {}) {
  const { markDirty } = useDirty()
  const [selectedType, setSelectedType] = useState<RoofType | null>(null)
  const ro = initialProject?.resultsOverrides
  const [roofOverrides, setRoofOverrides] = useState<RoofOverrides>(() => ({
    roofArea: ro?.roofArea,
    roofRaftersVolume: ro?.roofRaftersVolume,
    roofPurlinVolume: ro?.roofPurlinVolume,
    roofBattenVolume: ro?.roofBattenVolume,
  }))
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasMountedRef = useRef(false)
  const [widthText, setWidthText] = useState('')
  const [lengthText, setLengthText] = useState('')
  const [heightText, setHeightText] = useState('')
  const [overhangText, setOverhangText] = useState('')
  const [width, setWidth] = useState(0)
  const [length, setLength] = useState(0)
  const [height, setHeight] = useState(0)
  const [overhang, setOverhang] = useState(0)
  /** true = конёк вдоль длины (по умолчанию), false = конёк вдоль ширины (поворот 90°) */
  const [ridgeAlongLength, setRidgeAlongLength] = useState(true)

  const selectedLabel = selectedType
    ? ROOF_OPTIONS.find((t) => t.id === selectedType)?.label
    : null

  // При монтировании: если в storage есть данные крыши — выставляем тип (single/gable)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, number & string>
      const roofType = data.type === 'gable' ? 'gable' : 'single'
      const hasData =
        'width' in data || 'length' in data
          ? Number(data.width ?? 0) > 0 || Number(data.length ?? 0) > 0 || Number(data.height ?? 0) > 0 || Number(data.overhang ?? 0) > 0
          : false
      if (hasData && (roofType === 'gable' || roofType === 'single')) {
        queueMicrotask(() => setSelectedType(roofType))
      }
    } catch {
      // ignore
    }
  }, [])

  // Как у фундамента и стен: пишем в storage при изменении overrides, помечаем dirty при расхождении с initial
  useEffect(() => {
    if (typeof window === 'undefined') return
    setRoofOverridesInStorage('4', roofOverrides)
    const initial = initialProject?.resultsOverrides ?? {}
    const overridesChanged =
      JSON.stringify(roofOverrides) !==
      JSON.stringify({
        roofArea: initial.roofArea,
        roofRaftersVolume: initial.roofRaftersVolume,
        roofPurlinVolume: initial.roofPurlinVolume,
        roofBattenVolume: initial.roofBattenVolume,
      })
    if (overridesChanged) {
      sessionStorage.setItem('projectIsDirty', 'true')
      markDirty()
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
    }
  }, [roofOverrides, initialProject?.resultsOverrides])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Загрузка формы односкатной/двускатной из sessionStorage при выборе типа
  useEffect(() => {
    if (typeof window === 'undefined' || (selectedType !== 'single' && selectedType !== 'gable')) return
    const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, number | boolean>
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      const h = Number(data.height ?? 0)
      const o = Number(data.overhang ?? 0)
      queueMicrotask(() => {
        setWidth(w)
        setLength(len)
        setHeight(h)
        setOverhang(o)
        if (selectedType === 'gable' && typeof data.ridgeAlongLength === 'boolean') {
          setRidgeAlongLength(data.ridgeAlongLength)
        }
        if (w > 0 || len > 0 || h > 0 || o > 0) {
          setWidthText(w > 0 ? formatRu1(w) : '')
          setLengthText(len > 0 ? formatRu1(len) : '')
          setHeightText(h > 0 ? formatRu1(h) : '')
          setOverhangText(o > 0 ? formatRu1(o) : '')
        }
      })
    } catch {
      // ignore
    }
  }, [selectedType])

  // Сохранение односкатной в sessionStorage при изменении данных
  useEffect(() => {
    if (typeof window === 'undefined' || selectedType !== 'single') return
    const hasData = width > 0 || length > 0 || height > 0 || overhang > 0
    if (!hasData) return
    const slopeLength = width > 0 || height > 0 ? Math.sqrt(width * width + height * height) : 0
    const slopeDim = slopeLength + 2 * overhang
    const lengthDim = length + 2 * overhang
    const area = width > 0 && length > 0 ? Math.round(slopeDim * lengthDim * 100) / 100 : 0
    const payload = { type: 'single', width, length, height, overhang, area }
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem(ROOF_STORAGE_KEY, JSON.stringify(payload))
      return
    }
    sessionStorage.setItem(ROOF_STORAGE_KEY, JSON.stringify(payload))
    sessionStorage.setItem('projectIsDirty', 'true')
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  }, [selectedType, width, length, height, overhang])

  // Сохранение двускатной в sessionStorage при изменении данных
  useEffect(() => {
    if (typeof window === 'undefined' || selectedType !== 'gable') return
    const hasData = width > 0 || length > 0 || height > 0 || overhang > 0
    if (!hasData) return
    const alongLength = ridgeAlongLength
    const run = alongLength ? width / 2 : length / 2
    const slopeLength = run > 0 || height > 0 ? Math.sqrt(run * run + height * height) : 0
    const slopeDim = slopeLength + overhang
    const alongDim = alongLength ? length + 2 * overhang : width + 2 * overhang
    const area = width > 0 && length > 0 ? Math.round(2 * slopeDim * alongDim * 100) / 100 : 0
    const payload = { type: 'gable', width, length, height, overhang, ridgeAlongLength: alongLength, area }
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem(ROOF_STORAGE_KEY, JSON.stringify(payload))
      return
    }
    sessionStorage.setItem(ROOF_STORAGE_KEY, JSON.stringify(payload))
    sessionStorage.setItem('projectIsDirty', 'true')
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  }, [selectedType, width, length, height, overhang, ridgeAlongLength])

  const heightHint =
    selectedType === 'gable'
      ? recommendedHeightGable(ridgeAlongLength ? width : length)
      : recommendedHeight(width)
  const overhangHint = width > 0 && length > 0 ? RECOMMENDED_OVERHANG : null
  const slopeLength = width > 0 || height > 0 ? Math.sqrt(width * width + height * height) : 0
  const slopeDim = slopeLength + 2 * overhang
  const lengthDim = length + 2 * overhang
  const roofArea =
    width > 0 && length > 0
      ? slopeDim * lengthDim
      : 0
  // Двускатная: конёк вдоль длины → пролёт ската width/2, «длина» крыши length; конёк вдоль ширины → пролёт length/2, «длина» width
  const gableAlongLength = ridgeAlongLength
  const gableRun = gableAlongLength ? width / 2 : length / 2
  const slopeLengthGable = gableRun > 0 || height > 0 ? Math.sqrt(gableRun * gableRun + height * height) : 0
  const slopeDimGable = slopeLengthGable + overhang
  const gableAlongDim = gableAlongLength ? length + 2 * overhang : width + 2 * overhang
  const roofAreaGable =
    width > 0 && length > 0
      ? 2 * slopeDimGable * gableAlongDim
      : 0
  const RAFTER_SPACING = 0.6
  const BATTEN_SPACING = 0.4
  const rafterVolume =
    width > 0 && length > 0
      ? (Math.ceil(lengthDim / RAFTER_SPACING) + 1) * slopeDim * 0.05 * 0.15
      : 0
  const purlinVolume =
    width > 0 && length > 0 ? 3 * lengthDim * 0.04 * 0.1 : 0
  const battenVolume =
    width > 0 && length > 0
      ? Math.ceil(slopeDim / BATTEN_SPACING) * lengthDim * 0.025 * 0.1
      : 0
  const rafterVolumeGable =
    width > 0 && length > 0
      ? 2 * (Math.ceil(gableAlongDim / RAFTER_SPACING) + 1) * slopeDimGable * 0.05 * 0.15
      : 0
  const purlinVolumeGable = width > 0 && length > 0 ? 3 * gableAlongDim * 0.04 * 0.1 : 0
  const battenVolumeGable =
    width > 0 && length > 0
      ? 2 * Math.ceil(slopeDimGable / BATTEN_SPACING) * gableAlongDim * 0.025 * 0.1
      : 0

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/projects/create/walls-4"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" aria-label="Назад" />
              </Link>
              <h1 className="text-2xl font-bold">Крыша</h1>
              <div className="w-9" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 pb-10 sm:px-6">
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div className="relative" ref={containerRef}>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Тип крыши</label>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
              >
                <span className={selectedLabel ? 'text-white' : 'text-zinc-500'}>
                  {selectedLabel || 'Выберите тип крыши'}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 shadow-lg">
                  {ROOF_OPTIONS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedType(id)
                        setIsOpen(false)
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-xs text-zinc-500">Для отдельной постройки (4 стены) доступны все типы.</p>
            </div>
          </div>
          {selectedType === 'single' && (
            <>
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-zinc-200">Внешние размеры постройки (м)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                placeholder="Ширина (м)"
                value={widthText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setWidthText(t)
                  setWidth(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (widthText.trim() === '') return
                  setWidthText(formatRu1(width))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                placeholder="Длина (м)"
                value={lengthText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setLengthText(t)
                  setLength(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (lengthText.trim() === '') return
                  setLengthText(formatRu1(length))
                }}
              />
            </div>
          </div>

          <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/40">
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
            <div className="flex items-center justify-center p-2">
              <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-lg">
                <rect width="200" height="120" fill="transparent" />
                {width > 0 || length > 0
                  ? (() => {
                      const w = width > 0 ? width : 1
                      const l = length > 0 ? length : 1
                      const outW = w + 2 * overhang
                      const outL = l + 2 * overhang
                      const scale = 60 / Math.max(outW, outL, 1)
                      const wPx = w * scale
                      const lPx = l * scale
                      const outWPx = outW * scale
                      const outLPx = outL * scale
                      const x0 = 20
                      const y0 = 60 - outLPx / 2
                      const innerX = x0 + (outWPx - wPx) / 2
                      const innerY = y0 + (outLPx - lPx) / 2
                      return (
                        <>
                          <rect
                            x={x0}
                            y={y0}
                            width={outWPx}
                            height={outLPx}
                            rx={2}
                            fill="rgba(59,130,246,0.12)"
                            stroke="rgba(59,130,246,0.5)"
                            strokeWidth={1.5}
                          />
                          <rect
                            x={innerX}
                            y={innerY}
                            width={wPx}
                            height={lPx}
                            rx={2}
                            fill="rgba(59,130,246,0.35)"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                          />
                          {width > 0 && (
                            <text x={innerX + wPx / 2} y={innerY + lPx + 14} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.8)">
                              {formatRu1(width)} м
                            </text>
                          )}
                          {length > 0 && (
                            <text
                              x={innerX + wPx + 12}
                              y={innerY + lPx / 2}
                              textAnchor="middle"
                              fontSize={12}
                              fill="rgba(255,255,255,0.8)"
                              transform={`rotate(-90 ${innerX + wPx + 12} ${innerY + lPx / 2})`}
                            >
                              {formatRu1(length)} м
                            </text>
                          )}
                          <text x={190} y={18} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.7)">
                            Высота: {height > 0 ? formatRu1(height) : '—'} м
                          </text>
                          <text x={190} y={32} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.7)">
                            Свес: {overhang > 0 ? formatRu1(overhang) : '—'} м
                          </text>
                        </>
                      )
                    })()
                  : null}
              </svg>
            </div>
            <p className="pb-2 text-center text-xs text-zinc-500">Внутренний контур — постройка, внешний — крыша со свесом</p>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-zinc-200">Крыша (м)</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                placeholder={heightHint != null ? `Высота: ${formatRu1(heightHint)} м` : 'Высота (м)'}
                value={heightText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setHeightText(t)
                  setHeight(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (heightText.trim() === '') return
                  setHeightText(formatRu1(height))
                }}
              />
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                placeholder={overhangHint != null ? `Свес: ${formatRu1(overhangHint)} м` : 'Свес кровли (м)'}
                value={overhangText}
                onChange={(e) => {
                  const t = sanitizeRuDecimalInput(e.target.value, 2)
                  setOverhangText(t)
                  setOverhang(parseRuDecimal(t))
                }}
                onBlur={() => {
                  if (overhangText.trim() === '') return
                  setOverhangText(formatRu1(overhang))
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              Свес кровли — выступ крыши за пределы стены (карниз).
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
            <EditableResultBlock
              label="Площадь крыши"
              calculatedValue={roofArea}
              overrideValue={roofOverrides.roofArea}
              unit="м²"
              onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofArea: v }))}
            />
          </div>

          {roofArea > 0 && (
            <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="mb-2 text-sm font-medium text-zinc-200">Пиломатериалы (без запаса)</p>
              <EditableResultBlock
                label="Стропила (50×150 мм)"
                calculatedValue={Math.round(rafterVolume * 100) / 100}
                overrideValue={roofOverrides.roofRaftersVolume}
                unit="м³"
                onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofRaftersVolume: v }))}
              />
              <EditableResultBlock
                label="Прогоны (40×100 мм)"
                calculatedValue={Math.round(purlinVolume * 100) / 100}
                overrideValue={roofOverrides.roofPurlinVolume}
                unit="м³"
                onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofPurlinVolume: v }))}
              />
              <EditableResultBlock
                label="Обрешётка (25×100 мм)"
                calculatedValue={Math.round(battenVolume * 100) / 100}
                overrideValue={roofOverrides.roofBattenVolume}
                unit="м³"
                onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofBattenVolume: v }))}
              />
              <p className="mt-2 text-xs text-zinc-500">Шаг стропил 0,6 м, обрешётка 0,4 м.</p>
            </div>
          )}
            </>
          )}

          {selectedType === 'gable' && (
            <>
              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-zinc-200">Внешние размеры постройки (м)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="Ширина (м)"
                    value={widthText}
                    onChange={(e) => {
                      const t = sanitizeRuDecimalInput(e.target.value, 2)
                      setWidthText(t)
                      setWidth(parseRuDecimal(t))
                    }}
                    onBlur={() => {
                      if (widthText.trim() === '') return
                      setWidthText(formatRu1(width))
                    }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="Длина (м)"
                    value={lengthText}
                    onChange={(e) => {
                      const t = sanitizeRuDecimalInput(e.target.value, 2)
                      setLengthText(t)
                      setLength(parseRuDecimal(t))
                    }}
                    onBlur={() => {
                      if (lengthText.trim() === '') return
                      setLengthText(formatRu1(length))
                    }}
                  />
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <span className="text-sm text-zinc-200">
                    {ridgeAlongLength ? 'Конёк вдоль длины' : 'Конёк вдоль ширины'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!ridgeAlongLength}
                    onClick={() => {
                      setRidgeAlongLength((v) => !v)
                      sessionStorage.setItem('projectIsDirty', 'true')
                      markDirty()
                      window.dispatchEvent(new CustomEvent('projectDataChanged'))
                    }}
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      ridgeAlongLength ? 'bg-blue-600' : 'bg-zinc-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 translate-y-1 rounded-full bg-white shadow transition-transform ${
                        ridgeAlongLength ? 'translate-x-1' : 'translate-x-7'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/40">
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
                <div className="flex items-center justify-center gap-4 p-2">
                  <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-lg">
                    <rect width="200" height="120" fill="transparent" />
                    {width > 0 || length > 0
                      ? (() => {
                          const w = width > 0 ? width : 1
                          const l = length > 0 ? length : 1
                          const outW = w + 2 * overhang
                          const outL = l + 2 * overhang
                          const scale = 60 / Math.max(outW, outL, 1)
                          const wPx = w * scale
                          const lPx = l * scale
                          const outWPx = outW * scale
                          const outLPx = outL * scale
                          const x0 = 20
                          const y0 = 60 - outLPx / 2
                          const innerX = x0 + (outWPx - wPx) / 2
                          const innerY = y0 + (outLPx - lPx) / 2
                          return (
                            <>
                              <rect
                                x={x0}
                                y={y0}
                                width={outWPx}
                                height={outLPx}
                                rx={2}
                                fill="rgba(59,130,246,0.12)"
                                stroke="rgba(59,130,246,0.5)"
                                strokeWidth={1.5}
                              />
                              <rect
                                x={innerX}
                                y={innerY}
                                width={wPx}
                                height={lPx}
                                rx={2}
                                fill="rgba(59,130,246,0.35)"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                              />
                              {ridgeAlongLength ? (
                                <line
                                  x1={innerX + wPx / 2}
                                  y1={y0}
                                  x2={innerX + wPx / 2}
                                  y2={y0 + outLPx}
                                  stroke="rgba(139,92,246,0.8)"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 2"
                                />
                              ) : (
                                <line
                                  x1={x0}
                                  y1={innerY + lPx / 2}
                                  x2={x0 + outWPx}
                                  y2={innerY + lPx / 2}
                                  stroke="rgba(139,92,246,0.8)"
                                  strokeWidth={1.5}
                                  strokeDasharray="4 2"
                                />
                              )}
                              {width > 0 && (
                                <text x={innerX + wPx / 2} y={innerY + lPx + 14} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.8)">
                                  {formatRu1(width)} м
                                </text>
                              )}
                              {length > 0 && (
                                <text
                                  x={innerX + wPx + 12}
                                  y={innerY + lPx / 2}
                                  textAnchor="middle"
                                  fontSize={12}
                                  fill="rgba(255,255,255,0.8)"
                                  transform={`rotate(-90 ${innerX + wPx + 12} ${innerY + lPx / 2})`}
                                >
                                  {formatRu1(length)} м
                                </text>
                              )}
                              <text x={190} y={18} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.7)">
                                Высота конька: {height > 0 ? formatRu1(height) : '—'} м
                              </text>
                              <text x={190} y={32} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.7)">
                                Свес: {overhang > 0 ? formatRu1(overhang) : '—'} м
                              </text>
                            </>
                          )
                        })()
                      : null}
                  </svg>
                </div>
                <p className="pb-2 text-center text-xs text-zinc-500">План. Линия конька — пунктиром.</p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-zinc-200">Крыша (м)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder={heightHint != null ? `Высота конька: ${formatRu1(heightHint)} м` : 'Высота конька (м)'}
                    value={heightText}
                    onChange={(e) => {
                      const t = sanitizeRuDecimalInput(e.target.value, 2)
                      setHeightText(t)
                      setHeight(parseRuDecimal(t))
                    }}
                    onBlur={() => {
                      if (heightText.trim() === '') return
                      setHeightText(formatRu1(height))
                    }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={inputClass}
                    placeholder={overhangHint != null ? `Свес: ${formatRu1(overhangHint)} м` : 'Свес кровли (м)'}
                    value={overhangText}
                    onChange={(e) => {
                      const t = sanitizeRuDecimalInput(e.target.value, 2)
                      setOverhangText(t)
                      setOverhang(parseRuDecimal(t))
                    }}
                    onBlur={() => {
                      if (overhangText.trim() === '') return
                      setOverhangText(formatRu1(overhang))
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Свес кровли — выступ крыши за пределы стены (карниз).
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                <EditableResultBlock
                  label="Площадь крыши"
                  calculatedValue={roofAreaGable}
                  overrideValue={roofOverrides.roofArea}
                  unit="м²"
                  onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofArea: v }))}
                />
              </div>

              {roofAreaGable > 0 && (
                <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="mb-2 text-sm font-medium text-zinc-200">Пиломатериалы (без запаса)</p>
                  <EditableResultBlock
                    label="Стропила (50×150 мм)"
                    calculatedValue={Math.round(rafterVolumeGable * 100) / 100}
                    overrideValue={roofOverrides.roofRaftersVolume}
                    unit="м³"
                    onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofRaftersVolume: v }))}
                  />
                  <EditableResultBlock
                    label="Прогоны (40×100 мм)"
                    calculatedValue={Math.round(purlinVolumeGable * 100) / 100}
                    overrideValue={roofOverrides.roofPurlinVolume}
                    unit="м³"
                    onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofPurlinVolume: v }))}
                  />
                  <EditableResultBlock
                    label="Обрешётка (25×100 мм)"
                    calculatedValue={Math.round(battenVolumeGable * 100) / 100}
                    overrideValue={roofOverrides.roofBattenVolume}
                    unit="м³"
                    onOverride={(v: number | undefined) => setRoofOverrides((prev) => ({ ...prev, roofBattenVolume: v }))}
                  />
                  <p className="mt-2 text-xs text-zinc-500">Шаг стропил 0,6 м, обрешётка 0,4 м.</p>
                </div>
              )}
            </>
          )}

          {selectedType && selectedType !== 'single' && selectedType !== 'gable' && (
            <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-black/20 p-8 text-center">
              <p className="text-sm text-zinc-500">
                Расчёт «{ROOF_OPTIONS.find((t) => t.id === selectedType)?.label}» — в разработке
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function RoofPage(props: RoofPageProps = {}) {
  const [showBigPlan, setShowBigPlan] = useState(false)
  const onSchemaClick = props.onSchemaClick ?? (() => setShowBigPlan(true))
  const effectiveEmbedInView = props.embedInView ?? false
  return (
    <>
      <RoofPageContent {...props} embedInView={effectiveEmbedInView} onSchemaClick={onSchemaClick} initialProject={props.initialProject} />
      {showBigPlan && (() => {
        let width = 0
        let length = 0
        let overhang = 0.4
        let height = 0.5
        let roofType: 'single' | 'gable' = 'single'
        let ridgeAlongLength = true
        if (typeof window !== 'undefined') {
          try {
            const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
            if (raw) {
              const d = JSON.parse(raw) as { width?: number; length?: number; overhang?: number; height?: number; type?: string; ridgeAlongLength?: boolean }
              width = Number(d.width) >= 0 ? Number(d.width) : 0
              length = Number(d.length) >= 0 ? Number(d.length) : 0
              if (Number(d.overhang) >= 0) overhang = Number(d.overhang)
              if (Number(d.height) >= 0) height = Number(d.height)
              if (d.type === 'gable') roofType = 'gable'
              if (typeof d.ridgeAlongLength === 'boolean') ridgeAlongLength = d.ridgeAlongLength
            }
          } catch {
            // ignore
          }
        }
        return (
          <DetailPlanRoofWalls4
            width={width}
            length={length}
            overhang={overhang}
            height={height}
            roofType={roofType}
            ridgeAlongLength={ridgeAlongLength}
            onClose={() => setShowBigPlan(false)}
          />
        )
      })()}
    </>
  )
}
