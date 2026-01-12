# Groxy

Приложение на Next.js с аутентификацией через Supabase.

## Возможности

- ✅ Аутентификация пользователей (регистрация и вход)
- ✅ Защищенные маршруты (dashboard)
- ✅ Настройка профиля
- ✅ Тест подключения к Supabase
- ✅ Адаптивный дизайн с поддержкой темной темы

## Настройка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env.local` в корне проекта:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Маршруты

- `/` - Главная страница
- `/login` - Страница входа
- `/register` - Страница регистрации
- `/dashboard` - Панель управления (требует аутентификации)
- `/profile/setup` - Настройка профиля
- `/test-connection` - Тест подключения к Supabase
- `/auth/callback` - Callback для аутентификации

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
