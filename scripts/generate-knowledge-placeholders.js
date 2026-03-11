const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const TOPICS = [
  { slug: 'wood', count: 7, color: [139, 90, 43] },
  { slug: 'glass', count: 10, color: [200, 220, 240] },
  { slug: 'insulation', count: 9, color: [180, 160, 140] },
  { slug: 'brick', count: 6, color: [180, 100, 80] },
  { slug: 'roof', count: 8, color: [100, 100, 110] },
  { slug: 'foundation', count: 9, color: [120, 110, 100] },
  { slug: 'finishing', count: 9, color: [220, 210, 200] },
  { slug: 'paint', count: 5, color: [240, 230, 220] },
  { slug: 'fasteners', count: 10, color: [160, 160, 165] },
]

const W = 400
const H = 225

async function createImage(slug, index, rgb) {
  const dir = path.join(__dirname, '..', 'public', 'knowledge', slug)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, `section-${index}.jpg`)
  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgb(${rgb[0]},${rgb[1]},${rgb[2]})"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="rgba(255,255,255,0.5)" text-anchor="middle" dy=".3em">${slug} ${index}</text>
    </svg>
  `
  await sharp(Buffer.from(svg))
    .resize(W, H)
    .jpeg({ quality: 85 })
    .toFile(filePath)
  console.log('Created', filePath)
}

async function main() {
  for (const { slug, count, color } of TOPICS) {
    for (let i = 1; i <= count; i++) {
      await createImage(slug, i, color)
    }
  }
  console.log('Done.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
