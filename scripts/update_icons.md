# Инструкция по обновлению иконок

## Что уже сделано:
1. ✅ Обновлены адаптивные иконки (foreground и background) для Android 8.0+
2. ✅ Создан SVG шаблон для генерации PNG иконок

## Что нужно сделать вручную:

### 1. PNG иконки для старых версий Android (mipmap-*dpi)

Используйте онлайн-инструмент Android Asset Studio:
1. Откройте: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Загрузите файл: `scripts/icon_wireframe_cube.svg`
3. Выберите опцию "Adaptive and Legacy"
4. Скачайте ZIP архив с иконками
5. Скопируйте файлы из ZIP в соответствующие папки:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
   - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`
   - И соответствующие `ic_launcher_round.png` файлы

### 2. Splash Screen изображения

Используйте онлайн-конвертер SVG в PNG:
1. Откройте: https://convertio.co/svg-png/
2. Загрузите: `scripts/icon_wireframe_cube.svg`
3. Создайте PNG файлы следующих размеров:
   - 1080x1080 (для xxxhdpi)
   - 720x720 (для xxhdpi)
   - 480x480 (для xhdpi)
   - 360x360 (для hdpi)
   - 240x240 (для mdpi)
4. Скопируйте в папки:
   - `android/app/src/main/res/drawable/splash.png`
   - `android/app/src/main/res/drawable-port-mdpi/splash.png`
   - `android/app/src/main/res/drawable-port-hdpi/splash.png`
   - `android/app/src/main/res/drawable-port-xhdpi/splash.png`
   - `android/app/src/main/res/drawable-port-xxhdpi/splash.png`
   - `android/app/src/main/res/drawable-port-xxxhdpi/splash.png`

### 3. Favicon для веб-версии

Favicon будет автоматически обновлен при следующей сборке Next.js, если разместить файл `icon.png` или `favicon.ico` в папке `app/`.

