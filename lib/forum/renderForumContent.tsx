'use client'

import React from 'react'
import { ForumImageBlock } from '@/app/(protected)/forum/components/ForumImageBlock'

/** Проверяет, похожа ли строка на URL изображения */
export function isImageUrl(line: string): boolean {
  const t = line.trim()
  if (!t.startsWith('http://') && !t.startsWith('https://')) return false
  try {
    const u = new URL(t)
    const path = u.pathname.toLowerCase()
    return /\.(jpe?g|png|gif|webp)(\?|$)/i.test(path) || path.includes('/storage/')
  } catch {
    return false
  }
}

/** Разделитель: после него в content идут только URL фото (текст и фото хранятся отдельно). */
export const CONTENT_IMAGES_DELIMITER = '\n\n---IMAGES---\n'

/** Парсит content: текст отдельно, список URL фото отдельно (новый формат или legacy). */
export function parseContent(content: string): { text: string; imageUrls: string[] } {
  if (!content.trim()) return { text: '', imageUrls: [] }
  if (content.includes(CONTENT_IMAGES_DELIMITER)) {
    const [text = '', rest = ''] = content.split(CONTENT_IMAGES_DELIMITER)
    const imageUrls = rest.split('\n').map((l) => l.trim()).filter(isImageUrl)
    return { text: text.trimEnd(), imageUrls }
  }
  const imageUrls = content.split('\n').map((l) => l.trim()).filter(isImageUrl)
  return { text: content, imageUrls }
}

/** Извлекает URL изображений из content (для превью и legacy). */
export function getImageUrlsFromContent(content: string): string[] {
  if (content.includes(CONTENT_IMAGES_DELIMITER)) {
    return parseContent(content).imageUrls
  }
  return getOrderedImageUrls(content)
}

/** Все URL картинок в контенте по порядку (в т.ч. внутри строк). */
function getOrderedImageUrls(content: string): string[] {
  const urls: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    let rest = line
    while (rest.length > 0) {
      const found = findImageUrlInString(rest)
      if (!found) break
      urls.push(found.url)
      rest = rest.slice(found.end)
    }
  }
  if (urls.length === 0) {
    return content.split('\n').map((l) => l.trim()).filter(isImageUrl)
  }
  return urls
}

/** Невидимый символ-плейсхолдер для фото в редакторе (в блоке текста ничего не показываем). */
const IMAGE_PLACEHOLDER = '\u2063'

/** Для редактора: подставляет вместо URL невидимый символ — в поле ввода вы ничего не видите. */
export function contentToDisplayForEditor(content: string): string {
  const urls = getOrderedImageUrls(content)
  let display = content
  for (const url of urls) {
    display = display.replace(url, IMAGE_PLACEHOLDER)
  }
  return display
}

/** Из отображаемого в редакторе текста восстанавливает контент с реальными URL. */
export function displayToContent(display: string, currentContent: string): string {
  const urls = getOrderedImageUrls(currentContent)
  let out = display
  for (const url of urls) {
    out = out.replace(IMAGE_PLACEHOLDER, url)
  }
  return out
}

/** Находит первое вхождение URL изображения в строке. */
function findImageUrlInString(s: string): { url: string; start: number; end: number } | null {
  const re = /https?:\/\/[^\s]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    const raw = m[0]
    const url = raw.replace(/[.,;:!?)\]\s]+$/, '')
    if (isImageUrl(url)) {
      return { url, start: m.index, end: m.index + url.length }
    }
  }
  return null
}

/**
 * Разбивает строку на сегменты: текст и URL картинок (URL не показываем как текст).
 */
function lineToSegments(line: string): Array<{ type: 'text' | 'image'; value: string }> {
  const segments: Array<{ type: 'text' | 'image'; value: string }> = []
  let rest = line
  while (rest.length > 0) {
    const found = findImageUrlInString(rest)
    if (!found) {
      if (rest.length > 0) segments.push({ type: 'text', value: rest })
      break
    }
    if (found.start > 0) {
      segments.push({ type: 'text', value: rest.slice(0, found.start) })
    }
    segments.push({ type: 'image', value: found.url })
    rest = rest.slice(found.end)
  }
  return segments.length > 0 ? segments : [{ type: 'text', value: line }]
}

const imageFigureClass = 'max-w-full border border-white/10 object-contain max-h-[280px]'

/**
 * Рендерит текст поста/темы. Если content в новом формате (---IMAGES---), текст и фото раздельно;
 * иначе legacy: контент может содержать URL картинок в тексте.
 */
export function renderForumContent(content: string, className = 'whitespace-pre-wrap break-words text-sm text-zinc-200 min-w-0') {
  const hasDelimiter = content.includes(CONTENT_IMAGES_DELIMITER)
  if (hasDelimiter) {
    const { text, imageUrls } = parseContent(content)
    return (
      <div className={className}>
        {imageUrls.length > 0 ? (
          <ForumImageBlock urls={imageUrls} className="mb-3" />
        ) : null}
        {text ? <div className="whitespace-pre-wrap">{text}</div> : null}
      </div>
    )
  }
  const lines = content.split('\n')
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (trimmed && isImageUrl(trimmed)) {
          return (
            <figure key={i} className="mt-2 first:mt-0">
              <img src={trimmed} alt="" className={imageFigureClass} />
            </figure>
          )
        }
        const segments = lineToSegments(line)
        if (segments.length === 1 && segments[0].type === 'text') {
          return <span key={i}>{line}{i < lines.length - 1 ? '\n' : ''}</span>
        }
        return (
          <span key={i}>
            {segments.map((seg, j) =>
              seg.type === 'text' ? (
                seg.value
              ) : (
                <figure key={j} className="my-2 inline-block">
                  <img src={seg.value} alt="" className={imageFigureClass} />
                </figure>
              )
            )}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        )
      })}
    </div>
  )
}
