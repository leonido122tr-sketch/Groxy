#!/usr/bin/env python3
"""
Скрипт для генерации PNG иконок Android из векторной графики
"""
import os
from PIL import Image, ImageDraw

# Размеры для разных плотностей экрана
SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

def draw_wireframe_cube(draw, size, offset_x, offset_y, scale):
    """Рисует wireframe куб"""
    # Масштабируем координаты
    def scale_point(x, y):
        return (offset_x + x * scale, offset_y + y * scale)
    
    # Цвета
    cube_color = (0, 217, 255)  # #00D9FF
    vertex_color = (255, 255, 255)  # Белый
    
    # Координаты куба (из векторной иконки)
    # Front face
    front_top_left = scale_point(30, 45)
    front_top_right = scale_point(60, 35)
    front_bottom_right = scale_point(60, 65)
    front_bottom_left = scale_point(30, 75)
    
    # Back face
    back_top_left = scale_point(50, 35)
    back_top_right = scale_point(80, 25)
    back_bottom_right = scale_point(80, 55)
    back_bottom_left = scale_point(50, 65)
    
    stroke_width = max(2, int(3 * scale / 36))
    vertex_radius = max(1, int(2 * scale / 36))
    
    # Рисуем грани
    # Front face
    draw.line([front_top_left, front_top_right], fill=cube_color, width=stroke_width)
    draw.line([front_top_right, front_bottom_right], fill=cube_color, width=stroke_width)
    draw.line([front_bottom_right, front_bottom_left], fill=cube_color, width=stroke_width)
    draw.line([front_bottom_left, front_top_left], fill=cube_color, width=stroke_width)
    
    # Back face
    draw.line([back_top_left, back_top_right], fill=cube_color, width=stroke_width)
    draw.line([back_top_right, back_bottom_right], fill=cube_color, width=stroke_width)
    draw.line([back_bottom_right, back_bottom_left], fill=cube_color, width=stroke_width)
    draw.line([back_bottom_left, back_top_left], fill=cube_color, width=stroke_width)
    
    # Соединительные линии (3D)
    draw.line([front_top_left, back_top_left], fill=cube_color, width=stroke_width)
    draw.line([front_top_right, back_top_right], fill=cube_color, width=stroke_width)
    draw.line([front_bottom_right, back_bottom_right], fill=cube_color, width=stroke_width)
    draw.line([front_bottom_left, back_bottom_left], fill=cube_color, width=stroke_width)
    
    # Вершины (точки)
    vertices = [
        front_top_left, front_top_right, front_bottom_right, front_bottom_left,
        back_top_left, back_top_right, back_bottom_right, back_bottom_left
    ]
    
    for vertex in vertices:
        draw.ellipse([
            vertex[0] - vertex_radius,
            vertex[1] - vertex_radius,
            vertex[0] + vertex_radius,
            vertex[1] + vertex_radius
        ], fill=vertex_color)

def generate_icon(size, output_path):
    """Генерирует иконку заданного размера"""
    # Создаем изображение с прозрачным фоном
    img = Image.new('RGBA', (size, size), (10, 10, 10, 255))  # Темный фон #0A0A0A
    
    draw = ImageDraw.Draw(img)
    
    # Масштабируем координаты из viewport 108x108 к размеру иконки
    # Оставляем небольшой отступ
    padding = size * 0.15
    draw_size = size - (padding * 2)
    scale = draw_size / 108.0
    offset_x = padding
    offset_y = padding
    
    # Рисуем куб
    draw_wireframe_cube(draw, size, offset_x, offset_y, scale)
    
    # Сохраняем
    img.save(output_path, 'PNG')
    print(f"Создана иконка: {output_path} ({size}x{size})")

def main():
    """Основная функция"""
    base_dir = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
    
    for density, size in SIZES.items():
        # Создаем папку если не существует
        mipmap_dir = os.path.join(base_dir, f'mipmap-{density}')
        os.makedirs(mipmap_dir, exist_ok=True)
        
        # Генерируем обычную иконку
        icon_path = os.path.join(mipmap_dir, 'ic_launcher.png')
        generate_icon(size, icon_path)
        
        # Генерируем круглую иконку (та же самая, Android сам сделает круглой)
        round_icon_path = os.path.join(mipmap_dir, 'ic_launcher_round.png')
        generate_icon(size, round_icon_path)
        
        # Генерируем foreground для адаптивных иконок (108dp формат)
        foreground_dir = os.path.join(base_dir, f'mipmap-{density}')
        foreground_path = os.path.join(foreground_dir, 'ic_launcher_foreground.png')
        # Для foreground нужен размер 108dp, но с учетом масштаба
        foreground_size = int(size * 1.125)  # 108dp / 96dp для базового размера
        foreground_img = Image.new('RGBA', (foreground_size, foreground_size), (0, 0, 0, 0))
        foreground_draw = ImageDraw.Draw(foreground_img)
        foreground_padding = foreground_size * 0.15
        foreground_draw_size = foreground_size - (foreground_padding * 2)
        foreground_scale = foreground_draw_size / 108.0
        draw_wireframe_cube(foreground_draw, foreground_size, foreground_padding, foreground_padding, foreground_scale)
        foreground_img.save(foreground_path, 'PNG')
        print(f"Создан foreground: {foreground_path} ({foreground_size}x{foreground_size})")

if __name__ == '__main__':
    main()

