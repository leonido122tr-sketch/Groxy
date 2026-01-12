/**
 * Генерация всех PNG splash screen изображений для Android
 */

const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

// Размеры для разных плотностей и ориентаций
const SIZES = {
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

// Базовый размер для splash (квадратный, для drawable/)
const BASE_SPLASH_SIZE = 1080;

function createSplashSVG(width, height) {
    // Центрируем куб
    const centerX = width / 2;
    const centerY = height / 2;
    const cubeSize = Math.min(width, height) * 0.4; // 40% от меньшей стороны
    const padding = cubeSize * 0.1;
    
    // Координаты куба (относительно центра)
    const halfCube = cubeSize / 2;
    const coords = {
        front: {
            topLeft: { x: centerX - halfCube * 0.6, y: centerY - halfCube * 0.3 },
            topRight: { x: centerX + halfCube * 0.4, y: centerY - halfCube * 0.5 },
            bottomRight: { x: centerX + halfCube * 0.4, y: centerY + halfCube * 0.3 },
            bottomLeft: { x: centerX - halfCube * 0.6, y: centerY + halfCube * 0.5 }
        },
        back: {
            topLeft: { x: centerX - halfCube * 0.3, y: centerY - halfCube * 0.5 },
            topRight: { x: centerX + halfCube * 0.6, y: centerY - halfCube * 0.7 },
            bottomRight: { x: centerX + halfCube * 0.6, y: centerY + halfCube * 0.1 },
            bottomLeft: { x: centerX - halfCube * 0.3, y: centerY + halfCube * 0.3 }
        }
    };
    
    const strokeWidth = Math.max(3, Math.floor(width / 360));
    const vertexRadius = Math.max(2, Math.floor(width / 540));
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#0A0A0A"/>
  
  <!-- Wireframe Cube -->
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

async function generateSplashScreens() {
    const baseDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
    
    console.log('Генерация splash screen изображений...\n');
    
    // Базовый splash (drawable/splash.png)
    const baseSplashSvg = createSplashSVG(BASE_SPLASH_SIZE, BASE_SPLASH_SIZE);
    const baseSplashPng = await sharp(Buffer.from(baseSplashSvg))
        .png()
        .toBuffer();
    const baseSplashPath = path.join(baseDir, 'drawable', 'splash.png');
    fs.writeFileSync(baseSplashPath, baseSplashPng);
    console.log(`✓ drawable/splash.png (${BASE_SPLASH_SIZE}x${BASE_SPLASH_SIZE})`);
    
    // Splash для разных плотностей
    for (const [folder, size] of Object.entries(SIZES)) {
        const drawableDir = path.join(baseDir, `drawable-${folder}`);
        
        if (!fs.existsSync(drawableDir)) {
            fs.mkdirSync(drawableDir, { recursive: true });
        }
        
        const splashSvg = createSplashSVG(size.width, size.height);
        const splashPng = await sharp(Buffer.from(splashSvg))
            .png()
            .toBuffer();
        
        const splashPath = path.join(drawableDir, 'splash.png');
        fs.writeFileSync(splashPath, splashPng);
        console.log(`✓ drawable-${folder}/splash.png (${size.width}x${size.height})`);
    }
    
    console.log('\n✅ Все splash screen изображения успешно сгенерированы!');
}

generateSplashScreens().catch(console.error);

