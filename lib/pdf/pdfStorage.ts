import { Capacitor } from '@capacitor/core'

const PDFS_DIR = 'Groxy/pdfs'

// Эффективная конвертация Uint8Array в base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function ensurePdfDir(directory: any) {
  if (!Capacitor.isNativePlatform()) return
  const { Filesystem } = await import('@capacitor/filesystem')
  
  // Создаём директорию (для Data/Cache разрешения не нужны)
  try {
    await Filesystem.mkdir({ 
      directory, 
      path: PDFS_DIR, 
      recursive: true 
    })
    console.log('Директория PDF создана/проверена:', PDFS_DIR)
  } catch (error: any) {
    // On Android, mkdir may throw even when the directory already exists.
    // Treat "already exists" as success.
    const code = error?.code
    const msg = String(error?.message ?? '')
    if (code === 'OS-PLUG-FILE-0010' || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('exists')) {
      console.log('Директория PDF уже существует:', PDFS_DIR)
      return
    }
    console.warn('Ошибка создания директории PDF:', error)
    throw error
  }
}

export async function savePdfToDevice(filename: string, bytes: Uint8Array): Promise<{ uri: string; path: string } | string | null> {
  console.log('savePdfToDevice вызван:', { filename, size: bytes.length, isNative: Capacitor.isNativePlatform() })
  
  if (!Capacitor.isNativePlatform()) {
    // В веб-версии используем Blob URL
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  }

  // Используем JavaScript Interface для сохранения PDF в память устройства (Android)
  if (Capacitor.getPlatform() === 'android') {
    try {
      console.log('Использование JavaScript Interface для сохранения PDF на Android...')
      const base64Data = uint8ArrayToBase64(bytes)
      console.log('Base64 данные подготовлены, длина:', base64Data.length)
      
      // Проверяем наличие интерфейса
      const nativeStorage = (window as any).NativeStorage
      if (!nativeStorage) {
        throw new Error('NativeStorage JavaScript Interface не найден')
      }
      
      if (typeof nativeStorage.savePdf !== 'function') {
        throw new Error('NativeStorage.savePdf не является функцией')
      }
      
      console.log('Вызов NativeStorage.savePdf с параметрами:', { filename, dataLength: base64Data.length })
      
      // Вызываем синхронно (JavaScript Interface работает синхронно)
      const resultStr = nativeStorage.savePdf(filename, base64Data)
      
      if (!resultStr) {
        throw new Error('NativeStorage.savePdf вернул null или undefined')
      }
      
      console.log('Результат от NativeStorage:', resultStr)
      
      const result = JSON.parse(resultStr)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      if (!result.uri) {
        throw new Error('Результат не содержит URI: ' + JSON.stringify(result))
      }
      
      console.log('PDF успешно сохранён в память устройства:', result)
      // Возвращаем объект с uri и path для использования в FileOpener
      // path работает более надёжно с FileOpener, чем content:// URI
      return { uri: result.uri, path: result.path }
    } catch (error: any) {
      console.error('Ошибка сохранения PDF через JavaScript Interface:', {
        message: error?.message,
        stack: error?.stack,
        error: error,
        errorString: String(error),
      })
      throw error
    }
  }

  // Для iOS пробуем Filesystem как запасной вариант (на Android не работает)
  if (Capacitor.getPlatform() === 'ios') {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const base64Data = uint8ArrayToBase64(bytes)
      
      // Используем Directory.Data - приватная папка приложения, не требует разрешений
      const filePath = `${PDFS_DIR}/${filename}`
      
      // Создаём директорию
      await ensurePdfDir(Directory.Data)
      
      // Сохраняем файл
      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Data,
      })
      
      // Получаем URI файла
      const fileUri = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Data,
      })

      console.log('PDF успешно сохранён через Filesystem:', fileUri.uri)
      return fileUri.uri
    } catch (error: any) {
      console.error('Ошибка сохранения PDF через Filesystem:', error)
      throw error
    }
  }
  
  // Если дошли сюда, значит на Android не сработал нативный плагин
  throw new Error('Не удалось сохранить PDF. Нативный плагин не работает.')
}

export async function openPdfFromDevice(
  uri: string,
  pdfBytes?: Uint8Array,
  opts?: { userInitiated?: boolean; filePath?: string }
) {
  console.log('openPdfFromDevice вызван с URI:', uri, 'filePath:', opts?.filePath)

  // Жёсткая защита от автo-открытия:
  // PDF должен открываться ТОЛЬКО по явному действию пользователя (кнопка "Открыть PDF").
  // Если кто-то (старый код/побочный эффект) вызывает openPdfFromDevice без флага — просто выходим.
  if (!opts?.userInitiated) {
    console.warn('openPdfFromDevice: BLOCKED (not user initiated)')
    return
  }
  
  if (!Capacitor.isNativePlatform()) {
    // В веб-версии открываем через window.open
    if (pdfBytes) {
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } else {
      window.open(uri, '_blank')
    }
    return
  }

  // На Android используем нативный Intent для открытия PDF в системном приложении
  // (pdf.js с worker не работает в Android WebView, поэтому используем стандартный способ)
  if (Capacitor.getPlatform() === 'android') {
    try {
      console.log('Открытие PDF через нативный Android Intent (FileOpener), URI:', uri)
      
      const { FileOpener } = await import('@capawesome-team/capacitor-file-opener')
      
      // Используем FileOpener для открытия PDF в системном приложении (Google PDF Viewer, Adobe Reader и т.д.)
      // Пробуем использовать filePath (абсолютный путь), если он доступен, иначе используем URI
      // filePath работает более надёжно с FileOpener, чем content:// URI
      const pathToUse = opts?.filePath || uri
      console.log('FileOpener.openFile: используем путь:', pathToUse)
      
      await FileOpener.openFile({
        path: pathToUse,
        mimeType: 'application/pdf',
      })
      console.log('FileOpener.openFile успешно вызван на Android')
      return
    } catch (error: any) {
      console.error('Ошибка открытия PDF через FileOpener на Android:', error)
      
      // Запасной вариант: используем Share для выбора приложения
      try {
        const { Share } = await import('@capacitor/share')
        console.log('Запасной вариант: используем Share.share на Android')
        await Share.share({ 
          title: 'PDF Проект',
          url: uri, 
          dialogTitle: 'Открыть PDF через...' 
        })
        return
      } catch (shareError) {
        console.error('Ошибка открытия PDF через Share на Android:', shareError)
        alert('Не удалось открыть PDF. Убедитесь, что у вас установлено приложение для просмотра PDF (например, Google Диск или Adobe Reader).')
        return
      }
    }
  }

  // Для iOS используем специализированный плагин для открытия файлов
  if (Capacitor.getPlatform() === 'ios') {
    try {
      const { FileOpener } = await import('@capawesome-team/capacitor-file-opener')
      
      console.log('Попытка открыть PDF через FileOpener.openFile на iOS...')
      await FileOpener.openFile({
        path: uri,
        mimeType: 'application/pdf',
      })
      console.log('FileOpener.openFile успешно вызван на iOS')
      return
    } catch (error: any) {
      console.error('Ошибка открытия PDF через FileOpener на iOS:', error)
      
      // Если плагин не сработал, пробуем Share как запасной вариант
      try {
        const { Share } = await import('@capacitor/share')
        console.log('Запасной вариант: используем Share.share на iOS')
        await Share.share({ 
          title: 'PDF Проект',
          url: uri, 
          dialogTitle: 'Открыть PDF через...' 
        })
        return
      } catch (shareError) {
        console.error('Ошибка открытия PDF через Share на iOS:', shareError)
        alert('Не удалось открыть PDF автоматически. Убедитесь, что у вас установлено приложение для просмотра PDF.')
        return
      }
    }
  }
}

