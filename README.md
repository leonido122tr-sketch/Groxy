# Groxy

Приложение на Next.js с аутентификацией через Supabase.

## Возможности

- ✅ Аутентификация пользователей (регистрация и вход)
- ✅ Защищенные маршруты (dashboard)
- ✅ Настройка профиля
- ✅ Тест подключения к Supabase
- ✅ Адаптивный дизайн с поддержкой темной темы

## Требования

- **Node.js** — для веб-разработки и сборки
- **Java 21 (JDK 21)** — для сборки Android (APK). Установите, например, [Eclipse Temurin 21](https://adoptium.net/) или Oracle JDK 21. Проверка: `java -version` должен показать версию 21.

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

**Supabase:** таблица `profiles` в этом проекте использует русские имена колонок; первичный ключ — **`идентификатор`** (не `id`). RLS и триггеры в Supabase должны ссылаться на `идентификатор`. Подробнее: `docs/SUPABASE_SCHEMA.md`.

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## Запуск в браузере (как в APK)

Сборка для Android (Capacitor) — это **статический экспорт** в папку `out/`. В эмуляторе/телефоне тот же `out/` отдаётся WebView’ом, поэтому приложение там открывается.

Чтобы открыть **ту же самую сборку** в обычном браузере:

1. Соберите проект: `npm run build`
2. Запустите раздачу статики: `npm run serve`
3. Откройте в браузере: [http://localhost:3000](http://localhost:3000)

**Важно:** не открывайте `out/index.html` напрямую (двойной клик по файлу). Так браузер открывает страницу по схеме `file://`, из‑за чего скрипты и запросы могут блокироваться. Нужен именно локальный сервер (`npm run dev` или `npm run serve`).

- **Разработка в браузере:** `npm run dev` → http://localhost:3000  
- **Проверка сборки как в APK:** `npm run build` и `npm run serve` → http://localhost:3000  

## Сборка Android (APK)

Нужен **JDK 21** (см. раздел «Требования»).

**Быстрый цикл (сборка + синхронизация):**
```bash
npm run android:build
```
Собирает проект (Next.js с webpack) и копирует `out/` в `android/`.

**Установка и запуск на эмуляторе/устройстве:**  
Рабочий эмулятор — **порт 5556** (AVD groxyPlay3). Запуск: `emulator -avd groxyPlay3 -port 5556`, затем:
```bash
npm run android:run:5556
```
Устанавливает debug APK и открывает приложение на emulator-5556. Для другого устройства/порта: `ANDROID_EMULATOR_PORT=5554 npm run android:run` или `npm run android:run` (первое устройство в списке).

**Вручную:**
1. Сборка веб-части: `npm run build:webpack` (или `npm run build -- --webpack`)
2. Синхронизация: `npx cap sync android`
3. Сборка APK: `cd android && ./gradlew assembleRelease` (релизный APK в `android/app/build/outputs/apk/`).

## Эмулятор и WebView

Для полной визуализации (градиенты, тени) нужен эмулятор с **современным Android System WebView**. В проекте используется эмулятор на **порту 5556** (AVD **groxyPlay3**); установка и запуск приложения: `npm run android:run:5556`.

Рекомендуется:
1. Установить образ с Play Store:  
   `sdkmanager "system-images;android-36;google_apis_playstore;x86_64"`
2. Создать AVD (например **groxyPlay3**) на этом образе.
3. Запускать приложение в этом эмуляторе — цвета и интерфейс будут как в браузере.

На старом AVD (например api-33 без обновлений) WebView может не поддерживать современный CSS (oklch/oklab), из‑за чего кнопки и карточки выглядят «плоско». В коде есть fallback (кнопки с `rgb()`-градиентами, тени для `.native-app`), но для одинакового с вебом вида лучше использовать свежий образ с Play Store. В таком эмуляторе можно обновить WebView: Play Store → Android System WebView → Обновить.

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
