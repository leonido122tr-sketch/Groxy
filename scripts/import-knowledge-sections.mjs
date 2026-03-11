/**
 * Импорт разделов из разделы.txt в lib/knowledge/content/{slug}.ts
 * Запуск: node scripts/import-knowledge-sections.mjs "C:\Users\User\Desktop\разделы.txt"
 */
import fs from 'fs'
import path from 'path'

const sections = [
  { slug: 'roof', startLine: 1, endLine: 302, constName: 'ROOF_CONTENT', firstLinePrefix: /^заполни раздел кровли:\s*/i },
  { slug: 'foundation', startLine: 303, endLine: 695, constName: 'FOUNDATION_CONTENT', firstLinePrefix: /^Заполни раздел фундамента:\s*/i },
  { slug: 'finishing', startLine: 696, endLine: 1066, constName: 'FINISHING_CONTENT', firstLinePrefix: /^Заполни раздел отделочных материалов:\s*/i },
  { slug: 'paint', startLine: 1067, endLine: 1322, constName: 'PAINT_CONTENT', firstLinePrefix: /^Заполни раздел лакокрасочных материалов:\s*/i },
  { slug: 'fasteners', startLine: 1323, endLine: 1524, constName: 'FASTENERS_CONTENT', firstLinePrefix: /^Заполни раздел корепежа:\s*/i },
  { slug: 'brick', startLine: 1526, endLine: 2054, constName: 'BRICK_CONTENT', firstLinePrefix: /^/ },
  { slug: 'wood', startLine: 2055, endLine: 2431, constName: 'WOOD_CONTENT', firstLinePrefix: /^добавь раздел дерево:\s*/i },
  { slug: 'glass', startLine: 2432, endLine: 2742, constName: 'GLASS_CONTENT', firstLinePrefix: /^добавь раздел стекло:\s*/i },
  { slug: 'insulation', startLine: 2743, endLine: 3145, constName: 'INSULATION_CONTENT', firstLinePrefix: /^Добавь раздел утепления:\s*/i },
  { slug: 'metal', startLine: 3146, endLine: 99999, constName: 'METAL_CONTENT', firstLinePrefix: /^заполни раздел металл:\s*/i },
]

const inputPath = process.argv[2]
if (!inputPath || !fs.existsSync(inputPath)) {
  console.error('Usage: node scripts/import-knowledge-sections.mjs <path-to-разделы.txt>')
  process.exit(1)
}

const contentDir = path.join(process.cwd(), 'lib', 'knowledge', 'content')
if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true })

const raw = fs.readFileSync(inputPath, 'utf8')
const lines = raw.split(/\r?\n/)

for (const sec of sections) {
  const slice = lines.slice(sec.startLine - 1, sec.endLine)
  let text = slice.join('\n')
  text = text.replace(sec.firstLinePrefix, '').trimEnd()
  const escaped = text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  const out = `/** Раздел «${sec.slug}» — сгенерировано скриптом */\nexport const ${sec.constName} = \`${escaped}\`;\n`
  const outPath = path.join(contentDir, `${sec.slug}.ts`)
  fs.writeFileSync(outPath, out, 'utf8')
  console.log(`Written ${sec.slug}.ts (${text.length} chars)`)
}

console.log('Done. Add cases to loadContent.ts for each slug.')
