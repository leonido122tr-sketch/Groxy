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
  /** Двускатная крыша: конёк вдоль длины (true) или вдоль ширины (false), считывается с тумблера */
  roofType?: 'single' | 'gable'
  ridgeAlongLength?: boolean
  onClose: () => void
}

export function DetailPlanRoofWalls4({ width: W, length: L, overhang = 0.4, height = 0.5, roofType = 'single', ridgeAlongLength = true, onClose }: Props) {
  const w = Math.max(0.1, W)
  const l = Math.max(0.1, L)
  const outW = w + 2 * overhang
  const outL = l + 2 * overhang
  const contentW = outW * PX_PER_M
  const contentH = outL * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const svgW = outW * px + DIMENSION_OFFSET * 2 + 70
  const svgH = outL * px + DIMENSION_OFFSET * 2 + 70
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20
  const innerW = w * px
  const innerH = l * px
  const outWPx = outW * px
  const outLPx = outL * px
  const overhangPx = overhang * px
  const innerX = overhangPx
  const innerY = overhangPx
  const isGable = roofType === 'gable'
  const ridgeX1 = innerX
  const ridgeX2 = innerX + innerW
  const ridgeY1 = innerY
  const ridgeY2 = innerY + innerH
  const ridgeMidX = (ridgeX1 + ridgeX2) / 2
  const ridgeMidY = (ridgeY1 + ridgeY2) / 2

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Крыша — план</h2>
        <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
          Закрыть
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid-r4" width={px * GRID_STEP_M} height={px * GRID_STEP_M} patternUnits="userSpaceOnUse">
              <path d={`M ${px * GRID_STEP_M} 0 L ${px * GRID_STEP_M} ${px * GRID_STEP_M} M 0 ${px * GRID_STEP_M} L ${px * GRID_STEP_M} ${px * GRID_STEP_M}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={outWPx} height={outLPx} fill="url(#grid-r4)" stroke="#d6d3d1" strokeWidth="1" />
            <rect x={0} y={0} width={outWPx} height={outLPx} fill="rgba(120,113,108,0.15)" stroke="#78716c" strokeWidth="1.5" />
            <rect x={innerX} y={innerY} width={innerW} height={innerH} fill="rgba(120,113,108,0.25)" stroke="#57534e" strokeWidth="1.5" />
            {isGable && (
              <g stroke="#44403c" strokeWidth="1.5" fill="none">
                {ridgeAlongLength ? (
                  <>
                    <line x1={ridgeX1} y1={ridgeMidY} x2={ridgeX2} y2={ridgeMidY} strokeDasharray="4 2" />
                    <text x={ridgeMidX} y={ridgeMidY - 10} textAnchor="middle" fill="#292524" fontSize={fontSz} fontWeight="600">Конёк</text>
                  </>
                ) : (
                  <>
                    <line x1={ridgeMidX} y1={ridgeY1} x2={ridgeMidX} y2={ridgeY2} strokeDasharray="4 2" />
                    <text x={ridgeMidX + 12} y={ridgeMidY} textAnchor="middle" fill="#292524" fontSize={fontSz} fontWeight="600">Конёк</text>
                  </>
                )}
              </g>
            )}
            <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
              <path d={`M ${0 - tick45} ${outLPx + 20 + tick45} L ${0 + tick45} ${outLPx + 20 - tick45} M ${innerX - tick45} ${outLPx + 20 + tick45} L ${innerX + tick45} ${outLPx + 20 - tick45} M ${innerX + innerW - tick45} ${outLPx + 20 + tick45} L ${innerX + innerW + tick45} ${outLPx + 20 - tick45} M ${outWPx - tick45} ${outLPx + 20 + tick45} L ${outWPx + tick45} ${outLPx + 20 - tick45} M 0 ${outLPx + 20} L ${outWPx} ${outLPx + 20}`} />
              <text x={innerX / 2} y={outLPx + 40} textAnchor="middle" fill="#292524">{fmtRu(overhang)} м</text>
              <text x={innerX + innerW / 2} y={outLPx + 40} textAnchor="middle" fill="#292524">{fmtRu(w)} м</text>
              <text x={innerX + innerW + overhangPx / 2} y={outLPx + 40} textAnchor="middle" fill="#292524">{fmtRu(overhang)} м</text>
              <text x={outWPx / 2} y={outLPx + 55} textAnchor="middle" fill="#292524" fontWeight="600">{fmtRu(outW)} м</text>
              <path d={`M ${outWPx + 20 - tick45} ${outLPx - tick45} L ${outWPx + 20 + tick45} ${outLPx + tick45} M ${outWPx + 20 - tick45} ${innerY + innerH - tick45} L ${outWPx + 20 + tick45} ${innerY + innerH + tick45} M ${outWPx + 20 - tick45} ${innerY - tick45} L ${outWPx + 20 + tick45} ${innerY + tick45} M ${outWPx + 20 - tick45} ${0 - tick45} L ${outWPx + 20 + tick45} ${0 + tick45} M ${outWPx + 20} ${outLPx} L ${outWPx + 20} 0`} />
              <text x={outWPx + 40} y={innerY + innerH + overhangPx / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerY + innerH + overhangPx / 2})`}>{fmtRu(overhang)} м</text>
              <text x={outWPx + 40} y={innerY + innerH / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerY + innerH / 2})`}>{fmtRu(l)} м</text>
              <text x={outWPx + 40} y={innerY / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerY / 2})`}>{fmtRu(overhang)} м</text>
              <text x={outWPx + 55} y={outLPx / 2} textAnchor="middle" fill="#292524" fontWeight="600" transform={`rotate(-90, ${outWPx + 55}, ${outLPx / 2})`}>{fmtRu(outL)} м</text>
            </g>
            <text x={outWPx - 8} y={14} textAnchor="end" fontSize={11} fill="#57534e">
              {isGable ? 'Двускатная · ' : ''}Высота: {fmtRu(height)} м · Свес: {fmtRu(overhang)} м со всех сторон{isGable ? (ridgeAlongLength ? ' · Конёк вдоль длины' : ' · Конёк вдоль ширины') : ''}
            </text>
          </g>
        </svg>
        <p className="mt-3 text-center text-sm text-stone-500">
          1 клетка = 1 м · Внешний контур — крыша со свесом со всех сторон, внутренний — здание (4 стены){isGable ? ' · Конёк задаётся тумблером' : ''}
        </p>
      </div>
    </div>
  )
}
