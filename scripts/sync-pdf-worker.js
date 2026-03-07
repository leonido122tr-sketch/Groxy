/**
 * Копирует pdf.worker из pdfjs-dist в public/, чтобы версия API и воркера совпадали.
 * Запускается после npm install (postinstall) и перед сборкой (prebuild).
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const src = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')
const dest = path.join(root, 'public', 'pdf.worker.min.mjs')

if (!fs.existsSync(src)) {
  console.warn('sync-pdf-worker: pdfjs-dist worker не найден, пропуск')
  process.exit(0)
}

fs.copyFileSync(src, dest)
console.log('sync-pdf-worker: pdf.worker.min.mjs скопирован в public/')
