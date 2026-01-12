import { NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { degrees, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'

type Body = {
  title: string
  userName?: string
  includeMeta?: boolean
  materialLabel: string
  principleLabel: string
  dims: { width: number; length: number; height: number; thickness: number }
  results: { area: number; volume: number }
  openings: Array<{ width: number; height: number }>
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const includeMeta = body.includeMeta === true
  const resolvedUserName = includeMeta
    ? await (async () => {
        if (body.userName && body.userName.trim()) return body.userName.trim()
        try {
          const supabase = await createClient()
          const {
            data: { user },
          } = await supabase.auth.getUser()
          return user?.email ?? 'Пользователь'
        } catch {
          return 'Пользователь'
        }
      })()
    : null

  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const notoPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSans.ttf')
  const robotoPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf')
  let fontBytes: Buffer
  try {
    fontBytes = await readFile(notoPath)
  } catch {
    fontBytes = await readFile(robotoPath)
  }
  const font = await doc.embedFont(fontBytes, { subset: false })

  const page = doc.addPage([595.28, 841.89])
  const margin = 48
  let y = 841.89 - margin

  const title = (body.title || 'Проект строительства').toString()
  page.drawText(title, { x: margin, y, size: 20, font })
  y -= 28

  const fmt2 = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2)
  const fmt2ru = (n: number) => fmt2(n).replace('.', ',')

  if (includeMeta && resolvedUserName) {
    const now = new Date()
    const dateStr = now.toLocaleString('ru-RU')
    page.drawText(`Пользователь: ${resolvedUserName}`, { x: margin, y, size: 12, font })
    y -= 16
    page.drawText(`Дата: ${dateStr}`, { x: margin, y, size: 12, font })
    y -= 18
  }

  // Mini visualization: rectangle (4 walls) - идентично проекту
  // Убеждаемся, что визуализация находится в видимой области страницы
  const vizX = margin
  const vizW = 595.28 - margin * 2
  const vizH = 140
  const vizY = Math.max(margin, y - vizH) // Не позволяем визуализации выйти за пределы страницы
  
  // Внешний контейнер (белый фон с рамкой)
  page.drawRectangle({
    x: vizX,
    y: vizY,
    width: vizW,
    height: vizH,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: rgb(0.86, 0.86, 0.86),
    borderWidth: 1,
  })

  const svgW = 200
  const svgH = 120
  const svgScale = Math.min((vizW - 24) / svgW, (vizH - 24) / svgH)
  const boxX = vizX + (vizW - svgW * svgScale) / 2
  const boxY = vizY + (vizH - svgH * svgScale) / 2
  const toPdfX = (x: number) => boxX + x * svgScale
  const toPdfY = (yTop: number) => boxY + (svgH - yTop) * svgScale

  const width = Number.isFinite(body.dims?.width) ? body.dims.width : 0
  const length = Number.isFinite(body.dims?.length) ? body.dims.length : 0

  const w = width || 1
  const l = length || 1
  const scale = 60 / Math.max(w, l, 1)
  const wPx = w * scale
  const lPx = l * scale
  const thick = 4
  const LABEL_OFFSET = 18

  // Rectangle placement (derived from width/length) - точно как в проекте
  const x0 = 60
  const y0 = 26
  const rectW = wPx
  const rectH = lPx

  const leftX = x0
  const rightX = x0 + rectW - thick
  const topY = y0
  const bottomY = y0 + rectH - thick

  // Фон SVG (белый, как было раньше)
  page.drawRectangle({
    x: toPdfX(0),
    y: toPdfY(svgH),
    width: svgW * svgScale,
    height: svgH * svgScale,
    color: rgb(0.98, 0.98, 0.98),
  })

  // walls - все активные (яркие), как в проекте
  const activeFill = rgb(0.23, 0.51, 0.96) // #3b82f6
  const activeStroke = rgb(0.15, 0.39, 0.92) // #2563eb

  // length (top) - точно как в проекте: x={x0}, y={topY}
  // В SVG: rect рисуется от верхнего левого угла, y=topY - это верхний край
  // В PDF: drawRectangle рисуется от нижнего левого угла
  // Верхний край в SVG на topY -> нижний край в PDF на toPdfY(topY + thick)
  page.drawRectangle({
    x: toPdfX(x0),
    y: toPdfY(topY + thick),
    width: rectW * svgScale,
    height: thick * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // length (bottom) - точно как в проекте: x={x0}, y={bottomY}
  // Верхний край в SVG на bottomY -> нижний край в PDF на toPdfY(bottomY + thick)
  page.drawRectangle({
    x: toPdfX(x0),
    y: toPdfY(bottomY + thick),
    width: rectW * svgScale,
    height: thick * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // width (left) - точно как в проекте: x={leftX}, y={topY}
  // Верхний край в SVG на topY -> нижний край в PDF на toPdfY(topY + rectH)
  // Но rectH - это высота стены, так что нижний край на topY + rectH
  page.drawRectangle({
    x: toPdfX(leftX),
    y: toPdfY(topY + rectH),
    width: thick * svgScale,
    height: rectH * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // width (right) - точно как в проекте: x={rightX}, y={topY}
  // Верхний край в SVG на topY -> нижний край в PDF на toPdfY(topY + rectH)
  page.drawRectangle({
    x: toPdfX(rightX),
    y: toPdfY(topY + rectH),
    width: thick * svgScale,
    height: rectH * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // labels - точно как в проекте
  const widthLabel = `${fmt2ru(width)} м`
  const lengthLabel = `${fmt2ru(length)} м`
  
  const fontSize = 14
  // Высота текста в PDF (примерно 0.8 от размера шрифта для большинства шрифтов)
  const textHeight = fontSize * 0.8

  // length label above - горизонтальный текст над стеной, параллелен стене
  // В проекте: x={x0 + rectW / 2} (центр стены), y={Math.max(12, topY - LABEL_OFFSET)} (над стеной)
  // textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  const lengthTextWidth = font.widthOfTextAtSize(lengthLabel, fontSize)
  const lengthLabelX = toPdfX(x0 + rectW / 2) - lengthTextWidth / 2 // центрирование по x (середина стены)
  const lengthLabelY = toPdfY(Math.max(12, topY - LABEL_OFFSET)) + textHeight / 2 // центрирование по y
  page.drawText(lengthLabel, {
    x: lengthLabelX,
    y: lengthLabelY,
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
  })

  // width label (rotated, left) - вертикальный текст слева от стены, параллелен стене
  // В проекте: x={leftX - LABEL_OFFSET}, y={topY + rectH / 2} (центр стены по высоте)
  // В SVG: textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  // При повороте на -90: текст поворачивается вокруг этой точки
  // В PDF: при rotate текст рисуется от baseline, затем поворачивается вокруг (x, y)
  const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
  const widthLabelCenterX = toPdfX(leftX - LABEL_OFFSET) // желаемый центр по x после поворота
  const widthLabelCenterY = toPdfY(topY + rectH / 2) // желаемый центр по y после поворота (центр стены)
  
  // В PDF при повороте на -90 градусов:
  // Текст рисуется горизонтально от baseline в точке (x, y), затем поворачивается вокруг (x, y)
  // Baseline находится примерно на fontSize * 0.75 ниже верха текста для большинства шрифтов
  // Центр текста находится примерно на fontSize * 0.375 выше baseline
  // Чтобы центр текста был в (centerX, centerY) после поворота:
  // - До поворота: baseline в (centerX - fontSize * 0.375, centerY + textWidth/2)
  // - После поворота на -90: центр будет в (centerX, centerY)
  const centerToBaselineOffset = fontSize * 0.375 // смещение от центра текста до baseline
  page.drawText(widthLabel, {
    x: widthLabelCenterX - centerToBaselineOffset, // сдвиг для центрирования после поворота
    y: widthLabelCenterY + widthTextWidth / 2, // сдвиг для центрирования после поворота
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
    rotate: degrees(-90),
  })

  y = vizY - 18

  const openings = Array.isArray(body.openings) ? body.openings : []
  const lines: string[] = [
    `Материал: ${body.materialLabel || 'Не выбран'}`,
    `Принцип расчёта: ${body.principleLabel || ''}`,
    '',
    `Ширина: ${fmt2(width)} м`,
    `Длина: ${fmt2(length)} м`,
    `Высота: ${fmt2(body.dims?.height)} м`,
    `Толщина: ${fmt2(body.dims?.thickness)} м`,
    '',
    `Площадь: ${fmt2(body.results?.area)} м2`,
    `Объём: ${fmt2(body.results?.volume)} м3`,
  ]

  if (openings.length > 0) {
    lines.push('', `Проёмы (${openings.length}):`)
    openings.forEach((o, idx) => {
      lines.push(`Проём ${idx + 1}: Ширина ${fmt2(o.width)} м, Высота ${fmt2(o.height)} м`)
    })
  }

  for (const line of lines) {
    page.drawText(line, { x: margin, y, size: 12, font, color: rgb(0.1, 0.1, 0.1) })
    y -= 16
    if (y < margin) break
  }

  page.drawLine({ start: { x: margin, y: 40 }, end: { x: 595.28 - margin, y: 40 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  page.drawText('Groxy', { x: margin, y: 22, size: 10, font, color: rgb(0.35, 0.35, 0.35) })

  const bytes = await doc.save()
  const buf = Buffer.from(bytes)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=\"project.pdf\"',
      'Cache-Control': 'no-store',
      'Content-Length': String(buf.byteLength),
    },
  })
}


