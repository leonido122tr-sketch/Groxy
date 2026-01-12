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

  // Prefer Noto Sans (has Cyrillic). Fall back to Roboto if needed.
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

  // Mini visualization: точно как в проекте (2 стены)
  const vizX = margin
  const vizW = 595.28 - margin * 2
  const vizH = 140
  const vizY = y - vizH

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

  const width = Number.isFinite(body.dims?.width) ? body.dims.width : 0
  const length = Number.isFinite(body.dims?.length) ? body.dims.length : 0

  const svgW = 200
  const svgH = 120
  const svgScale = Math.min((vizW - 24) / svgW, (vizH - 24) / svgH)
  const boxX = vizX + (vizW - svgW * svgScale) / 2
  const boxY = vizY + (vizH - svgH * svgScale) / 2
  const toPdfX = (x: number) => boxX + x * svgScale
  const toPdfY = (yTop: number) => boxY + (svgH - yTop) * svgScale

  const w = width || 1
  const l = length || 1
  const scale = 60 / Math.max(w, l, 1)
  const wPx = w * scale
  const lPx = l * scale
  const x0 = 10
  const y0 = 78
  const thickPx = 4
  const xV = x0 + wPx - thickPx
  const yV = y0 - lPx + thickPx

  // Фон SVG (белый, как было раньше)
  page.drawRectangle({
    x: toPdfX(0),
    y: toPdfY(svgH),
    width: svgW * svgScale,
    height: svgH * svgScale,
    color: rgb(0.98, 0.98, 0.98),
  })

  // walls - все активные (яркие)
  const activeFill = rgb(0.23, 0.51, 0.96) // #3b82f6
  const activeStroke = rgb(0.15, 0.39, 0.92) // #2563eb

  // Горизонтальная стена (width) - точно как в проекте: y={y0}
  page.drawRectangle({
    x: toPdfX(x0),
    y: toPdfY(y0 + thickPx),
    width: wPx * svgScale,
    height: thickPx * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // Вертикальная стена (length) - точно как в проекте: y={yV}
  page.drawRectangle({
    x: toPdfX(xV),
    y: toPdfY(yV + lPx),
    width: thickPx * svgScale,
    height: lPx * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // Labels - точно как в проекте
  const widthLabel = `${fmt2ru(width)}м` // без пробела перед "м", как в проекте
  const lengthLabel = `${fmt2ru(length)}м`
  
  const fontSize = 14
  // Высота текста в PDF (примерно 0.8 от размера шрифта для большинства шрифтов)
  const textHeight = fontSize * 0.8

  // width label - горизонтальный текст под горизонтальной стеной, параллелен стене
  // В проекте: x={x0 + wPx / 2} (центр стены), y={96}
  // textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
  page.drawText(widthLabel, {
    x: toPdfX(x0 + wPx / 2) - widthTextWidth / 2, // центрирование по x (середина стены)
    y: toPdfY(96) + textHeight / 2, // центрирование по y
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
  })

  // length label rotated - вертикальный текст справа от вертикальной стены, параллелен стене
  // В проекте: x={xV + 18}, y={yV + lPx / 2} (центр стены по высоте)
  // В SVG: textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  const lengthTextWidth = font.widthOfTextAtSize(lengthLabel, fontSize)
  const lengthLabelCenterX = toPdfX(xV + 18) // желаемый центр по x после поворота
  const lengthLabelCenterY = toPdfY(yV + lPx / 2) // желаемый центр по y после поворота (центр стены)
  const centerToBaselineOffset = fontSize * 0.375 // смещение от центра текста до baseline
  page.drawText(lengthLabel, {
    x: lengthLabelCenterX - centerToBaselineOffset, // сдвиг для центрирования после поворота
    y: lengthLabelCenterY + lengthTextWidth / 2, // сдвиг для центрирования после поворота
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
    rotate: degrees(-90),
  })

  // Move cursor below viz
  y = vizY - 18

  // Use plain units in PDF for maximum compatibility in mobile viewers.
  const lines: string[] = [
    `Материал: ${body.materialLabel || 'Не выбран'}`,
    `Принцип расчёта: ${body.principleLabel || ''}`,
    '',
    `Ширина: ${fmt2(body.dims?.width)} м`,
    `Длина: ${fmt2(body.dims?.length)} м`,
    `Высота: ${fmt2(body.dims?.height)} м`,
    `Толщина: ${fmt2(body.dims?.thickness)} м`,
    '',
    `Площадь: ${fmt2(body.results?.area)} м2`,
    `Объём: ${fmt2(body.results?.volume)} м3`,
  ]

  const openings = Array.isArray(body.openings) ? body.openings : []
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

  // Footer
  page.drawLine({
    start: { x: margin, y: 40 },
    end: { x: 595.28 - margin, y: 40 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  page.drawText('Groxy', { x: margin, y: 22, size: 10, font, color: rgb(0.35, 0.35, 0.35) })

  const bytes = await doc.save()
  const buf = Buffer.from(bytes)
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      // ASCII filename to avoid header encoding issues
      'Content-Disposition': 'attachment; filename="project.pdf"',
      'Cache-Control': 'no-store',
      'Content-Length': String(buf.byteLength),
    },
  })
}


