'use client'

import { Capacitor } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

let hardwareBackOwnerSeq = 0
let activeHardwareBackOwner = 0
let activeHardwareBackListener: { remove: () => Promise<void> } | null = null

function canGoBack() {
  if (typeof window === 'undefined') return false
  return window.history.length > 1
}

export function useSmartBack(fallbackHref: string) {
  const router = useRouter()

  return useCallback(() => {
    if (canGoBack()) {
      router.back()
      return
    }
    router.push(fallbackHref)
  }, [fallbackHref, router])
}

export function useAndroidBackHandler(onBack: () => void, enabled = true) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return
    }

    let cancelled = false
    const owner = ++hardwareBackOwnerSeq

    void import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => onBackRef.current()))
      .then((listener) => {
        if (cancelled) {
          void listener.remove()
          return
        }

        if (activeHardwareBackListener) {
          void activeHardwareBackListener.remove()
        }

        activeHardwareBackListener = listener
        activeHardwareBackOwner = owner
      })

    return () => {
      cancelled = true

      if (activeHardwareBackOwner === owner && activeHardwareBackListener) {
        const listener = activeHardwareBackListener
        activeHardwareBackListener = null
        activeHardwareBackOwner = 0
        void listener.remove()
      }
    }
  }, [enabled])
}

type BackButtonProps = {
  fallbackHref: string
  children: React.ReactNode
  className?: string
  ariaLabel?: string
  registerHardwareBack?: boolean
}

export function BackButton({
  fallbackHref,
  children,
  className = '',
  ariaLabel = 'Назад',
  registerHardwareBack = true,
}: BackButtonProps) {
  const goBack = useSmartBack(fallbackHref)
  useAndroidBackHandler(goBack, registerHardwareBack)

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  )
}
