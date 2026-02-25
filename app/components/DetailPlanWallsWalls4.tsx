'use client'

import { useEffect, useRef, useState } from 'react'
import type { LocalProject } from '@/lib/projects/localProjects'
import type { Opening } from '@/lib/projects/localProjects'

const PX_PER_M = 48
const GRID_STEP_M = 0.5
const GRID_MARGIN_CELLS = 2
const DIMENSION_OFFSET = 28
const MAX_CONTENT_PX = 800
const DIMENSION_FONT_SIZE = 13
const DIM_TICK_45 = 4 / Math.sqrt(2)

function fmtRu(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0'
}

type Principle = 'inside' | 'outside'

type Props = {
  project: Extract<LocalProject, { type: 'walls_4' }>
  onOpeningsChange?: (openings: Opening[]) => void
  onClose: () => void
}

export function DetailPlanWallsWalls4({ project, onOpeningsChange, onClose }: Props) {
  const data = project.data
  const principle: Principle = data.principle === 'outside' ? 'outside' : 'inside'
  const isInside = principle === 'inside'
  const t = Math.max(0.05, Number(data.thickness) ?? 0.25)
  const W = Math.max(0.1, Number(data.width) || 5)
  const L = Math.max(0.1, Number(data.length) || 5)
  const w = isInside ? W + 2 * t : W
  const l = isInside ? L + 2 * t : L

  const [openings, setOpenings] = useState<Opening[]>(() => {
    const list = Array.isArray(data.openings) ? data.openings : []
    return list.map((o, i) => ({
      ...o,
      wall: (o.wall ?? 1) as 1 | 2 | 3 | 4,
      offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : Math.max(t, t + i * 0.5),
    }))
  })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ index: number; startX: number; startY: number; startOffset: number; wall: 1 | 2 | 3 | 4; startCursorAlongWall: number } | null>(null)
  const openingsRef = useRef(openings)
  useEffect(() => {
    openingsRef.current = openings
  }, [openings])

  if (t >= w || t >= l) {
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

  const contentW = w * PX_PER_M
  const contentH = l * PX_PER_M
  const scale = Math.min(1, MAX_CONTENT_PX / contentW, MAX_CONTENT_PX / contentH)
  const px = PX_PER_M * scale
  const GRID_CELL_PX = GRID_STEP_M * px
  const GRID_MARGIN_PX = GRID_CELL_PX * GRID_MARGIN_CELLS

  const tPx = t * px
  const totalW = w * px
  const totalH = l * px
  const gridW = totalW + GRID_MARGIN_PX * 2
  const gridH = totalH + GRID_MARGIN_PX * 2
  const svgW = gridW + DIMENSION_OFFSET * 2 + 60
  const svgH = gridH + DIMENSION_OFFSET * 2 + 60
  const textScale = Math.max(svgW, svgH) / 400
  const fontSz = DIMENSION_FONT_SIZE * textScale
  const tick45 = DIM_TICK_45 * textScale
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20
  const thickLineX = totalW + 12
  const thickY0 = totalH - tPx
  const thickY1 = totalH

  const outerPath = `M 0 0 H ${totalW} V ${totalH} H 0 Z`
  const innerPath = `M ${tPx} ${tPx} H ${totalW - tPx} V ${totalH - tPx} H ${tPx} Z`
  const stripPath = `${outerPath} ${innerPath}`

  const outHorLineY = totalH + 20
  const outVertLineX = totalW + 20
  const outVertTextX = totalW + 40
  const outVertTextY = totalH / 2
  const INNER_DIM_OFFSET = 20
  const inHorLineY = tPx + INNER_DIM_OFFSET
  const inHorTextY = tPx + INNER_DIM_OFFSET + 35
  const inHorEndX = totalW - tPx
  const inHorCenterX = (tPx + inHorEndX) / 2
  const inVertLineX = tPx + INNER_DIM_OFFSET
  const inVertTextX = tPx + INNER_DIM_OFFSET + 40
  const inVertTextY = (tPx + (totalH - tPx)) / 2
  const innerDimW = isInside ? W : w - 2 * t
  const innerDimL = isInside ? L : l - 2 * t

  const wallLen1 = w
  const wallLen2 = l
  const wallLen3 = w
  const wallLen4 = l

  // Логика сегментов и внешних длин привязана к внутренним размерам (например 10×10 м: width/length — внутренние, w/l — внешние при principle inside).
  const wall1Openings = openings.filter((o) => (o.wall ?? 1) === 1).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall2Openings = openings.filter((o) => (o.wall ?? 1) === 2).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall3Openings = openings.filter((o) => (o.wall ?? 1) === 3).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall4Openings = openings.filter((o) => (o.wall ?? 1) === 4).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))

  // Сегменты по внешним граням стен (0..w или 0..l)
  const segments1: { start: number; end: number; length: number }[] = []
  let s1 = 0
  for (const o of wall1Openings) {
    const off = Math.max(t, Math.min(w - t - (o.width ?? 0.9), o.offset ?? t))
    const ow = o.width ?? 0.9
    if (off > s1) segments1.push({ start: s1, end: off, length: off - s1 })
    s1 = Math.max(s1, off + ow)
  }
  if (s1 < w) segments1.push({ start: s1, end: w, length: w - s1 })
  if (segments1.length === 0) segments1.push({ start: 0, end: w, length: w })

  const segments2: { start: number; end: number; length: number }[] = []
  let s2 = 0
  for (const o of wall2Openings) {
    const off = Math.max(t, Math.min(l - t - (o.width ?? 0.9), o.offset ?? t))
    const ow = o.width ?? 0.9
    if (off > s2) segments2.push({ start: s2, end: off, length: off - s2 })
    s2 = Math.max(s2, off + ow)
  }
  if (s2 < l) segments2.push({ start: s2, end: l, length: l - s2 })
  if (segments2.length === 0) segments2.push({ start: 0, end: l, length: l })

  const segments3: { start: number; end: number; length: number }[] = []
  const wall3ByLeft = [...wall3Openings].map((o) => {
    const off = Math.max(0, Math.min(w - 2 * t - (o.width ?? 0.9), o.offset ?? 0))
    const ow = o.width ?? 0.9
    return { left: w - t - off - ow, right: w - t - off, ow }
  }).sort((a, b) => a.left - b.left)
  let s3 = 0
  for (const { left, right } of wall3ByLeft) {
    if (left > s3) segments3.push({ start: s3, end: left, length: left - s3 })
    s3 = Math.max(s3, right)
  }
  if (s3 < w) segments3.push({ start: s3, end: w, length: w - s3 })
  if (segments3.length === 0) segments3.push({ start: 0, end: w, length: w })

  const segments4: { start: number; end: number; length: number }[] = []
  let s4 = 0
  for (const o of wall4Openings) {
    const off = Math.max(t, Math.min(l - t - (o.width ?? 0.9), o.offset ?? t))
    const ow = o.width ?? 0.9
    if (off > s4) segments4.push({ start: s4, end: off, length: off - s4 })
    s4 = Math.max(s4, off + ow)
  }
  if (s4 < l) segments4.push({ start: s4, end: l, length: l - s4 })
  if (segments4.length === 0) segments4.push({ start: 0, end: l, length: l })

  const LABEL_HALF = 24
  const TIER_OFFSET = 14
  const SEGMENT_ROW_OFFSET = 20
  const segHorLineYTop = -SEGMENT_ROW_OFFSET - 20
  const segHorLineYBottom = totalH + 20 + SEGMENT_ROW_OFFSET
  const segVertLeftX = -SEGMENT_ROW_OFFSET - 20
  const segVertRightX = totalW + 20 + SEGMENT_ROW_OFFSET

  const tier1 = segments1.map(() => 0)
  for (let i = 0; i < segments1.length; i++) {
    const cx = (segments1[i].start + segments1[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cxJ = (segments1[j].start + segments1[j].end) / 2 * px
      if (Math.abs(cx - cxJ) < 2 * LABEL_HALF && tier1[i] === tier1[j]) tier1[i] = 1
    }
  }
  const tier2 = segments2.map(() => 0)
  for (let i = 0; i < segments2.length; i++) {
    const cy = (segments2[i].start + segments2[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cyJ = (segments2[j].start + segments2[j].end) / 2 * px
      if (Math.abs(cy - cyJ) < 2 * LABEL_HALF && tier2[i] === tier2[j]) tier2[i] = 1
    }
  }
  const tier3 = segments3.map(() => 0)
  for (let i = 0; i < segments3.length; i++) {
    const cx = (segments3[i].start + segments3[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cxJ = (segments3[j].start + segments3[j].end) / 2 * px
      if (Math.abs(cx - cxJ) < 2 * LABEL_HALF && tier3[i] === tier3[j]) tier3[i] = 1
    }
  }
  const tier4 = segments4.map(() => 0)
  for (let i = 0; i < segments4.length; i++) {
    const cy = (segments4[i].start + segments4[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cyJ = (segments4[j].start + segments4[j].end) / 2 * px
      if (Math.abs(cy - cyJ) < 2 * LABEL_HALF && tier4[i] === tier4[j]) tier4[i] = 1
    }
  }

  const getContentCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { contentX: 0, contentY: 0 }
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { contentX: 0, contentY: 0 }
    const svgP = pt.matrixTransform(ctm.inverse())
    return {
      contentX: svgP.x - ox - GRID_MARGIN_PX,
      contentY: svgP.y - oy - GRID_MARGIN_PX,
    }
  }

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault()
    const o = openings[index]
    if (!o || !svgRef.current) return
    const wall = (o.wall ?? 1) as 1 | 2 | 3 | 4
    const startOffset = o.offset ?? 0
    const { contentX, contentY } = getContentCoords(e)
    let startCursorAlongWall: number
    if (wall === 1) startCursorAlongWall = contentX / px
    else if (wall === 2) startCursorAlongWall = contentY / px
    else if (wall === 3) startCursorAlongWall = (totalW - contentX) / px
    else startCursorAlongWall = contentY / px
    dragRef.current = { index, startX: e.clientX, startY: e.clientY, startOffset, wall, startCursorAlongWall }
    ;(e.target as SVGElement).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !svgRef.current) return
    const { index, startOffset, startCursorAlongWall } = dragRef.current
    const o = openings[index]
    if (!o) return
    const ow = o.width ?? 0.9
    const { contentX, contentY } = getContentCoords(e)
    const onWall1 = contentY >= 0 && contentY <= tPx && contentX >= 0 && contentX <= totalW
    const onWall2 = contentX >= totalW - tPx && contentX <= totalW && contentY >= 0 && contentY <= totalH
    const onWall3 = contentY >= totalH - tPx && contentY <= totalH && contentX >= 0 && contentX <= totalW
    const onWall4 = contentX >= 0 && contentX <= tPx && contentY >= 0 && contentY <= totalH
    const minOff1 = t
    const maxOff1 = Math.max(minOff1, wallLen1 - t - ow)
    const minOff2 = t
    const maxOff2 = Math.max(minOff2, wallLen2 - t - ow)
    // Нижняя стена: offset от правого внутр. угла; minOff3=0 — правый край проёма может доходить до правого внутр. угла; не заходить в левый угол => maxOff3 = w-2t-ow
    const minOff3 = 0
    const maxOff3 = Math.max(minOff3, wallLen3 - 2 * t - ow)
    const minOff4 = t
    const maxOff4 = Math.max(minOff4, wallLen4 - t - ow)
    const gripOffset = startCursorAlongWall - startOffset
    const curWall = dragRef.current.wall
    const wallsOn: (1 | 2 | 3 | 4)[] = []
    if (onWall1) wallsOn.push(1)
    if (onWall2) wallsOn.push(2)
    if (onWall3) wallsOn.push(3)
    if (onWall4) wallsOn.push(4)
    const preferredWall = wallsOn.includes(curWall) ? curWall : wallsOn[0]
    if (preferredWall == null) return

    let newWall = preferredWall
    let newOffset = startOffset
    if (newWall === 1) {
      const curCursor = contentX / px
      newOffset = Math.max(minOff1, Math.min(maxOff1, curCursor - gripOffset))
    } else if (newWall === 2) {
      const curCursor = contentY / px
      newOffset = Math.max(minOff2, Math.min(maxOff2, curCursor - gripOffset))
    } else if (newWall === 3) {
      const curCursor = (totalW - contentX) / px
      newOffset = Math.max(minOff3, Math.min(maxOff3, curCursor - gripOffset))
    } else {
      const curCursor = contentY / px
      newOffset = Math.max(minOff4, Math.min(maxOff4, curCursor - gripOffset))
    }
    if (newWall !== dragRef.current.wall) {
      dragRef.current.startCursorAlongWall = newWall === 1 ? contentX / px : newWall === 2 ? contentY / px : newWall === 3 ? (totalW - contentX) / px : contentY / px
      dragRef.current.startOffset = newOffset
    }
    dragRef.current.wall = newWall
    setOpenings((prev) => {
      const next = [...prev]
      const opening = next[index]
      if (opening) next[index] = { ...opening, wall: newWall, offset: newOffset }
      return next
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    ;(e.target as SVGElement).releasePointerCapture?.(e.pointerId)
    if (dragRef.current) {
      onOpeningsChange?.(openingsRef.current)
      dragRef.current = null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
        <button type="button" onClick={onClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
          Закрыть
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm" preserveAspectRatio="xMidYMid meet" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          <defs>
            <pattern id="grid-w4" width={GRID_CELL_PX} height={GRID_CELL_PX} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_CELL_PX} 0 L ${GRID_CELL_PX} ${GRID_CELL_PX} M 0 ${GRID_CELL_PX} L ${GRID_CELL_PX} ${GRID_CELL_PX}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={gridW} height={gridH} fill="url(#grid-w4)" stroke="#d6d3d1" strokeWidth="1" />
            <g transform={`translate(${GRID_MARGIN_PX}, ${GRID_MARGIN_PX})`}>
              <path d={stripPath} fillRule="evenodd" fill="url(#grid-w4)" stroke="none" />
              <path d={innerPath} fill="url(#grid-w4)" stroke="none" />
              <path d={stripPath} fillRule="evenodd" fill="none" stroke="#57534e" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />
              {openings.map((o, i) => {
                const wall = (o.wall ?? 1) as 1 | 2 | 3 | 4
                const ow = o.width ?? 0.9
                const wallLen = wall === 1 || wall === 3 ? wallLen1 : wallLen2
                const maxLen = Math.max(0, wallLen - 2 * t)
                if (ow > maxLen) return null
                const minOff = wall === 3 ? 0 : t
                const maxOff = wall === 3 ? Math.max(0, wallLen - 2 * t - ow) : Math.max(minOff, wallLen - t - ow)
                const offM = Math.max(minOff, Math.min(maxOff, o.offset ?? (wall === 3 ? 0 : t)))
                const off = offM * px
                const ww = ow * px
                const grip = (
                  <rect key="grip" x={wall === 1 ? off : wall === 2 ? totalW - tPx : wall === 3 ? totalW - tPx - off - ww : 0} y={wall === 1 ? 0 : wall === 2 ? off : wall === 3 ? totalH - tPx : off} width={wall === 1 || wall === 3 ? ww : tPx} height={wall === 1 || wall === 3 ? tPx : ww} fill="transparent" cursor="grab" onPointerDown={(ev) => handlePointerDown(ev, i)} />
                )
                if (wall === 1) {
                  return (
                    <g key={`op-${i}`}>
                      <rect x={off} y={0} width={ww} height={tPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <text x={off + ww / 2} y={tPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10}>{fmtRu(o.width ?? 0.9)} м</text>
                      {grip}
                    </g>
                  )
                }
                if (wall === 2) {
                  return (
                    <g key={`op-${i}`}>
                      <rect x={totalW - tPx} y={off} width={tPx} height={ww} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <text x={totalW - tPx / 2} y={off + ww / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10} transform={`rotate(-90, ${totalW - tPx / 2}, ${off + ww / 2})`}>{fmtRu(o.width ?? 0.9)} м</text>
                      {grip}
                    </g>
                  )
                }
                if (wall === 3) {
                  return (
                    <g key={`op-${i}`}>
                      <rect x={totalW - tPx - off - ww} y={totalH - tPx} width={ww} height={tPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <text x={totalW - tPx - off - ww / 2} y={totalH - tPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10}>{fmtRu(o.width ?? 0.9)} м</text>
                      {grip}
                    </g>
                  )
                }
                return (
                  <g key={`op-${i}`}>
                    <rect x={0} y={off} width={tPx} height={ww} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                    <text x={tPx / 2} y={off + ww / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10} transform={`rotate(90, ${tPx / 2}, ${off + ww / 2})`}>{fmtRu(o.width ?? 0.9)} м</text>
                    {grip}
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
                <path d={`M ${tPx - tick45} ${inHorLineY + tick45} L ${tPx + tick45} ${inHorLineY - tick45} M ${inHorEndX - tick45} ${inHorLineY + tick45} L ${inHorEndX + tick45} ${inHorLineY - tick45} M ${tPx} ${inHorLineY} L ${inHorEndX} ${inHorLineY}`} />
                <text x={inHorCenterX} y={inHorTextY} textAnchor="middle" fill="#292524">{fmtRu(innerDimW)} м</text>
                <path d={`M ${inVertLineX - tick45} ${totalH - tPx - tick45} L ${inVertLineX + tick45} ${totalH - tPx + tick45} M ${inVertLineX - tick45} ${tPx - tick45} L ${inVertLineX + tick45} ${tPx + tick45} M ${inVertLineX} ${totalH - tPx} L ${inVertLineX} ${tPx}`} />
                <text x={inVertTextX} y={inVertTextY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${inVertTextX}, ${inVertTextY})`}>{fmtRu(innerDimL)} м</text>
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Размеры сегментов">
                {wall1Openings.length > 0 && segments1.map((seg, i) => {
                  const x0 = seg.start * px
                  const x1 = seg.end * px
                  const labelY = segHorLineYTop - 20 - tier1[i] * TIER_OFFSET
                  return (
                    <g key={`w1-${i}`}>
                      <path d={`M ${x0 - tick45} ${segHorLineYTop + tick45} L ${x0 + tick45} ${segHorLineYTop - tick45} M ${x1 - tick45} ${segHorLineYTop + tick45} L ${x1 + tick45} ${segHorLineYTop - tick45} M ${x0} ${segHorLineYTop} L ${x1} ${segHorLineYTop}`} />
                      <text x={(seg.start + seg.end) / 2 * px} y={labelY} textAnchor="middle" fill="#292524">{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall2Openings.length > 0 && segments2.map((seg, i) => {
                  const y0 = seg.start * px
                  const y1 = seg.end * px
                  const labelX = segVertRightX + 20 + tier2[i] * TIER_OFFSET
                  const labelY = (seg.start + seg.end) / 2 * px
                  return (
                    <g key={`w2-${i}`}>
                      <path d={`M ${segVertRightX - tick45} ${y0 - tick45} L ${segVertRightX + tick45} ${y0 + tick45} M ${segVertRightX - tick45} ${y1 - tick45} L ${segVertRightX + tick45} ${y1 + tick45} M ${segVertRightX} ${y0} L ${segVertRightX} ${y1}`} />
                      <text x={labelX} y={labelY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${labelX}, ${labelY})`}>{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall3Openings.length > 0 && segments3.map((seg, i) => {
                  const x0 = seg.start * px
                  const x1 = seg.end * px
                  const labelY = segHorLineYBottom + 20 + tier3[i] * TIER_OFFSET
                  return (
                    <g key={`w3-${i}`}>
                      <path d={`M ${x0 - tick45} ${segHorLineYBottom + tick45} L ${x0 + tick45} ${segHorLineYBottom - tick45} M ${x1 - tick45} ${segHorLineYBottom + tick45} L ${x1 + tick45} ${segHorLineYBottom - tick45} M ${x0} ${segHorLineYBottom} L ${x1} ${segHorLineYBottom}`} />
                      <text x={(seg.start + seg.end) / 2 * px} y={labelY} textAnchor="middle" fill="#292524">{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall4Openings.length > 0 && segments4.map((seg, i) => {
                  const y0 = seg.start * px
                  const y1 = seg.end * px
                  const labelX = segVertLeftX - 20 - tier4[i] * TIER_OFFSET
                  const labelY = (seg.start + seg.end) / 2 * px
                  return (
                    <g key={`w4-${i}`}>
                      <path d={`M ${segVertLeftX - tick45} ${y0 - tick45} L ${segVertLeftX + tick45} ${y0 + tick45} M ${segVertLeftX - tick45} ${y1 - tick45} L ${segVertLeftX + tick45} ${y1 + tick45} M ${segVertLeftX} ${y0} L ${segVertLeftX} ${y1}`} />
                      <text x={labelX} y={labelY} textAnchor="middle" fill="#292524" transform={`rotate(90, ${labelX}, ${labelY})`}>{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
              </g>
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif">
                <path d={`M ${thickLineX - tick45} ${thickY0 - tick45} L ${thickLineX + tick45} ${thickY0 + tick45} M ${thickLineX - tick45} ${thickY1 - tick45} L ${thickLineX + tick45} ${thickY1 + tick45} M ${thickLineX} ${thickY0} L ${thickLineX} ${thickY1}`} />
                <text x={thickLineX + 10} y={(thickY0 + thickY1) / 2} textAnchor="start" fill="#292524" dominantBaseline="middle">{fmtRu(t)} м</text>
              </g>
            </g>
          </g>
        </svg>
        <p className="mt-3 text-center text-sm text-stone-500">
          {onOpeningsChange ? 'Перетаскивайте проёмы вдоль стен (не в зонах пересечения). · ' : ''}
          1 клетка = 0,5 м · Прямоугольные стены · наружная и внутренняя грани
        </p>
      </div>
    </div>
  )
}
