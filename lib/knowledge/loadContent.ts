import type { KnowledgeSection } from '@/lib/knowledge/content/concrete'

/**
 * Ленивая подгрузка контента раздела базы знаний.
 * Для бетона возвращается массив секций (заголовок, картинка, текст), для остальных — строка.
 */
export async function loadKnowledgeContent(slug: string): Promise<string | KnowledgeSection[] | null> {
  switch (slug) {
    case 'concrete':
      return (await import('@/lib/knowledge/content/concrete')).CONCRETE_SECTIONS
    case 'roof':
      return (await import('@/lib/knowledge/content/roof')).ROOF_SECTIONS
    case 'foundation':
      return (await import('@/lib/knowledge/content/foundation')).FOUNDATION_SECTIONS
    case 'finishing':
      return (await import('@/lib/knowledge/content/finishing')).FINISHING_SECTIONS
    case 'paint':
      return (await import('@/lib/knowledge/content/paint')).PAINT_SECTIONS
    case 'fasteners':
      return (await import('@/lib/knowledge/content/fasteners')).FASTENERS_SECTIONS
    case 'brick':
      return (await import('@/lib/knowledge/content/brick')).BRICK_SECTIONS
    case 'wood':
      return (await import('@/lib/knowledge/content/wood')).WOOD_SECTIONS
    case 'glass':
      return (await import('@/lib/knowledge/content/glass')).GLASS_SECTIONS
    case 'insulation':
      return (await import('@/lib/knowledge/content/insulation')).INSULATION_SECTIONS
    case 'metal':
      return (await import('@/lib/knowledge/content/metal')).METAL_SECTIONS
    case 'standards':
      return (await import('@/lib/knowledge/content/standards')).STANDARDS_CONTENT
    default:
      return null
  }
}
