/**
 * Генерация всех PNG иконок для Android из SVG
 * Использует sharp для конвертации SVG в PNG
 */

const fs = require('fs');
const path = require('path');

// Размеры для разных плотностей экрана Android
const SIZES = {
    'mdpi': { launcher: 48, foreground: 108, round: 48 },
    'hdpi': { launcher: 72, foreground: 162, round: 72 },
    'xhdpi': { launcher: 96, foreground: 216, round: 96 },
    'xxhdpi': { launcher: 144, foreground: 324, round: 144 },
    'xxxhdpi': { launcher: 192, foreground: 432, round: 192 }
};

// SVG содержимое wireframe куба
function createIconSVG(size, isForeground = false) {
    // Используем viewBox 512x512 и масштабируем к нужному размеру
    const viewBoxSize = 512;
    const padding = size * 0.15; // 15% отступы для безопасности
    const drawSize = size - (padding * 2);
    const scale = drawSize / viewBoxSize;
    const offsetX = padding;
    const offsetY = padding;
    
    // Координаты из оригинального SVG (относительно 512x512)
    const baseCoords = {
        front: {
            topLeft: { x: 142, y: 213 },
            topRight: { x: 284, y: 166 },
            bottomRight: { x: 284, y: 308 },
            bottomLeft: { x: 142, y: 355 }
        },
        back: {
            topLeft: { x: 237, y: 166 },
            topRight: { x: 379, y: 119 },
            bottomRight: { x: 379, y: 261 },
            bottomLeft: { x: 237, y: 308 }
        }
    };
    
    // Масштабируем координаты
    const coords = {
        front: {
            topLeft: { x: offsetX + baseCoords.front.topLeft.x * scale, y: offsetY + baseCoords.front.topLeft.y * scale },
            topRight: { x: offsetX + baseCoords.front.topRight.x * scale, y: offsetY + baseCoords.front.topRight.y * scale },
            bottomRight: { x: offsetX + baseCoords.front.bottomRight.x * scale, y: offsetY + baseCoords.front.bottomRight.y * scale },
            bottomLeft: { x: offsetX + baseCoords.front.bottomLeft.x * scale, y: offsetY + baseCoords.front.bottomLeft.y * scale }
        },
        back: {
            topLeft: { x: offsetX + baseCoords.back.topLeft.x * scale, y: offsetY + baseCoords.back.topLeft.y * scale },
            topRight: { x: offsetX + baseCoords.back.topRight.x * scale, y: offsetY + baseCoords.back.topRight.y * scale },
            bottomRight: { x: offsetX + baseCoords.back.bottomRight.x * scale, y: offsetY + baseCoords.back.bottomRight.y * scale },
            bottomLeft: { x: offsetX + baseCoords.back.bottomLeft.x * scale, y: offsetY + baseCoords.back.bottomLeft.y * scale }
        }
    };
    
    const strokeWidth = Math.max(1.5, Math.floor(14 * scale));
    const vertexRadius = Math.max(1.5, Math.floor(9 * scale));

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${isForeground ? '' : '<rect width="' + size + '" height="' + size + '" fill="#0A0A0A"/>'}
  <!-- Wireframe Cube - 3D perspective -->
  <!-- Front face -->
  <path
    d="M${coords.front.topLeft.x},${coords.front.topLeft.y} L${coords.front.topRight.x},${coords.front.topRight.y} L${coords.front.bottomRight.x},${coords.front.bottomRight.y} L${coords.front.bottomLeft.x},${coords.front.bottomLeft.y} Z"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
  <!-- Back face -->
  <path
    d="M${coords.back.topLeft.x},${coords.back.topLeft.y} L${coords.back.topRight.x},${coords.back.topRight.y} L${coords.back.bottomRight.x},${coords.back.bottomRight.y} L${coords.back.bottomLeft.x},${coords.back.bottomLeft.y} Z"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
  <!-- Connecting lines (3D perspective) -->
  <path
    d="M${coords.front.topLeft.x},${coords.front.topLeft.y} L${coords.back.topLeft.x},${coords.back.topLeft.y}"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M${coords.front.topRight.x},${coords.front.topRight.y} L${coords.back.topRight.x},${coords.back.topRight.y}"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M${coords.front.bottomRight.x},${coords.front.bottomRight.y} L${coords.back.bottomRight.x},${coords.back.bottomRight.y}"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M${coords.front.bottomLeft.x},${coords.front.bottomLeft.y} L${coords.back.bottomLeft.x},${coords.back.bottomLeft.y}"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"/>
  
  <!-- Glow effect at vertices -->
  <circle cx="${coords.front.topLeft.x}" cy="${coords.front.topLeft.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.front.topRight.x}" cy="${coords.front.topRight.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.front.bottomRight.x}" cy="${coords.front.bottomRight.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.front.bottomLeft.x}" cy="${coords.front.bottomLeft.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.back.topLeft.x}" cy="${coords.back.topLeft.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.back.topRight.x}" cy="${coords.back.topRight.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.back.bottomRight.x}" cy="${coords.back.bottomRight.y}" r="${vertexRadius}" fill="#FFFFFF"/>
  <circle cx="${coords.back.bottomLeft.x}" cy="${coords.back.bottomLeft.y}" r="${vertexRadius}" fill="#FFFFFF"/>
</svg>`;
}

async function generateIcons() {
    try {
        const sharp = require('sharp');
        console.log('Используется библиотека sharp для генерации PNG...\n');
        
        const baseDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
        
        for (const [density, sizes] of Object.entries(SIZES)) {
            const mipmapDir = path.join(baseDir, `mipmap-${density}`);
            
            // Создаем папку если не существует
            if (!fs.existsSync(mipmapDir)) {
                fs.mkdirSync(mipmapDir, { recursive: true });
            }
            
            console.log(`Генерация иконок для ${density}...`);
            
            // Генерируем ic_launcher.png (с фоном)
            const launcherSvg = createIconSVG(sizes.launcher, false);
            const launcherPng = await sharp(Buffer.from(launcherSvg))
                .png()
                .toBuffer();
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher.png'), launcherPng);
            console.log(`  ✓ ic_launcher.png (${sizes.launcher}x${sizes.launcher})`);
            
            // Генерируем ic_launcher_round.png (та же иконка, Android сам сделает круглой)
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_round.png'), launcherPng);
            console.log(`  ✓ ic_launcher_round.png (${sizes.round}x${sizes.round})`);
            
            // Генерируем ic_launcher_foreground.png (без фона, только куб)
            const foregroundSvg = createIconSVG(sizes.foreground, true);
            const foregroundPng = await sharp(Buffer.from(foregroundSvg))
                .png()
                .toBuffer();
            fs.writeFileSync(path.join(mipmapDir, 'ic_launcher_foreground.png'), foregroundPng);
            console.log(`  ✓ ic_launcher_foreground.png (${sizes.foreground}x${sizes.foreground})`);
        }
        
        console.log('\n✅ Все иконки успешно сгенерированы!');
        
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('sharp')) {
            console.error('Ошибка: библиотека sharp не установлена.');
            console.log('\nУстановите sharp командой:');
            console.log('npm install sharp --save-dev');
            console.log('\nИли используйте онлайн-инструмент Android Asset Studio:');
            console.log('https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html');
            console.log('Загрузите файл: scripts/icon_wireframe_cube.svg');
            process.exit(1);
        } else {
            console.error('Ошибка при генерации иконок:', error);
            process.exit(1);
        }
    }
}

generateIcons();

