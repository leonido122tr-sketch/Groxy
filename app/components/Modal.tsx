'use client'

import { useEffect } from 'react'

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
        className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 id="modal-title" className="mb-4 text-xl font-semibold text-white">
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
      ? 'flex-1 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700'
      : 'flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white hover:bg-blue-700'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 text-base text-zinc-300">{description}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="glass flex-1 rounded-xl px-4 py-3 text-base font-semibold text-white transition-all hover:bg-white/15"
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
