'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'

function parseRuDecimal(value: string) {
  const cleaned = value.replace(/\s+/g, '').replace(',', '.')
  const n = Number.parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function sanitizeRuDecimalInput(raw: string, maxDecimals = 2) {
  const filtered = raw.replace(/[^\d,\.]/g, '')
  const firstSepIdx = filtered.search(/[.,]/)
  const sep = firstSepIdx >= 0 ? filtered[firstSepIdx] : null
  const intPartRaw = (sep ? filtered.slice(0, firstSepIdx) : filtered).replace(/[.,]/g, '')
  const rest = sep ? filtered.slice(firstSepIdx + 1) : ''
  const decRaw = rest.replace(/[.,]/g, '')
  let intPart = intPartRaw.replace(/^0+(?=\d)/, '')
  if (intPart === '' && (raw.includes(',') || raw.includes('.') || raw.startsWith(',') || raw.startsWith('.'))) intPart = '0'
  let out = intPart
  if (sep) {
    const dec = decRaw.slice(0, maxDecimals)
    out = `${intPart}${sep}${dec}`
    if (dec.length === 0 && (raw.endsWith(',') || raw.endsWith('.'))) out = `${intPart}${sep}`
  }
  return out
}

type Props = {
  label: string
  calculatedValue: number
  overrideValue: number | undefined
  unit: 'м²' | 'м³' | 'м'
  onOverride: (value: number | undefined) => void
  className?: string
}

export function EditableResultBlock({ label, calculatedValue, overrideValue, unit, onOverride, className = '' }: Props) {
  const effective = overrideValue ?? calculatedValue
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const commit = () => {
    const n = parseRuDecimal(inputValue)
    if (n >= 0) onOverride(n)
    else onOverride(undefined)
    setEditing(false)
  }

  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-zinc-400">{label}</p>
        {overrideValue != null && (
          <button
            type="button"
            onClick={() => onOverride(undefined)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Сбросить к расчёту
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => setInputValue(sanitizeRuDecimalInput(e.target.value))}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
            className="w-32 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-2xl font-bold text-white"
            autoFocus
          />
          <span className="text-2xl font-semibold text-white">{unit}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setInputValue(effective.toFixed(2).replace('.', ','))
            setEditing(true)
          }}
          className="mt-1 flex items-center gap-2 text-left"
        >
          <p className="text-4xl font-bold text-white">
            {effective.toFixed(2).replace('.', ',')} <span className="text-2xl font-semibold">{unit}</span>
          </p>
          <Pencil className="h-4 w-4 shrink-0 text-zinc-400 hover:text-white" />
        </button>
      )}
    </div>
  )
}
