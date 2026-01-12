/**
 * Генерация всех иконок из SVG файла
 * Использует SVG как источник для создания всех необходимых иконок
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SVG_SOURCE = path.join(__dirname, '..', 'assets', 'icon-source.svg');

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

async function generateAllFromSVG() {
    try {
        if (!fs.existsSync(SVG_SOURCE)) {
            console.error(`❌ Ошибка: SVG файл не найден: ${SVG_SOURCE}`);
            process.exit(1);
        }

        console.log(`📁 Используется SVG: ${SVG_SOURCE}\n`);

        const androidResDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        const appDir = path.join(__dirname, '..', 'app');
        
        // Читаем SVG
        const svgBuffer = fs.readFileSync(SVG_SOURCE);
        const svgImage = sharp(svgBuffer);

        // 1. Генерация Android иконок
        console.log('🎨 Генерация Android иконок...\n');
        
        for (const [density, sizes] of Object.entries(ICON_SIZES)) {
            const mipmapDir = path.join(androidResDir, `mipmap-${density}`);
            
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            // ic_launcher.png (с темным фоном)
            const launcherBuffer = await svgImage
                .clone()
                .resize(sizes.launcher, sizes.launcher, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherBuffer);
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherBuffer);
            
            // ic_launcher_foreground.png (для адаптивных иконок - только куб, без отражения)
            // Создаем версию без отражения
            const foregroundBuffer = await svgImage
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

        // 2. Обновление векторного drawable
        console.log('\n📝 Обновление векторных drawable...\n');
        
        // Копируем SVG в drawable
        const drawableDir = path.join(androidResDir, 'drawable');
        if (!fs.existsSync(drawableDir)) {
            fs.mkdirSync(drawableDir, { recursive: true });
        }
        
        // Создаем упрощенную версию для векторного drawable (без отражения)
        const drawableSvg = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <!-- Wireframe Cube -->
    <path
        android:pathData="M32,40 L52,35 L52,50 L32,55 Z"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M42,35 L62,30 L62,45 L42,50 Z"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M32,40 L42,35"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M52,35 L62,30"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M52,50 L62,45"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M32,55 L42,50"
        android:strokeColor="#00D9FF"
        android:strokeWidth="2.5"
        android:fillColor="#00000000" />
    <path
        android:pathData="M32,40 A0.8,0.8 0 1,1 32,40 A0.8,0.8 0 1,1 32,40 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M52,35 A0.8,0.8 0 1,1 52,35 A0.8,0.8 0 1,1 52,35 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M52,50 A0.8,0.8 0 1,1 52,50 A0.8,0.8 0 1,1 52,50 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M32,55 A0.8,0.8 0 1,1 32,55 A0.8,0.8 0 1,1 32,55 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M42,35 A0.8,0.8 0 1,1 42,35 A0.8,0.8 0 1,1 42,35 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M62,30 A0.8,0.8 0 1,1 62,30 A0.8,0.8 0 1,1 62,30 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M62,45 A0.8,0.8 0 1,1 62,45 A0.8,0.8 0 1,1 62,45 Z"
        android:fillColor="#FFFFFF" />
    <path
        android:pathData="M42,50 A0.8,0.8 0 1,1 42,50 A0.8,0.8 0 1,1 42,50 Z"
        android:fillColor="#FFFFFF" />
</vector>`;
        
        fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), drawableSvg);
        fs.writeFileSync(path.join(androidResDir, 'drawable-v24', 'ic_launcher_foreground.xml'), drawableSvg);
        console.log('  ✓ ic_launcher_foreground.xml обновлен');

        // 3. Генерация splash screen
        console.log('\n🖼️  Генерация splash screen...\n');
        
        const baseSplash = await svgImage
            .clone()
            .resize(BASE_SPLASH_SIZE, BASE_SPLASH_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(androidResDir, 'drawable', 'splash.png'), baseSplash);
        console.log(`  ✓ drawable/splash.png (${BASE_SPLASH_SIZE}x${BASE_SPLASH_SIZE})`);
        
        for (const [folder, size] of Object.entries(SPLASH_SIZES)) {
            const drawableDir = path.join(androidResDir, `drawable-${folder}`);
            
            if (!fs.existsSync(drawableDir)) {
                fs.mkdirSync(drawableDir, { recursive: true });
            }
            
            const splashBuffer = await svgImage
                .clone()
                .resize(size.width, size.height, {
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 1 }
                })
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(drawableDir, 'splash.png'), splashBuffer);
            console.log(`  ✓ drawable-${folder}/splash.png (${size.width}x${size.height})`);
        }

        // 4. Генерация favicon и веб-иконок
        console.log('\n🌐 Генерация favicon и веб-иконок...\n');
        
        const icon512 = await svgImage
            .clone()
            .resize(512, 512, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
        fs.writeFileSync(path.join(appDir, 'icon.svg'), fs.readFileSync(SVG_SOURCE));
        console.log(`  ✓ app/icon.png (512x512)`);
        console.log(`  ✓ app/icon.svg`);
        
        const favicon32 = await svgImage
            .clone()
            .resize(32, 32, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 1 }
            })
            .png()
            .toBuffer();
        
        fs.writeFileSync(path.join(appDir, 'favicon.ico'), favicon32);
        console.log(`  ✓ app/favicon.ico (32x32)`);

        console.log('\n✅ Все иконки успешно сгенерированы!');
        console.log('\n📦 Теперь выполните:');
        console.log('  cd android && gradlew.bat clean assembleRelease bundleRelease');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

generateAllFromSVG();

