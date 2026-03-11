# Вход через Google (Supabase)

## 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → проект → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → тип **Web application**.
3. **Authorized redirect URIs** — добавить:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   `<PROJECT_REF>` — из URL Supabase (например `abcdefgh.supabase.co` → `https://abcdefgh.supabase.co/auth/v1/callback`).
4. Сохранить **Client ID** и **Client Secret**.

## 2. Supabase Dashboard

1. **Authentication** → **Providers** → **Google** — включить.
2. Вставить **Client ID** и **Client Secret** из Google.
3. **Authentication** → **URL Configuration**:
   - **Site URL** — основной URL приложения (например `https://your-app.com` или `http://localhost:3000` для dev).
   - **Redirect URLs** — добавить **каждый** URL, куда Supabase может отправить пользователя после входа:
     - для веба: `https://your-app.com/auth/callback`, `http://localhost:3000/auth/callback`;
     - **для APK (обязательно)** — custom scheme: `com.groxy.app://auth/callback`.
   В Google Console этот custom scheme **не** добавляют — там только `https://<PROJECT_REF>.supabase.co/auth/v1/callback`.

## 3. Проверка

После деплоя откройте **Вход** → **Продолжить с Google**. Должен открыться экран Google, после выбора аккаунта — редирект на `/auth/callback` и переход в приложение.

## Проблемы

- **redirect_uri_mismatch** — в Google Console должен быть точно Supabase callback `...supabase.co/auth/v1/callback`, а в Supabase Redirect URLs — ваш `/auth/callback`.
- **PKCE** — в проекте уже включён `flowType: 'pkce'`; callback вызывает `exchangeCodeForSession` при наличии `?code=` в URL.
