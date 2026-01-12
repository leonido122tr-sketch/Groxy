# Инструкция по использованию исходного файла иконки

## Шаг 1: Подготовка исходного файла

Поместите ваш исходный файл изображения иконки в любое место (например, в папку проекта) или укажите полный путь к нему.

**Требования к файлу:**
- Формат: PNG, JPG, или любой формат, поддерживаемый библиотекой sharp
- Рекомендуемый размер: минимум 512x512px (лучше 1024x1024px или больше)
- Квадратное изображение (соотношение 1:1) предпочтительно

## Шаг 2: Генерация всех иконок

Запустите скрипт генерации, указав путь к вашему исходному файлу:

```bash
node scripts/generate_all_from_source.js путь/к/вашему/файлу.png
```

**Примеры:**
```bash
# Если файл в корне проекта
node scripts/generate_all_from_source.js icon-source.png

# Если файл в папке assets
node scripts/generate_all_from_source.js assets/icon-source.png

# Полный путь
node scripts/generate_all_from_source.js C:\Users\User\Downloads\my-icon.png
```

## Шаг 3: Сборка APK

После генерации всех иконок соберите APK:

```bash
cd android
gradlew.bat clean assembleRelease bundleRelease
```

## Что будет создано:

1. **Android иконки** (для всех плотностей экрана):
   - `mipmap-mdpi/ic_launcher.png`
   - `mipmap-hdpi/ic_launcher.png`
   - `mipmap-xhdpi/ic_launcher.png`
   - `mipmap-xxhdpi/ic_launcher.png`
   - `mipmap-xxxhdpi/ic_launcher.png`
   - И соответствующие `ic_launcher_round.png` и `ic_launcher_foreground.png`

2. **Splash screen изображения**:
   - `drawable/splash.png`
   - Все портретные и ландшафтные варианты для разных плотностей

3. **Веб-иконки**:
   - `app/icon.png` (512x512)
   - `app/favicon.ico` (32x32)

Все файлы будут созданы автоматически из вашего исходного изображения с сохранением пропорций и качества.

