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
  left: number
  back: number
  right: number
  overhang?: number
  height?: number
  onClose: () => void
  /** Режим встраивания для захвата в PDF */
  embedOnly?: boolean
}

export function DetailPlanRoofWalls3({ left: L, back: B, right: R, overhang = 0.4, height = 0.5, onClose, embedOnly = false }: Props) {
  const hasNoDimensions = (Number(L) ?? 0) <= 0 && (Number(B) ?? 0) <= 0 && (Number(R) ?? 0) <= 0
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
          <p className="text-stone-600">Введите параметры крыши (левую, заднюю и правую стороны), чтобы отобразить план.</p>
        </div>
      </div>
    )
  }

  const left = Math.max(0.1, L)
  const back = Math.max(0.1, B)
  const right = Math.max(0.1, R)
  const depth = Math.max(left, right)
  const slopeLength = Math.sqrt(depth * depth + height * height)
  const outW = back + 2 * overhang
  const outH = slopeLength + overhang
  const contentW = outW * PX_PER_M
  const contentH = outH * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const svgW = outW * px + DIMENSION_OFFSET * 2 + 70
  const svgH = outH * px + DIMENSION_OFFSET * 2 + 70
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20
  const innerW = back * px
  const innerH = depth * px
  const outWPx = outW * px
  const outHPx = outH * px

  const content = (
    <div className={embedOnly ? 'bg-white p-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'} style={embedOnly ? { width: 800 } : undefined} data-pdf-plan={embedOnly ? 'roof' : undefined}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm" preserveAspectRatio="xMidYMid meet">
          <defs>
            <pattern id="grid-r3" width={px * GRID_STEP_M} height={px * GRID_STEP_M} patternUnits="userSpaceOnUse">
              <path d={`M ${px * GRID_STEP_M} 0 L ${px * GRID_STEP_M} ${px * GRID_STEP_M} M 0 ${px * GRID_STEP_M} L ${px * GRID_STEP_M} ${px * GRID_STEP_M}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={outWPx} height={outHPx} fill="url(#grid-r3)" stroke="#d6d3d1" strokeWidth="1" />
            <rect x={0} y={0} width={outWPx} height={outHPx} fill="rgba(120,113,108,0.15)" stroke="#78716c" strokeWidth="1.5" />
            <rect x={0} y={0} width={innerW} height={innerH} fill="rgba(120,113,108,0.25)" stroke="#57534e" strokeWidth="1.5" />
            <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
              <path d={`M ${0 - tick45} ${outHPx + 20 + tick45} L ${0 + tick45} ${outHPx + 20 - tick45} M ${innerW - tick45} ${outHPx + 20 + tick45} L ${innerW + tick45} ${outHPx + 20 - tick45} M ${outWPx - tick45} ${outHPx + 20 + tick45} L ${outWPx + tick45} ${outHPx + 20 - tick45} M 0 ${outHPx + 20} L ${outWPx} ${outHPx + 20}`} />
              <text x={innerW / 2} y={outHPx + 40} textAnchor="middle" fill="#292524">{fmtRu(back)} м</text>
              <text x={outWPx / 2} y={outHPx + 55} textAnchor="middle" fill="#292524" fontWeight="600">{fmtRu(outW)} м</text>
              <path d={`M ${outWPx + 20 - tick45} ${outHPx - tick45} L ${outWPx + 20 + tick45} ${outHPx + tick45} M ${outWPx + 20 - tick45} ${innerH - tick45} L ${outWPx + 20 + tick45} ${innerH + tick45} M ${outWPx + 20 - tick45} ${0 - tick45} L ${outWPx + 20 + tick45} ${0 + tick45} M ${outWPx + 20} ${outHPx} L ${outWPx + 20} 0`} />
              <text x={outWPx + 40} y={innerH / 2} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${outWPx + 40}, ${innerH / 2})`}>{fmtRu(depth)} м</text>
              <text x={outWPx + 55} y={outHPx / 2} textAnchor="middle" fill="#292524" fontWeight="600" transform={`rotate(-90, ${outWPx + 55}, ${outHPx / 2})`}>{fmtRu(outH)} м</text>
            </g>
            <text x={outWPx - 8} y={14} textAnchor="end" fontSize={11} fill="#57534e">Высота: {fmtRu(height)} м · Свес: {fmtRu(overhang)} м</text>
          </g>
        </svg>
        {!embedOnly && <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 1 м · Внешний контур — крыша со свесом, внутренний — пристрой (3 стены)</p>}
      </div>
  )
  if (embedOnly) return content
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Крыша — план</h2>
        <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
          Закрыть
        </button>
      </header>
      {content}
    </div>
  )
}
