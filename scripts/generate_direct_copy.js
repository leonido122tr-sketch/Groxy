/**
 * Прямое копирование исходного PNG с минимальным масштабированием
 * Сохраняет точное соответствие исходному файлу
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

// Размеры для Android иконок
const ICON_SIZES = {
    'ldpi': 36,
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// Для адаптивных иконок делаем изображение намного больше (250%),
// чтобы даже после обрезки системой оно заполняло всю видимую область без пустых мест
// Android адаптивные иконки обрезают края, но увеличенное изображение заполнит всю область
const FOREGROUND_SIZES = {
    'ldpi': 203,    // 250% от 81dp - максимальное заполнение области
    'mdpi': 270,    // 250% от 108dp - максимальное заполнение области
    'hdpi': 405,    // 250% от 162dp
    'xhdpi': 540,   // 250% от 216dp
    'xxhdpi': 810,  // 250% от 324dp
    'xxxhdpi': 1080 // 250% от 432dp
};

async function generateDirectCopy() {
    try {
        console.log(`📁 Используется исходный PNG: ${resolvedSourcePath}\n`);

        const metadata = await sharp(resolvedSourcePath).metadata();
        console.log(`📐 Исходный размер: ${metadata.width}x${metadata.height}px\n`);

        const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        const appDir = path.join(__dirname, '..', 'app');
        
        const sourceImage = sharp(resolvedSourcePath);

        console.log('🎨 Генерация Android иконок (прямое копирование)...\n');
        
        // Генерируем иконки
        for (const [density, size] of Object.entries(ICON_SIZES)) {
            const mipmapDir = path.join(androidResDir, `mipmap-${density}`);
            
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            // ic_launcher.png - заполняем весь размер без отступов
            const launcherBuffer = await sourceImage
                .clone()
                .resize(size, size, {
                    fit: 'cover', // Заполняем весь размер, обрезая при необходимости
                    position: 'center',
                    kernel: sharp.kernel.lanczos3
                })
                .png({ quality: 100, compressionLevel: 6 })
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuffer);
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherBuffer);
            
            // ic_launcher_foreground.png - для адаптивных иконок
            // Делаем изображение больше, чтобы оно заполняло всю видимую область
            const foregroundSize = FOREGROUND_SIZES[density];
            const foregroundBuffer = await sourceImage
                .clone()
                .resize(foregroundSize, foregroundSize, {
                    fit: 'cover', // Заполняем увеличенный размер
                    position: 'center',
                    kernel: sharp.kernel.lanczos3
                })
                .png({ quality: 100, compressionLevel: 6 })
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundBuffer);
            
            console.log(`  ✓ ${density}: ${size}x${size}, foreground: ${foregroundSize}x${foregroundSize}`);
        }

        // Splash screens - заполняем весь экран без пустых мест
        console.log('\n🖼️  Генерация splash screen (полный размер без отступов)...\n');
        
        const baseSplash = await sourceImage
            .clone()
            .resize(1080, 1080, {
                fit: 'cover', // Заполняем весь размер экрана
                position: 'center',
                kernel: sharp.kernel.lanczos3
            })
            .png({ quality: 100, compressionLevel: 6 })
            .toBuffer();
        
        fs.writeFileSync(path.join(androidResDir, 'drawable', 'splash.png'), baseSplash);
        console.log(`  ✓ drawable/splash.png (1080x1080, заполняет весь экран)`);
        
        // Favicon
        console.log('\n🌐 Генерация favicon...\n');
        
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

        console.log('\n✅ Все иконки созданы прямым копированием из исходного PNG!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

generateDirectCopy();

