# Подготовка к релизу Groxy (Android)

## Что сделано

1. **Сборка веб-части:** `npm run build` — статический экспорт в `out/`
2. **Синхронизация с Android:** `npx cap sync android` — копирование в `android/app/src/main/assets/public`
3. **Запуск в эмуляторе:** `npx cap run android` — сборка и установка на устройство/эмулятор
4. **Release AAB:** подписанный бандл для Google Play собран

## Файлы релиза

| Файл | Назначение |
|------|------------|
| `android/app/build/outputs/bundle/release/app-release.aab` | **Android App Bundle** — загрузка в Google Play Console |
| `android/app/build/outputs/apk/release/app-release.apk` | **Release APK** — загрузка в RuStore (если AAB требует ту же подпись, что и предыдущая версия) |

Подписание выполняется автоматически, если в корне `android/` есть `keystore.properties` с путём к keystore и паролями.

## Команды для следующих релизов

```bash
# 1. Сборка
npm run build

# 2. Синхронизация с Android
npx cap sync android

# 3. Запуск в эмуляторе (опционально)
npx cap run android

# 4. Сборка AAB для Play Store
cd android
.\gradlew.bat bundleRelease
```

AAB будет в: `android\app\build\outputs\bundle\release\app-release.aab`

**Сборка release APK для RuStore** (если магазин просит APK вместо AAB):

```bash
cd android
.\gradlew.bat assembleRelease
```

APK будет в: `android\app\build\outputs\apk\release\app-release.apk`

## Перед загрузкой в Play Console

- [ ] Увеличить `versionCode` и `versionName` в `android/app/build.gradle` (уже 4 и 1.03)
- [ ] Проверить подпись: в консоли должно быть указано то же приложение (applicationId `com.groxy.app`)
- [ ] Заполнить описание, скриншоты и контент-рейтинг в Play Console

## Версия приложения

- **Версия:** 1.03  
- **versionCode:** 4  

При следующем релизе измени в `android/app/build.gradle`: например `versionCode 5`, `versionName "1.04"`, и в `package.json`: `"version": "1.04"`.
