/**
 * Генерация всех иконок Android из исходного файла изображения
 * Поместите исходный файл изображения в assets/icon-source.png или укажите путь
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Путь к исходному файлу изображения
const SOURCE_ICON_PATH = path.join(__dirname, '..', 'assets', 'icon-source.png');

// Размеры для разных плотностей экрана Android
const SIZES = {
    'mdpi': { launcher: 48, foreground: 108, round: 48 },
    'hdpi': { launcher: 72, foreground: 162, round: 72 },
    'xhdpi': { launcher: 96, foreground: 216, round: 96 },
    'xxhdpi': { launcher: 144, foreground: 324, round: 144 },
    'xxxhdpi': { launcher: 192, foreground: 432, round: 192 }
};

async function generateIconsFromSource(sourcePath) {
    try {
        // Проверяем существование исходного файла
        if (!fs.existsSync(sourcePath)) {
            console.error(`❌ Ошибка: исходный файл не найден: ${sourcePath}`);
            console.log('\nПожалуйста:');
            console.log(`1. Поместите ваше изображение иконки в: ${sourcePath}`);
            console.log('2. Или укажите другой путь, изменив SOURCE_ICON_PATH в скрипте');
            process.exit(1);
        }

        console.log(`📁 Используется исходный файл: ${sourcePath}\n`);

        // Получаем метаданные исходного изображения
        const metadata = await sharp(sourcePath).metadata();
        console.log(`📐 Размер исходного изображения: ${metadata.width}x${metadata.height}px`);
        console.log(`📋 Формат: ${metadata.format}\n`);

        const baseDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

        // Читаем исходное изображение один раз
        const sourceImage = sharp(sourcePath);

        for (const [density, sizes] of Object.entries(SIZES)) {
            const mipmapDir = path.join(baseDir, `mipmap-${density}`);
            
            // Создаем папку если не существует
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            console.log(`🔄 Генерация иконок для ${density}...`);
            
            // Генерируем ic_launcher.png (полная иконка с фоном)
            const launcherBuffer = await sourceImage
                .clone()
                .resize(sizes.launcher, sizes.launcher, {
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10, alpha: 1 } // Темный фон #0A0A0A
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuffer);
            console.log(`  ✓ ic_launcher.png (${sizes.launcher}x${sizes.launcher})`);
            
            // Генерируем ic_launcher_round.png (та же иконка, Android сам сделает круглой)
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherBuffer);
            console.log(`  ✓ ic_launcher_round.png (${sizes.round}x${sizes.round})`);
            
            // Генерируем ic_launcher_foreground.png (только куб, без фона, для адаптивных иконок)
            // Используем немного больший размер для foreground
            const foregroundBuffer = await sourceImage
                .clone()
                .resize(sizes.foreground, sizes.foreground, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 } // Прозрачный фон
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundBuffer);
            console.log(`  ✓ ic_launcher_foreground.png (${sizes.foreground}x${sizes.foreground})`);
        }
        
        console.log('\n✅ Все иконки успешно сгенерированы из исходного файла!');
        
    } catch (error) {
        console.error('❌ Ошибка при генерации иконок:', error);
        process.exit(1);
    }
}

// Проверяем аргументы командной строки для альтернативного пути
const customPath = process.argv[2];
const sourcePath = customPath ? path.resolve(customPath) : SOURCE_ICON_PATH;

generateIconsFromSource(sourcePath);

