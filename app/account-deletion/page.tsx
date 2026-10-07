'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon } from '@/app/components/AppIcons'
import { Alert } from '@/app/components/Alert'
import { createClient } from '@/lib/supabase/client'
import { deleteOwnAccount } from '@/lib/auth/deleteOwnAccount'

export default function AccountDeletionPage() {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(false)
  const [ready, setReady] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return
        setSignedIn(Boolean(data.user))
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        setSignedIn(false)
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const remove = async () => {
    setPending(true)
    setError(null)
    try {
      await deleteOwnAccount()
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить аккаунт.')
      setPending(false)
    }
  }

  return (
    <AppPage header={<AppHeader />} width="md" className="py-5">
      <SurfaceCard className="p-5">
        <h1 className="text-2xl font-semibold text-white">Удаление аккаунта</h1>
        <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
          <p>
            В приложении Groxy аккаунт удаляется в профиле: кнопка «Удалить аккаунт». Удаление сразу и без восстановления.
          </p>
          <p>
            Вместе с аккаунтом удаляются профиль, имя, фото, текст «о себе», почта и проекты на сервере.
            Подписки на темы, отметки просмотров и оценки тем тоже удаляются.
            Темы и комментарии на форуме остаются без имени, фото и других данных автора. Картинки внутри этих сообщений остаются.
            Список проектов в приложении на этом телефоне тоже очищается.
          </p>
          <p>
            Если войти не получается, напишите в раздел «Поддержка и сотрудничество» с того адреса, на который регистрировались.
          </p>
        </div>

        {error ? (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}

        <div className="mt-6">
          {!ready ? (
            <p className="text-sm text-zinc-400">Проверяю вход…</p>
          ) : signedIn ? (
            confirming ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-200">Аккаунт, имя, фото и проекты будут удалены. Темы и комментарии останутся без вашего имени и фото. Вернуть аккаунт нельзя.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void remove()}
                    className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {pending ? 'Удаляю…' : 'Да, удалить аккаунт'}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                    className="rounded-2xl border border-white/12 px-4 py-3 text-sm text-zinc-200"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-2xl border border-red-400/40 px-4 py-3 text-sm font-medium text-red-200"
              >
                Удалить аккаунт
              </button>
            )
          ) : (
            <Link href="/login" className="inline-flex rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
              Войти и удалить аккаунт
            </Link>
          )}
        </div>

        <p className="mt-6 text-sm text-zinc-400">
          <Link href="/privacy" className="text-zinc-300 hover:text-white">Политика конфиденциальности</Link>
        </p>

        <BackButton fallbackHref="/" className="mt-8 inline-flex items-center gap-2 text-sm text-zinc-300">
          <BackIcon className="h-4 w-4" />
          На главную
        </BackButton>
      </SurfaceCard>
    </AppPage>
  )
}
