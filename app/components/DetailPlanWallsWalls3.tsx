'use client'

/**
 * План стен 3 стороны (П). Построение идентично DetailPlanFoundationWalls3.
 * Проёмы: как в проекте 2 стены — локальное состояние, перетаскивание вдоль стен, onOpeningsChange.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LocalProject } from '@/lib/projects/localProjects'
import type { Opening } from '@/lib/projects/localProjects'

const PX_PER_M = 48
const GRID_STEP_M = 0.5 // 1 клетка = 0,5 м
const GRID_MARGIN_CELLS = 2
const DIMENSION_OFFSET = 28
const MAX_CONTENT_PX = 800
const DIMENSION_FONT_SIZE = 13
const TOUCH_HIT_PADDING = 24
/** Полудлина косой засечки 45° */
const DIM_TICK_45 = 4 / Math.sqrt(2)

function fmtRu(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0'
}

type Principle = 'inside' | 'outside'

type Props = {
  project: Extract<LocalProject, { type: 'walls_3' }>
  onOpeningsChange?: (openings: Opening[]) => void
  onClose: () => void
  /** Режим встраивания для захвата в PDF */
  embedOnly?: boolean
}

export function DetailPlanWallsWalls3({ project, onOpeningsChange, onClose, embedOnly = false }: Props) {
  const data = project.data
  const principle: Principle = data.principle === 'outside' ? 'outside' : 'inside'
  const isInside = principle === 'inside'
  const rawL = Number(data.left) ?? 0
  const rawB = Number(data.back) ?? 0
  const rawR = Number(data.right) ?? 0
  const hasNoDimensions = rawL <= 0 && rawB <= 0 && rawR <= 0
  const t = Math.max(0.05, Number(data.thickness) ?? 0)
  const L = Math.max(0.1, rawL)
  const B = Math.max(0.1, rawB)
  const R = Math.max(0.1, rawR)
  const length = isInside ? L + t : L
  const width = isInside ? B + 2 * t : B
  const third = isInside ? R + t : R

  const [openings, setOpenings] = useState<Opening[]>(() => {
    const list = Array.isArray(data.openings) ? data.openings : []
    return list.map((o, i) => ({
      ...o,
      wall: (o.wall ?? 1) as 1 | 2 | 3,
      offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : i * 0.5,
    }))
  })
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ index: number; startX: number; startY: number; startOffset: number; wall: 1 | 2 | 3; startCursorAlongWall: number } | null>(null)
  const openingsRef = useRef(openings)
  const onOpeningsChangeRef = useRef(onOpeningsChange)
  onOpeningsChangeRef.current = onOpeningsChange
  const [dragState, setDragState] = useState<{ index: number; wall: 1 | 2 | 3; offset: number } | null>(null)
  useEffect(() => {
    openingsRef.current = openings
  }, [openings])
  const effectiveOpenings = useMemo(() => {
    if (!dragState) return openings
    const list = [...openings]
    const o = list[dragState.index]
    if (o) list[dragState.index] = { ...o, wall: dragState.wall, offset: dragState.offset }
    return list
  }, [openings, dragState])

  useEffect(() => {
    if (embedOnly) return
    const handleDocPointerUp = () => {
      if (!dragRef.current) return
      const final = openingsRef.current
      setOpenings(final)
      onOpeningsChangeRef.current?.(final)
      dragRef.current = null
      setDragState(null)
    }
    document.addEventListener('pointerup', handleDocPointerUp)
    document.addEventListener('pointercancel', handleDocPointerUp)
    return () => {
      document.removeEventListener('pointerup', handleDocPointerUp)
      document.removeEventListener('pointercancel', handleDocPointerUp)
    }
  }, [embedOnly])

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

  // Один контур: левая и правая ноги по высоте ровно length и third (толщина горизонтали уже входит в эти размеры, внахлёст). — как в фундаменте 3 стороны
  const outerPath = `M 0 ${totalH} L ${tPx} ${totalH} L ${widthPx - tPx} ${totalH} L ${widthPx} ${totalH} L ${widthPx} ${totalH - thirdPx} L ${widthPx - tPx} ${totalH - thirdPx} L ${widthPx - tPx} ${totalH} L ${tPx} ${totalH} L ${tPx} ${totalH - lengthPx} L 0 ${totalH - lengthPx} L 0 ${totalH} Z`
  const innerPath = `M ${tPx} ${totalH - tPx} L ${widthPx - tPx} ${totalH - tPx} V ${totalH - thirdPx} L ${tPx} ${totalH - thirdPx} V ${totalH - lengthPx} L ${tPx} ${totalH - tPx} Z`
  const stripPath = `${outerPath} ${innerPath}`
  const outerStrokePath = `M 0 ${totalH} L 0 ${totalH - lengthPx} L ${tPx} ${totalH - lengthPx} L ${tPx} ${totalH - tPx} L ${widthPx - tPx} ${totalH - tPx} L ${widthPx - tPx} ${totalH - thirdPx} L ${widthPx} ${totalH - thirdPx} L ${widthPx} ${totalH} L 0 ${totalH} Z`
  const strokePath = outerStrokePath
  // Прямоугольники ног для отображения сетки (горизонтальная полоса уже просвечивает из-за stripPath)
  const leftLegGridPath = `M 0 ${totalH - lengthPx} L ${tPx} ${totalH - lengthPx} L ${tPx} ${totalH} L 0 ${totalH} Z`
  const rightLegGridPath = `M ${widthPx - tPx} ${totalH - thirdPx} L ${widthPx} ${totalH - thirdPx} L ${widthPx} ${totalH} L ${widthPx - tPx} ${totalH} Z`

  const thickLineX = totalW + 12
  const thickY0 = totalH - tPx
  const thickY1 = totalH

  // Наружные размеры: как в фундаменте 3 стороны
  const outHorLineY = totalH + 22
  const outHorTextY = totalH + 48
  const outVertLineX = totalW + 22
  const outVertTextX = totalW + 50
  const outVertLeftX = -22
  const outVertLeftTextX = -50
  const midRightY = totalH - thirdPx / 2
  const midLeftY = totalH - lengthPx / 2

  // Внутренние размеры: как в фундаменте 3 стороны
  const inGap = 18
  const inHorLineY = totalH - tPx - inGap
  const inHorTextY = totalH - tPx - inGap / 2
  const inHorEndX = widthPx - tPx
  const inHorCenterX = (tPx + inHorEndX) / 2
  const inOffset = inGap
  const inTextOffset = inGap / 2
  const inVertLineX = tPx + inOffset
  const inVertTextX = tPx + inTextOffset
  const inVertRightX = widthPx - tPx - inOffset
  const inVertRightTextX = widthPx - tPx - inOffset - inTextOffset
  const inVertTextY = (totalH - lengthPx + (totalH - tPx)) / 2
  const midInRightY = (totalH - thirdPx + (totalH - tPx)) / 2

  const barLen = Math.max(0, width - 2 * t)
  // barLen уже есть свободная зона (полная горизонталь минус пересечения с ногами по t); не вычитаем t повторно
  const usable1 = Math.max(0, length - t)
  const usable3 = Math.max(0, third - t)
  const barUsableStart = 0
  const barUsableEnd = barLen
  const barUsableLen = barLen
  const maxOffset1 = Math.max(0, length)
  const maxOffset2 = Math.max(0, barLen)
  const maxOffset3 = Math.max(0, third)

  // Последний сегмент: от конца проёма до конца ноги (length/third), длина не меньше t. Конец ноги = пересечение с полосой, не length+t.
  const wall2Max = barUsableLen
  const wall1End = length
  const wall3End = third
  const wall1Openings = effectiveOpenings.filter((o) => (o.wall ?? 1) === 1).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall2Openings = effectiveOpenings.filter((o) => (o.wall ?? 1) === 2).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const wall3Openings = effectiveOpenings.filter((o) => (o.wall ?? 1) === 3).sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const segments1: { start: number; end: number; length: number }[] = []
  let s1 = 0
  if (wall1Openings.length > 0) {
    for (const o of wall1Openings) {
      const off = Math.max(0, Math.min(wall1End, o.offset ?? 0))
      const ow = o.width ?? 0.9
      const endOpening = Math.min(wall1End, off + ow, usable1)
      if (off > s1) segments1.push({ start: s1, end: Math.min(off, usable1), length: Math.min(off, usable1) - s1 })
      s1 = Math.max(s1, endOpening)
    }
    const remainderLen = Math.max(t, wall1End - s1)
    segments1.push({ start: s1, end: wall1End, length: remainderLen })
  }
  if (segments1.length === 0 && wall1End > 0) segments1.push({ start: 0, end: wall1End, length: wall1End })
  // Горизонтальная стена: сегменты во внешних координатах (0..width), чтобы линия слева доходила до края (0), справа — до width.
  const wall2OuterMax = width
  const segments2: { start: number; end: number; length: number }[] = []
  let s2 = 0
  if (wall2Openings.length > 0) {
    for (const o of wall2Openings) {
      const off = Math.max(0, Math.min(wall2Max, o.offset ?? 0))
      const ow = o.width ?? 0.9
      // Проём может доходить до конца бара (до пересечения с правой ногой), иначе остаток начинают считать слишком рано.
      const endOpeningBar = Math.min(wall2Max, off + ow)
      const segmentEndOuter = t + Math.min(off, wall2Max)
      const endOpeningOuter = t + endOpeningBar
      if (segmentEndOuter > s2) {
        const length = s2 === 0 ? Math.max(t, segmentEndOuter) : segmentEndOuter - s2
        segments2.push({ start: s2, end: segmentEndOuter, length })
      }
      s2 = Math.max(s2, endOpeningOuter)
    }
    // От конца проёма до конца горизонтальной стены (правый край здания).
    const remainderLen = Math.max(t, wall2OuterMax - s2)
    segments2.push({ start: s2, end: wall2OuterMax, length: remainderLen })
  }
  if (segments2.length === 0 && wall2OuterMax > 0) segments2.push({ start: 0, end: wall2OuterMax, length: width })
  const segments3: { start: number; end: number; length: number }[] = []
  let s3 = 0
  if (wall3Openings.length > 0) {
    for (const o of wall3Openings) {
      const off = Math.max(0, Math.min(wall3End, o.offset ?? 0))
      const ow = o.width ?? 0.9
      const endOpening = Math.min(wall3End, off + ow, usable3)
      if (off > s3) segments3.push({ start: s3, end: Math.min(off, usable3), length: Math.min(off, usable3) - s3 })
      s3 = Math.max(s3, endOpening)
    }
    const remainderLen = Math.max(t, wall3End - s3)
    segments3.push({ start: s3, end: wall3End, length: remainderLen })
  }
  if (segments3.length === 0 && wall3End > 0) segments3.push({ start: 0, end: wall3End, length: wall3End })

  const LABEL_HALF = 24
  const TIER_OFFSET = 14
  const SEGMENT_ROW_OFFSET = 20
  const segHorLineY = totalH + 20 + SEGMENT_ROW_OFFSET
  const segVertLeftX = outVertLeftX - SEGMENT_ROW_OFFSET - 20
  const segVertRightX = totalW + 20 + SEGMENT_ROW_OFFSET

  const tier1: number[] = segments1.map(() => 0)
  for (let i = 0; i < segments1.length; i++) {
    const cy = (segments1[i].start + segments1[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cyJ = (segments1[j].start + segments1[j].end) / 2 * px
      if (Math.abs(cy - cyJ) < 2 * LABEL_HALF && tier1[i] === tier1[j]) tier1[i] = 1
    }
  }
  const tier2: number[] = segments2.map(() => 0)
  for (let i = 0; i < segments2.length; i++) {
    const cx = (segments2[i].start + segments2[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cxJ = (segments2[j].start + segments2[j].end) / 2 * px
      if (Math.abs(cx - cxJ) < 2 * LABEL_HALF && tier2[i] === tier2[j]) tier2[i] = 1
    }
  }
  const tier3: number[] = segments3.map(() => 0)
  for (let i = 0; i < segments3.length; i++) {
    const cy = (segments3[i].start + segments3[i].end) / 2 * px
    for (let j = 0; j < i; j++) {
      const cyJ = (segments3[j].start + segments3[j].end) / 2 * px
      if (Math.abs(cy - cyJ) < 2 * LABEL_HALF && tier3[i] === tier3[j]) tier3[i] = 1
    }
  }
  const idxBarRight = segments2.length > 0 ? segments2.reduce((best, _, i) => (segments2[i].start + segments2[i].end) / 2 > (segments2[best].start + segments2[best].end) / 2 ? i : best, 0) : -1
  const idxBarLeft = segments2.length > 0 ? segments2.reduce((best, _, i) => (segments2[i].start + segments2[i].end) / 2 < (segments2[best].start + segments2[best].end) / 2 ? i : best, 0) : -1
  if (idxBarRight >= 0 && segments3.length > 0) {
    const cxBar = (segments2[idxBarRight].start + segments2[idxBarRight].end) / 2 * px
    const idxRight3 = segments3.reduce((best, _, i) => (segments3[i].start + segments3[i].end) / 2 > (segments3[best].start + segments3[best].end) / 2 ? i : best, 0)
    const cy3 = totalH - thirdPx + (segments3[idxRight3].start + segments3[idxRight3].end) / 2 * px
    const y2Bar = segHorLineY + 20 + tier2[idxBarRight] * TIER_OFFSET
    const labelX3 = segVertRightX + 20 + tier3[idxRight3] * TIER_OFFSET
    if (cxBar + LABEL_HALF > labelX3 - 8 && cxBar - LABEL_HALF < labelX3 + 8 && Math.abs(cy3 - y2Bar) < 2 * LABEL_HALF) {
      tier2[idxBarRight] = 1
      tier3[idxRight3] = 1
    }
  }
  if (idxBarLeft >= 0 && segments1.length > 0) {
    const cxBar = (segments2[idxBarLeft].start + segments2[idxBarLeft].end) / 2 * px
    const idxLeft1 = segments1.reduce((best, _, i) => (segments1[i].start + segments1[i].end) / 2 > (segments1[best].start + segments1[best].end) / 2 ? i : best, 0)
    const cy1 = totalH - lengthPx + (segments1[idxLeft1].start + segments1[idxLeft1].end) / 2 * px
    const y2Bar = segHorLineY + 20 + tier2[idxBarLeft] * TIER_OFFSET
    const labelX1 = segVertLeftX - 20 - tier1[idxLeft1] * TIER_OFFSET
    if (cxBar - LABEL_HALF < labelX1 + 8 && cxBar + LABEL_HALF > labelX1 - 8 && Math.abs(cy1 - y2Bar) < 2 * LABEL_HALF) {
      tier2[idxBarLeft] = 1
      tier1[idxLeft1] = 1
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault()
      const o = openings[index]
      if (!o || !svgRef.current) return
      const wall = (o.wall ?? 1) as 1 | 2 | 3
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
      const startCursorAlongWall =
        wall === 1
          ? (contentY - (totalH - lengthPx)) / px
          : wall === 2
            ? (contentX - tPx) / px
            : (contentY - (totalH - thirdPx)) / px
      dragRef.current = { index, startX: e.clientX, startY: e.clientY, startOffset, wall, startCursorAlongWall }
      setDragState({ index, wall, offset: startOffset })
      ;(e.target as SVGElement).setPointerCapture?.(e.pointerId)
    },
    [openings, ox, oy, totalH, lengthPx, thirdPx, tPx, px, GRID_MARGIN_PX]
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
      const onWall1 = contentX >= 0 && contentX <= tPx && contentY >= totalH - lengthPx && contentY <= totalH
      const onWall2 = contentX >= tPx && contentX <= widthPx - tPx && contentY >= totalH - tPx && contentY <= totalH
      const onWall3 = contentX >= widthPx - tPx && contentX <= widthPx && contentY >= totalH - thirdPx && contentY <= totalH
      let newWall: 1 | 2 | 3
      let newOffset: number
      const curWall = dragRef.current.wall
      const startOffset = dragRef.current.startOffset
      const startCursorAlongWall = dragRef.current.startCursorAlongWall
      const gripOffset = startCursorAlongWall - startOffset
      const curCursor1 = (contentY - (totalH - lengthPx)) / px
      const curCursor2 = (contentX - tPx) / px
      const curCursor3 = (contentY - (totalH - thirdPx)) / px
      if (onWall1 && onWall2) {
        newWall = curWall === 1 || curWall === 2 ? curWall : 2
        if (newWall === 1) newOffset = Math.max(0, Math.min(maxOffset1, curCursor1 - gripOffset))
        else newOffset = Math.max(0, Math.min(maxOffset2, curCursor2 - gripOffset))
      } else if (onWall2 && onWall3) {
        newWall = curWall === 2 || curWall === 3 ? curWall : 2
        if (newWall === 2) newOffset = Math.max(0, Math.min(maxOffset2, curCursor2 - gripOffset))
        else newOffset = Math.max(0, Math.min(maxOffset3, curCursor3 - gripOffset))
      } else if (onWall1) {
        newWall = 1
        newOffset = Math.max(0, Math.min(maxOffset1, curCursor1 - gripOffset))
      } else if (onWall2) {
        newWall = 2
        newOffset = Math.max(0, Math.min(maxOffset2, curCursor2 - gripOffset))
      } else if (onWall3) {
        newWall = 3
        newOffset = Math.max(0, Math.min(maxOffset3, curCursor3 - gripOffset))
      } else {
        return
      }
      if (newWall !== curWall) {
        dragRef.current.startCursorAlongWall = newWall === 1 ? curCursor1 : newWall === 2 ? curCursor2 : curCursor3
        dragRef.current.startOffset = newOffset
      }
      dragRef.current.wall = newWall
      const next = [...openings]
      const opening = next[index]
      if (opening) next[index] = { ...opening, wall: newWall, offset: newOffset }
      openingsRef.current = next
      setDragState((prev) => (prev && prev.index === index ? { ...prev, wall: newWall, offset: newOffset } : prev))
    },
    [openings, ox, oy, totalH, lengthPx, thirdPx, tPx, widthPx, px, maxOffset1, maxOffset2, maxOffset3, GRID_MARGIN_PX]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      ;(e.target as SVGElement).releasePointerCapture?.(e.pointerId)
      if (dragRef.current) {
        setOpenings(openingsRef.current)
        onOpeningsChange?.(openingsRef.current)
        dragRef.current = null
        setDragState(null)
      }
    },
    [onOpeningsChange]
  )

  const handleClose = () => {
    if (!embedOnly && onOpeningsChange) onOpeningsChange(openingsRef.current)
    setDragState(null)
    onClose()
  }

  if (hasNoDimensions && !embedOnly) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
          <button type="button" onClick={handleClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Введите параметры стен (левую, заднюю и правую стороны), чтобы отобразить план.</p>
        </div>
      </div>
    )
  }

  if (t >= length || t >= width || t >= third) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
        <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
          <button type="button" onClick={handleClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
            Закрыть
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-stone-600">Визуализация недоступна: толщина стены не может быть больше левой, задней или правой стороны.</p>
        </div>
      </div>
    )
  }

  const content = (
      <div className={embedOnly ? 'bg-white p-4' : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4'} style={embedOnly ? { width: 800 } : undefined} data-pdf-plan={embedOnly ? 'walls' : undefined}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="block w-full max-w-full h-auto rounded-lg border border-stone-200 bg-white shadow-sm"
          preserveAspectRatio="xMidYMid meet"
          style={!embedOnly ? { touchAction: 'none' } : undefined}
          onPointerMove={embedOnly ? undefined : handlePointerMove}
          onPointerUp={embedOnly ? undefined : handlePointerUp}
          onPointerLeave={embedOnly ? undefined : handlePointerUp}
        >
          <defs>
            <pattern id="grid-w3" width={GRID_CELL_PX} height={GRID_CELL_PX} patternUnits="userSpaceOnUse">
              <path d={`M ${GRID_CELL_PX} 0 L ${GRID_CELL_PX} ${GRID_CELL_PX} M 0 ${GRID_CELL_PX} L ${GRID_CELL_PX} ${GRID_CELL_PX}`} fill="none" stroke="#e7e5e4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={gridW} height={gridH} fill="url(#grid-w3)" stroke="#d6d3d1" strokeWidth="1" />
            <g transform={`translate(${GRID_MARGIN_PX}, ${GRID_MARGIN_PX})`}>
              <path d={stripPath} fillRule="evenodd" fill="rgba(250,250,249,0.85)" stroke="none" />
              <path d={innerPath} fill="url(#grid-w3)" stroke="none" />
              <path d={leftLegGridPath} fill="url(#grid-w3)" stroke="none" />
              <path d={rightLegGridPath} fill="url(#grid-w3)" stroke="none" />
              <path d={strokePath} fillRule="evenodd" fill="none" stroke="#57534e" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="butt" />

              {/* Проёмы: как в 2 стенах — перетаскивание вдоль стен, onOpeningsChange при отпускании */}
              {effectiveOpenings.map((o, i) => {
                const wall = (o.wall ?? 1) as 1 | 2 | 3
                const offset = o.offset ?? 0
                const ow = o.width ?? 0.9
                const wPx = ow * px
                if (wall === 1) {
                  const effW = Math.max(0, Math.min(ow, usable1 - offset))
                  const offPx = offset * px
                  const y = totalH - lengthPx + offPx
                  const hPx = effW > 0 ? effW * px : 4
                  const yDraw = effW > 0 ? y : totalH - lengthPx + usable1 * px - 2
                  const hitX = 0
                  const hitY = Math.max(totalH - lengthPx, yDraw - TOUCH_HIT_PADDING)
                  const hitW = Math.min(widthPx, tPx + 2 * TOUCH_HIT_PADDING)
                  const hitH = Math.min(totalH - hitY, hPx + 2 * TOUCH_HIT_PADDING)
                  return (
                    <g key={i}>
                      <rect x={0} y={yDraw} width={tPx} height={hPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <rect x={hitX} y={hitY} width={hitW} height={hitH} fill="transparent" cursor={embedOnly ? 'default' : 'grab'} onPointerDown={embedOnly ? undefined : (ev) => handlePointerDown(ev, i)} />
                      <text x={tPx / 2} y={yDraw + hPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10} pointerEvents="none">{effW > 0 ? fmtRu(effW) + ' м' : ''}</text>
                    </g>
                  )
                }
                if (wall === 2) {
                  const maxBarOpening = barUsableLen
                  const effW = ow >= maxBarOpening
                    ? maxBarOpening
                    : Math.max(0, Math.min(offset + ow, barUsableEnd) - Math.max(offset, barUsableStart))
                  const effStart = ow >= maxBarOpening ? barUsableStart : Math.max(offset, barUsableStart)
                  const xPx = tPx + effStart * px
                  const wPxDraw = effW > 0 ? effW * px : 4
                  const xDraw = effW > 0 ? xPx : (offset + ow <= barUsableStart ? tPx : widthPx - tPx - 4)
                  const hitX = Math.max(tPx, xDraw - TOUCH_HIT_PADDING)
                  const hitY = Math.max(0, totalH - tPx - TOUCH_HIT_PADDING)
                  const hitW = Math.min(widthPx - hitX, wPxDraw + 2 * TOUCH_HIT_PADDING)
                  const hitH = Math.min(totalH - hitY, tPx + 2 * TOUCH_HIT_PADDING)
                  return (
                    <g key={i}>
                      <rect x={xDraw} y={totalH - tPx} width={wPxDraw} height={tPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <rect x={hitX} y={hitY} width={hitW} height={hitH} fill="transparent" cursor={embedOnly ? 'default' : 'grab'} onPointerDown={embedOnly ? undefined : (ev) => handlePointerDown(ev, i)} />
                      <text x={xDraw + wPxDraw / 2} y={totalH - tPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10} pointerEvents="none">{effW > 0 ? fmtRu(effW) + ' м' : ''}</text>
                    </g>
                  )
                }
                {
                  const effW = Math.max(0, Math.min(ow, usable3 - offset))
                  const offPx = offset * px
                  const y = totalH - thirdPx + offPx
                  const hPx = effW > 0 ? effW * px : 4
                  const yDraw = effW > 0 ? y : totalH - thirdPx + usable3 * px - 2
                  const hitX = Math.max(widthPx - tPx - TOUCH_HIT_PADDING, 0)
                  const hitY = Math.max(totalH - thirdPx, yDraw - TOUCH_HIT_PADDING)
                  const hitW = Math.min(widthPx - hitX, tPx + 2 * TOUCH_HIT_PADDING)
                  const hitH = Math.min(totalH - hitY, hPx + 2 * TOUCH_HIT_PADDING)
                  return (
                    <g key={i}>
                      <rect x={widthPx - tPx} y={yDraw} width={tPx} height={hPx} fill="#fafaf9" stroke="#57534e" strokeWidth="1.5" />
                      <rect x={hitX} y={hitY} width={hitW} height={hitH} fill="transparent" cursor={embedOnly ? 'default' : 'grab'} onPointerDown={embedOnly ? undefined : (ev) => handlePointerDown(ev, i)} />
                      <text x={widthPx - tPx / 2} y={yDraw + hPx / 2} textAnchor="middle" dominantBaseline="middle" fill="#292524" fontSize={10} pointerEvents="none">{effW > 0 ? fmtRu(effW) + ' м' : ''}</text>
                    </g>
                  )
                }
              })}

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
              <g fill="none" stroke="#44403c" strokeWidth="1" fontSize={fontSz} fontFamily="system-ui, sans-serif" aria-label="Размеры сегментов">
                {wall1Openings.length > 0 && segments1.map((seg, i) => {
                  const y0 = totalH - lengthPx + seg.start * px
                  const y1 = totalH - lengthPx + seg.end * px
                  const labelX = segVertLeftX - 20 - tier1[i] * TIER_OFFSET
                  const labelY = totalH - lengthPx + (seg.start + seg.end) / 2 * px
                  return (
                    <g key={`w1-${i}`}>
                      <path d={`M ${segVertLeftX - tick45} ${y0 - tick45} L ${segVertLeftX + tick45} ${y0 + tick45} M ${segVertLeftX - tick45} ${y1 - tick45} L ${segVertLeftX + tick45} ${y1 + tick45} M ${segVertLeftX} ${y0} L ${segVertLeftX} ${y1}`} />
                      <text x={labelX} y={labelY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${labelX}, ${labelY})`}>{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall2Openings.length > 0 && segments2.map((seg, i) => {
                  const x0 = seg.start * px
                  const x1 = seg.end * px
                  return (
                    <g key={`w2-${i}`}>
                      <path d={`M ${x0 - tick45} ${segHorLineY + tick45} L ${x0 + tick45} ${segHorLineY - tick45} M ${x1 - tick45} ${segHorLineY + tick45} L ${x1 + tick45} ${segHorLineY - tick45} M ${x0} ${segHorLineY} L ${x1} ${segHorLineY}`} />
                      <text x={(seg.start + seg.end) / 2 * px} y={segHorLineY + 20 + tier2[i] * TIER_OFFSET} textAnchor="middle" fill="#292524">{fmtRu(seg.length)} м</text>
                    </g>
                  )
                })}
                {wall3Openings.length > 0 && segments3.map((seg, i) => {
                  const y0 = totalH - thirdPx + seg.start * px
                  const y1 = totalH - thirdPx + seg.end * px
                  const labelX = segVertRightX + 20 + tier3[i] * TIER_OFFSET
                  const labelY = totalH - thirdPx + (seg.start + seg.end) / 2 * px
                  return (
                    <g key={`w3-${i}`}>
                      <path d={`M ${segVertRightX - tick45} ${y0 - tick45} L ${segVertRightX + tick45} ${y0 + tick45} M ${segVertRightX - tick45} ${y1 - tick45} L ${segVertRightX + tick45} ${y1 + tick45} M ${segVertRightX} ${y0} L ${segVertRightX} ${y1}`} />
                      <text x={labelX} y={labelY} textAnchor="middle" fill="#292524" transform={`rotate(-90, ${labelX}, ${labelY})`}>{fmtRu(seg.length)} м</text>
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
        {!embedOnly && <p className="mt-3 text-center text-sm text-stone-500">1 клетка = 0,5 м · П-образные стены · наружная и внутренняя грани · перетаскивайте проёмы вдоль стен</p>}
      </div>
  )
  if (embedOnly) return content

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 pt-safe" style={{ paddingTop: 'max(var(--safe-top), 24px)' }}>
      <header className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-800">Стены — план</h2>
        <button type="button" onClick={handleClose} className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-300">
          Закрыть
        </button>
      </header>
      {content}
    </div>
  )
}
