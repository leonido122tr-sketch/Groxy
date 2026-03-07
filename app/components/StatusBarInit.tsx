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
          document.body.classList.add('native-app')
          // Приложение всегда использует темную тему
          // Устанавливаем стиль статусбара для темной темы
          await StatusBar.setStyle({ 
            style: Style.Dark
          });
          
          // Не перекрываем статусбар, чтобы контент не заходил под него
          await StatusBar.setOverlaysWebView({ overlay: false });
          
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

