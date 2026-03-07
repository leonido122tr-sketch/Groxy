'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DirtyContextType {
  isDirty: boolean
  savedPdfUri: string | null
  markDirty: () => void
  markClean: () => void
  setSavedPdfUri: (uri: string | null) => void
}

const DirtyContext = createContext<DirtyContextType | undefined>(undefined)

export function DirtyProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false)
  const [savedPdfUri, setSavedPdfUri] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsDirty(sessionStorage.getItem('projectIsDirty') === 'true')
    setSavedPdfUri(sessionStorage.getItem('pdfViewerUri'))
  }, [])

  const syncIsDirtyFromStorage = () => {
    if (typeof window === 'undefined') return
    const value = sessionStorage.getItem('projectIsDirty') === 'true'
    setIsDirty((prev) => (prev !== value ? value : prev))
  }

  // Синхронизация isDirty при событии projectDataChanged (проёмы в большом плане) или projectIsDirtyChanged (форма калькулятора)
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('projectDataChanged', syncIsDirtyFromStorage)
    window.addEventListener('projectIsDirtyChanged', syncIsDirtyFromStorage)
    return () => {
      window.removeEventListener('projectDataChanged', syncIsDirtyFromStorage)
      window.removeEventListener('projectIsDirtyChanged', syncIsDirtyFromStorage)
    }
  }, [])

  // При возврате на вкладку или при смене видимости перечитываем флаг из sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncIsDirtyFromStorage()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  // Сохраняем isDirty в sessionStorage для persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('projectIsDirty', String(isDirty))
    }
  }, [isDirty])

  // Сохраняем savedPdfUri в sessionStorage для persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (savedPdfUri) {
        sessionStorage.setItem('pdfViewerUri', savedPdfUri)
      } else {
        sessionStorage.removeItem('pdfViewerUri')
      }
    }
  }, [savedPdfUri])

  const markDirty = () => {
    setIsDirty(true)
    // savedPdfUri не сбрасываем: «Открыть PDF» по‑прежнему открывает последний сохранённый файл; перезапись — по кнопке сохранения
  }

  const markClean = () => {
    setIsDirty(false)
  }

  return (
    <DirtyContext.Provider value={{ isDirty, savedPdfUri, markDirty, markClean, setSavedPdfUri }}>
      {children}
    </DirtyContext.Provider>
  )
}

export function useDirty() {
  const context = useContext(DirtyContext)
  if (context === undefined) {
    throw new Error('useDirty must be used within a DirtyProvider')
  }
  return context
}
