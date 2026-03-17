'use client'

import React from 'react'
import Link from 'next/link'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

/**
 * Ловит ошибки при рендере защищённых страниц и показывает заглушку вместо 500.
 */
export class ProtectedLayoutErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ProtectedLayout]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0f14] px-4">
          <p className="mb-4 text-center text-zinc-300">Что-то пошло не так</p>
          <Link
            href="/login"
            className="rounded-2xl bg-[#2f6fed] px-6 py-3 text-sm font-medium text-white"
          >
            Перейти к входу
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}
