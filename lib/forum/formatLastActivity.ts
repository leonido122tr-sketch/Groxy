/**
 * Форматирует дату последней активности для списка разделов форума.
 * Примеры: "2 мин. назад", "Вчера, в 14:42", "Пятница в 18:12"
 */
export function formatLastActivity(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3600_000)
  const diffDays = Math.floor(diffMs / 86400_000)

  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин. назад`
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    const h = date.getHours()
    const m = date.getMinutes()
    return `Сегодня, ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  if (diffDays === 1 || (diffDays < 2 && date.getDate() !== now.getDate())) {
    const h = date.getHours()
    const m = date.getMinutes()
    return `Вчера, в ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  if (diffDays < 7) {
    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    const dayName = days[date.getDay()]
    const h = date.getHours()
    const m = date.getMinutes()
    return `${dayName} в ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }
  const d = date.getDate()
  const mon = date.getMonth() + 1
  const y = date.getFullYear()
  return `${d.toString().padStart(2, '0')}.${mon.toString().padStart(2, '0')}.${y}`
}
