'use client'

import Link from 'next/link'

export default function CreateProjectPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black font-sans text-white pt-safe">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15"
            >
              ← Назад
            </Link>
            <h1 className="text-2xl font-bold">Создать проект</h1>
            <div className="w-[88px]" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold leading-tight">Планирование строительства</h2>
        <p className="mt-2 max-w-2xl text-zinc-400">Начните создание проекта, добавив стены</p>

        <div className="mt-8">
          <Link
            href="/projects/create/walls"
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <span className="text-2xl leading-none">+</span>
            Пристрой 2 стены
          </Link>
        </div>

        <div className="mt-4">
          <Link
            href="/projects/create/walls-3"
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <span className="text-2xl leading-none">+</span>
            Пристрой 3 стены
          </Link>
        </div>

        <div className="mt-4">
          <Link
            href="/projects/create/walls-4"
            className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-5 text-base font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <span className="text-2xl leading-none">+</span>
            Отдельная постройка 4 стены
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl border border-white/15 bg-white/5" />
          <p className="mt-5 text-lg font-semibold">Начните с добавления стен</p>
          <p className="mt-2 text-sm text-zinc-400">
            Нажмите кнопку выше, чтобы перейти к вводу параметров стен
          </p>
        </div>
      </main>
    </div>
  )
}


