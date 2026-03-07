'use client'

const PX_PER_M = 48
const GRID_STEP_M = 1
const DIMENSION_OFFSET = 28
const DIMENSION_FONT_SIZE = 13
const DIM_TICK_45 = 4 / Math.sqrt(2)
const MAX_CONTENT_PX = 800

function fmtRu(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0'
}

type Props = {
  width: number
  length: number
  overhang?: number
  height?: number
  /** 0 = скат в сторону свеса по ширине, 1 = в сторону свеса по длине */
  slopeToward?: 0 | 1
  onClose: () => void
  /** Режим встраивания для захвата в PDF */
  embedOnly?: boolean
}

export function DetailPlanRoofWalls2({ width: W, length: L, overhang = 0.4, height = 0.5, slopeToward = 0, onClose, embedOnly = false }: Props) {
  const hasNoDimensions = (Number(W) ?? 0) <= 0 && (Number(L) ?? 0) <= 0
  if (hasNoDimensions && !embedOnly) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Крыша — план</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Введите параметры крыши (ширину и длину), чтобы отобразить план.</p>
        </div>
      </div>
    )
  }

  const w = Math.max(0.1, W)
  const l = Math.max(0.1, L)
  const outW = w + overhang
  const outL = l + overhang
  const contentW = outW * PX_PER_M
  const contentH = outL * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const svgW = outW * px + DIMENSION_OFFSET * 2 + 70
  const svgH = outL * px + DIMENSION_OFFSET * 2 + 70
  const textScale = Math.max(svgW, svgH) / 400
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20
  const innerX = 0
  const innerY = 0
  const innerW = w * px
  const innerH = l * px
  const arrowCX = innerX + innerW / 2
  const arrowCY = innerY + innerH / 2
  const margin = 20
  const outWPx = outW * px
  const outLPx = outL * px
  const overhangPx = overhang * px

  const content = (
    <div className={embedOnly ? 'bg-white p-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'} style={embedOnly ? { width: 800 } : undefined} data-pdf-plan={embedOnly ? 'roof' : undefined}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="grid-r2" width={px * GRID_STEP_M} height={px * GRID_STEP_M} patternUnits="userSpaceOnUse">
              <path d={`M ${px * GRID_STEP_M} 0 L ${px * GRID_STEP_M} ${px * GRID_STEP_M} M 0 ${px * GRID_STEP_M} L ${px * GRID_STEP_M} ${px * GRID_STEP_M}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
            <marker id="arrow-roof-d" markerWidth={12} markerHeight={12} refX={11} refY={6} orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0 0 L12 6 L0 12 Z" fill="#44403c" stroke="#57534e" strokeWidth={1} />
            </marker>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={outWPx} height={outLPx} fill="url(#grid-r2)" stroke="#d6d3d1" strokeWidth="1" />
            <rect x={0} y={0} width={outWPx} height={outLPx} fill="rgba(120,113,108,0.15)" stroke="#78716c" strokeWidth="1.5" />
            <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="rgba(120,113,108,0.25)" stroke="#57534e" strokeWidth="1.5" />
            {/* Стрелка направления ската: 0 = к свесу по ширине (вертикально), 1 = к свесу по длине (горизонтально) */}
            {(innerW > 50 || innerH > 50) && (
              <line
                x1={slopeToward === 0 ? arrowCX : innerX + margin}
                y1={slopeToward === 0 ? innerY + margin : arrowCY}
                x2={slopeToward === 0 ? arrowCX : innerX + innerW - margin}
                y2={slopeToward === 0 ? innerY + innerH - margin : arrowCY}
                stroke="#44403c"
                strokeWidth={2}
                strokeLinecap="round"
                markerEnd="url(#arrow-roof-d)"
              />
            )}
            <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={DIMENSION_FONT_SIZE} fontFamily="sans-serif">
              {/* Горизонталь: ширина постройки, свес и ширина крыши — одна линия с засечками 45° */}
              <path d={`M ${0 - tick45} ${outLPx + 20 + tick45} L ${0 + tick45} ${outLPx + 20 - tick45} M ${innerW - tick45} ${outLPx + 20 + tick45} L ${innerW + tick45} ${outLPx + 20 - tick45} M ${outWPx - tick45} ${outLPx + 20 + tick45} L ${outWPx + tick45} ${outLPx + 20 - tick45} M 0 ${outLPx + 20} L ${outWPx} ${outLPx + 20}`} />
              <text x={innerW / 2} y={outLPx + 40} textAnchor="middle" fill="#292524">{fmtRu(w)} м</text>
              <text x={innerW + overhangPx / 2} y={outLPx + 40} textAnchor="middle" fill="#292524">{fmtRu(overhang)} м</text>
              <text x={outWPx / 2} y={outLPx + 55} textAnchor="middle" fill="#292524" fontWeight="600">{fmtRu(outW)} м</text>
              {/* Вертикаль: длина постройки, свес и длина крыши — засечки 45° */}
              <path d={`M ${outWPx + 20 - tick45} ${outLPx - tick45} L ${outWPx + 20 + tick45} ${outLPx + tick45} M ${outWPx + 20 - tick45} ${innerH - tick45} L ${outWPx + 20 + tick45} ${innerH + tick45} M ${outWPx + 20 - tick45} ${0 - tick45} L ${outWPx + 20 + tick45} ${0 + tick45} M ${outWPx + 20} ${outLPx} L ${outWPx + 20} 0`} />
              <text x={outWPx + 40} y={innerH / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerH / 2})`}>{fmtRu(l)} м</text>
              <text x={outWPx + 40} y={innerH + overhangPx / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerH + overhangPx / 2})`}>{fmtRu(overhang)} м</text>
              <text x={outWPx + 55} y={outLPx / 2} textAnchor="middle" fill="#292524" fontWeight="600" transform={`rotate(-90, ${outWPx + 55}, ${outLPx / 2})`}>{fmtRu(outL)} м</text>
            </g>
            <text x={outWPx - 8} y={14} textAnchor="end" fontSize={11} fill="#57534e">Высота: {fmtRu(height)} м · Скат: {slopeToward === 0 ? 'в сторону свеса по ширине' : 'в сторону свеса по длине'}</text>
          </g>
        </svg>
        {!embedOnly && <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 1 м · Внешний контур — крыша со свесом, внутренний — пристрой. Стрелка — направление ската.</p>}
      </div>
  )
  if (embedOnly) return content
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Крыша — план</h2>
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
