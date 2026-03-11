'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient, isSupabaseNetworkError } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageLoader } from '@/app/components/PageLoader'
import { Alert } from '@/app/components/Alert'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { BackButton } from '@/app/components/BackButton'
import { BackIcon, IconBadge, UserFormIcon } from '@/app/components/AppIcons'
import { uploadAvatar, getAvatarDisplayUrl } from '@/lib/avatar/uploadAvatar'

type ProfileRow = { отображаемое_имя?: string | null; аватар?: string | null }

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user: u } } = await supabase.auth.getUser()
        setUser(u ?? null)
        if (u?.email) setEmail(u.email)
        if (u?.user_metadata?.phone) setPhone(String(u.user_metadata.phone))
        if (!u) router.push('/login')
        else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('отображаемое_имя, аватар')
            .eq('идентификатор', u.id)
            .single()
          const row = profile as ProfileRow | null
          setFullName(
            row?.отображаемое_имя?.trim() || u.user_metadata?.full_name || ''
          )
          const avatarVal = row?.аватар?.trim() || null
          setAvatarUrl(avatarVal)
          if (avatarVal) {
            getAvatarDisplayUrl(supabase, avatarVal).then((url) => setAvatarDisplayUrl(url))
          } else {
            setAvatarDisplayUrl(null)
          }
          await supabase.from('profiles').upsert(
            {
              идентификатор: u.id,
              электронная_почта: u.email ?? '',
              отображаемое_имя: u.user_metadata?.full_name ?? null,
              обновлено_в: new Date().toISOString(),
            },
            { onConflict: 'идентификатор' }
          )
        }
      } catch (err: unknown) {
        if (isSupabaseNetworkError(err)) {
          setError('Нет связи с сервером. Проверьте интернет.')
        } else {
          console.error('Ошибка загрузки профиля:', err)
          setError('Не удалось загрузить профиль.')
        }
        router.push('/login')
      }
    }
    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const trimmedEmail = email.trim()
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setError('Укажите корректный email')
        setLoading(false)
        return
      }

      if (trimmedEmail !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail })
        if (emailError) throw emailError
      }

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      })

      if (metaError) throw metaError

      let finalAvatarUrl: string | null = avatarRemoved ? null : avatarUrl
      if (user?.id && avatarFile) {
        finalAvatarUrl = await uploadAvatar(supabase, avatarFile, user.id)
      }

      if (user?.id) {
        await supabase.from('profiles').upsert(
          {
            идентификатор: user.id,
            отображаемое_имя: fullName.trim() || null,
            электронная_почта: trimmedEmail,
            аватар: finalAvatarUrl,
            обновлено_в: new Date().toISOString(),
          },
          { onConflict: 'идентификатор' }
        )
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при сохранении профиля'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const showAvatar = !avatarRemoved && (avatarPreview || avatarDisplayUrl)
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarRemoved(false)
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }
  const onRemoveAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(null)
    setAvatarFile(null)
    setAvatarRemoved(true)
    setAvatarUrl(null)
    setAvatarDisplayUrl(null)
  }

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  if (!user) {
    return <PageLoader />
  }

  return (
    <AppPage width="md" className="justify-center py-6">
      <SurfaceCard accent className="p-5">
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
              {showAvatar ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white/20 bg-[#1a2230]">
                  <img
                    src={avatarPreview || avatarDisplayUrl || ''}
                    alt="Фото профиля"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <IconBadge tone="indigo" size="lg" className="inline-flex">
                  <UserFormIcon className="h-7 w-7" />
                </IconBadge>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={onFileChange}
            />
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-white/20 bg-[#1a2230] px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-[#243040]"
              >
                {showAvatar ? 'Изменить фото' : 'Добавить фото'}
              </button>
              {showAvatar && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  className="rounded-xl border border-white/20 bg-[#1a2230] px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-[#243040] hover:text-zinc-200"
                >
                  Удалить фото
                </button>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-white">Настройка профиля</h1>
            <p className="mt-2 text-sm text-zinc-400">Укажите данные для подписи PDF</p>
          </div>

          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-zinc-200">
                Полное имя
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-base"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-semibold text-zinc-200">
                Номер телефона
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base"
                placeholder="+7 (999) 123-45-67"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Указывается в подписи PDF при включённой опции «Подписать PDF»
              </p>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-hover">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Сохранение...
                </span>
              ) : (
                'Сохранить'
              )}
            </button>
          </form>

          <p className="mt-6 text-center">
            <BackButton
              fallbackHref="/project"
              className="inline-flex items-center gap-2 text-sm text-zinc-300"
            >
              <BackIcon className="h-4 w-4" />
              Назад в меню
            </BackButton>
          </p>
          <p className="mt-2 text-center">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-300"
            >
              Пропустить →
            </Link>
          </p>
      </SurfaceCard>
    </AppPage>
  )
}
