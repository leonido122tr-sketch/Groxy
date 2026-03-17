'use client'

import { useState, useEffect } from 'react'
import { useDirty } from './DirtyContext'
import { ConfirmModal } from '@/app/components/Modal'
import { DownloadIcon } from '@/app/components/AppIcons'
import { runSavePdfFromStorage, type WallsVariant } from '@/lib/pdf/runSavePdfFromStorage'

type Props = {
  variant: WallsVariant
  onToast?: (message: string) => void
}

const SAVE_ERROR_DUPLICATE = 'DUPLICATE_PROJECT_NAME'

/** Синяя иконка дискеты 3,5": сохраняет/перезаписывает PDF. Активна только при isDirty. */
export function PdfSaveFloppyButton({ variant, onToast }: Props) {
  const { isDirty, savedPdfUri, setSavedPdfUri, markClean } = useDirty()
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showNameHint, setShowNameHint] = useState(false)
  useEffect(() => {
    if (!showNameHint) return
    const t = setTimeout(() => setShowNameHint(false), 2500)
    return () => clearTimeout(t)
  }, [showNameHint])

  const getProjectName = () => {
    if (typeof window === 'undefined') return ''
    const n = variant === 'walls_2' ? '2' : variant === 'walls_3' ? '3' : '4'
    return (sessionStorage.getItem(`currentProjectName_walls_${n}`) ?? '').trim()
  }

  const doSave = async () => {
    const name = getProjectName()
    if (!name) {
      setShowNameHint(true)
      return
    }
    setShowNameHint(false)
    setSaving(true)
    try {
      const result = await runSavePdfFromStorage(variant)
      if (result) {
        setSavedPdfUri(result.uri)
        markClean()
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('projectDataChanged'))
          } catch {}
        }
        onToast?.('Проект и PDF сохранены')
      } else {
        onToast?.('Не удалось сохранить PDF. Заполните параметры.')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === SAVE_ERROR_DUPLICATE) {
        onToast?.('Проект с таким названием уже существует')
      } else {
        onToast?.(msg || 'Ошибка сохранения PDF')
      }
    } finally {
      setSaving(false)
      setShowOverwriteModal(false)
    }
  }

  const handleClick = () => {
    if (!isDirty) return
    if (!getProjectName()) {
      setShowNameHint(true)
      return
    }
    setShowNameHint(false)
    if (savedPdfUri) {
      setShowOverwriteModal(true)
      return
    }
    void doSave()
  }

  return (
    <>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={handleClick}
          disabled={!isDirty || saving}
          aria-label="Сохранить PDF"
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
            isDirty && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'cursor-not-allowed bg-white/10 text-zinc-500'
          }`}
        >
          <DownloadIcon className="h-5 w-5" aria-hidden />
        </button>
        {showNameHint && (
          <div
            className="android-toast absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap text-xs text-amber-300"
            role="status"
          >
            Введите название проекта
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={showOverwriteModal}
        onClose={() => setShowOverwriteModal(false)}
        onConfirm={doSave}
        title="Перезаписать сохранённый PDF?"
        description="Создать новый PDF по текущим данным и перезаписать ранее сохранённый файл?"
        confirmLabel="Перезаписать"
        cancelLabel="Отмена"
        variant="primary"
      />
    </>
  )
}
