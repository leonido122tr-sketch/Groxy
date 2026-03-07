'use client'

/**
 * Фундамент 3 стороны (П): построение как у фундамента 2 стороны (Г) —
 * горизонталь (2 стена) внизу, две вертикали (1 и 3) идут вверх.
 * 1 стена = левая вертикаль (длина), 2 стена = горизонталь (ширина), 3 стена = правая вертикаль.
 *
 * Эталонное построение (фиксируем):
 * — Снаружи: 3 + 3 + 3 м (левая нога, горизонталь, правая нога).
 * — Толщина фундамента: 0,5 м.
 * — Внутри: 2,5 + 2 + 2,5 м (внутр. левая, внутр. ширина между ногами, внутр. правая).
 * Соответствует принципу «внутри»: left=2,5, back=2, right=2,5, thickness=0,5 → снаружи 3, 3, 3.
 */

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
  /** 1 стена — левая вертикаль (м), при принципе «внутри» — внутренняя, при «снаружи» — наружная */
  left: number
  /** 2 стена — горизонталь (м), при принципе «внутри» — внутренняя, при «снаружи» — наружная */
  back: number
  /** 3 стена — правая вертикаль (м), при принципе «внутри» — внутренняя, при «снаружи» — наружная */
  right: number
  thickness?: number
  /** Принцип расчёта: размеры по внутренней или наружной грани (по умолчанию «внутри») */
  principle?: Principle
  onClose: () => void
  /** Режим встраивания для захвата в PDF */
  embedOnly?: boolean
}

export function DetailPlanFoundationWalls3({ left: L, back: B, right: R, thickness: T = 0.25, principle = 'inside', onClose, embedOnly = false }: Props) {
  const hasNoDimensions = (Number(L) ?? 0) <= 0 && (Number(B) ?? 0) <= 0 && (Number(R) ?? 0) <= 0
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
          <p className="text-stone-600">Введите параметры фундамента (левую, заднюю и правую стороны, толщину), чтобы отобразить план.</p>
        </div>
      </div>
    )
  }

  const t = Math.max(0.05, Number(T))
  const isInside = principle === 'inside'
  // В проекте размеры заданы в выбранном принципе: «внутри» → L,B,R внутренние; «снаружи» → наружные.
  // Горизонталь: при «внутри» B = просвет между ногами (внутр. ширина), поэтому полная ширина = B + 2*t.
  const length = isInside ? Math.max(0.1, L) + t : Math.max(0.1, L)
  const width = isInside ? Math.max(0.1, B) + 2 * t : Math.max(0.1, B)
  const third = isInside ? Math.max(0.1, R) + t : Math.max(0.1, R)

  if (t >= length || t >= width || t >= third) {
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
          <p className="text-stone-600">Визуализация недоступна: толщина ленты не может быть больше длины, ширины или третьей стороны.</p>
        </div>
      </div>
    )
  }

  const contentW = width * PX_PER_M
  const contentH = t * PX_PER_M + Math.max(length, third) * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const GRID_CELL_PX = GRID_STEP_M * px
  const GRID_MARGIN_PX = GRID_CELL_PX * GRID_MARGIN_CELLS

  const tPx = t * px
  const widthPx = width * px
  const lengthPx = length * px
  const thirdPx = third * px

  const totalW = widthPx
  const totalH = tPx + Math.max(lengthPx, thirdPx)
  const gridW = totalW + GRID_MARGIN_PX * 2
  const gridH = totalH + GRID_MARGIN_PX * 2
  const svgW = gridW + DIMENSION_OFFSET * 2 + 40
  const svgH = gridH + DIMENSION_OFFSET * 2 + 40
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20

  // Один контур: левая и правая ноги по высоте ровно length и third (толщина горизонтали уже входит в эти размеры, внахлёст).
  const outerPath = `M 0 ${totalH} L ${tPx} ${totalH} L ${widthPx - tPx} ${totalH} L ${widthPx} ${totalH} L ${widthPx} ${totalH - thirdPx} L ${widthPx - tPx} ${totalH - thirdPx} L ${widthPx - tPx} ${totalH} L ${tPx} ${totalH} L ${tPx} ${totalH - lengthPx} L 0 ${totalH - lengthPx} L 0 ${totalH} Z`
  const innerPath = `M ${tPx} ${totalH - tPx} L ${widthPx - tPx * 2} ${totalH - tPx} V ${totalH - thirdPx} L ${widthPx - tPx} ${totalH - thirdPx} V ${totalH - tPx} L ${tPx} ${totalH - tPx} V ${totalH - lengthPx} Z`
  const stripPath = `${outerPath} ${innerPath}`
  // Обводка только по внешнему контуру (без границ соприкосновения ног с горизонталью и без внутреннего отверстия).
  const outerStrokePath = `M 0 ${totalH} L 0 ${totalH - lengthPx} L ${tPx} ${totalH - lengthPx} L ${tPx} ${totalH - tPx} L ${widthPx - tPx} ${totalH - tPx} L ${widthPx - tPx} ${totalH - thirdPx} L ${widthPx} ${totalH - thirdPx} L ${widthPx} ${totalH} L 0 ${totalH} Z`
  const strokePath = outerStrokePath

  const thickLineX = totalW + 12
  const thickY0 = totalH - tPx
  const thickY1 = totalH

  // Наружные размеры: горизонталь под фигурой, вертикали слева и справа — отступы увеличены, чтобы подписи не налезали
  const outHorLineY = totalH + 22
  const outHorTextY = totalH + 48
  const outVertLineX = totalW + 22
  const outVertTextX = totalW + 50
  const outVertLeftX = -22
  const outVertLeftTextX = -50
  const midRightY = totalH - thirdPx / 2
  const midLeftY = totalH - lengthPx / 2

  // Внутренние размеры: подписи в зазоре между размерной линией и гранью фигуры — ближе к бару и к левой/правой ноге
  const inGap = 18
  const inHorLineY = totalH - tPx - inGap
  const inHorTextY = totalH - tPx - inGap / 2
  // Внутренняя горизонталь: от внутренней грани левой ноги до внутренней грани правой ноги → длина = width - 2*t
  const inHorEndX = widthPx - tPx
  const inHorCenterX = (tPx + inHorEndX) / 2
  const inOffset = inGap
  const inTextOffset = inGap / 2
  const inVertLineX = tPx + inOffset
  const inVertTextX = tPx + inTextOffset
  const inVertRightX = widthPx - tPx - inOffset
  const inVertRightTextX = widthPx - tPx - inTextOffset
  const inVertTextY = (totalH - lengthPx + (totalH - tPx)) / 2
  const midInRightY = (totalH - thirdPx + (totalH - tPx)) / 2

  const content = (
      <div className={embedOnly ? 'bg-white p-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'} style={embedOnly ? { width: 800 } : undefined} data-pdf-plan={embedOnly ? 'foundation' : undefined}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="grid-f3" width={GRID_CELL_PX} height={GRID_CELL_PX} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_CELL_PX} 0 L ${GRID_CELL_PX} ${GRID_CELL_PX} M 0 ${GRID_CELL_PX} L ${GRID_CELL_PX} ${GRID_CELL_PX}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={gridW} height={gridH} fill="url(#grid-f3)" stroke="#d6d3d1" strokeWidth="1" />
            <g transform={`translate(${GRID_MARGIN_PX}, ${GRID_MARGIN_PX})`}>
              <path d={stripPath} fillRule="evenodd" fill="#fafaf9" stroke="none" />
              <path d={innerPath} fill="url(#grid-f3)" stroke="none" />
              <path d={strokePath} fillRule="evenodd" fill="none" stroke="#57534e" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Наружные размеры">
                <path d={`M ${0 - tick45} ${outHorLineY + tick45} L ${0 + tick45} ${outHorLineY - tick45} M ${totalW - tick45} ${outHorLineY + tick45} L ${totalW + tick45} ${outHorLineY - tick45} M 0 ${outHorLineY} L ${totalW} ${outHorLineY}`} />
                <text x={totalW / 2} y={outHorTextY} textAnchor="middle" fill="#292524">{fmtRu(width)} м</text>
                <path d={`M ${outVertLeftX - tick45} ${totalH - lengthPx + tick45} L ${outVertLeftX + tick45} ${totalH - lengthPx - tick45} M ${outVertLeftX - tick45} ${totalH + tick45} L ${outVertLeftX + tick45} ${totalH - tick45} M ${outVertLeftX} ${totalH - lengthPx} L ${outVertLeftX} ${totalH}`} />
                <text x={outVertLeftTextX} y={midLeftY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outVertLeftTextX}, ${midLeftY})`}>{fmtRu(length)} м</text>
                <path d={`M ${outVertLineX - tick45} ${totalH - thirdPx + tick45} L ${outVertLineX + tick45} ${totalH - thirdPx - tick45} M ${outVertLineX - tick45} ${totalH + tick45} L ${outVertLineX + tick45} ${totalH - tick45} M ${outVertLineX} ${totalH - thirdPx} L ${outVertLineX} ${totalH}`} />
                <text x={outVertTextX} y={midRightY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outVertTextX}, ${midRightY})`}>{fmtRu(third)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Внутренние размеры">
                <path d={`M ${tPx - tick45} ${inHorLineY + tick45} L ${tPx + tick45} ${inHorLineY - tick45} M ${inHorEndX - tick45} ${inHorLineY + tick45} L ${inHorEndX + tick45} ${inHorLineY - tick45} M ${tPx} ${inHorLineY} L ${inHorEndX} ${inHorLineY}`} />
                <text x={inHorCenterX} y={inHorTextY} textAnchor="middle" fill="#292524">{fmtRu(width - 2 * t)} м</text>
                <path d={`M ${inVertLineX - tick45} ${totalH - lengthPx + tick45} L ${inVertLineX + tick45} ${totalH - lengthPx - tick45} M ${inVertLineX - tick45} ${totalH - tPx + tick45} L ${inVertLineX + tick45} ${totalH - tPx - tick45} M ${inVertLineX} ${totalH - lengthPx} L ${inVertLineX} ${totalH - tPx}`} />
                <text x={inVertTextX} y={inVertTextY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${inVertTextX}, ${inVertTextY})`}>{fmtRu(length - t)} м</text>
                <path d={`M ${inVertRightX - tick45} ${totalH - thirdPx + tick45} L ${inVertRightX + tick45} ${totalH - thirdPx - tick45} M ${inVertRightX - tick45} ${totalH - tPx + tick45} L ${inVertRightX + tick45} ${totalH - tPx - tick45} M ${inVertRightX} ${totalH - thirdPx} L ${inVertRightX} ${totalH - tPx}`} />
                <text x={inVertRightTextX} y={midInRightY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${inVertRightTextX}, ${midInRightY})`}>{fmtRu(third - t)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
                <path d={`M ${thickLineX - tick45} ${thickY0 - tick45} L ${thickLineX + tick45} ${thickY0 + tick45} M ${thickLineX - tick45} ${thickY1 - tick45} L ${thickLineX + tick45} ${thickY1 + tick45} M ${thickLineX} ${thickY0} L ${thickLineX} ${thickY1}`} />
                <text x={thickLineX + 10} y={(thickY0 + thickY1) / 2} textAnchor="start" fill="#292524" dominantBaseline="middle">{fmtRu(t)} м</text>
              </g>
            </g>
          </g>
        </svg>
        {!embedOnly && <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 0,5 м · П-образный фундамент · наружная и внутренняя грани</p>}
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
