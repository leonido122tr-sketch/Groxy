'use client'

import { useEffect } from 'react'
import { useAndroidBackHandler } from '@/app/components/BackButton'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  /** Optional: custom close label for accessibility */
  closeLabel?: string
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  closeLabel = 'Закрыть',
}: ModalProps) {
  useAndroidBackHandler(onClose, isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative z-10 mx-auto w-full max-w-md rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.55)] animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="mb-4 text-xl font-semibold tracking-[-0.03em] text-white">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

type ConfirmModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Отмена',
  variant = 'primary',
}: ConfirmModalProps) {
  const confirmClass =
    variant === 'danger'
      ? 'flex-1 rounded-2xl bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700'
      : 'flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 text-base leading-7 text-zinc-300">{description}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-2xl border border-white/12 bg-[#10161f] px-4 py-3 text-base font-semibold text-white transition hover:border-white/18 hover:bg-[#141a22]"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`btn-hover ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
