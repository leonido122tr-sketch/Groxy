/**
 * Генерация splash screen для всех ориентаций и плотностей
 * Заполняет весь экран без пустых мест
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourcePath = process.argv[2] || path.join(__dirname, '..', 'assets', 'icon-source.png');

if (!fs.existsSync(sourcePath)) {
    console.error('❌ Исходный PNG файл не найден:', sourcePath);
    process.exit(1);
}

const resolvedSourcePath = path.resolve(sourcePath);

// Размеры для splash screen (заполняем весь экран)
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

async function generateSplashScreens() {
    try {
        console.log(`📁 Используется исходный PNG: ${resolvedSourcePath}\n`);

        const metadata = await sharp(resolvedSourcePath).metadata();
        console.log(`📐 Исходный размер: ${metadata.width}x${metadata.height}px\n`);

        const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        const sourceImage = sharp(resolvedSourcePath);

        console.log('🖼️  Генерация splash screen (заполнение всего экрана)...\n');
        
        // Базовый splash (квадратный)
        const baseSplash = await sourceImage
            .clone()
            .resize(BASE_SPLASH_SIZE, BASE_SPLASH_SIZE, {
                fit: 'cover', // Заполняем весь размер
                position: 'center',
                kernel: sharp.kernel.lanczos3
            })
            .png({ quality: 100, compressionLevel: 6 })
            .toBuffer();
        
        fs.writeFileSync(path.join(androidResDir, 'drawable', 'splash.png'), baseSplash);
        console.log(`  ✓ drawable/splash.png (${BASE_SPLASH_SIZE}x${BASE_SPLASH_SIZE})`);
        
        // Splash для разных ориентаций и плотностей
        for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
            const drawableDir = path.join(androidResDir, `drawable-${folder}`);
            
            if (!fs.existsSync(drawableDir)) {
                fs.mkdirSync(drawableDir, { recursive: true });
            }
            
            // Заполняем весь размер экрана, обрезая при необходимости
            const splashBuffer = await sourceImage
                .clone()
                .resize(size.width, size.height, {
                    fit: 'cover', // Заполняем весь размер экрана без пустых мест
                    position: 'center',
                    kernel: sharp.kernel.lanczos3
                })
                .png({ quality: 100, compressionLevel: 6 })
                .toBuffer();
            
            fs.writeFileSync(path.join(drawableDir, 'splash.png'), splashBuffer);
            console.log(`  ✓ drawable-${folder}/splash.png (${size.width}x${size.height}, заполняет весь экран)`);
        }

        console.log('\n✅ Все splash screen изображения сгенерированы с заполнением всего экрана!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

generateSplashScreens();

