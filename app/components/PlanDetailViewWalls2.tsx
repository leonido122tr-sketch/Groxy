'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocalProject } from '@/lib/projects/localProjects'
import type { Opening } from '@/lib/projects/localProjects'

const PX_PER_M = 48
const GRID_STEP_M = 1
const DIMENSION_OFFSET = 28
const DIMENSION_FONT_SIZE = 12

function fmtRu(n: number) {
  return Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '0'
}

type Props = {
  project: Extract<LocalProject, { type: 'walls_2' }>
  onOpeningsChange?: (openings: Opening[]) => void
  onClose: () => void
}

export function PlanDetailViewWalls2({ project, onOpeningsChange, onClose }: Props) {
  const data = project.data
  const W = Math.max(0.1, Number(data.width) || 5)
  const L = Math.max(0.1, Number(data.length) || 5)
  const T = Math.max(0.05, Number(data.thickness) || 0.25)

  const [openings, setOpenings] = useState<Opening[]>(() => {
    const list = Array.isArray(data.openings) ? data.openings : []
    return list.map((o, i) => ({
      ...o,
      wall: o.wall ?? 1,
      offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : (i * 0.5),
    }))
  })

  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ index: number; startX: number; startY: number; startOffset: number; wall: 1 | 2 } | null>(null)
  const openingsRef = useRef(openings)
  useEffect(() => {
    openingsRef.current = openings
  }, [openings])

  const wall1Len = W
  const wall2Len = L

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.preventDefault()
      const o = openings[index]
      if (!o) return
      const wall = (o.wall ?? 1) as 1 | 2
      dragRef.current = {
        index,
        startX: e.clientX,
        startY: e.clientY,
        startOffset: o.offset ?? 0,
        wall,
      }
      ;(e.target as SVGElement).setPointerCapture?.(e.pointerId)
    },
    [openings]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !svgRef.current) return
      const { index, startX, startY, startOffset, wall } = dragRef.current
      const deltaPx = wall === 1 ? e.clientX - startX : startY - e.clientY
      const deltaM = deltaPx / PX_PER_M
      const newOffset = Math.max(0, Math.min((wall === 1 ? wall1Len : wall2Len) - (openings[index]?.width ?? 0), startOffset + deltaM))
      setOpenings((prev) => {
        const next = [...prev]
        const o = next[index]
        if (o) next[index] = { ...o, offset: newOffset, wall }
        return next
      })
    },
    [openings, wall1Len, wall2Len]
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

  const svgW = (W + T) * PX_PER_M + DIMENSION_OFFSET * 2 + 40
  const svgH = (L + T) * PX_PER_M + DIMENSION_OFFSET * 2 + 40
  const ox = DIMENSION_OFFSET + 20
  const oy = DIMENSION_OFFSET + 20

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f14]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">План (схема в масштабе)</h2>
        <button
          type="button"
          onClick={onClose}
          className="android-btn-secondary text-sm font-medium"
        >
          Закрыть
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <svg
          ref={svgRef}
          width={svgW}
          height={svgH}
          className="block"
          style={{ minWidth: svgW, minHeight: svgH }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern id="grid-walls2" width={PX_PER_M * GRID_STEP_M} height={PX_PER_M * GRID_STEP_M} patternUnits="userSpaceOnUse">
              <path d={`M ${PX_PER_M} 0 L ${PX_PER_M} ${PX_PER_M * GRID_STEP_M} M 0 ${PX_PER_M} L ${PX_PER_M * GRID_STEP_M} ${PX_PER_M}`} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <g transform={`translate(${ox}, ${oy})`}>
            <rect x={0} y={0} width={(W + T) * PX_PER_M} height={(L + T) * PX_PER_M} fill="url(#grid-walls2)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <g transform={`translate(0, ${(L + T) * PX_PER_M}) scale(1, -1)`}>
              <rect x={0} y={0} width={W * PX_PER_M} height={T * PX_PER_M} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              <rect x={(W - T) * PX_PER_M} y={T * PX_PER_M} width={T * PX_PER_M} height={L * PX_PER_M} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              {openings.map((o, i) => {
                const wall = (o.wall ?? 1) as 1 | 2
                const offset = o.offset ?? 0
                const ow = o.width ?? 0.9
                if (wall === 1) {
                  const x = offset * PX_PER_M
                  const y = 0
                  const w = ow * PX_PER_M
                  const h = T * PX_PER_M
                  if (x + w > W * PX_PER_M) return null
                  return (
                    <g key={i}>
                      <rect x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                      <rect x={x} y={y} width={w} height={h} fill="transparent" cursor="grab" onPointerDown={(ev) => handlePointerDown(ev, i)} />
                    </g>
                  )
                }
                const x = (W - T) * PX_PER_M
                const y = T * PX_PER_M + offset * PX_PER_M
                const w = T * PX_PER_M
                const h = ow * PX_PER_M
                if (y + h > (L + T) * PX_PER_M) return null
                return (
                  <g key={i}>
                    <rect x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                    <rect x={x} y={y} width={w} height={h} fill="transparent" cursor="grab" onPointerDown={(ev) => handlePointerDown(ev, i)} />
                  </g>
                )
              })}
            </g>
            <g fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1" fontSize={DIMENSION_FONT_SIZE} fontFamily="sans-serif">
              <path d={`M 0 ${(L + T) * PX_PER_M + 16} L 0 ${(L + T) * PX_PER_M + 24} M ${W * PX_PER_M} ${(L + T) * PX_PER_M + 16} L ${W * PX_PER_M} ${(L + T) * PX_PER_M + 24} M 0 ${(L + T) * PX_PER_M + 20} L ${W * PX_PER_M} ${(L + T) * PX_PER_M + 20}`} />
              <text x={(W * PX_PER_M) / 2} y={(L + T) * PX_PER_M + 38} textAnchor="middle" fill="rgba(255,255,255,0.9)">{fmtRu(W)} м</text>
              <path d={`M ${(W + T) * PX_PER_M + 16} ${(L + T) * PX_PER_M} L ${(W + T) * PX_PER_M + 24} ${(L + T) * PX_PER_M} M ${(W + T) * PX_PER_M + 16} ${T * PX_PER_M} L ${(W + T) * PX_PER_M + 24} ${T * PX_PER_M} M ${(W + T) * PX_PER_M + 20} ${(L + T) * PX_PER_M} L ${(W + T) * PX_PER_M + 20} ${T * PX_PER_M}`} />
              <text x={(W + T) * PX_PER_M + 38} y={T * PX_PER_M + (L * PX_PER_M) / 2} textAnchor="middle" fill="rgba(255,255,255,0.9)" transform={`rotate(-90, ${(W + T) * PX_PER_M + 38}, ${T * PX_PER_M + (L * PX_PER_M) / 2})`} style={{ transformOrigin: 'center' }}>{fmtRu(L)} м</text>
            </g>
          </g>
        </svg>
        <p className="mt-3 text-center text-xs text-zinc-500">1 клетка = 1 м · Перетаскивайте проёмы вдоль стен</p>
      </div>
    </div>
  )
}
