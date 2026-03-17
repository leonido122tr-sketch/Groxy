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

/** Логин в UI = колонка profiles.отображаемое_имя в Supabase */
type ProfileRow = { отображаемое_имя?: string | null; аватар?: string | null; город?: string | null; push_notifications_enabled?: boolean }

type CityOption = { name: string; region: string | null }

export default function ProfileSetupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [citySearching, setCitySearching] = useState(false)
  const citySearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(true)
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
            .select('отображаемое_имя, аватар, город, push_notifications_enabled')
            .eq('идентификатор', u.id)
            .single()
          const row = profile as ProfileRow | null
          setPushEnabled(row?.push_notifications_enabled ?? true)
          // Источник истины для «Логин» — profiles.отображаемое_имя; fallback — Auth full_name
          setFullName(
            row?.отображаемое_имя?.trim() || (u.user_metadata?.full_name as string)?.trim() || ''
          )
          setCity(row?.город?.trim() ?? '')
          const avatarVal = row?.аватар?.trim() || null
          setAvatarUrl(avatarVal)
          if (avatarVal) {
            getAvatarDisplayUrl(supabase, avatarVal).then((url) => setAvatarDisplayUrl(url))
          } else {
            setAvatarDisplayUrl(null)
          }
          // Не перезаписываем отображаемое_имя при загрузке — только синхронизируем почту при необходимости
          await supabase.from('profiles').upsert(
            {
              id: u.id,
              идентификатор: u.id,
              электронная_почта: u.email ?? '',
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
          phone: phone.trim() || undefined,
        },
      })

      if (metaError) throw metaError

      let finalAvatarUrl: string | null = avatarRemoved ? null : avatarUrl
      if (user?.id && avatarFile) {
        finalAvatarUrl = await uploadAvatar(supabase, avatarFile, user.id)
      }

      if (user?.id) {
          const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            идентификатор: user.id,
            электронная_почта: trimmedEmail,
            аватар: finalAvatarUrl,
            город: city.trim() || null,
            push_notifications_enabled: pushEnabled,
            обновлено_в: new Date().toISOString(),
          },
          { onConflict: 'идентификатор' }
        )
          if (profileError) throw profileError
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

  // Закрытие выпадающего списка городов по клику снаружи
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    return () => {
      if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current)
    }
  }, [])

  // Поиск городов в Supabase (public.search_cities) при вводе
  const runCitySearch = (query: string) => {
    const q = query.trim()
    if (q.length < 2) {
      setCityOptions([])
      return
    }
    setCitySearching(true)
    supabase
      .rpc('search_cities', { query: q })
      .then(({ data, error }) => {
        setCitySearching(false)
        if (error) {
          setCityOptions([])
          return
        }
        setCityOptions((data as CityOption[]) ?? [])
      })
      .catch(() => setCitySearching(false))
  }

  const onCityInputChange = (value: string) => {
    setCity(value)
    if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current)
    if (!value.trim()) {
      setCityOptions([])
      return
    }
    citySearchTimeoutRef.current = setTimeout(() => runCitySearch(value), 300)
  }

  const onCityFocus = () => {
    setCityDropdownOpen(true)
    if (city.trim().length >= 2) runCitySearch(city)
    else setCityOptions([])
  }

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
          </div>

          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <span className="mb-2 block text-sm font-semibold text-zinc-200">
                Логин
              </span>
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-zinc-200">
                {fullName || '—'}
              </p>
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

            <div ref={cityDropdownRef} className="relative">
              <label htmlFor="city" className="mb-2 block text-sm font-semibold text-zinc-200">
                Город
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => onCityInputChange(e.target.value)}
                onFocus={onCityFocus}
                placeholder="Начните вводить название города"
                className="input-base"
                autoComplete="off"
              />
              {cityDropdownOpen && (
                <ul
                  className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-[#1a2230] py-1 shadow-lg"
                  role="listbox"
                >
                  {citySearching ? (
                    <li className="px-3 py-2 text-sm text-zinc-500">Поиск…</li>
                  ) : cityOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-zinc-500">
                      {city.trim().length < 2 ? 'Введите минимум 2 символа' : 'Ничего не найдено'}
                    </li>
                  ) : (
                    cityOptions.map((row) => (
                      <li key={`${row.name}-${row.region ?? ''}`}>
                        <button
                          type="button"
                          role="option"
                          className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/10 focus:bg-white/10 focus:outline-none"
                          onClick={() => {
                            setCity(row.name)
                            setCityDropdownOpen(false)
                          }}
                        >
                          {row.region ? `${row.name}, ${row.region}` : row.name}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <label htmlFor="push-enabled" className="cursor-pointer text-sm font-medium text-zinc-200">
                Уведомления на устройстве
              </label>
              <input
                id="push-enabled"
                type="checkbox"
                checked={pushEnabled}
                onChange={(e) => setPushEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#1a2230] text-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Включите, чтобы получать push-уведомления о новых комментариях в ваших темах на форуме. Список уведомлений всегда доступен по иконке в шапке.
            </p>

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
