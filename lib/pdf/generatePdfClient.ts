import { PDFDocument, rgb, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

type PdfData = {
  title: string
  includeMeta?: boolean
  materialLabel: string
  principleLabel: string
  dims: { width: number; length: number; height: number; thickness: number } | { left: number; back: number; right: number; height: number; thickness: number }
  results: { area: number; volume: number }
  openings: Array<{ width: number; height: number }>
  type: 'walls_2' | 'walls_3' | 'walls_4'
}

async function loadFont(): Promise<Uint8Array> {
  try {
    const response = await fetch('/fonts/NotoSans.ttf')
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    }
  } catch (e) {
    console.log('Не удалось загрузить NotoSans, используем Roboto')
  }
  
  const response = await fetch('/fonts/Roboto-Regular.ttf')
  if (!response.ok) {
    throw new Error('Не удалось загрузить шрифты')
  }
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

const fmt2 = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2)
const fmt2ru = (n: number) => fmt2(n).replace('.', ',')

export async function generatePdfClient(data: PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const fontBytes = await loadFont()
  // Используем subset: false чтобы все символы (русские и английские) корректно отображались
  const font = await doc.embedFont(fontBytes, { subset: false })

  const page = doc.addPage([595.28, 841.89])
  const margin = 50
  const pageWidth = 595.28
  const pageHeight = 841.89
  let y = pageHeight - margin

  // Классическая палитра - черно-белая с серыми оттенками
  const textDark = rgb(0, 0, 0)
  const textGray = rgb(0.4, 0.4, 0.4)
  const borderColor = rgb(0.8, 0.8, 0.8)

  // Заголовок - простой, без цветного фона
  const title = (data.title || 'Проект строительства').toString()
  page.drawText(title, {
    x: margin,
    y,
    size: 22,
    font,
    color: textDark,
  })
  y -= 30

  // Простая линия-разделитель
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: borderColor,
  })
  y -= 30

  // ВИЗУАЛИЗАЦИЯ - простая рамка
  const vizX = margin
  const vizW = pageWidth - margin * 2
  const vizH = 200
  const vizY = y - vizH

  page.drawRectangle({
    x: vizX,
    y: vizY,
    width: vizW,
    height: vizH,
    color: rgb(1, 1, 1),
    borderColor: textDark,
    borderWidth: 1,
  })

  // SVG координаты: viewBox="0 0 200 120"
  const svgW = 200
  const svgH = 120
  const svgScale = Math.min((vizW - 60) / svgW, (vizH - 40) / svgH)
  const boxX = vizX + (vizW - svgW * svgScale) / 2
  const boxY = vizY + (vizH - svgH * svgScale) / 2

  const toPdfX = (x: number) => boxX + x * svgScale
  const toPdfY = (svgYPos: number) => boxY + (svgH - svgYPos) * svgScale

  // Классические цвета для схемы - темно-серый вместо яркого синего
  const wallColor = rgb(0.3, 0.3, 0.3)
  const wallBorder = rgb(0.1, 0.1, 0.1)
  const labelColor = textDark

  if (data.type === 'walls_2') {
    const dims = data.dims as { width: number; length: number; height: number; thickness: number }
    const w = Number.isFinite(dims?.width) && dims.width > 0 ? dims.width : 1
    const l = Number.isFinite(dims?.length) && dims.length > 0 ? dims.length : 1
    const scale = 60 / Math.max(w, l, 1)
    const wPx = w * scale
    const lPx = l * scale
    const x0 = 10
    const y0 = 78
    const thickPx = 4
    const xV = x0 + wPx - thickPx
    const yV = y0 - lPx + thickPx

    page.drawRectangle({
      x: toPdfX(x0),
      y: toPdfY(y0 + thickPx),
      width: wPx * svgScale,
      height: thickPx * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    page.drawRectangle({
      x: toPdfX(xV),
      y: toPdfY(yV + lPx),
      width: thickPx * svgScale,
      height: lPx * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    const fontSize = 13
    const widthLabel = `${fmt2ru(w)} м`
    const lengthLabel = `${fmt2ru(l)} м`

    const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
    page.drawText(widthLabel, {
      x: toPdfX(x0 + wPx / 2) - widthTextWidth / 2,
      y: toPdfY(96) + fontSize * 0.4,
      size: fontSize,
      font,
      color: labelColor,
    })

    const lengthTextWidth = font.widthOfTextAtSize(lengthLabel, fontSize)
    const lengthCenterX = toPdfX(xV + 18)
    const lengthCenterY = toPdfY(yV + lPx / 2)
    const centerToBaselineOffset = fontSize * 0.375
    page.drawText(lengthLabel, {
      x: lengthCenterX - centerToBaselineOffset,
      y: lengthCenterY + lengthTextWidth / 2,
      size: fontSize,
      font,
      color: labelColor,
      rotate: degrees(-90),
    })

  } else if (data.type === 'walls_3') {
    const dims = data.dims as { left: number; back: number; right: number; height: number; thickness: number }
    const l = Number.isFinite(dims?.left) && dims.left > 0 ? dims.left : 1
    const b = Number.isFinite(dims?.back) && dims.back > 0 ? dims.back : 1
    const r = Number.isFinite(dims?.right) && dims.right > 0 ? dims.right : 1

    const scale = 60 / Math.max(l, b, r, 1)
    const lPx = l * scale
    const bPx = b * scale
    const rPx = r * scale
    const thick = 4

    const x0 = 40
    const yTop = 28
    const LABEL_OFFSET = 18

    const leftX = x0
    const backY = yTop
    const rightX = x0 + bPx - thick
    const leftY = backY + thick
    const rightY = backY + thick

    page.drawRectangle({
      x: toPdfX(x0),
      y: toPdfY(backY + thick),
      width: bPx * svgScale,
      height: thick * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    page.drawRectangle({
      x: toPdfX(leftX),
      y: toPdfY(leftY + lPx),
      width: thick * svgScale,
      height: lPx * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    page.drawRectangle({
      x: toPdfX(rightX),
      y: toPdfY(rightY + rPx),
      width: thick * svgScale,
      height: rPx * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    const fontSize = 13
    const leftLabel = `${fmt2ru(dims.left)} м`
    const backLabel = `${fmt2ru(dims.back)} м`
    const rightLabel = `${fmt2ru(dims.right)} м`
    const centerToBaselineOffset = fontSize * 0.375

    const backTextWidth = font.widthOfTextAtSize(backLabel, fontSize)
    page.drawText(backLabel, {
      x: toPdfX(x0 + bPx / 2) - backTextWidth / 2,
      y: toPdfY(Math.max(12, backY - LABEL_OFFSET)) + centerToBaselineOffset,
      size: fontSize,
      font,
      color: labelColor,
    })

    const leftTextWidth = font.widthOfTextAtSize(leftLabel, fontSize)
    page.drawText(leftLabel, {
      x: toPdfX(leftX - LABEL_OFFSET) - centerToBaselineOffset,
      y: toPdfY(leftY + lPx / 2) + leftTextWidth / 2,
      size: fontSize,
      font,
      color: labelColor,
      rotate: degrees(-90),
    })

    const rightTextWidth = font.widthOfTextAtSize(rightLabel, fontSize)
    page.drawText(rightLabel, {
      x: toPdfX(rightX + thick + LABEL_OFFSET) - centerToBaselineOffset,
      y: toPdfY(rightY + rPx / 2) + rightTextWidth / 2,
      size: fontSize,
      font,
      color: labelColor,
      rotate: degrees(-90),
    })

  } else if (data.type === 'walls_4') {
    const dims = data.dims as { width: number; length: number; height: number; thickness: number }
    const w = Number.isFinite(dims?.width) && dims.width > 0 ? dims.width : 1
    const l = Number.isFinite(dims?.length) && dims.length > 0 ? dims.length : 1

    const scale = 60 / Math.max(w, l, 1)
    const wPx = w * scale
    const lPx = l * scale
    const thick = 4
    const LABEL_OFFSET = 18

    const x0 = 60
    const y0 = 26
    const rectW = wPx
    const rectH = lPx

    const leftX = x0
    const rightX = x0 + rectW - thick
    const topY = y0
    const bottomY = y0 + rectH - thick

    page.drawRectangle({
      x: toPdfX(x0),
      y: toPdfY(topY + thick),
      width: rectW * svgScale,
      height: thick * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })
    page.drawRectangle({
      x: toPdfX(x0),
      y: toPdfY(bottomY + thick),
      width: rectW * svgScale,
      height: thick * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })
    page.drawRectangle({
      x: toPdfX(leftX),
      y: toPdfY(topY + rectH),
      width: thick * svgScale,
      height: rectH * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })
    page.drawRectangle({
      x: toPdfX(rightX),
      y: toPdfY(topY + rectH),
      width: thick * svgScale,
      height: rectH * svgScale,
      color: wallColor,
      borderColor: wallBorder,
      borderWidth: 1,
    })

    const fontSize = 13
    const widthLabel = `${fmt2ru(w)} м`
    const lengthLabel = `${fmt2ru(l)} м`
    const centerToBaselineOffset = fontSize * 0.375

    const lengthTextWidth = font.widthOfTextAtSize(lengthLabel, fontSize)
    page.drawText(lengthLabel, {
      x: toPdfX(x0 + rectW / 2) - lengthTextWidth / 2,
      y: toPdfY(Math.max(12, topY - LABEL_OFFSET)) + centerToBaselineOffset,
      size: fontSize,
      font,
      color: labelColor,
    })

    const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
    page.drawText(widthLabel, {
      x: toPdfX(leftX - LABEL_OFFSET) - centerToBaselineOffset,
      y: toPdfY(topY + rectH / 2) + widthTextWidth / 2,
      size: fontSize,
      font,
      color: labelColor,
      rotate: degrees(-90),
    })
  }

  y = vizY - 30

  // Разделитель
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: borderColor,
  })
  y -= 25

  // ПАРАМЕТРЫ - простой список
  page.drawText('Параметры проекта', {
    x: margin,
    y,
    size: 14,
    font,
    color: textDark,
  })
  y -= 25

  page.drawText(`Материал: ${data.materialLabel || 'Не выбран'}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 18

  page.drawText(`Принцип расчёта: ${data.principleLabel || ''}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 25

  if (data.type === 'walls_2' || data.type === 'walls_4') {
    const dims = data.dims as { width: number; length: number; height: number; thickness: number }
    page.drawText(`Ширина: ${fmt2(dims.width)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Длина: ${fmt2(dims.length)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
  } else {
    const dims = data.dims as { left: number; back: number; right: number; height: number; thickness: number }
    page.drawText(`Левая стена: ${fmt2(dims.left)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Задняя стена: ${fmt2(dims.back)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Правая стена: ${fmt2(dims.right)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
  }

  const dims = 'height' in data.dims ? data.dims : { height: 0, thickness: 0 }
  page.drawText(`Высота: ${fmt2(dims.height)} м`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 18
  page.drawText(`Толщина: ${fmt2(dims.thickness)} м`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 25

  // Разделитель
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: borderColor,
  })
  y -= 25

  // РЕЗУЛЬТАТЫ - простой блок без цветного фона
  page.drawText('Результаты расчёта', {
    x: margin,
    y,
    size: 14,
    font,
    color: textDark,
  })
  y -= 25

  page.drawText(`Площадь: ${fmt2(data.results.area)} м²`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 18
  page.drawText(`Объём: ${fmt2(data.results.volume)} м³`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 25

  // Проёмы (если есть)
  const openings = Array.isArray(data.openings) ? data.openings : []
  if (openings.length > 0) {
    page.drawText(`Проёмы (${openings.length}):`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18

    openings.forEach((o, idx) => {
      page.drawText(`Проём ${idx + 1}: Ширина ${fmt2(o.width)} м, Высота ${fmt2(o.height)} м`, {
        x: margin,
        y,
        size: 11,
        font,
        color: textDark,
      })
      y -= 16
    })
  }

  // Добавляем имя пользователя и электронную почту в конец, если включено
  if (data.includeMeta) {
    // Разделитель перед информацией о пользователе
    y -= 15
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: borderColor,
    })
    y -= 20

    // Пытаемся получить имя пользователя и email из Supabase
    let userName = 'Пользователь'
    let userEmail = ''
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        userName = user.user_metadata.full_name
      }
      if (user?.email) {
        userEmail = user.email
      }
    } catch (e) {
      console.log('Не удалось получить данные пользователя:', e)
    }

    page.drawText(userName, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18

    if (userEmail) {
      page.drawText(userEmail, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 20
    } else {
      y -= 2
    }
  }

  // FOOTER - простой и классический
  const footerY = 40
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: pageWidth - margin, y: footerY + 10 },
    thickness: 0.5,
    color: borderColor,
  })
  page.drawText('Groxy', {
    x: margin,
    y: footerY,
    size: 10,
    font,
    color: textGray,
  })

  const pdfBytes = await doc.save()
  return pdfBytes
}
