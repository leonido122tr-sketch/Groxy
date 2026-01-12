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
  dims: { left: number; back: number; right: number; height: number; thickness: number }
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

  // Mini visualization (U-shape: left/back/right) - точно как в проекте
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

  const svgW = 200
  const svgH = 120
  const svgScale = Math.min((vizW - 24) / svgW, (vizH - 24) / svgH)
  const boxX = vizX + (vizW - svgW * svgScale) / 2
  const boxY = vizY + (vizH - svgH * svgScale) / 2
  const toPdfX = (x: number) => boxX + x * svgScale
  const toPdfY = (yTop: number) => boxY + (svgH - yTop) * svgScale

  const left = Number.isFinite(body.dims?.left) ? body.dims.left : 0
  const back = Number.isFinite(body.dims?.back) ? body.dims.back : 0
  const right = Number.isFinite(body.dims?.right) ? body.dims.right : 0

  const l = left || 1
  const b = back || 1
  const r = right || 1
  const scale = 60 / Math.max(l, b, r, 1)
  const lPx = l * scale
  const bPx = b * scale
  const rPx = r * scale
  const thick = 4
  const LABEL_OFFSET = 18

  // U-shape placement - точно как в проекте
  const x0 = 40
  const yTop = 28

  // walls: left vertical, back horizontal, right vertical
  const leftX = x0
  const backY = yTop
  const rightX = x0 + bPx - thick

  const leftY = backY + thick
  const rightY = backY + thick

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

  // back (top)
  page.drawRectangle({
    x: toPdfX(x0),
    y: toPdfY(backY + thick),
    width: bPx * svgScale,
    height: thick * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // left
  page.drawRectangle({
    x: toPdfX(leftX),
    y: toPdfY(leftY + lPx),
    width: thick * svgScale,
    height: lPx * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // right
  page.drawRectangle({
    x: toPdfX(rightX),
    y: toPdfY(rightY + rPx),
    width: thick * svgScale,
    height: rPx * svgScale,
    color: activeFill,
    borderColor: activeStroke,
    borderWidth: 1,
  })

  // Labels - точно как в проекте
  const leftLabel = `${fmt2ru(left)} м`
  const backLabel = `${fmt2ru(back)} м`
  const rightLabel = `${fmt2ru(right)} м`
  
  const fontSize = 14
  // Высота текста в PDF (примерно 0.8 от размера шрифта для большинства шрифтов)
  const textHeight = fontSize * 0.8

  // back label - горизонтальный текст над горизонтальной стеной, параллелен стене
  // В проекте: x={x0 + bPx / 2} (центр стены), y={Math.max(12, backY - LABEL_OFFSET)} (над стеной)
  const backTextWidth = font.widthOfTextAtSize(backLabel, fontSize)
  page.drawText(backLabel, {
    x: toPdfX(x0 + bPx / 2) - backTextWidth / 2, // центрирование по x (середина стены)
    y: toPdfY(Math.max(12, backY - LABEL_OFFSET)) + textHeight / 2, // центрирование по y
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
  })

  // left label (rotated) - вертикальный текст слева от левой стены, параллелен стене
  // В проекте: x={leftX - LABEL_OFFSET}, y={leftY + lPx / 2} (центр стены по высоте)
  // В SVG: textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  const leftTextWidth = font.widthOfTextAtSize(leftLabel, fontSize)
  const leftLabelCenterX = toPdfX(leftX - LABEL_OFFSET) // желаемый центр по x после поворота
  const leftLabelCenterY = toPdfY(leftY + lPx / 2) // желаемый центр по y после поворота (центр стены)
  const centerToBaselineOffset = fontSize * 0.375 // смещение от центра текста до baseline
  page.drawText(leftLabel, {
    x: leftLabelCenterX - centerToBaselineOffset, // сдвиг для центрирования после поворота
    y: leftLabelCenterY + leftTextWidth / 2, // сдвиг для центрирования после поворота
    size: fontSize,
    font,
    color: rgb(0.38, 0.65, 0.98), // #60a5fa
    rotate: degrees(-90),
  })

  // right label (rotated) - вертикальный текст справа от правой стены, параллелен стене
  // В проекте: x={rightX + thick + LABEL_OFFSET}, y={rightY + rPx / 2} (центр стены по высоте)
  // В SVG: textAnchor="middle" и dominantBaseline="middle" - центр текста в этой точке
  const rightTextWidth = font.widthOfTextAtSize(rightLabel, fontSize)
  const rightLabelCenterX = toPdfX(rightX + thick + LABEL_OFFSET) // желаемый центр по x после поворота
  const rightLabelCenterY = toPdfY(rightY + rPx / 2) // желаемый центр по y после поворота (центр стены)
  page.drawText(rightLabel, {
    x: rightLabelCenterX - centerToBaselineOffset, // сдвиг для центрирования после поворота
    y: rightLabelCenterY + rightTextWidth / 2, // сдвиг для центрирования после поворота
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
    `Левая стена: ${fmt2(left)} м`,
    `Задняя стена: ${fmt2(back)} м`,
    `Правая стена: ${fmt2(right)} м`,
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
      'Content-Disposition': 'attachment; filename="project.pdf"',
      'Cache-Control': 'no-store',
      'Content-Length': String(buf.byteLength),
    },
  })
}


