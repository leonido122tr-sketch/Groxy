'use client'

import Link from 'next/link'
import { AppPage, SurfaceCard } from '@/app/components/AppShell'
import { AppHeader } from '@/app/components/AppHeader'
import { ForwardIcon } from '@/app/components/AppIcons'

const DASHBOARD_ITEMS: { href: string; title: string; description: string; imageUrl: string }[] = [
  {
    href: '/projects/create',
    title: 'Начать новый проект',
    description: 'Создать проект, ввести размеры, получить расчёты и сохранить PDF.',
    imageUrl: '/dashboard/create-project.jpg',
  },
  {
    href: '/project',
    title: 'Мои проекты',
    description: 'Сохранённые проекты, история и быстрый переход к рабочим данным.',
    imageUrl: '/dashboard/my-projects.jpg',
  },
  {
    href: '/forum',
    title: 'Сообщество',
    description: 'Обсуждения, вопросы и будущая экосистема специалистов и заказчиков.',
    imageUrl: '/dashboard/community.jpg',
  },
  {
    href: '/materials/compare',
    title: 'Сравнение материалов',
    description: 'Сравнение характеристик и будущая аналитика по выбору материала.',
    imageUrl: '/dashboard/compare-materials.jpg',
  },
  {
    href: '/knowledge',
    title: 'База знаний',
    description: 'Статьи, материалы и практические сведения по строительству.',
    imageUrl: '/dashboard/knowledge.jpg',
  },
  {
    href: '/support',
    title: 'Поддержка и сотрудничество',
    description: 'Написать о проблемах и пожеланиях',
    imageUrl: '/dashboard/support.jpg',
  },
]

export default function DashboardPage() {
  return (
    <AppPage header={<AppHeader />} width="lg" className="py-5">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Начальный экран</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Выберите действие: начать новый проект, открыть сохранённые или перейти в разделы приложения.
          </p>
        </div>

        <div className="space-y-3">
          {DASHBOARD_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-[22px] active:scale-[0.995]"
            >
              <SurfaceCard className="relative overflow-hidden p-0">
                <img
                  src={item.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-50"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[#121922]/95 via-[#121922]/75 to-[#121922]/50"
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-[88px] items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <span className="text-base font-medium text-white drop-shadow-sm">{item.title}</span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-zinc-300">{item.description}</p>
                  </div>
                  <ForwardIcon className="h-5 w-5 shrink-0 text-zinc-400" />
                </div>
              </SurfaceCard>
            </Link>
          ))}
        </div>
      </div>
    </AppPage>
  )
}
