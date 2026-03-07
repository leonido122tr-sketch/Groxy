'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import { useDirty } from '../../buildings-2/DirtyContext'
import { EditableResultBlock } from '@/app/components/EditableResultBlock'
import { DetailPlanRoofWalls3 } from '@/app/components/DetailPlanRoofWalls3'
import { setRoofOverridesInStorage } from '@/lib/projects/resultOverridesStorage'

const ROOF_STORAGE_KEY = 'currentProjectData_roof_3'

function readRoof3InitFromStorage(): Record<string, number> | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, number>
    const l = Number(data.left ?? 0), b = Number(data.back ?? 0), r = Number(data.right ?? 0), h = Number(data.height ?? 0), o = Number(data.overhang ?? 0)
    if (l > 0 || b > 0 || r > 0 || h > 0 || o > 0) return { left: l, back: b, right: r, height: h, overhang: o }
    return null
  } catch {
    return null
  }
}

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

// Рекомендуемая высота при уклоне ~12° (глубина = max(левая, правая))
function recommendedHeight(depth: number): number | null {
  if (!(depth > 0)) return null
  const slopeDeg = 12
  const h = depth * Math.tan((slopeDeg * Math.PI) / 180)
  return Math.round(h * 100) / 100
}

const RECOMMENDED_OVERHANG = 0.4

type RoofOverrides = { roofArea?: number }

type RoofPageProps = {
  embedInView?: boolean
  /** При клике на визуализацию открыть детальный план (только при embedInView) */
  onSchemaClick?: () => void
  /** Сохранённый проект (при просмотре) — переопределения инициализируются из него, как у фундамента и стен */
  initialProject?: { resultsOverrides?: RoofOverrides }
}

function RoofPageContent({ embedInView, onSchemaClick, initialProject }: RoofPageProps = {}) {
  const { markDirty } = useDirty()
  const storageInit = useMemo(() => readRoof3InitFromStorage(), [])
  const ro = initialProject?.resultsOverrides
  const [roofOverrides, setRoofOverrides] = useState<RoofOverrides>(() => ({ roofArea: ro?.roofArea }))
  const hasMountedRef = useRef(false)
  const [leftText, setLeftText] = useState(() => (storageInit ? (storageInit.left > 0 ? formatRu1(storageInit.left) : '') : ''))
  const [backText, setBackText] = useState(() => (storageInit ? (storageInit.back > 0 ? formatRu1(storageInit.back) : '') : ''))
  const [rightText, setRightText] = useState(() => (storageInit ? (storageInit.right > 0 ? formatRu1(storageInit.right) : '') : ''))
  const [heightText, setHeightText] = useState(() => (storageInit ? (storageInit.height > 0 ? formatRu1(storageInit.height) : '') : ''))
  const [overhangText, setOverhangText] = useState(() => (storageInit ? (storageInit.overhang > 0 ? formatRu1(storageInit.overhang) : '') : ''))
  const [left, setLeft] = useState(storageInit?.left ?? 0)
  const [back, setBack] = useState(storageInit?.back ?? 0)
  const [right, setRight] = useState(storageInit?.right ?? 0)
  const [height, setHeight] = useState(storageInit?.height ?? 0)
  const [overhang, setOverhang] = useState(storageInit?.overhang ?? 0)

  // Как у фундамента и стен: пишем в storage при изменении overrides, помечаем dirty при расхождении с initial
  useEffect(() => {
    if (typeof window === 'undefined') return
    setRoofOverridesInStorage('3', roofOverrides)
    const initial = initialProject?.resultsOverrides ?? {}
    const overridesChanged = JSON.stringify(roofOverrides) !== JSON.stringify({ roofArea: initial.roofArea })
    if (overridesChanged) {
      sessionStorage.setItem('projectIsDirty', 'true')
      markDirty()
      window.dispatchEvent(new CustomEvent('projectDataChanged'))
    }
  }, [roofOverrides, initialProject?.resultsOverrides])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasData = left > 0 || back > 0 || right > 0 || height > 0 || overhang > 0
    if (!hasData) return
    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      sessionStorage.setItem(
        ROOF_STORAGE_KEY,
        JSON.stringify({ left, back, right, height, overhang })
      )
      return
    }
    sessionStorage.setItem(
      ROOF_STORAGE_KEY,
      JSON.stringify({ left, back, right, height, overhang })
    )
    sessionStorage.setItem('projectIsDirty', 'true')
    window.dispatchEvent(new CustomEvent('projectDataChanged'))
  }, [left, back, right, height, overhang])

  const depth = left > 0 || right > 0 ? Math.max(left, right) : 0
  const heightHint = recommendedHeight(depth)
  const overhangHint = left > 0 && back > 0 && right > 0 ? RECOMMENDED_OVERHANG : null

  // Глубина ската = max(левая, правая); длина ската по плоскости
  const slopeLength = depth > 0 || height > 0 ? Math.sqrt(depth * depth + height * height) : 0
  // Пристрой из 3 стен: свес по карнизу один, по длине (за левую и правую стены) — два
  const roofArea =
    left > 0 && back > 0 && right > 0
      ? (slopeLength + overhang) * (back + 2 * overhang)
      : 0

  // Пиломатериалы (без запаса). Шаг стропил 0,6 м, обрешётка 0,4 м.
  const RAFTER_SPACING = 0.6
  const BATTEN_SPACING = 0.4
  const slopeDim = slopeLength + overhang
  const lengthDim = back + 2 * overhang
  const rafterVolume =
    roofArea > 0
      ? (Math.ceil(lengthDim / RAFTER_SPACING) + 1) * slopeDim * 0.05 * 0.15
      : 0
  const purlinVolume = roofArea > 0 ? 3 * lengthDim * 0.04 * 0.1 : 0
  const battenVolume =
    roofArea > 0
      ? Math.ceil(slopeDim / BATTEN_SPACING) * lengthDim * 0.025 * 0.1
      : 0

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
              <h1 className="text-2xl font-bold">Крыша</h1>
              <div className="w-9" />
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-2 pb-10 sm:px-6">
        <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Тип крыши</label>
              <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <span>Односкатная крыша</span>
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">Для пристройки 3 стен доступна только односкатная крыша.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-200">Внешние размеры пристроя (м)</label>
              <p className="mb-2 text-xs text-zinc-500">Три стены: левая, задняя, правая (П-образный пристрой)</p>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="Левая (м)"
                  value={leftText}
                  onChange={(e) => {
                    const t = sanitizeRuDecimalInput(e.target.value, 2)
                    setLeftText(t)
                    setLeft(parseRuDecimal(t))
                  }}
                  onBlur={() => {
                    if (leftText.trim() === '') return
                    setLeftText(formatRu1(left))
                  }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="Задняя (м)"
                  value={backText}
                  onChange={(e) => {
                    const t = sanitizeRuDecimalInput(e.target.value, 2)
                    setBackText(t)
                    setBack(parseRuDecimal(t))
                  }}
                  onBlur={() => {
                    if (backText.trim() === '') return
                    setBackText(formatRu1(back))
                  }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="Правая (м)"
                  value={rightText}
                  onChange={(e) => {
                    const t = sanitizeRuDecimalInput(e.target.value, 2)
                    setRightText(t)
                    setRight(parseRuDecimal(t))
                  }}
                  onBlur={() => {
                    if (rightText.trim() === '') return
                    setRightText(formatRu1(right))
                  }}
                />
              </div>
            </div>

            {/* Визуализация: пристрой (U) и крыша со свесом (внешний прямоугольник) — как в калькуляторе 2 стен */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
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
                  {left > 0 || back > 0 || right > 0
                    ? (() => {
                        const thick = 4
                        const l = left > 0 ? left : 1
                        const b = back > 0 ? back : 1
                        const r = right > 0 ? right : 1
                        const dep = Math.max(l, r)
                        const outW = b + 2 * overhang
                        const outH = dep + overhang
                        const scale = 60 / Math.max(outW, outH, 1)
                        const lPx = l * scale
                        const bPx = b * scale
                        const rPx = r * scale
                        const oPx = overhang * scale
                        const contentH = dep * scale + oPx
                        const x0 = 20 + oPx
                        const y0 = 60 - contentH / 2 + oPx
                        return (
                          <>
                            <rect
                              x={x0 - oPx}
                              y={y0 - oPx}
                              width={bPx + 2 * oPx}
                              height={dep * scale + oPx}
                              rx={2}
                              fill="rgba(59,130,246,0.12)"
                              stroke="rgba(59,130,246,0.5)"
                              strokeWidth={1.5}
                            />
                            <rect x={x0} y={y0} width={thick} height={lPx} rx={1} fill="rgba(59,130,246,0.35)" stroke="#3b82f6" strokeWidth={1.5} />
                            <rect x={x0} y={y0} width={bPx} height={thick} rx={1} fill="rgba(59,130,246,0.35)" stroke="#3b82f6" strokeWidth={1.5} />
                            <rect x={x0 + bPx - thick} y={y0} width={thick} height={rPx} rx={1} fill="rgba(59,130,246,0.35)" stroke="#3b82f6" strokeWidth={1.5} />
                            {left > 0 && (
                              <text x={x0 - 6} y={y0 + lPx / 2} textAnchor="end" fontSize={11} fill="rgba(255,255,255,0.8)">
                                {formatRu1(left)} м
                              </text>
                            )}
                            {back > 0 && (
                              <text x={x0 + bPx / 2} y={y0 + thick + 14} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.8)">
                                {formatRu1(back)} м
                              </text>
                            )}
                            {right > 0 && (
                              <text x={x0 + bPx + 16} y={y0 + rPx / 2} textAnchor="start" fontSize={11} fill="rgba(255,255,255,0.8)">
                                {formatRu1(right)} м
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
              <p className="pb-2 text-center text-xs text-zinc-500">Внутренний контур — пристрой, внешний — крыша со свесом</p>
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
                Свес кровли — выступ крыши за пределы стены (карниз). Учитывается по открытой стороне и по торцам (за левую и правую стены).
              </p>
            </div>
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
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-sm font-medium text-zinc-200">Пиломатериалы (без запаса)</p>
              <ul className="space-y-2 text-sm text-white">
                <li>
                  Стропила: {formatRu1(Math.round(rafterVolume * 100) / 100)} м³ (50×150 мм)
                </li>
                <li>
                  Прогоны: {formatRu1(Math.round(purlinVolume * 100) / 100)} м³ (40×100 мм)
                </li>
                <li>
                  Обрешётка: {formatRu1(Math.round(battenVolume * 100) / 100)} м³ (25×100 мм)
                </li>
              </ul>
              <p className="mt-2 text-xs text-zinc-500">Шаг стропил 0,6 м, обрешётка 0,4 м.</p>
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
      {showBigPlan &&
        (() => {
          let left = 0
          let back = 0
          let right = 0
          let overhang = 0.4
          let height = 0.5
          if (typeof window !== 'undefined') {
            try {
              const raw = sessionStorage.getItem(ROOF_STORAGE_KEY)
              if (raw) {
                const d = JSON.parse(raw) as { left?: number; back?: number; right?: number; overhang?: number; height?: number }
                left = Number(d.left) >= 0 ? Number(d.left) : 0
                back = Number(d.back) >= 0 ? Number(d.back) : 0
                right = Number(d.right) >= 0 ? Number(d.right) : 0
                if (Number(d.overhang) >= 0) overhang = Number(d.overhang)
                if (Number(d.height) >= 0) height = Number(d.height)
              }
            } catch {
              // ignore
            }
          }
          return (
            <DetailPlanRoofWalls3
              left={left}
              back={back}
              right={right}
              overhang={overhang}
              height={height}
              onClose={() => setShowBigPlan(false)}
            />
          )
        })()}
    </>
  )
}
