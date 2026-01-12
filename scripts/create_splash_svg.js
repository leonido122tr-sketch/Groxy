/**
 * Создает SVG для splash screen и иконок
 * Используется для генерации PNG через онлайн-конвертер или другие инструменты
 */
const fs = require('fs');
const path = require('path');

const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <!-- Темный фон -->
  <rect width="1080" height="1080" fill="#0A0A0A"/>
  
  <!-- Wireframe Cube - 3D perspective -->
  <!-- Front face -->
  <path
    d="M300,450 L600,350 L600,650 L300,750 Z"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
  <!-- Back face (shifted right and up) -->
  <path
    d="M500,350 L800,250 L800,550 L500,650 Z"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"/>
  
  <!-- Connecting lines (3D perspective) -->
  <path
    d="M300,450 L500,350"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M600,350 L800,250"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M600,650 L800,550"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"/>
  <path
    d="M300,750 L500,650"
    stroke="#00D9FF"
    stroke-width="30"
    fill="none"
    stroke-linecap="round"/>
  
  <!-- Glow effect at vertices (circles) -->
  <circle cx="300" cy="450" r="20" fill="#FFFFFF"/>
  <circle cx="600" cy="350" r="20" fill="#FFFFFF"/>
  <circle cx="600" cy="650" r="20" fill="#FFFFFF"/>
  <circle cx="300" cy="750" r="20" fill="#FFFFFF"/>
  <circle cx="500" cy="350" r="20" fill="#FFFFFF"/>
  <circle cx="800" cy="250" r="20" fill="#FFFFFF"/>
  <circle cx="800" cy="550" r="20" fill="#FFFFFF"/>
  <circle cx="500" cy="650" r="20" fill="#FFFFFF"/>
</svg>`;

// Сохраняем SVG
const outputPath = path.join(__dirname, 'icon_wireframe_cube.svg');
fs.writeFileSync(outputPath, svgContent);
console.log(`SVG создан: ${outputPath}`);
console.log('\nИспользуйте этот SVG для:');
console.log('1. Конвертации в PNG через https://convertio.co/svg-png/');
console.log('2. Или используйте Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html');

