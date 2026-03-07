import { PDFDocument, rgb, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

type FoundationData =
  | {
      length: number
      width: number
      height: number
      thickness: number
      principle: 'inside' | 'outside'
      concreteGrade?: string
    }
  | {
      left: number
      back: number
      right: number
      height: number
      thickness: number
      principle: 'inside' | 'outside'
      concreteGrade?: string
    }

/** Данные крыши для PDF: 2 стены — width, length; 3 стены — left, back, right; общие — height, overhang, area */
export type RoofData =
  | { width: number; length: number; height: number; overhang: number; area: number }
  | { left: number; back: number; right: number; height: number; overhang: number; area: number }

export type PdfResultsOverrides = {
  wallsArea?: number
  wallsVolume?: number
  foundationVolume?: number
  roofArea?: number
}

/** Data URL (image/png) планов для вставки в PDF вместо ручной отрисовки */
export type PlanImages = { foundation?: string; walls?: string; roof?: string }

type PdfData =
  | {
      title: string
      includeMeta?: boolean
      skipWalls: true
      type?: 'walls_2' | 'walls_3' | 'walls_4'
      foundation?: FoundationData
      roof?: RoofData
      pdfComment?: string
      resultsOverrides?: PdfResultsOverrides
      planImages?: PlanImages
    }
  | {
      title: string
      includeMeta?: boolean
      materialLabel: string
      principleLabel: string
      dims: { width: number; length: number; height: number; thickness: number } | { left: number; back: number; right: number; height: number; thickness: number }
      results: { area: number; volume: number }
      /** Проёмы: width, height обязательны; offset и wall сохраняют положение вдоль стены для корректного отображения в PDF */
      openings: Array<{ width: number; height: number; offset?: number; wall?: 1 | 2 | 3 | 4 }>
      type: 'walls_2' | 'walls_3' | 'walls_4'
      foundation?: FoundationData
      roof?: RoofData
      skipWalls?: false
      pdfComment?: string
      resultsOverrides?: PdfResultsOverrides
      planImages?: PlanImages
    }

async function loadFont(): Promise<Uint8Array> {
  try {
    const response = await fetch('/fonts/NotoSans.ttf')
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    }
  } catch {
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

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function generatePdfClient(data: PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const fontBytes = await loadFont()
  // Используем subset: false чтобы все символы (русские и английские) корректно отображались
  const font = await doc.embedFont(fontBytes, { subset: false })

  let page = doc.addPage([595.28, 841.89])
  const margin = 50
  const pageWidth = 595.28
  const pageHeight = 841.89
  /** Нижняя зона страницы под надпись про обращение к специалисту — контент не должен заходить ниже */
  const BOTTOM_RESERVED = 58
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

  const svgW = 200
  const svgH = 120
  /** Высота блока визуализации в PDF — компактнее, чтобы не съедать лишнее место; картинка масштабируется по пропорциям */
  const BIG_VIZ_HEIGHT = 300
  const wallColor = rgb(0.3, 0.3, 0.3)
  const wallBorder = rgb(0.1, 0.1, 0.1)
  const labelColor = textDark
  const wallsDataRaw = (!('skipWalls' in data) || !data.skipWalls)
    ? (data as Extract<PdfData, { skipWalls?: false }>)
    : null
  const hasValidWallDims = wallsDataRaw && (() => {
    const d = wallsDataRaw.dims
    if (wallsDataRaw.type === 'walls_2' || wallsDataRaw.type === 'walls_4') {
      const dims = d as { width: number; length: number; height: number; thickness: number }
      return (Number(dims?.width) > 0 || Number(dims?.length) > 0 || Number(dims?.height) > 0 || Number(dims?.thickness) > 0)
    }
    if (wallsDataRaw.type === 'walls_3') {
      const dims = d as { left: number; back: number; right: number; height: number; thickness: number }
      return (Number(dims?.left) > 0 || Number(dims?.back) > 0 || Number(dims?.right) > 0 || Number(dims?.height) > 0 || Number(dims?.thickness) > 0)
    }
    return true
  })()
  const wallsData = hasValidWallDims ? wallsDataRaw : null
  const hasWalls = !!wallsData
  const hasFoundation = !!data.foundation
  const roofRaw = data.roof as (RoofData & { area?: number }) | undefined
  const hasRoofByDims =
    !!roofRaw &&
    (('width' in roofRaw && 'length' in roofRaw && Number(roofRaw.width) > 0 && Number(roofRaw.length) > 0) ||
      ('left' in roofRaw && 'back' in roofRaw && 'right' in roofRaw &&
        Number(roofRaw.left) > 0 && Number(roofRaw.back) > 0 && Number(roofRaw.right) > 0))
  const hasRoof = hasRoofByDims

  if (hasFoundation) {
    if (y - 22 - BIG_VIZ_HEIGHT < margin + BOTTOM_RESERVED) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    page.drawText('Фундамент', {
      x: margin,
      y,
      size: 16,
      font,
      color: textDark,
    })
    y -= 22

    const fVizX = margin
    const fVizW = pageWidth - margin * 2
    const fVizH = BIG_VIZ_HEIGHT
    const fVizY = y - fVizH
    page.drawRectangle({
      x: fVizX,
      y: fVizY,
      width: fVizW,
      height: fVizH,
      color: rgb(1, 1, 1),
      borderColor: textDark,
      borderWidth: 1,
    })

    const f = data.foundation!
    const planImages = data.planImages
    if (planImages?.foundation) {
      try {
        const pngBytes = dataUrlToUint8Array(planImages.foundation)
        const pngImage = await doc.embedPng(pngBytes)
        const scale = Math.min(fVizW / pngImage.width, fVizH / pngImage.height)
        const drawW = pngImage.width * scale
        const drawH = pngImage.height * scale
        page.drawImage(pngImage, {
          x: fVizX + (fVizW - drawW) / 2,
          y: fVizY + (fVizH - drawH) / 2,
          width: drawW,
          height: drawH,
        })
      } catch {
        // fallback: draw simple plan below
      }
    }
    if (!planImages?.foundation) {
    const fSvgScale = Math.min((fVizW - 60) / svgW, (fVizH - 40) / svgH)
    const fBoxX = fVizX + (fVizW - svgW * fSvgScale) / 2
    const fBoxY = fVizY + (fVizH - svgH * fSvgScale) / 2
    const fToPdfX = (x: number) => fBoxX + x * fSvgScale
    const fToPdfY = (svgYPos: number) => fBoxY + (svgH - svgYPos) * fSvgScale

    const layoutType =
      wallsData?.type ?? ('left' in f && 'back' in f && 'right' in f ? 'walls_3' : 'walls_2')

    if (layoutType === 'walls_2' && 'length' in f && 'width' in f) {
      const w = Math.max(0, f.width)
      const l = Math.max(0, f.length)
      if (w > 0 && l > 0) {
        const scale = 60 / Math.max(w, l, 1)
        const wPx = w * scale
        const lPx = l * scale
        const x0 = 10
        const y0 = 78
        const thickPx = 4
        const xV = x0 + wPx - thickPx
        const yV = y0 - lPx + thickPx

        page.drawRectangle({
          x: fToPdfX(x0),
          y: fToPdfY(y0 + thickPx),
          width: wPx * fSvgScale,
          height: thickPx * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(xV),
          y: fToPdfY(yV + lPx),
          width: thickPx * fSvgScale,
          height: lPx * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })

        const fontSize = 13
        const widthLabel = `${fmt2ru(w)} м`
        const lengthLabel = `${fmt2ru(l)} м`
        const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
        page.drawText(widthLabel, {
          x: fToPdfX(x0 + wPx / 2) - widthTextWidth / 2,
          y: fToPdfY(96) + fontSize * 0.4,
          size: fontSize,
          font,
          color: labelColor,
        })
        const lengthTextWidth = font.widthOfTextAtSize(lengthLabel, fontSize)
        const lengthCenterX = fToPdfX(xV + 18)
        const lengthCenterY = fToPdfY(yV + lPx / 2)
        const centerToBaselineOffset = fontSize * 0.375
        page.drawText(lengthLabel, {
          x: lengthCenterX - centerToBaselineOffset,
          y: lengthCenterY + lengthTextWidth / 2,
          size: fontSize,
          font,
          color: labelColor,
          rotate: degrees(-90),
        })
      }
    } else if (layoutType === 'walls_3' && 'left' in f && 'back' in f && 'right' in f) {
      const l = Math.max(0, f.left)
      const b = Math.max(0, f.back)
      const r = Math.max(0, f.right)
      if (l > 0 && b > 0 && r > 0) {
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
          x: fToPdfX(x0),
          y: fToPdfY(backY + thick),
          width: bPx * fSvgScale,
          height: thick * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(leftX),
          y: fToPdfY(leftY + lPx),
          width: thick * fSvgScale,
          height: lPx * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(rightX),
          y: fToPdfY(rightY + rPx),
          width: thick * fSvgScale,
          height: rPx * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })

        const fontSize = 13
        const leftLabel = `${fmt2ru(l)} м`
        const backLabel = `${fmt2ru(b)} м`
        const rightLabel = `${fmt2ru(r)} м`
        const centerToBaselineOffset = fontSize * 0.375

        const backTextWidth = font.widthOfTextAtSize(backLabel, fontSize)
        page.drawText(backLabel, {
          x: fToPdfX(x0 + bPx / 2) - backTextWidth / 2,
          y: fToPdfY(Math.max(12, backY - LABEL_OFFSET)) + centerToBaselineOffset,
          size: fontSize,
          font,
          color: labelColor,
        })

        const leftTextWidth = font.widthOfTextAtSize(leftLabel, fontSize)
        page.drawText(leftLabel, {
          x: fToPdfX(leftX - LABEL_OFFSET) - centerToBaselineOffset,
          y: fToPdfY(leftY + lPx / 2) + leftTextWidth / 2,
          size: fontSize,
          font,
          color: labelColor,
          rotate: degrees(-90),
        })

        const rightTextWidth = font.widthOfTextAtSize(rightLabel, fontSize)
        page.drawText(rightLabel, {
          x: fToPdfX(rightX + thick + LABEL_OFFSET) - centerToBaselineOffset,
          y: fToPdfY(rightY + rPx / 2) + rightTextWidth / 2,
          size: fontSize,
          font,
          color: labelColor,
          rotate: degrees(-90),
        })
      }
    } else if (layoutType === 'walls_4' && 'length' in f && 'width' in f) {
      const w = Math.max(0, f.width)
      const l = Math.max(0, f.length)
      if (w > 0 && l > 0) {
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
          x: fToPdfX(x0),
          y: fToPdfY(topY + thick),
          width: rectW * fSvgScale,
          height: thick * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(x0),
          y: fToPdfY(bottomY + thick),
          width: rectW * fSvgScale,
          height: thick * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(leftX),
          y: fToPdfY(topY + rectH),
          width: thick * fSvgScale,
          height: rectH * fSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: fToPdfX(rightX),
          y: fToPdfY(topY + rectH),
          width: thick * fSvgScale,
          height: rectH * fSvgScale,
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
          x: fToPdfX(x0 + rectW / 2) - lengthTextWidth / 2,
          y: fToPdfY(Math.max(12, topY - LABEL_OFFSET)) + centerToBaselineOffset,
          size: fontSize,
          font,
          color: labelColor,
        })

        const widthTextWidth = font.widthOfTextAtSize(widthLabel, fontSize)
        page.drawText(widthLabel, {
          x: fToPdfX(leftX - LABEL_OFFSET) - centerToBaselineOffset,
          y: fToPdfY(topY + rectH / 2) + widthTextWidth / 2,
          size: fontSize,
          font,
          color: labelColor,
          rotate: degrees(-90),
        })
      }
    }
    }

    y = fVizY - 30

    const t = Number.isFinite(f.thickness) ? f.thickness : 0
    const h = Number.isFinite(f.height) ? f.height : 0
    const principle = f.principle === 'inside' ? 'Внутри' : 'Снаружи'
    const adj = f.principle === 'inside' ? t / 2 : -t / 2

    let foundationLength = 0
    if ('length' in f && 'width' in f) {
      const adjustedWidth = Math.max(0, f.width + adj)
      const adjustedLength = Math.max(0, f.length + adj)
      foundationLength = adjustedWidth + adjustedLength
    } else if ('left' in f && 'back' in f && 'right' in f) {
      const adjustedLeft = Math.max(0, f.left + adj)
      const adjustedBack = Math.max(0, f.back + adj)
      const adjustedRight = Math.max(0, f.right + adj)
      foundationLength = adjustedLeft + adjustedBack + adjustedRight
    }

    const volume = Math.max(0, foundationLength * t * h)
    const reinforcement = Math.max(0, foundationLength * 4)
    const hoopWidth = Math.max(0, t - 0.08)
    const hoopHeight = Math.max(0, h - 0.08)
    const hoopPerimeter = (hoopWidth + hoopHeight) * 2
    const hoopCount = Math.ceil(foundationLength / 0.25) + 1
    const hoops = Math.max(0, hoopPerimeter * hoopCount)

    page.drawText('Параметры фундамента', {
      x: margin,
      y,
      size: 14,
      font,
      color: textDark,
    })
    y -= 25
    page.drawText(`Принцип расчёта: ${principle}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18

    if ('length' in f && 'width' in f) {
      page.drawText(`Ширина: ${fmt2(f.width)} м`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
      page.drawText(`Длина: ${fmt2(f.length)} м`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
    } else if ('left' in f && 'back' in f && 'right' in f) {
      page.drawText(`Левая: ${fmt2(f.left)} м`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
      page.drawText(`Задняя: ${fmt2(f.back)} м`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
      page.drawText(`Правая: ${fmt2(f.right)} м`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
    }

    page.drawText(`Высота: ${fmt2(h)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Толщина: ${fmt2(t)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    if (f.concreteGrade) {
      page.drawText(`Марка бетона: ${f.concreteGrade}`, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 18
    }

    y -= 6
    const foundationVolumeDisplay = data.resultsOverrides?.foundationVolume != null ? Number(data.resultsOverrides.foundationVolume) : volume
    const foundationVolumeUserNote = data.resultsOverrides?.foundationVolume != null ? ' (введено пользователем)' : ''
    page.drawText(`Объём: ${fmt2(foundationVolumeDisplay)} м³${foundationVolumeUserNote}`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Арматура: ${fmt2(reinforcement)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18
    page.drawText(`Хомуты (шаг 0,25 м): ${fmt2(hoops)} м`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 20

    if (hasWalls) {
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: borderColor,
      })
      y -= 25
    }
  }

  if (hasFoundation && hasWalls) {
    page = doc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin
  }

  if (hasWalls && wallsData) {
    if (y - 22 - BIG_VIZ_HEIGHT < margin + BOTTOM_RESERVED) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    page.drawText('Стены', {
      x: margin,
      y,
      size: 16,
      font,
      color: textDark,
    })
    y -= 22

    // ВИЗУАЛИЗАЦИЯ — большая (как в модальном окне)
    const vizX = margin
    const vizW = pageWidth - margin * 2
    const vizH = BIG_VIZ_HEIGHT
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

    if (data.planImages?.walls) {
      try {
        const pngBytes = dataUrlToUint8Array(data.planImages.walls)
        const pngImage = await doc.embedPng(pngBytes)
        const scale = Math.min(vizW / pngImage.width, vizH / pngImage.height)
        const drawW = pngImage.width * scale
        const drawH = pngImage.height * scale
        page.drawImage(pngImage, {
          x: vizX + (vizW - drawW) / 2,
          y: vizY + (vizH - drawH) / 2,
          width: drawW,
          height: drawH,
        })
      } catch {
        // fallback: draw simple plan below
      }
    }
    if (!data.planImages?.walls) {
    // SVG координаты: viewBox="0 0 200 120"
    const svgScale = Math.min((vizW - 60) / svgW, (vizH - 40) / svgH)
    const boxX = vizX + (vizW - svgW * svgScale) / 2
    const boxY = vizY + (vizH - svgH * svgScale) / 2

    const toPdfX = (x: number) => boxX + x * svgScale
    const toPdfY = (svgYPos: number) => boxY + (svgH - svgYPos) * svgScale

    if (wallsData.type === 'walls_2') {
      const dims = wallsData.dims as { width: number; length: number; height: number; thickness: number }
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

  } else if (wallsData.type === 'walls_3') {
    const dims = wallsData.dims as { left: number; back: number; right: number; height: number; thickness: number }
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

  } else if (wallsData.type === 'walls_4') {
    const dims = wallsData.dims as { width: number; length: number; height: number; thickness: number }
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

    }
    y = vizY - 30
  }

  if (hasWalls && wallsData) {
  // Разделитель
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: borderColor,
  })
  y -= 25

  // ПАРАМЕТРЫ - простой список
  page.drawText('Параметры стен', {
    x: margin,
    y,
    size: 14,
    font,
    color: textDark,
  })
  y -= 25

  page.drawText(`Материал: ${wallsData.materialLabel || 'Не выбран'}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 18

  page.drawText(`Принцип расчёта: ${wallsData.principleLabel || ''}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 25

  if (wallsData.type === 'walls_2' || wallsData.type === 'walls_4') {
    const dims = wallsData.dims as { width: number; length: number; height: number; thickness: number }
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
    const dims = wallsData.dims as { left: number; back: number; right: number; height: number; thickness: number }
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

  const dims = 'height' in wallsData.dims ? wallsData.dims : { height: 0, thickness: 0 }
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

  const wallsAreaDisplay = data.resultsOverrides?.wallsArea != null ? Number(data.resultsOverrides.wallsArea) : wallsData.results.area
  const wallsVolumeDisplay = data.resultsOverrides?.wallsVolume != null ? Number(data.resultsOverrides.wallsVolume) : wallsData.results.volume
  const wallsAreaUserNote = data.resultsOverrides?.wallsArea != null ? ' (введено пользователем)' : ''
  const wallsVolumeUserNote = data.resultsOverrides?.wallsVolume != null ? ' (введено пользователем)' : ''
  page.drawText(`Площадь: ${fmt2(wallsAreaDisplay)} м²${wallsAreaUserNote}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 18
  page.drawText(`Объём: ${fmt2(wallsVolumeDisplay)} м³${wallsVolumeUserNote}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: textDark,
  })
  y -= 25

  // Проёмы (если есть)
  const openings = Array.isArray(wallsData.openings) ? wallsData.openings : []
  if (openings.length > 0) {
    page.drawText(`Проёмы (${openings.length}):`, {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 18

    openings.forEach((o: { width: number; height: number }, idx: number) => {
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
  }

  // Крыша: визуализация и параметры (как у фундамента и стен)
  if (hasRoof && data.roof) {
    let roof = data.roof as RoofData & { area?: number }
    // Вычисляем area, если нет (например, сохранённые данные из walls-4/roof без area)
    if (roof && (Number(roof.area) <= 0 || roof.area == null)) {
      const ro = Math.max(0, roof.overhang ?? 0)
      const rh = Math.max(0, roof.height ?? 0)
      if ('width' in roof && 'length' in roof) {
        const rw = Math.max(0, roof.width)
        const rl = Math.max(0, roof.length)
        if (rw > 0 && rl > 0) {
          const slopeLength = Math.sqrt(rw * rw + rh * rh)
          const slopeDim = slopeLength + 2 * ro
          const lengthDim = rl + 2 * ro
          roof = { ...roof, area: slopeDim * lengthDim }
        }
      } else if ('left' in roof && 'back' in roof && 'right' in roof) {
        const rl = Math.max(0, roof.left)
        const rb = Math.max(0, roof.back)
        const rr = Math.max(0, roof.right)
        if (rl > 0 && rb > 0 && rr > 0) {
          const slopeLength = Math.sqrt(Math.max(rl, rr) ** 2 + rh ** 2)
          const slopeDim = slopeLength + 2 * ro
          const lengthDim = rb + 2 * ro
          roof = { ...roof, area: slopeDim * lengthDim }
        }
      }
    }
    const roofFinal = roof as RoofData
    if (y < margin + 22 + BIG_VIZ_HEIGHT + BOTTOM_RESERVED) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    page.drawText('Крыша', {
      x: margin,
      y,
      size: 16,
      font,
      color: textDark,
    })
    y -= 22

    const rVizX = margin
    const rVizW = pageWidth - margin * 2
    const rVizH = BIG_VIZ_HEIGHT
    const rVizY = y - rVizH
    page.drawRectangle({
      x: rVizX,
      y: rVizY,
      width: rVizW,
      height: rVizH,
      color: rgb(1, 1, 1),
      borderColor: textDark,
      borderWidth: 1,
    })

    if (data.planImages?.roof) {
      try {
        const pngBytes = dataUrlToUint8Array(data.planImages.roof)
        const pngImage = await doc.embedPng(pngBytes)
        const scale = Math.min(rVizW / pngImage.width, rVizH / pngImage.height)
        const drawW = pngImage.width * scale
        const drawH = pngImage.height * scale
        page.drawImage(pngImage, {
          x: rVizX + (rVizW - drawW) / 2,
          y: rVizY + (rVizH - drawH) / 2,
          width: drawW,
          height: drawH,
        })
      } catch {
        // fallback: draw simple plan below
      }
    }
    if (!data.planImages?.roof) {
    const rSvgScale = Math.min((rVizW - 60) / svgW, (rVizH - 40) / svgH)
    const rBoxX = rVizX + (rVizW - svgW * rSvgScale) / 2
    const rBoxY = rVizY + (rVizH - svgH * rSvgScale) / 2
    const rToPdfX = (x: number) => rBoxX + x * rSvgScale
    const rToPdfY = (svgYPos: number) => rBoxY + (svgH - svgYPos) * rSvgScale

    if ('width' in roofFinal && 'length' in roofFinal) {
      const rw = Math.max(0, roofFinal.width)
      const rl = Math.max(0, roofFinal.length)
      const ro = Math.max(0, roofFinal.overhang)
      if (rw > 0 && rl > 0) {
        const isWalls4 = data.type === 'walls_4'
        const maxW = isWalls4 ? rw + 2 * ro : rw + ro
        const maxL = isWalls4 ? rl + 2 * ro : rl + ro
        const scale = Math.min(160 / maxW, 100 / maxL, 80)
        const wPx = rw * scale
        const lPx = rl * scale
        const outWPx = maxW * scale
        const outLPx = maxL * scale
        const x0 = 20
        const y0 = 20
        const innerX = isWalls4 ? x0 + (outWPx - wPx) / 2 : x0
        const innerBottom = isWalls4 ? y0 + (outLPx - lPx) / 2 + lPx : y0 + lPx
        page.drawRectangle({
          x: rToPdfX(x0),
          y: rToPdfY(y0 + outLPx),
          width: outWPx * rSvgScale,
          height: outLPx * rSvgScale,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: rToPdfX(innerX),
          y: rToPdfY(innerBottom),
          width: wPx * rSvgScale,
          height: lPx * rSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        const fontSize = 12
        page.drawText(`${fmt2ru(rw)} м`, {
          x: rToPdfX(innerX + wPx / 2) - font.widthOfTextAtSize(`${fmt2ru(rw)} м`, fontSize) / 2,
          y: rToPdfY(innerBottom + 14) + fontSize * 0.4,
          size: fontSize,
          font,
          color: labelColor,
        })
        page.drawText(`Высота: ${fmt2ru(roofFinal.height)} м`, {
          x: rToPdfX(190),
          y: rToPdfY(8),
          size: 10,
          font,
          color: labelColor,
        })
        page.drawText(`Свес: ${fmt2ru(ro)} м`, {
          x: rToPdfX(190),
          y: rToPdfY(18),
          size: 10,
          font,
          color: labelColor,
        })
      }
    } else if ('left' in roofFinal && 'back' in roofFinal && 'right' in roofFinal) {
      const rl = Math.max(0, roofFinal.left)
      const rb = Math.max(0, roofFinal.back)
      const rr = Math.max(0, roofFinal.right)
      const ro = Math.max(0, roofFinal.overhang)
      if (rl > 0 && rb > 0 && rr > 0) {
        const depth = Math.max(rl, rr)
        const scale = Math.min(160 / (rb + 2 * ro), 100 / (depth + ro), 80)
        const lPx = rl * scale
        const bPx = rb * scale
        const rPx = rr * scale
        const oPx = ro * scale
        const thick = 4
        const x0 = 20
        const y0 = 20
        // Сдвиг, чтобы при большом свесе (oPx > 20) рисунок не уходил в отрицательные координаты и не выходил за границы 200×120
        const offsetX = Math.max(0, oPx - 20)
        const offsetY = Math.max(0, oPx - 20)
        const outW = bPx + 2 * oPx
        const outH = depth * scale + oPx
        // Внешний прямоугольник — крыша со свесом
        page.drawRectangle({
          x: rToPdfX(x0 - oPx + offsetX),
          y: rToPdfY(y0 - oPx + outH + offsetY),
          width: outW * rSvgScale,
          height: outH * rSvgScale,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: wallBorder,
          borderWidth: 1,
        })
        const leftX = x0 + offsetX
        const backY = y0 + offsetY
        const rightX = x0 + bPx - thick + offsetX
        // Внутренний U: задняя стенка на backY, левая/правая от backY вниз
        page.drawRectangle({
          x: rToPdfX(leftX),
          y: rToPdfY(backY + lPx),
          width: thick * rSvgScale,
          height: lPx * rSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: rToPdfX(leftX),
          y: rToPdfY(backY + thick),
          width: bPx * rSvgScale,
          height: thick * rSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        page.drawRectangle({
          x: rToPdfX(rightX),
          y: rToPdfY(backY + rPx),
          width: thick * rSvgScale,
          height: rPx * rSvgScale,
          color: wallColor,
          borderColor: wallBorder,
          borderWidth: 1,
        })
        const fontSize = 11
        page.drawText(`Левая ${fmt2ru(rl)} м`, { x: rToPdfX(leftX - 25), y: rToPdfY(backY + lPx / 2) + fontSize * 0.4, size: fontSize, font, color: labelColor })
        page.drawText(`Задняя ${fmt2ru(rb)} м`, { x: rToPdfX(leftX + bPx / 2) - font.widthOfTextAtSize(`Задняя ${fmt2ru(rb)} м`, fontSize) / 2, y: rToPdfY(backY + thick + 14) + fontSize * 0.4, size: fontSize, font, color: labelColor })
        page.drawText(`Правая ${fmt2ru(rr)} м`, { x: rToPdfX(rightX + 20), y: rToPdfY(backY + rPx / 2) + fontSize * 0.4, size: fontSize, font, color: labelColor })
        page.drawText(`Высота: ${fmt2ru(roofFinal.height)} м`, { x: rToPdfX(190), y: rToPdfY(8), size: 10, font, color: labelColor })
        page.drawText(`Свес: ${fmt2ru(ro)} м`, { x: rToPdfX(190), y: rToPdfY(18), size: 10, font, color: labelColor })
      }
    }
    }

    y = rVizY - 30

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: borderColor,
    })
    y -= 25

    page.drawText('Параметры крыши', {
      x: margin,
      y,
      size: 14,
      font,
      color: textDark,
    })
    y -= 22

    if ('width' in roofFinal && 'length' in roofFinal) {
      page.drawText(`Ширина: ${fmt2ru(roofFinal.width)} м`, { x: margin, y, size: 12, font, color: textDark })
      y -= 18
      page.drawText(`Длина: ${fmt2ru(roofFinal.length)} м`, { x: margin, y, size: 12, font, color: textDark })
      y -= 18
    } else if ('left' in roofFinal && 'back' in roofFinal && 'right' in roofFinal) {
      page.drawText(`Левая: ${fmt2ru(roofFinal.left)} м`, { x: margin, y, size: 12, font, color: textDark })
      y -= 18
      page.drawText(`Задняя: ${fmt2ru(roofFinal.back)} м`, { x: margin, y, size: 12, font, color: textDark })
      y -= 18
      page.drawText(`Правая: ${fmt2ru(roofFinal.right)} м`, { x: margin, y, size: 12, font, color: textDark })
      y -= 18
    }
    page.drawText(`Высота: ${fmt2ru(roofFinal.height)} м`, { x: margin, y, size: 12, font, color: textDark })
    y -= 18
    page.drawText(`Свес: ${fmt2ru(roofFinal.overhang)} м`, { x: margin, y, size: 12, font, color: textDark })
    y -= 25
    const roofAreaDisplay = data.resultsOverrides?.roofArea != null ? Number(data.resultsOverrides.roofArea) : roofFinal.area
    const roofAreaUserNote = data.resultsOverrides?.roofArea != null ? ' (введено пользователем)' : ''
    page.drawText(`Площадь крыши: ${fmt2ru(roofAreaDisplay)} м²${roofAreaUserNote}`, {
      x: margin,
      y,
      size: 14,
      font,
      color: textDark,
    })
    y -= 30
  }

  // Добавляем имя пользователя и электронную почту в конец, если включено
  if (data.includeMeta) {
    if (y < margin + BOTTOM_RESERVED + 80) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    // Разделитель перед информацией о пользователе
    y -= 15
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: borderColor,
    })
    y -= 20

    // Пытаемся получить имя, email и телефон из Supabase
    let userName = 'Пользователь'
    let userEmail = ''
    let userPhone = ''
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
      if (user?.user_metadata?.phone && String(user.user_metadata.phone).trim()) {
        userPhone = String(user.user_metadata.phone).trim()
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
      y -= 18
    }

    if (userPhone) {
      page.drawText(userPhone, {
        x: margin,
        y,
        size: 12,
        font,
        color: textDark,
      })
      y -= 20
    } else if (userEmail) {
      y -= 20
    } else {
      y -= 2
    }
  }

  // Комментарий пользователя в PDF (если указан)
  const pdfComment = data.pdfComment?.trim()
  if (pdfComment) {
    if (y < margin + BOTTOM_RESERVED + 60) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
    y -= 15
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.5,
      color: borderColor,
    })
    y -= 18
    page.drawText('Комментарий:', {
      x: margin,
      y,
      size: 12,
      font,
      color: textDark,
    })
    y -= 16
    const commentLines = pdfComment.split(/\r?\n/)
    const lineHeight = 14
    for (const line of commentLines) {
      if (y < margin + BOTTOM_RESERVED) break
      const trimmed = line.trim()
      if (trimmed) {
        page.drawText(trimmed.slice(0, 80), {
          x: margin,
          y,
          size: 11,
          font,
          color: textDark,
        })
        y -= lineHeight
      }
    }
    y -= 8
  }

  // FOOTER на каждой странице: линия, disclaimer, Groxy
  const disclaimerText = 'Расчёт носит ознакомительный характер. Для точных данных рекомендуется обратиться к специалисту.'
  const footerY = 40
  const footerLineY = footerY + 10
  const pages = doc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    p.drawLine({
      start: { x: margin, y: footerLineY },
      end: { x: pageWidth - margin, y: footerLineY },
      thickness: 0.5,
      color: borderColor,
    })
    p.drawText(disclaimerText, {
      x: margin,
      y: footerY - 2,
      size: 8,
      font,
      color: textGray,
    })
    const groxyY = footerY - 14
    if (groxyY > 20) {
      p.drawText('Groxy', {
        x: margin,
        y: groxyY,
        size: 10,
        font,
        color: textGray,
      })
    }
  }

  const pdfBytes = await doc.save()
  return pdfBytes
}
