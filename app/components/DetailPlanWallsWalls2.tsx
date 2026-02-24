'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocalProject } from '@/lib/projects/localProjects'
import type { Opening } from '@/lib/projects/localProjects'

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
  project: Extract<LocalProject, { type: 'walls_2' }>
  onOpeningsChange?: (openings: Opening[]) => void
  onClose: () => void
}

export function DetailPlanWallsWalls2({ project, onOpeningsChange, onClose }: Props) {
  const data = project.data
  const principle: Principle = data.principle === 'outside' ? 'outside' : 'inside'
  const isInside = principle === 'inside'
  const T = Math.max(0.05, Number(data.thickness) ?? 0.25)
  const W = Math.max(0.1, Number(data.width) || 5)
  const L = Math.max(0.1, Number(data.length) || 5)
  const w = isInside ? W + T : W
  const l = isInside ? L + T : L

  const [openings, setOpenings] = useState<Opening[]>(() => {
    const list = Array.isArray(data.openings) ? data.openings : []
    return list.map((o, i) => ({
      ...o,
      wall: o.wall ?? 1,
      offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : i * 0.5,
    }))
  })

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ index: number; startX: number; startY: number; startOffset: number; wall: 1 | 2; startCursorAlongWall: number } | null>(null)
  const openingsRef = useRef(openings)
  useEffect(() => {
    openingsRef.current = openings
  }, [openings])

  const contentW = w * PX_PER_M
  const contentH = l * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const GRID_CELL_PX = GRID_STEP_M * px
  const GRID_MARGIN_PX = GRID_CELL_PX * GRID_MARGIN_CELLS

  const totalW = w * px
  const totalH = l * px
  const horY = (l - T) * px
  const vertX = (w - T) * px
  const tPx = T * px
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20
  const usable1 = Math.max(0, w - T)
  const usable2 = Math.max(0, l - T)
  const maxOffset1 = w
  const maxOffset2 = l

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault()
      const o = openings[index]
      if (!o || !svgRef.current) return
      const wall = (o.wall ?? 1) as 1 | 2
      const startOffset = o.offset ?? 0
      const svg = svgRef.current
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const svgP = pt.matrixTransform(ctm.inverse())
      const contentX = svgP.x - ox - GRID_MARGIN_PX
      const contentY = svgP.y - oy - GRID_MARGIN_PX
      const startCursorAlongWall = wall === 1 ? contentX / px : contentY / px
      dragRef.current = { index, startX: e.clientX, startY: e.clientY, startOffset, wall, startCursorAlongWall }
      ;(e.target as SVGElement).setPointerCapture?.(e.pointerId)
    },
    [openings, ox, oy, px, GRID_MARGIN_PX]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !svgRef.current) return
      const { index } = dragRef.current
      const o = openings[index]
      if (!o) return
      const ow = o.width ?? 0.9
      const svg = svgRef.current
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const svgP = pt.matrixTransform(ctm.inverse())
      const contentX = svgP.x - ox - GRID_MARGIN_PX
      const contentY = svgP.y - oy - GRID_MARGIN_PX
      const onWall1 = contentY >= horY && contentY <= totalH && contentX >= 0 && contentX <= totalW
      const onWall2 = contentX >= vertX && contentX <= totalW && contentY >= 0 && contentY <= totalH
      let newWall: 1 | 2
      let newOffset: number
      const curWall = dragRef.current.wall
      const startOffset = dragRef.current.startOffset
      const startCursorAlongWall = dragRef.current.startCursorAlongWall
      const gripOffset = startCursorAlongWall - startOffset
      if (onWall1 && onWall2) {
        newWall = curWall
        if (newWall === 1) {
          const curCursor = contentX / px
          newOffset = Math.max(0, Math.min(maxOffset1, curCursor - gripOffset))
        } else {
          const curCursor = contentY / px
          newOffset = Math.max(0, Math.min(maxOffset2, curCursor - gripOffset))
        }
      } else if (onWall1) {
        newWall = 1
        const curCursor = contentX / px
        newOffset = Math.max(0, Math.min(maxOffset1, curCursor - gripOffset))
      } else if (onWall2) {
        newWall = 2
        const curCursor = contentY / px
        newOffset = Math.max(0, Math.min(maxOffset2, curCursor - gripOffset))
      } else {
        return
      }
      if (newWall !== curWall) {
        dragRef.current.startCursorAlongWall = newWall === 1 ? contentX / px : contentY / px
        dragRef.current.startOffset = newOffset
      }
      dragRef.current.wall = newWall
      setOpenings((prev) => {
        const next = [...prev]
        const opening = next[index]
        if (opening) next[index] = { ...opening, wall: newWall, offset: newOffset }
        return next
      })
    },
    [openings, ox, oy, horY, totalH, totalW, vertX, w, l, T, px, GRID_MARGIN_PX]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.target as SVGElement).releasePointerCapture?.(e.pointerId)
      if (dragRef.current) {
        onOpeningsChange?.(openingsRef.current)
        dragRef.current = null
      }
    },
    [onOpeningsChange]
  )

  if (T >= w || T >= l) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Визуализация недоступна: толщина стены не может быть больше ширины или длины.</p>
        </div>
      </div>
    )
  }

  const gridW = totalW + GRID_MARGIN_PX * 2
  const gridH = totalH + GRID_MARGIN_PX * 2

  const outerPath = `M 0 ${totalH} L ${totalW} ${totalH} L ${totalW} 0 L ${vertX} 0 L ${vertX} ${horY} L 0 ${horY} L 0 ${totalH} Z`
  const innerPath = `M ${vertX} ${horY} L ${vertX} 0 L ${totalW} 0 L ${totalW} ${totalH} L 0 ${totalH} L 0 ${horY} L ${vertX} ${horY} Z`
  const stripPath = `${outerPath} ${innerPath}`

  // При "внутри": w = W + T, l = L + T. При "снаружи": w = W, l = L.
  // Последний сегмент: от конца проёма до фактического конца стены, длина не меньше T (область пересечения).
  const wall1Max = w
  const wall2Max = l
  const wall1Openings = openings.filter((o) => (o.wall ?? 1) === 1).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall2Openings = openings.filter((o) => (o.wall ?? 1) === 2).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const segments1: { start: number; end: number; length: number }[] = []
  let s1 = 0
  if (wall1Openings.length > 0) {
    for (const o of wall1Openings) {
      const off = Math.max(0, Math.min(wall1Max, o.offset ?? 0))
      const ow = o.width ?? 0.9
      const endOpening = Math.min(wall1Max, off + ow, usable1)
      if (off > s1) segments1.push({ start: s1, end: Math.min(off, usable1), length: Math.min(off, usable1) - s1 })
      s1 = Math.max(s1, endOpening)
    }
    const remainderLen = Math.max(T, wall1Max - s1)
    segments1.push({ start: s1, end: wall1Max, length: remainderLen })
  }
  if (segments1.length === 0 && wall1Max > 0) segments1.push({ start: 0, end: wall1Max, length: wall1Max })
  const segments2: { start: number; end: number; length: number }[] = []
  let s2 = 0
  if (wall2Openings.length > 0) {
    for (const o of wall2Openings) {
      const off = Math.max(0, Math.min(wall2Max, o.offset ?? 0))
      const ow = o.width ?? 0.9
      const endOpening = Math.min(wall2Max, off + ow, usable2)
      if (off > s2) segments2.push({ start: s2, end: Math.min(off, usable2), length: Math.min(off, usable2) - s2 })
      s2 = Math.max(s2, endOpening)
    }
    const remainderLen = Math.max(T, wall2Max - s2)
    segments2.push({ start: s2, end: wall2Max, length: remainderLen })
  }
  if (segments2.length === 0 && wall2Max > 0) segments2.push({ start: 0, end: wall2Max, length: wall2Max })

  const LABEL_HALF = 24
  const TIER_OFFSET = 14
  /** Фиксированный отступ второго ряда и второй линии: первая линия/ряд — полная длина, вторая — сегменты (при наличии проёма на стене). */
  const SEGMENT_ROW_OFFSET = 20
  const segHorLineY = totalH + 20 + SEGMENT_ROW_OFFSET
  const segVertLineX = totalW + 20 + SEGMENT_ROW_OFFSET

  const tier1: number[] = segments1.map(() => 0)
  for (let i = 0; i < segments1.length; i++) {
    const cx = (segments1[i].start + segments1[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cxJ = (segments1[j].start + segments1[j].end) / 2 * px
      if (Math.abs(cx - cxJ) < 2 * LABEL_HALF && tier1[i] === tier1[j]) tier1[i] = 1
    }
  }
  const tier2: number[] = segments2.map(() => 0)
  for (let i = 0; i < segments2.length; i++) {
    const cy = (segments2[i].start + segments2[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cyJ = (segments2[j].start + segments2[j].end) / 2 * px
      if (Math.abs(cy - cyJ) < 2 * LABEL_HALF && tier2[i] === tier2[j]) tier2[i] = 1
    }
  }
  const idxRight = segments1.length > 0 ? segments1.reduce((best, _, i) => (segments1[i].start + segments1[i].end) / 2 > (segments1[best].start + segments1[best].end) / 2 ? i : best, 0) : -1
  const idxBottom = segments2.length > 0 ? segments2.reduce((best, _, i) => (segments2[i].start + segments2[i].end) / 2 > (segments2[best].start + segments2[best].end) / 2 ? i : best, 0) : -1
  if (idxRight >= 0 && idxBottom >= 0) {
    const cxR = (segments1[idxRight].start + segments1[idxRight].end) / 2 * px
    const cyB = (segments2[idxBottom].start + segments2[idxBottom].end) / 2 * px
    const y1 = totalH + 40 + SEGMENT_ROW_OFFSET + tier1[idxRight] * TIER_OFFSET
    const x2 = totalW + 40 + SEGMENT_ROW_OFFSET + tier2[idxBottom] * TIER_OFFSET
    const overlapX = cxR + LABEL_HALF > x2 - 8 && cxR - LABEL_HALF < x2 + 8
    const overlapY = cyB + LABEL_HALF > y1 - 8 && cyB - LABEL_HALF < y1 + 8
    if (overlapX && overlapY) {
      tier1[idxRight] = 1
      tier2[idxBottom] = 1
    }
  }

  // Зона толщины: линия + подпись справа от схемы; при налезании подписей сегментов — сдвигаем указатель или ярусы
  const THICK_ZONE_LEFT = 4
  const THICK_ZONE_RIGHT = 50
  let thickLineX = totalW + 12
  const thickY0 = totalH - tPx
  const thickY1 = totalH

  // Наружные размеры: горизонталь под (0…totalW), вертикаль справа (0…totalH)
  const outHorLineY = totalH + 20
  const outVertLineX = totalW + 20
  const outVertTextX = totalW + 40
  const outVertTextY = totalH / 2
  // Внутренние размеры: горизонталь над (0…vertX), вертикаль слева (0…horY)
  const inHorLineY = horY - 20
  const inHorTextY = horY - 40
  const inHorCenterX = vertX / 2
  const inVertLineX = vertX - 20
  const inVertTextX = vertX - 40
  const inVertTextY = horY / 2

  // Горизонтальная подпись справа не должна заходить в зону толщины — сдвигаем указатель толщины вправо
  if (segments1.length > 0) {
    const segmentRightExtent = Math.max(...segments1.map((seg) => (seg.start + seg.end) / 2 * px + LABEL_HALF))
    if (segmentRightExtent >= thickLineX - THICK_ZONE_LEFT) {
      thickLineX = segmentRightExtent + 12
    }
  }

  const thickZoneXMax = thickLineX + THICK_ZONE_RIGHT
  const segmentBaseX = segVertLineX + 20
  const minTier2ToClearThick = Math.max(0, Math.ceil((thickZoneXMax + 10 - segmentBaseX) / TIER_OFFSET))
  for (let i = 0; i < segments2.length; i++) {
    const labelY = (segments2[i].start + segments2[i].end) / 2 * px
    const labelX0 = segmentBaseX + tier2[i] * TIER_OFFSET
    const labelXMin = labelX0 - LABEL_HALF
    const overlapsThickY = labelY + LABEL_HALF > thickY0 && labelY - LABEL_HALF < thickY1
    const overlapsThickX = labelXMin < thickZoneXMax
    if (overlapsThickY && overlapsThickX) {
      tier2[i] = Math.max(tier2[i], minTier2ToClearThick)
    }
  }

  const baseRight = totalW + 12 + 50
  const extraRight = thickLineX + 50 > baseRight ? (thickLineX + 50 - baseRight) : 0
  const svgW = gridW + DIMENSION_OFFSET * 2 + 40 + extraRight
  const svgH = gridH + DIMENSION_OFFSET * 2 + 40
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300"
        >
          Закрыть
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="grid-w2" width={GRID_CELL_PX} height={GRID_CELL_PX} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_CELL_PX} 0 L ${GRID_CELL_PX} ${GRID_CELL_PX} M 0 ${GRID_CELL_PX} L ${GRID_CELL_PX} ${GRID_CELL_PX}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={gridW} height={gridH} fill="url(#grid-w2)" stroke="#d6d3d1" strokeWidth="1" />
            <g transform={`translate(${GRID_MARGIN_PX}, ${GRID_MARGIN_PX})`}>
              <path d={stripPath} fillRule="evenodd" fill="rgba(168,162,158,0.4)" stroke="#57534e" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />
              {openings.map((o, i) => {
                const wall = (o.wall ?? 1) as 1 | 2
                const offset = o.offset ?? 0
                const ow = o.width ?? 0.9
                if (wall === 1) {
                  const effW = Math.max(0, Math.min(ow, usable1 - offset))
                  const xPx = offset * px
                  const wPxDraw = effW > 0 ? effW * px : 4
                  const xDraw = effW > 0 ? xPx : vertX - 4
                  const cx = xDraw + wPxDraw / 2
                  const cy = horY + tPx / 2
                  return (
                    <g key={i}>
                      <rect x={xDraw} y={horY} width={wPxDraw} height={tPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <rect x={xDraw} y={horY} width={wPxDraw} height={tPx} fill="transparent" cursor="grab" onPointerDown={(ev) => handlePointerDown(ev, i)} />
                      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={11} fontFamily="sans-serif" pointerEvents="none">{effW > 0 ? fmtRu(effW) + ' м' : ''}</text>
                    </g>
                  )
                }
                const effW = Math.max(0, Math.min(ow, usable2 - offset))
                const yPx = offset * px
                const hPxDraw = effW > 0 ? effW * px : 4
                const yDraw = effW > 0 ? yPx : horY - 4
                const cx = vertX + tPx / 2
                const cy = yDraw + hPxDraw / 2
                return (
                  <g key={i}>
                    <rect x={vertX} y={yDraw} width={tPx} height={hPxDraw} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                    <rect x={vertX} y={yDraw} width={tPx} height={hPxDraw} fill="transparent" cursor="grab" onPointerDown={(ev) => handlePointerDown(ev, i)} />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={11} fontFamily="sans-serif" pointerEvents="none" transform={`rotate(-90, ${cx}, ${cy})`}>{effW > 0 ? fmtRu(effW) + ' м' : ''}</text>
                  </g>
                )
              })}
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Наружные размеры">
                <path d={`M ${0 - tick45} ${outHorLineY + tick45} L ${0 + tick45} ${outHorLineY - tick45} M ${totalW - tick45} ${outHorLineY + tick45} L ${totalW + tick45} ${outHorLineY - tick45} M 0 ${outHorLineY} L ${totalW} ${outHorLineY}`} />
                <text x={totalW / 2} y={totalH + 40} textAnchor="middle" fill="#292524" fontWeight="600">{fmtRu(w)} м</text>
                <path d={`M ${outVertLineX - tick45} ${totalH - tick45} L ${outVertLineX + tick45} ${totalH + tick45} M ${outVertLineX - tick45} ${0 - tick45} L ${outVertLineX + tick45} ${0 + tick45} M ${outVertLineX} ${totalH} L ${outVertLineX} 0`} />
                <text x={outVertTextX} y={outVertTextY} textAnchor="middle" fill="#292524" fontWeight="600" transform={`rotate(-90, ${outVertTextX}, ${outVertTextY})`}>{fmtRu(l)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Внутренние размеры">
                <path d={`M ${0 - tick45} ${inHorLineY + tick45} L ${0 + tick45} ${inHorLineY - tick45} M ${vertX - tick45} ${inHorLineY + tick45} L ${vertX + tick45} ${inHorLineY - tick45} M 0 ${inHorLineY} L ${vertX} ${inHorLineY}`} />
                <text x={inHorCenterX} y={inHorTextY} textAnchor="middle" fill="#292524">{fmtRu(w - T)} м</text>
                <path d={`M ${inVertLineX - tick45} ${horY - tick45} L ${inVertLineX + tick45} ${horY + tick45} M ${inVertLineX - tick45} ${0 - tick45} L ${inVertLineX + tick45} ${0 + tick45} M ${inVertLineX} ${horY} L ${inVertLineX} 0`} />
                <text x={inVertTextX} y={inVertTextY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${inVertTextX}, ${inVertTextY})`}>{fmtRu(l - T)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Размеры сегментов">
                {/* Для каждой стены отдельно: второй ряд, если на этой стене есть хотя бы один проём (чтобы пользователь видел оставшуюся длину, в т.ч. при проёме в крайнем положении). */}
                {wall1Openings.length > 0 && segments1.map((seg, i) => {
                  const x0 = seg.start * px
                  const x1 = seg.end * px
                  return (
                    <g key={`w1-${i}`}>
                      <path d={`M ${x0 - tick45} ${segHorLineY + tick45} L ${x0 + tick45} ${segHorLineY - tick45} M ${x1 - tick45} ${segHorLineY + tick45} L ${x1 + tick45} ${segHorLineY - tick45} M ${x0} ${segHorLineY} L ${x1} ${segHorLineY}`} />
                      <text x={(seg.start + seg.end) / 2 * px} y={segHorLineY + 20 + tier1[i] * TIER_OFFSET} textAnchor="middle" fill="#292524">{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall2Openings.length > 0 && segments2.map((seg, i) => {
                  const y0 = seg.start * px
                  const y1 = seg.end * px
                  const labelX = segVertLineX + 20 + tier2[i] * TIER_OFFSET
                  const labelY = (seg.start + seg.end) / 2 * px
                  return (
                    <g key={`w2-${i}`}>
                      <path d={`M ${segVertLineX - tick45} ${y0 - tick45} L ${segVertLineX + tick45} ${y0 + tick45} M ${segVertLineX - tick45} ${y1 - tick45} L ${segVertLineX + tick45} ${y1 + tick45} M ${segVertLineX} ${y0} L ${segVertLineX} ${y1}`} />
                      <text x={labelX} y={labelY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${labelX}, ${labelY})`}>{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
                <path d={`M ${thickLineX - tick45} ${thickY0 - tick45} L ${thickLineX + tick45} ${thickY0 + tick45} M ${thickLineX - tick45} ${thickY1 - tick45} L ${thickLineX + tick45} ${thickY1 + tick45} M ${thickLineX} ${thickY0} L ${thickLineX} ${thickY1}`} />
                <text x={thickLineX + 10} y={(thickY0 + thickY1) / 2} textAnchor="start" fill="#292524" dominantBaseline="middle">{fmtRu(T)} м</text>
              </g>
            </g>
          </g>
        </svg>
        <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 0,5 м · Г-образные стены · наружная и внутренняя грани · перетаскивайте проёмы вдоль стен</p>
      </div>
    </div>
  )
}
