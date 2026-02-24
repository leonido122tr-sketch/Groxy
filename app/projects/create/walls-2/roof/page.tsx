'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import { useDirty } from '../../buildings-2/DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { getRoofOverridesFromStorage, setRoofOverridesInStorage } from '@/lib/projects/resultOverridesStorage'

const ROOF_STORAGE_KEY = 'currentProjectData_roof_2'

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

// Рекомендуемая высота односкатной крыши при уклоне ~12° (tg(12°) ≈ 0,21)
function recommendedHeight(width: number): number | null {
  if (!(width > 0)) return null
  const slopeDeg = 12
  const h = width * Math.tan((slopeDeg * Math.PI) / 180)
  return Math.round(h * 100) / 100
}

// Рекомендуемый свес карниза (типовой диапазон 0,3–0,5 м)
const RECOMMENDED_OVERHANG = 0.4

type RoofPageProps = {
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
}

export default function RoofPage({ embedInView, onSchemaClick }: RoofPageProps = {}) {
  const { markDirty } = useDirty()
  const [roofAreaOverride, setRoofAreaOverride] = useState<number | undefined>(undefined)
  const [roofRaftersOverride, setRoofRaftersOverride] = useState<number | undefined>(undefined)
  const [roofPurlinOverride, setRoofPurlinOverride] = useState<number | undefined>(undefined)
  const [roofBattenOverride, setRoofBattenOverride] = useState<number | undefined>(undefined)
  const hasMountedRef = useRef(false)
  const [widthText, setWidthText] = useState('')
  const [lengthText, setLengthText] = useState('')
  const [heightText, setHeightText] = useState('')
  const [overhangText, setOverhangText] = useState('')
  const [width, setWidth] = useState(0)
  const [length, setLength] = useState(0)
  const [height, setHeight] = useState(0)
  const [overhang, setOverhang] = useState(0)
  /** 0 = скат в сторону свеса по ширине, 1 = в сторону свеса по длине */
  const [slopeToward, setSlopeToward] = useState<0 | 1>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw) as Record<string, unknown>
      const w = Number(data.width ?? 0)
      const len = Number(data.length ?? 0)
      const h = Number(data.height ?? 0)
      const o = Number(data.overhang ?? 0)
      const st = Number(data.slopeToward ?? 0)
      queueMicrotask(() => {
        setWidth(w)
        setLength(len)
        setHeight(h)
        setOverhang(o)
        setSlopeToward(st === 1 ? 1 : 0)
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
    const overrides = getRoofOverridesFromStorage('2')
    queueMicrotask(() => {
      if (overrides.roofArea != null) setRoofAreaOverride(overrides.roofArea)
      if (overrides.roofRaftersVolume != null) setRoofRaftersOverride(overrides.roofRaftersVolume)
      if (overrides.roofPurlinVolume != null) setRoofPurlinOverride(overrides.roofPurlinVolume)
      if (overrides.roofBattenVolume != null) setRoofBattenOverride(overrides.roofBattenVolume)
    })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasData = width > 0 || length > 0 || height > 0 || overhang > 0
    if (!hasData && slopeToward === 0) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem(
        ROOF_STORAGE_KEY,
        JSON.stringify({ width, length, height, overhang, slopeToward })
      )
      return
    }
    sessionStorage.setItem(
      ROOF_STORAGE_KEY,
      JSON.stringify({ width, length, height, overhang, slopeToward })
    )
    sessionStorage.setItem('projectIsDirty', 'true')
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  }, [width, length, height, overhang, slopeToward])

  const heightHint = recommendedHeight(width)
  const overhangHint = width > 0 && length > 0 ? RECOMMENDED_OVERHANG : null

  // Расчёт от направления ската: 0 = скат по ширине (конёк по длине), 1 = скат по длине (конёк по ширине)
  const slopeAlongWidth = slopeToward === 0
  const slopeRun = slopeAlongWidth ? width : length
  const ridgeRun = slopeAlongWidth ? length : width
  const slopeLength = slopeRun > 0 || height > 0 ? Math.sqrt(slopeRun * slopeRun + height * height) : 0
  const slopeDim = slopeLength + overhang
  const ridgeDim = ridgeRun + overhang
  const roofArea =
    width > 0 && length > 0
      ? slopeDim * ridgeDim
      : 0

  // Пиломатериалы (без запаса). Шаг стропил 0,6 м, обрешётка 0,4 м. Стропила вдоль ската, количество по коньку.
  const RAFTER_SPACING = 0.6
  const BATTEN_SPACING = 0.4
  const rafterVolume =
    width > 0 && length > 0
      ? (Math.ceil(ridgeDim / RAFTER_SPACING) + 1) * slopeDim * 0.05 * 0.15
      : 0
  const purlinVolume =
    width > 0 && length > 0 ? 3 * ridgeDim * 0.04 * 0.1 : 0
  const battenVolume =
    width > 0 && length > 0
      ? Math.ceil(slopeDim / BATTEN_SPACING) * ridgeDim * 0.025 * 0.1
      : 0

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      {!embedInView && (
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/projects/create/walls-2"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <ArrowLeft className="h-5 w-5" aria-label="Назад" />
              </Link>
              <h1 className="text-2xl font-bold">Крыша</h1>
              <div className="w-[88px]" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Тип крыши</label>
              <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <span>Односкатная крыша</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">Для пристройки 2 стен доступна только односкатная крыша.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Внешние размеры пристроя (м)</label>
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

            {/* Визуализация: пристрой (внутренний прямоугольник) и крыша со свесом (внешний) */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
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
              <div className="flex items-center justify-center p-2">
                <svg viewBox="0 0 200 120" className="h-28 w-full max-w-md select-none rounded-lg">
                  <defs>
                    <marker id="arrow-roof-w" markerWidth={10} markerHeight={10} refX={9} refY={5} orient="auto" markerUnits="userSpaceOnUse">
                      <path d="M0 0 L10 5 L0 10 Z" fill="rgba(255,255,255,0.95)" stroke="rgba(255,255,255,0.6)" strokeWidth={0.8} />
                    </marker>
                  </defs>
                  <rect width="200" height="120" fill="transparent" />
                  {width > 0 || length > 0
                    ? (() => {
                        const w = width > 0 ? width : 1
                        const l = length > 0 ? length : 1
                        const outW = w + overhang
                        const outL = l + overhang
                        const scale = 60 / Math.max(outW, outL, 1)
                        const wPx = w * scale
                        const lPx = l * scale
                        const outWPx = outW * scale
                        const outLPx = outL * scale
                        const x0 = 20
                        const y0 = 60 - outLPx / 2
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
                          x={x0}
                          y={y0}
                          width={wPx}
                          height={lPx}
                          rx={2}
                          fill="rgba(59,130,246,0.35)"
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                        />
                        {width > 0 && (
                          <text x={x0 + wPx / 2} y={y0 + lPx + 14} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.8)">
                            {formatRu1(width)} м
                          </text>
                        )}
                        {length > 0 && (
                          <text
                            x={x0 + wPx + 12}
                            y={y0 + lPx / 2}
                            textAnchor="middle"
                            fontSize={12}
                            fill="rgba(255,255,255,0.8)"
                            transform={`rotate(-90 ${x0 + wPx + 12} ${y0 + lPx / 2})`}
                          >
                            {formatRu1(length)} м
                          </text>
                        )}
                        {/* Стрелка направления ската: 0 = к свесу по ширине (вертикально), 1 = к свесу по длине (горизонтально) */}
                        {wPx > 20 && lPx > 20 && (
                          <line
                            x1={slopeToward === 0 ? x0 + wPx / 2 : x0 + 16}
                            y1={slopeToward === 0 ? y0 + 16 : y0 + lPx / 2}
                            x2={slopeToward === 0 ? x0 + wPx / 2 : x0 + wPx - 16}
                            y2={slopeToward === 0 ? y0 + lPx - 16 : y0 + lPx / 2}
                            stroke="rgba(255,255,255,0.95)"
                            strokeWidth={2}
                            strokeLinecap="round"
                            markerEnd="url(#arrow-roof-w)"
                          />
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
              <p className="pb-1 text-center text-xs text-zinc-500">Внутренний контур — пристрой, внешний — крыша со свесом. Стрелка — куда скатывается вода.</p>
              {(width > 0 && length > 0) && (
                <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
                  <span className="text-xs text-zinc-400">
                    Скат в сторону: {slopeToward === 0 ? 'свеса по ширине' : 'свеса по длине'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlopeToward((s) => (s === 0 ? 1 : 0))}
                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20"
                  >
                    Поменять направление
                  </button>
                </div>
              )}
            </div>

            <div>
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
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
            <EditableResultBlock
              label="Площадь крыши"
              calculatedValue={roofArea}
              overrideValue={roofAreaOverride}
              unit="м²"
              onOverride={(v: number | undefined) => {
                setRoofAreaOverride(v)
                if (typeof window !== 'undefined') {
                  setRoofOverridesInStorage('2', { roofArea: v })
                  sessionStorage.setItem('projectIsDirty', 'true')
                  markDirty()
                  window.dispatchEvent(new CustomEvent('projectDataChanged'))
                }
              }}
            />
          </div>

          {roofArea > 0 && (
            <div className="mt-4 space-y-4">
              <p className="text-sm font-medium text-zinc-200">Пиломатериалы (без запаса)</p>
              <EditableResultBlock
                label="Стропила (50×150 мм)"
                calculatedValue={Math.round(rafterVolume * 100) / 100}
                overrideValue={roofRaftersOverride}
                unit="м³"
                onOverride={(v: number | undefined) => {
                  setRoofRaftersOverride(v)
                  if (typeof window !== 'undefined') {
                    setRoofOverridesInStorage('2', { roofRaftersVolume: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
              <EditableResultBlock
                label="Прогоны (40×100 мм)"
                calculatedValue={Math.round(purlinVolume * 100) / 100}
                overrideValue={roofPurlinOverride}
                unit="м³"
                onOverride={(v: number | undefined) => {
                  setRoofPurlinOverride(v)
                  if (typeof window !== 'undefined') {
                    setRoofOverridesInStorage('2', { roofPurlinVolume: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
              <EditableResultBlock
                label="Обрешётка (25×100 мм)"
                calculatedValue={Math.round(battenVolume * 100) / 100}
                overrideValue={roofBattenOverride}
                unit="м³"
                onOverride={(v: number | undefined) => {
                  setRoofBattenOverride(v)
                  if (typeof window !== 'undefined') {
                    setRoofOverridesInStorage('2', { roofBattenVolume: v })
                    sessionStorage.setItem('projectIsDirty', 'true')
                    markDirty()
                    window.dispatchEvent(new CustomEvent('projectDataChanged'))
                  }
                }}
              />
              <p className="text-xs text-zinc-500">Шаг стропил 0,6 м, обрешётка 0,4 м.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
