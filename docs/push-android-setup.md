# Push-уведомления на Android

Чтобы на устройстве приходили push о новых комментариях в темах форума, нужна настройка Firebase и приложения.

## 1. Firebase

1. [Firebase Console](https://console.firebase.google.com/) → ваш проект (или создайте).
2. Добавьте приложение Android: пакет **`com.groxy.app`** (из `capacitor.config.ts` / `appId`).
3. Скачайте **`google-services.json`** и положите в **`android/app/`** (на уровень с `build.gradle` приложения).
4. **Cloud Messaging**: в настройках проекта (Project settings → Cloud Messaging) при необходимости включите FCM. Для отправки с бэкенда понадобится **Server key** (legacy) — его нужно добавить в Supabase как секрет **`FCM_SERVER_KEY`** (см. инструкцию по Edge Function).

## 2. Приложение

- Регистрация FCM-токена и сохранение в таблицу **`push_tokens`** выполняются автоматически при входе пользователя в приложение (на нативной платформе).
- В настройках профиля («Уведомления на устройстве») пользователь может отключить отправку пушей; список уведомлений в приложении (иконка колокольчика) при этом остаётся.

## 3. Иконка уведомлений (опционально)

На Android в манифесте можно указать белую иконку для push (иначе может отображаться стандартная):

- В **`android/app/src/main/AndroidManifest.xml`** в `<application>` добавьте:
  ```xml
  <meta-data
      android:name="com.google.firebase.messaging.default_notification_icon"
      android:resource="@mipmap/ic_notification" />
  ```
- Создайте ресурс **ic_notification** (белый силуэт на прозрачном фоне), например через Android Studio (Image Asset → Notification Icons).

## 4. Синхронизация Capacitor

После добавления `@capacitor/push-notifications` и `google-services.json`:

```bash
npx cap sync android
```

Соберите и запустите приложение; при первом заходе в защищённую зону запросится разрешение на уведомления, токен сохранится в БД.
