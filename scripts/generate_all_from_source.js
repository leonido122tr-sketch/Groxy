/**
 * Генерация всех иконок, splash screen и favicon из исходного файла
 * Использование: node scripts/generate_all_from_source.js путь/к/файлу.png
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Получаем путь к исходному файлу из аргументов
const sourcePath = process.argv[2];

if (!sourcePath) {
    console.error('❌ Ошибка: не указан путь к исходному файлу');
    console.log('\nИспользование:');
    console.log('  node scripts/generate_all_from_source.js путь/к/файлу.png');
    console.log('\nПример:');
    console.log('  node scripts/generate_all_from_source.js assets/icon-source.png');
    process.exit(1);
}

const resolvedSourcePath = path.resolve(sourcePath);

if (!fs.existsSync(resolvedSourcePath)) {
    console.error(`❌ Ошибка: файл не найден: ${resolvedSourcePath}`);
    process.exit(1);
}

// Размеры для Android иконок
const ICON_SIZES = {
    'mdpi': { launcher: 48, foreground: 108, round: 48 },
    'hdpi': { launcher: 72, foreground: 162, round: 72 },
    'xhdpi': { launcher: 96, foreground: 216, round: 96 },
    'xxhdpi': { launcher: 144, foreground: 324, round: 144 },
    'xxxhdpi': { launcher: 192, foreground: 432, round: 192 }
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

async function generateAllFromSource() {
    try {
        console.log(`📁 Исходный файл: ${resolvedSourcePath}\n`);

        // Получаем метаданные
        const metadata = await sharp(resolvedSourcePath).metadata();
        console.log(`📐 Размер: ${metadata.width}x${metadata.height}px`);
        console.log(`📋 Формат: ${metadata.format}\n`);

        const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        const appDir = path.join(__dirname, '..', 'app');
        
        const sourceImage = sharp(resolvedSourcePath);

        // 1. Генерация иконок Android
        console.log('🎨 Генерация Android иконок...\n');
        
        for (const [density, sizes] of Object.entries(ICON_SIZES)) {
            const mipmapDir = path.join(androidResDir, `mipmap-${density}`);
            
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            // ic_launcher.png (с темным фоном)
            const launcherBuffer = await sourceImage
                .clone()
                .resize(sizes.launcher, sizes.launcher, {
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10, alpha: 1 }
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuffer);
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherBuffer);
            
            // ic_launcher_foreground.png (прозрачный фон)
            const foregroundBuffer = await sourceImage
                .clone()
                .resize(sizes.foreground, sizes.foreground, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundBuffer);
            
            console.log(`  ✓ ${density}: ${sizes.launcher}x${sizes.launcher}, ${sizes.foreground}x${sizes.foreground}`);
        }

        // 2. Генерация splash screen
        console.log('\n🖼️  Генерация splash screen...\n');
        
        // Базовый splash
        const baseSplash = await sourceImage
            .clone()
            .resize(BASE_SPLASH_SIZE, BASE_SPLASH_SIZE, {
                fit: 'contain',
                background: { r: 10, g: 10, b: 10, alpha: 1 }
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
            
            const splashBuffer = await sourceImage
                .clone()
                .resize(size.width, size.height, {
                    fit: 'contain',
                    background: { r: 10, g: 10, b: 10, alpha: 1 }
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(drawableDir, 'splash.png'), splashBuffer);
            console.log(`  ✓ drawable-${folder}/splash.png (${size.width}x${size.height})`);
        }

        // 3. Генерация favicon и веб-иконок
        console.log('\n🌐 Генерация favicon и веб-иконок...\n');
        
        // icon.png (512x512 для Next.js)
        const icon512 = await sourceImage
            .clone()
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 10, g: 10, b: 10, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
        console.log(`  ✓ app/icon.png (512x512)`);
        
        // favicon.ico (32x32)
        const favicon32 = await sourceImage
            .clone()
            .resize(32, 32, {
                fit: 'contain',
                background: { r: 10, g: 10, b: 10, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'favicon.ico'), favicon32);
        console.log(`  ✓ app/favicon.ico (32x32)`);

        console.log('\n✅ Все иконки успешно сгенерированы из исходного файла!');
        console.log('\n📦 Теперь выполните:');
        console.log('  cd android && gradlew.bat assembleRelease');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

generateAllFromSource();

