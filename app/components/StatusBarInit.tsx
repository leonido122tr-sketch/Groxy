'use client';

import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export function StatusBarInit() {
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        // Проверяем, что мы на мобильном устройстве
        if (Capacitor.isNativePlatform()) {
          // Приложение всегда использует темную тему
          // Устанавливаем стиль статусбара для темной темы
          await StatusBar.setStyle({ 
            style: Style.Dark
          });
          
          // Разрешаем контенту перекрывать статусбар (overlay)
          await StatusBar.setOverlaysWebView({ overlay: true });
          
          // Устанавливаем прозрачный фон для статусбара
          await StatusBar.setBackgroundColor({ color: '#00000000' });
        }
      } catch (error) {
        // Игнорируем ошибки, если плагин недоступен (например, в браузере)
        console.log('StatusBar plugin not available:', error);
      }
    };

    initStatusBar();
  }, []);

  return null;
}

