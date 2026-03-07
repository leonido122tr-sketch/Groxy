/**
 * Собирает данные фундамента и крыши для PDF 4 стен из sessionStorage.
 * Одна точка правды для parameters, buildings-4 и калькулятора.
 */
export type Walls4Foundation = {
  length: number
  width: number
  height: number
  thickness: number
  principle: 'inside' | 'outside'
  concreteGrade?: string
}

export type Walls4Roof = {
  width: number
  length: number
  height: number
  overhang: number
  area: number
}

export type Walls4PdfExtras = {
  foundation?: Walls4Foundation
  roof?: Walls4Roof
}

export function getWalls4PdfExtrasFromStorage(): Walls4PdfExtras {
  if (typeof window === 'undefined' || !window.sessionStorage) return {}

  const result: Walls4PdfExtras = {}

  const foundationRaw = sessionStorage.getItem('currentProjectData_foundation_4')
  if (foundationRaw) {
    try {
      const f = JSON.parse(foundationRaw) as Record<string, unknown>
      const fl = Number(f.length ?? 0)
      const fw = Number(f.width ?? 0)
      const fh = Number(f.height ?? 0)
      const ft = Number(f.thickness ?? 0)
      if (fl > 0 && fw > 0 && fh > 0 && ft > 0) {
        result.foundation = {
          length: fl,
          width: fw,
          height: fh,
          thickness: ft,
          principle: f.principle === 'inside' ? 'inside' : 'outside',
          concreteGrade: typeof f.concreteGrade === 'string' ? f.concreteGrade : undefined,
        }
      }
    } catch {
      // ignore
    }
  }

  const roofRaw = sessionStorage.getItem('currentProjectData_roof_4')
  if (roofRaw) {
    try {
      const r = JSON.parse(roofRaw) as Record<string, number & string>
      const rw = Number(r.width ?? 0)
      const rl = Number(r.length ?? 0)
      if (rw > 0 && rl > 0) {
        const rh = Number(r.height ?? 0)
        const ro = Number(r.overhang ?? 0)
        const isGable = r.type === 'gable'
        const ridgeAlongLength = (r as Record<string, boolean>).ridgeAlongLength !== false
        let area: number
        if (Number(r.area) > 0) {
          area = Number(r.area)
        } else if (isGable) {
          const run = ridgeAlongLength ? rw / 2 : rl / 2
          const slopeLength = Math.sqrt(run * run + rh * rh)
          const slopeDim = slopeLength + ro
          const alongDim = ridgeAlongLength ? rl + 2 * ro : rw + 2 * ro
          area = Math.round(2 * slopeDim * alongDim * 100) / 100
        } else {
          const slopeLength = Math.sqrt(rw * rw + rh * rh)
          const slopeDim = slopeLength + 2 * ro
          const lengthDim = rl + 2 * ro
          area = Math.round(slopeDim * lengthDim * 100) / 100
        }
        result.roof = { width: rw, length: rl, height: rh, overhang: ro, area }
      }
    } catch {
      // ignore
    }
  }

  return result
}
