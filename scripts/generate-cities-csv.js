/**
 * Генерирует data/cities.csv из data/russia-cities.json для импорта в Supabase public.cities.
 * Колонки: name, region (из region.name).
 */
const fs = require('fs')
const path = require('path')

const jsonPath = path.join(__dirname, '..', 'data', 'russia-cities.json')
const csvPath = path.join(__dirname, '..', 'data', 'cities.csv')

const raw = fs.readFileSync(jsonPath, 'utf8')
const items = JSON.parse(raw)

function escapeCsv (s) {
  if (s == null || s === '') return ''
  const str = String(s)
  if (/[",\n\r]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

const header = 'name,region'
const rows = items.map((item) => {
  const name = item.name ?? ''
  const region = item.region?.name ?? item.region?.fullname ?? ''
  return escapeCsv(name) + ',' + escapeCsv(region)
})

fs.writeFileSync(csvPath, '\uFEFF' + header + '\n' + rows.join('\n'), 'utf8')
console.log('Written', rows.length, 'rows to', csvPath)
