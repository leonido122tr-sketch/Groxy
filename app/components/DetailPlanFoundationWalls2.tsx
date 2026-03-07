'use client'

const PX_PER_M = 48
const GRID_STEP_M = 0.5 // 1 клетка = 0,5 м
const GRID_MARGIN_CELLS = 2
const DIMENSION_OFFSET = 28
const MAX_CONTENT_PX = 800
const DIMENSION_FONT_SIZE = 13
/** Полудлина косой засечки 45° */
const DIM_TICK_45 = 4 / Math.sqrt(2)

function fmtRu(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0'
}

type Principle = 'inside' | 'outside'

type Props = {
  /** Ширина (м): при принципе «внутри» — внутренняя, при «снаружи» — наружная */
  width: number
  /** Длина (м): при принципе «внутри» — внутренняя, при «снаружи» — наружная */
  length: number
  thickness?: number
  /** Принцип расчёта: размеры по внутренней или наружной грани (по умолчанию «внутри») */
  principle?: Principle
  onClose: () => void
  /** Режим встраивания для захвата в PDF: без шапки и кнопки, с data-pdf-plan */
  embedOnly?: boolean
}

export function DetailPlanFoundationWalls2({ width: W, length: L, thickness: T = 0, principle = 'inside', onClose, embedOnly = false }: Props) {
  const hasNoDimensions = (Number(W) ?? 0) <= 0 && (Number(L) ?? 0) <= 0
  if (hasNoDimensions && !embedOnly) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Фундамент — план</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Введите параметры фундамента (ширину, длину, высоту и толщину), чтобы отобразить план.</p>
        </div>
      </div>
    )
  }

  const t = Math.max(0.05, Number(T))
  const isInside = principle === 'inside'
  // В проекте размеры заданы в выбранном принципе: «внутри» → W,L внутренние; «снаружи» → W,L наружные
  const w = isInside ? Math.max(0.1, W) + t : Math.max(0.1, W)
  const l = isInside ? Math.max(0.1, L) + t : Math.max(0.1, L)

  if (t >= w || t >= l) {
    if (embedOnly) return <div className="bg-stone-50 p-4" data-pdf-plan="foundation" style={{ width: 800 }}><p className="text-stone-600 text-center">Визуализация недоступна</p></div>
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Фундамент — план</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Визуализация недоступна: толщина ленты не может быть больше ширины или длины.</p>
        </div>
      </div>
    )
  }

  const contentW = w * PX_PER_M
  const contentH = l * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const GRID_CELL_PX = GRID_STEP_M * px
  const GRID_MARGIN_PX = GRID_CELL_PX * GRID_MARGIN_CELLS

  const tPx = t * px
  const totalW = w * px
  const totalH = l * px
  const vertX = (w - t) * px
  const horY = (l - t) * px

  // Один контур: внешняя граница + внутренняя граница (отверстие) — заливка только кольца ленты
  const outerPath = `M 0 ${totalH} L ${totalW} ${totalH} L ${totalW} 0 L ${vertX} 0 L ${vertX} ${horY} L 0 ${horY} L 0 ${totalH} Z`
  const innerPath = `M ${vertX} ${horY} L ${vertX} 0 L ${totalW} 0 L ${totalW} ${totalH} L 0 ${totalH} L 0 ${horY} L ${vertX} ${horY} Z`
  const stripPath = `${outerPath} ${innerPath}`

  const gridW = totalW + GRID_MARGIN_PX * 2
  const gridH = totalH + GRID_MARGIN_PX * 2
  const svgW = gridW + DIMENSION_OFFSET * 2 + 40
  const svgH = gridH + DIMENSION_OFFSET * 2 + 40
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20

  const thickLineX = totalW + 12
  const thickY0 = totalH - tPx
  const thickY1 = totalH

  // Наружные размеры: горизонталь под стороной (0…totalW), вертикаль справа (0…totalH)
  const outHorLineY = totalH + 20
  const outHorTextY = totalH + 40
  const outVertLineX = totalW + 20
  const outVertTextX = totalW + 40
  const outVertTextY = totalH / 2

  // Внутренние размеры: горизонталь над стороной (0…vertX), вертикаль слева (0…horY)
  const inHorLineY = horY - 20
  const inHorTextY = horY - 40
  const inHorEndX = vertX
  const inHorCenterX = vertX / 2
  const inVertLineX = vertX - 20
  const inVertTextX = vertX - 40
  const inVertTextY = horY / 2

  const content = (
    <div className={embedOnly ? 'bg-white p-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'} style={embedOnly ? { width: 800 } : undefined} data-pdf-plan={embedOnly ? 'foundation' : undefined}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="grid-f2" width={GRID_CELL_PX} height={GRID_CELL_PX} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_CELL_PX} 0 L ${GRID_CELL_PX} ${GRID_CELL_PX} M 0 ${GRID_CELL_PX} L ${GRID_CELL_PX} ${GRID_CELL_PX}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={gridW} height={gridH} fill="url(#grid-f2)" stroke="#d6d3d1" strokeWidth="1" />
            <g transform={`translate(${GRID_MARGIN_PX}, ${GRID_MARGIN_PX})`}>
              <path d={stripPath} fillRule="evenodd" fill="rgba(168,162,158,0.4)" stroke="#57534e" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Наружные размеры">
                <path d={`M ${0 - tick45} ${outHorLineY + tick45} L ${0 + tick45} ${outHorLineY - tick45} M ${totalW - tick45} ${outHorLineY + tick45} L ${totalW + tick45} ${outHorLineY - tick45} M 0 ${outHorLineY} L ${totalW} ${outHorLineY}`} />
                <text x={totalW / 2} y={outHorTextY} textAnchor="middle" fill="#292524">{fmtRu(w)} м</text>
                <path d={`M ${outVertLineX - tick45} ${totalH - tick45} L ${outVertLineX + tick45} ${totalH + tick45} M ${outVertLineX - tick45} ${0 - tick45} L ${outVertLineX + tick45} ${0 + tick45} M ${outVertLineX} ${totalH} L ${outVertLineX} 0`} />
                <text x={outVertTextX} y={outVertTextY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outVertTextX}, ${outVertTextY})`}>{fmtRu(l)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Внутренние размеры">
                <path d={`M ${0 - tick45} ${inHorLineY + tick45} L ${0 + tick45} ${inHorLineY - tick45} M ${inHorEndX - tick45} ${inHorLineY + tick45} L ${inHorEndX + tick45} ${inHorLineY - tick45} M 0 ${inHorLineY} L ${inHorEndX} ${inHorLineY}`} />
                <text x={inHorCenterX} y={inHorTextY} textAnchor="middle" fill="#292524">{fmtRu(w - t)} м</text>
                <path d={`M ${inVertLineX - tick45} ${horY - tick45} L ${inVertLineX + tick45} ${horY + tick45} M ${inVertLineX - tick45} ${0 - tick45} L ${inVertLineX + tick45} ${0 + tick45} M ${inVertLineX} ${horY} L ${inVertLineX} 0`} />
                <text x={inVertTextX} y={inVertTextY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${inVertTextX}, ${inVertTextY})`}>{fmtRu(l - t)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
                <path d={`M ${thickLineX - tick45} ${thickY0 - tick45} L ${thickLineX + tick45} ${thickY0 + tick45} M ${thickLineX - tick45} ${thickY1 - tick45} L ${thickLineX + tick45} ${thickY1 + tick45} M ${thickLineX} ${thickY0} L ${thickLineX} ${thickY1}`} />
                <text x={thickLineX + 10} y={(thickY0 + thickY1) / 2} textAnchor="start" fill="#292524" dominantBaseline="middle">{fmtRu(t)} м</text>
              </g>
            </g>
          </g>
        </svg>
        {!embedOnly && <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 0,5 м · Г-образный фундамент · наружная и внутренняя грани</p>}
      </div>
  )
  if (embedOnly) return content
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Фундамент — план</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
        >
          Закрыть
        </button>
      </header>
      {content}
    </div>
  )
}
