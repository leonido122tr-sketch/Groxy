'use client'

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseNetworkError } from "@/lib/supabase/client";
import { PageLoader } from "@/app/components/PageLoader";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const AUTH_CHECK_TIMEOUT_MS = 5000;

    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), AUTH_CHECK_TIMEOUT_MS)
        );
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        // Обрабатываем ошибку refresh token
        if (sessionError) {
          console.error('Ошибка проверки сессии:', sessionError);
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
          }
          setLoading(false);
          return;
        }

        if (session) {
          router.push('/dashboard');
          return;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (isSupabaseNetworkError(error)) {
          console.warn('Нет связи с сервером авторизации, продолжаем без входа.');
        } else if (message.includes('конфигурация Supabase') || message.includes('NEXT_PUBLIC_SUPABASE')) {
          console.warn('Конфигурация Supabase не найдена, продолжаем без авторизации');
        } else if (message.includes('Refresh Token') || message.includes('Invalid Refresh Token')) {
          try {
            const supabase = createClient();
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError);
          }
        } else {
          console.error('Ошибка проверки сессии:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="relative flex min-h-app pt-safe pb-safe items-center justify-center overflow-hidden bg-black font-sans text-white">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Logo — такой же, как на странице «Мои проекты» */}
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl">
            <Image
              src="/logo.png"
              alt="Groxy"
              width={96}
              height={96}
              className="h-24 w-24 object-cover rounded-3xl"
              priority
            />
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="text-gradient">Groxy</span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl leading-relaxed text-zinc-300 sm:text-2xl">
              Планирование и расчёт строительных проектов
            </p>
          </div>

          {/* Features */}
          <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass rounded-xl p-3 transition-all hover:bg-white/10">
              <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-0.5 text-sm font-semibold text-white">Расчёты</h3>
              <p className="text-xs leading-snug text-zinc-400">Автоматический расчёт материалов и объёмов</p>
            </div>

            <div className="glass rounded-xl p-3 transition-all hover:bg-white/10">
              <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
                <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mb-0.5 text-sm font-semibold text-white">PDF отчеты</h3>
              <p className="text-xs leading-snug text-zinc-400">Генерация профессиональных документов</p>
            </div>

            <div className="glass rounded-xl p-3 transition-all hover:bg-white/10">
              <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/20">
                <svg className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-0.5 text-sm font-semibold text-white">Мобильный доступ</h3>
              <p className="text-xs leading-snug text-zinc-400">Работайте в любое время и месте</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
            <Link
              href="/login"
              className="btn-hover gradient-primary flex h-14 flex-1 items-center justify-center rounded-2xl px-8 text-lg font-semibold text-white shadow-glow"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="btn-hover glass-strong flex h-14 flex-1 items-center justify-center rounded-2xl px-8 text-lg font-semibold text-white"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
