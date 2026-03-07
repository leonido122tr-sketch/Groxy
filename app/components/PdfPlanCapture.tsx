'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DetailPlanFoundationWalls2 } from '@/app/components/DetailPlanFoundationWalls2'
import { DetailPlanWallsWalls2 } from '@/app/components/DetailPlanWallsWalls2'
import { DetailPlanRoofWalls2 } from '@/app/components/DetailPlanRoofWalls2'
import { DetailPlanFoundationWalls3 } from '@/app/components/DetailPlanFoundationWalls3'
import { DetailPlanWallsWalls3 } from '@/app/components/DetailPlanWallsWalls3'
import { DetailPlanRoofWalls3 } from '@/app/components/DetailPlanRoofWalls3'
import { DetailPlanFoundationWalls4 } from '@/app/components/DetailPlanFoundationWalls4'
import { DetailPlanWallsWalls4 } from '@/app/components/DetailPlanWallsWalls4'
import { DetailPlanRoofWalls4 } from '@/app/components/DetailPlanRoofWalls4'
import type { LocalProject } from '@/lib/projects/localProjects'
import type { PlanImages } from '@/lib/pdf/generatePdfClient'

const CAPTURE_DELAY_MS = 700

type PdfPayload = Parameters<typeof import('@/lib/pdf/generatePdfClient').generatePdfClient>[0]
/** Payload с стенами (для capture всегда есть стены и openings) */
type PdfPayloadWithWalls = Extract<PdfPayload, { openings: unknown }>

function buildProjectFromPayload(type: 'walls_2' | 'walls_3' | 'walls_4', payload: PdfPayload): Extract<LocalProject, { type: 'walls_2' }> | Extract<LocalProject, { type: 'walls_3' }> | Extract<LocalProject, { type: 'walls_4' }> {
  const base = { id: '', name: '', createdAt: '', updatedAt: '' }
  if (type === 'walls_2') {
    const d = (payload as { dims: { width: number; length: number; height: number; thickness: number }; openings?: Array<{ width: number; height: number; offset?: number; wall?: number }>; materialLabel?: string; principleLabel?: string })
    const dims = d.dims ?? { width: 5, length: 5, height: 2.5, thickness: 0.25 }
    return {
      ...base,
      type: 'walls_2',
      data: {
        principle: d.principleLabel === 'Снаружи' ? 'outside' : 'inside',
        material: d.materialLabel ?? '',
        width: dims.width,
        length: dims.length,
        height: dims.height,
        thickness: dims.thickness,
        openings: (d.openings ?? []).map((o, i) => ({ width: o.width, height: o.height, wall: (o.wall != null ? o.wall : 1) as 1 | 2, offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : i * 0.5 })),
      },
    }
  }
  if (type === 'walls_3') {
    const d = (payload as { dims: { left: number; back: number; right: number; height: number; thickness: number }; openings?: Array<{ width: number; height: number; offset?: number; wall?: number }>; materialLabel?: string; principleLabel?: string })
    const dims = d.dims ?? { left: 3, back: 5, right: 3, height: 2.5, thickness: 0.25 }
    return {
      ...base,
      type: 'walls_3',
      data: {
        principle: d.principleLabel === 'Снаружи' ? 'outside' : 'inside',
        material: d.materialLabel ?? '',
        left: dims.left,
        back: dims.back,
        right: dims.right,
        height: dims.height,
        thickness: dims.thickness,
        openings: (d.openings ?? []).map((o, i) => ({ width: o.width, height: o.height, wall: (o.wall != null ? o.wall : 1) as 1 | 2 | 3, offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : i * 0.5 })),
      },
    }
  }
  const d = (payload as { dims: { width: number; length: number; height: number; thickness: number }; openings?: Array<{ width: number; height: number; offset?: number; wall?: number }>; materialLabel?: string; principleLabel?: string })
  const dims = d.dims ?? { width: 5, length: 5, height: 2.5, thickness: 0.25 }
  return {
    ...base,
    type: 'walls_4',
    data: {
      principle: d.principleLabel === 'Снаружи' ? 'outside' : 'inside',
      material: d.materialLabel ?? '',
      width: dims.width,
      length: dims.length,
      height: dims.height,
      thickness: dims.thickness,
      openings: (d.openings ?? []).map((o, i) => ({ width: o.width, height: o.height, wall: (o.wall != null ? o.wall : 1) as 1 | 2 | 3 | 4, offset: typeof o.offset === 'number' && Number.isFinite(o.offset) ? o.offset : i * 0.5 })),
    },
  }
}

function PdfPlanCaptureInner({
  type,
  payload,
  onComplete,
}: {
  type: 'walls_2' | 'walls_3' | 'walls_4'
  payload: PdfPayload
  onComplete: (bytes: Uint8Array) => void
}) {
  const foundation = payload.foundation
  const roof = payload.roof
  const [project, setProject] = useState(() => buildProjectFromPayload(type, payload))

  const onOpeningsChange = useCallback((nextOpenings: Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }>) => {
    setProject((prev) => ({
      ...prev,
      data: { ...prev.data, openings: nextOpenings },
    } as Extract<LocalProject, { type: typeof prev.type }>))
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const foundationEl = document.querySelector('[data-pdf-plan="foundation"]')
        const wallsEl = document.querySelector('[data-pdf-plan="walls"]')
        const roofEl = document.querySelector('[data-pdf-plan="roof"]')
        const { toPng } = await import('html-to-image')
        const planImages: PlanImages = {}
        if (foundationEl) planImages.foundation = await toPng(foundationEl as HTMLElement, { pixelRatio: 2 })
        if (wallsEl) planImages.walls = await toPng(wallsEl as HTMLElement, { pixelRatio: 2 })
        if (roofEl) planImages.roof = await toPng(roofEl as HTMLElement, { pixelRatio: 2 })
        const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
        const openingsForPdf = Array.isArray(project.data.openings) ? project.data.openings.map((o) => ({
          width: o.width,
          height: o.height,
          ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
          ...(o.wall != null ? { wall: o.wall } : {}),
        })) : ((payload as { openings?: Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }> }).openings ?? [])
        const pdfPayload: PdfPayloadWithWalls = { ...payload, openings: openingsForPdf, planImages } as PdfPayloadWithWalls
        const pdfBytes = await generatePdfClient(pdfPayload)
        onComplete(pdfBytes)
      } catch (e) {
        console.warn('PDF plan capture failed, falling back to simple plan', e)
        try {
          const { generatePdfClient } = await import('@/lib/pdf/generatePdfClient')
          const openingsForPdf = Array.isArray(project.data.openings) ? project.data.openings.map((o) => ({
            width: o.width,
            height: o.height,
            ...(typeof o.offset === 'number' && Number.isFinite(o.offset) ? { offset: o.offset } : {}),
            ...(o.wall != null ? { wall: o.wall } : {}),
          })) : ((payload as { openings?: Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }> }).openings ?? [])
          const pdfPayloadFallback: PdfPayloadWithWalls = { ...payload, openings: openingsForPdf } as PdfPayloadWithWalls
          const pdfBytes = await generatePdfClient(pdfPayloadFallback)
          onComplete(pdfBytes)
        } catch {
          onComplete(new Uint8Array(0))
        }
      }
    }, CAPTURE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [payload, onComplete, project])

  const noop = () => {}
  return (
    <div className="flex flex-col gap-4 bg-stone-100 p-4" style={{ width: 820 }}>
      {type === 'walls_2' && (
        <>
          {foundation && typeof foundation === 'object' && 'width' in foundation ? (
            <DetailPlanFoundationWalls2
              width={Number((foundation as { width?: number }).width) || 5}
              length={Number((foundation as { length?: number }).length) || 5}
              thickness={Number((foundation as { thickness?: number }).thickness) ?? 0.25}
              principle={(foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
              embedOnly
              onClose={noop}
            />
          ) : null}
          <DetailPlanWallsWalls2 project={project as Extract<LocalProject, { type: 'walls_2' }>} embedOnly onClose={noop} onOpeningsChange={onOpeningsChange} />
          {roof && typeof roof === 'object' && 'width' in roof ? (
            <DetailPlanRoofWalls2
              width={Number((roof as { width?: number }).width) || 5}
              length={Number((roof as { length?: number }).length) || 5}
              overhang={Number((roof as { overhang?: number }).overhang) ?? 0.4}
              height={Number((roof as { height?: number }).height) ?? 0.5}
              slopeToward={Number((roof as { slopeToward?: number }).slopeToward) === 1 ? 1 : 0}
              embedOnly
              onClose={noop}
            />
          ) : null}
        </>
      )}
      {type === 'walls_3' && (
        <>
          {foundation && typeof foundation === 'object' && 'left' in foundation ? (
            <DetailPlanFoundationWalls3
              left={Number((foundation as { left?: number }).left) || 3}
              back={Number((foundation as { back?: number }).back) || 5}
              right={Number((foundation as { right?: number }).right) || 3}
              thickness={Number((foundation as { thickness?: number }).thickness) ?? 0.25}
              principle={(foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
              embedOnly
              onClose={noop}
            />
          ) : null}
          <DetailPlanWallsWalls3 project={project as Extract<LocalProject, { type: 'walls_3' }>} embedOnly onClose={noop} onOpeningsChange={onOpeningsChange} />
          {roof && typeof roof === 'object' && 'left' in roof ? (
            <DetailPlanRoofWalls3
              left={Number((roof as { left?: number }).left) || 3}
              back={Number((roof as { back?: number }).back) || 5}
              right={Number((roof as { right?: number }).right) || 3}
              overhang={Number((roof as { overhang?: number }).overhang) ?? 0.4}
              height={Number((roof as { height?: number }).height) ?? 0.5}
              embedOnly
              onClose={noop}
            />
          ) : null}
        </>
      )}
      {type === 'walls_4' && (
        <>
          {foundation && typeof foundation === 'object' && 'width' in foundation ? (
            <DetailPlanFoundationWalls4
              width={Number((foundation as { width?: number }).width) || 5}
              length={Number((foundation as { length?: number }).length) || 5}
              thickness={Number((foundation as { thickness?: number }).thickness) ?? 0.25}
              principle={(foundation as { principle?: 'inside' | 'outside' })?.principle === 'outside' ? 'outside' : 'inside'}
              embedOnly
              onClose={noop}
            />
          ) : null}
          <DetailPlanWallsWalls4 project={project as Extract<LocalProject, { type: 'walls_4' }>} embedOnly onClose={noop} onOpeningsChange={onOpeningsChange} />
          {roof && typeof roof === 'object' && 'width' in roof ? (
            <DetailPlanRoofWalls4
              width={Number((roof as { width?: number }).width) || 5}
              length={Number((roof as { length?: number }).length) || 5}
              overhang={Number((roof as { overhang?: number }).overhang) ?? 0.4}
              height={Number((roof as { height?: number }).height) ?? 0.5}
              roofType={((roof as { type?: string }).type === 'gable' ? 'gable' : 'single') as 'single' | 'gable'}
              ridgeAlongLength={typeof (roof as unknown as { ridgeAlongLength?: boolean }).ridgeAlongLength === 'boolean' ? (roof as unknown as { ridgeAlongLength: boolean }).ridgeAlongLength : true}
              embedOnly
              onClose={noop}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

/**
 * Генерирует PDF с большой визуализацией (планы фундамента, стен, крыши).
 * Монтирует скрытый контейнер с DetailPlan-компонентами, захватывает их в PNG и передаёт в generatePdfClient.
 */
export async function generatePdfWithPlanCapture(
  type: 'walls_2' | 'walls_3' | 'walls_4',
  payload: PdfPayload
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const div = document.createElement('div')
    div.setAttribute('aria-hidden', 'true')
    div.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none;'
    document.body.appendChild(div)
    const root = createRoot(div)
    const onComplete = (bytes: Uint8Array) => {
      try {
        root.unmount()
        if (div.parentNode) document.body.removeChild(div)
      } catch {
        // ignore
      }
      resolve(bytes)
    }
    root.render(
      <PdfPlanCaptureInner
        type={type}
        payload={payload}
        onComplete={onComplete}
      />
    )
  })
}
