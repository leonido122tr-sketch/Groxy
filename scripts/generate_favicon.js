/**
 * Генерация favicon.ico для веб-версии
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const faviconSizes = [16, 32, 48, 64, 128, 256, 512];

// SVG для favicon (без фона, только куб, центрированный)
function createFaviconSVG(size) {
    const padding = size * 0.15;
    const drawSize = size - (padding * 2);
    const scale = drawSize / 512;
    const offsetX = padding;
    const offsetY = padding;
    
    // Координаты из оригинального SVG
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
    
    const strokeWidth = Math.max(1, Math.floor(14 * scale));
    const vertexRadius = Math.max(1, Math.floor(9 * scale));
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#0A0A0A"/>
  
  <path
    d="M${coords.front.topLeft.x},${coords.front.topLeft.y} L${coords.front.topRight.x},${coords.front.topRight.y} L${coords.front.bottomRight.x},${coords.front.bottomRight.y} L${coords.front.bottomLeft.x},${coords.front.bottomLeft.y} Z"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
  <path
    d="M${coords.back.topLeft.x},${coords.back.topLeft.y} L${coords.back.topRight.x},${coords.back.topRight.y} L${coords.back.bottomRight.x},${coords.back.bottomRight.y} L${coords.back.bottomLeft.x},${coords.back.bottomLeft.y} Z"
    stroke="#00D9FF"
    stroke-width="${strokeWidth}"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
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

async function generateFavicon() {
    console.log('Генерация favicon.ico...\n');
    
    const appDir = path.join(__dirname, '..', 'app');
    const publicDir = path.join(__dirname, '..', 'public');
    
    // Создаем PNG разных размеров для favicon.ico
    const pngBuffers = [];
    
    for (const size of faviconSizes) {
        const svg = createFaviconSVG(size);
        const png = await sharp(Buffer.from(svg))
            .resize(size, size)
            .png()
            .toBuffer();
        pngBuffers.push({ size, buffer: png });
        console.log(`✓ Создан PNG ${size}x${size}`);
    }
    
    // Создаем ICO файл из PNG (используем самый большой размер как основной)
    const icoBuffer = await sharp(pngBuffers[pngBuffers.length - 1].buffer)
        .resize(32, 32)
        .png()
        .toBuffer();
    
    // Сохраняем favicon.ico
    const faviconPath = path.join(appDir, 'favicon.ico');
    fs.writeFileSync(faviconPath, icoBuffer);
    console.log(`\n✓ favicon.ico создан: ${faviconPath}`);
    
    // Также сохраняем icon.png для Next.js
    const iconPng = await sharp(pngBuffers[pngBuffers.length - 1].buffer)
        .resize(512, 512)
        .png()
        .toBuffer();
    
    const iconPath = path.join(appDir, 'icon.png');
    fs.writeFileSync(iconPath, iconPng);
    console.log(`✓ icon.png создан: ${iconPath}`);
    
    console.log('\n✅ Favicon успешно сгенерирован!');
}

generateFavicon().catch(console.error);

