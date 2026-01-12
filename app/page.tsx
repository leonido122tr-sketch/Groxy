'use client'

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Обрабатываем ошибку refresh token
        if (sessionError) {
          console.error('Ошибка проверки сессии:', sessionError);
          // Если refresh token не найден или невалиден, очищаем сессию
          if (sessionError.message?.includes('Refresh Token') || sessionError.message?.includes('Invalid Refresh Token')) {
            await supabase.auth.signOut();
          }
          setLoading(false);
          return;
        }
        
        if (session) {
          // Пользователь уже авторизован, перенаправляем на dashboard
          router.push('/dashboard');
          return;
        }
      } catch (error: any) {
        console.error('Ошибка проверки сессии:', error);
        // Если это ошибка refresh token, очищаем сессию
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid Refresh Token')) {
          try {
            const supabase = createClient();
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Ошибка при выходе:', signOutError);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
        <p className="text-zinc-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-app pt-safe pb-safe items-center justify-center bg-black font-sans text-white">
      <main className="flex w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
            Добро пожаловать
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-400">
            Начните работу с приложением
          </p>
          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-full bg-white px-8 text-black transition-colors hover:bg-[#ccc] sm:w-auto"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-white/20 px-8 transition-colors hover:border-transparent hover:bg-white/10 sm:w-auto text-white"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
