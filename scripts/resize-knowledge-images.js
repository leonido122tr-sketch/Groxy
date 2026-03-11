const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const W = 400
const H = 225
const knowledgeDir = path.join(__dirname, '..', 'public', 'knowledge')

async function resizeDir(dirPath) {
  const slug = path.basename(dirPath)
  const files = fs.readdirSync(dirPath).filter((f) => f.startsWith('section-') && f.endsWith('.jpg'))
  for (const f of files) {
    const src = path.join(dirPath, f)
    await sharp(src).resize(W, H).jpeg({ quality: 82 }).toFile(src + '.tmp')
    fs.renameSync(src + '.tmp', src)
    console.log('Resized', path.join(slug, f))
  }
}

async function main() {
  const dirs = fs.readdirSync(knowledgeDir, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const d of dirs) {
    await resizeDir(path.join(knowledgeDir, d.name))
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
