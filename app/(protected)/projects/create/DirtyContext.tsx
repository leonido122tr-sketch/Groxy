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

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('projectDataChanged', syncIsDirtyFromStorage)
    window.addEventListener('projectIsDirtyChanged', syncIsDirtyFromStorage)
    return () => {
      window.removeEventListener('projectDataChanged', syncIsDirtyFromStorage)
      window.removeEventListener('projectIsDirtyChanged', syncIsDirtyFromStorage)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncIsDirtyFromStorage()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('projectIsDirty', String(isDirty))
    }
  }, [isDirty])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (savedPdfUri) {
        sessionStorage.setItem('pdfViewerUri', savedPdfUri)
      } else {
        sessionStorage.removeItem('pdfViewerUri')
      }
    }
  }, [savedPdfUri])

  const markDirty = () => setIsDirty(true)
  const markClean = () => setIsDirty(false)

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
