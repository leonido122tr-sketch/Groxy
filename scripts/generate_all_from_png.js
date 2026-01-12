/**
 * Генерация всех иконок из исходного PNG файла
 * Просто масштабирует исходный PNG до нужных размеров без изменений
 * Использование: node scripts/generate_all_from_png.js путь/к/файлу.png
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Получаем путь к исходному файлу из аргументов
const sourcePath = process.argv[2] || path.join(__dirname, '..', 'assets', 'icon-source.png');

if (!sourcePath || !fs.existsSync(sourcePath)) {
    console.error('❌ Ошибка: исходный PNG файл не найден');
    console.log('\nИспользование:');
    console.log('  node scripts/generate_all_from_png.js путь/к/вашему/файлу.png');
    console.log('\nИли поместите файл в: assets/icon-source.png');
    process.exit(1);
}

const resolvedSourcePath = path.resolve(sourcePath);

// Размеры для Android иконок
const ICON_SIZES = {
    'mdpi': { launcher: 48, foreground: 108 },
    'hdpi': { launcher: 72, foreground: 162 },
    'xhdpi': { launcher: 96, foreground: 216 },
    'xxhdpi': { launcher: 144, foreground: 324 },
    'xxxhdpi': { launcher: 192, foreground: 432 }
};

// Размеры для splash screen
const SPLASH_SIZES = {
    'port-mdpi': { width: 480, height: 800 },
    'port-hdpi': { width: 720, height: 1280 },
    'port-xhdpi': { width: 960, height: 1600 },
    'port-xxhdpi': { width: 1440, height: 2560 },
    'port-xxxhdpi': { width: 1920, height: 3200 },
    'land-mdpi': { width: 800, height: 480 },
    'land-hdpi': { width: 1280, height: 720 },
    'land-xhdpi': { width: 1600, height: 960 },
    'land-xxhdpi': { width: 2560, height: 1440 },
    'land-xxxhdpi': { width: 3200, height: 1920 }
};

const BASE_SPLASH_SIZE = 1080;

async function generateAllFromPNG() {
    try {
        console.log(`📁 Используется исходный PNG: ${resolvedSourcePath}\n`);

        // Проверяем исходный файл
        const metadata = await sharp(resolvedSourcePath).metadata();
        console.log(`📐 Размер исходного файла: ${metadata.width}x${metadata.height}px`);
        console.log(`📋 Формат: ${metadata.format}\n`);

        const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        const appDir = path.join(__dirname, '..', 'app');
        
        const sourceImage = sharp(resolvedSourcePath);

        // 1. Генерация Android иконок
        console.log('🎨 Генерация Android иконок из исходного PNG...\n');
        
        for (const [density, sizes] of Object.entries(ICON_SIZES)) {
            const mipmapDir = path.join(androidResDir, `mipmap-${density}`);
            
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            // ic_launcher.png - масштабируем исходный PNG, заполняя весь размер
            const launcherBuffer = await sourceImage
                .clone()
                .resize(sizes.launcher, sizes.launcher, {
                    fit: 'cover', // Используем cover для заполнения всего размера
                    position: 'center'
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuffer);
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherBuffer);
            
            // ic_launcher_foreground.png - для адаптивных иконок
            const foregroundBuffer = await sourceImage
                .clone()
                .resize(sizes.foreground, sizes.foreground, {
                    fit: 'cover', // Используем cover для заполнения
                    position: 'center'
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundBuffer);
            
            console.log(`  ✓ ${density}: ${sizes.launcher}x${sizes.launcher}, ${sizes.foreground}x${sizes.foreground}`);
        }

        // 2. Генерация splash screen
        console.log('\n🖼️  Генерация splash screen из исходного PNG...\n');
        
        // Базовый splash
        const baseSplash = await sourceImage
            .clone()
            .resize(BASE_SPLASH_SIZE, BASE_SPLASH_SIZE, {
                fit: 'cover',
                position: 'center'
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(androidResDir, 'drawable', 'splash.png'), baseSplash);
        console.log(`  ✓ drawable/splash.png (${BASE_SPLASH_SIZE}x${BASE_SPLASH_SIZE})`);
        
        // Splash для разных плотностей
        for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
            const drawableDir = path.join(androidResDir, `drawable-${folder}`);
            
            if (!fs.existsSync(drawableDir)) {
                fs.mkdirSync(drawableDir, { recursive: true });
            }
            
            // Для портретной ориентации - квадрат по центру
            // Для ландшафтной - квадрат по центру
            const splashBuffer = await sourceImage
                .clone()
                .resize(size.width, size.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(drawableDir, 'splash.png'), splashBuffer);
            console.log(`  ✓ drawable-${folder}/splash.png (${size.width}x${size.height})`);
        }

        // 3. Генерация favicon и веб-иконок
        console.log('\n🌐 Генерация favicon и веб-иконок из исходного PNG...\n');
        
        // icon.png (512x512 для Next.js)
        const icon512 = await sourceImage
            .clone()
            .resize(512, 512, {
                fit: 'cover',
                position: 'center'
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
        console.log(`  ✓ app/icon.png (512x512)`);
        
        // favicon.ico (32x32)
        const favicon32 = await sourceImage
            .clone()
            .resize(32, 32, {
                fit: 'cover',
                position: 'center'
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'favicon.ico'), favicon32);
        console.log(`  ✓ app/favicon.ico (32x32)`);

        console.log('\n✅ Все иконки успешно созданы из исходного PNG файла!');
        console.log('   Исходное изображение используется без изменений, только масштабируется.\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

generateAllFromPNG();

